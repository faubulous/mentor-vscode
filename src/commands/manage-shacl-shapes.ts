import * as vscode from 'vscode';
import { container } from 'tsyringe';
import { Store } from '@faubulous/mentor-rdf';
import { ServiceToken } from '@src/services/tokens';
import { ShaclValidationService } from '@src/services/validation/shacl-validation-service';
import { ShaclProfileSettingsWriter } from '@src/services/validation/shacl-profile-settings-writer';
import { ScopeKey } from '@src/utilities/config-scope';
import { getShapeGraphCandidates, toDisplayPath } from '@src/utilities';
import {
	ShaclBrokenReferences,
	ShaclDocumentLocation,
	ShaclDocumentValidationState,
	ShaclValidationSettings,
	findDocumentProfileId,
	generateProfileId,
	isExclusionEntry,
	isGlobPattern,
	matchesPathKey,
	matchesProfilePaths,
	toDocumentPatternKey,
	toUniqueStringArray,
} from '@src/services/validation/shacl-validation-configuration';

export const manageShaclShapes = {
	id: 'mentor.command.manageShaclShapes',
	handler: async () => {
		const editor = vscode.window.activeTextEditor;

		if (!editor || !editor.document) {
			return;
		}

		await new ManageShaclShapesCommand(editor.document.uri).run();
	}
};

interface ProfilePickItem extends vscode.QuickPickItem {
	profileName: string;
}

interface ShapePickItem extends vscode.QuickPickItem {
	graphUri: string;
}

type ProfilePickerResult =
	| { kind: 'accept'; profileNames: string[] }
	| { kind: 'selectFiles' }
	| { kind: 'manageProfiles' };

type FilePickerResult =
	| { kind: 'accept'; shapes: string[] }
	| { kind: 'back' }
	| { kind: 'manageProfiles' };

/**
 * The type of shape source selector the command is currently showing: the named-profile picker
 * or the individual shape-file picker.
 */
type ShapeSourceType = 'profiles' | 'files';

const MANAGE_PROFILES_BUTTON: vscode.QuickInputButton = {
	iconPath: new vscode.ThemeIcon('gear'),
	tooltip: 'Manage validation profiles…'
};

const SELECT_FILES_BUTTON: vscode.QuickInputButton = {
	iconPath: new vscode.ThemeIcon('files'),
	tooltip: 'Select individual shape files…'
};

/**
 * Shows a multi-select quick pick of the named validation profiles.
 */
function showProfilePicker(
	settings: ShaclValidationSettings,
	state: ShaclDocumentValidationState,
	broken: ShaclBrokenReferences
): Promise<ProfilePickerResult | undefined> {
	const applied = new Set(state.profileNames);

	const items: ProfilePickItem[] = Object.entries(settings.profiles ?? {}).map(([id, profile]) => {
		const shapeCount = toUniqueStringArray(profile?.shapes).length;
		const descriptionParts = [`${shapeCount} file${shapeCount === 1 ? '' : 's'}`];

		if (broken.profiles[id]) {
			descriptionParts.push('$(warning) missing files');
		}

		// The detail line collects the missing-file summary and, last, the profile description.
		const detailParts: string[] = [];

		if (broken.profiles[id]) {
			detailParts.push(`Missing: ${broken.profiles[id].map(toDisplayPath).join(', ')}`);
		}

		const description = profile?.description?.trim();

		if (description) {
			detailParts.push(description);
		}

		return {
			label: profile?.name ?? id,
			description: descriptionParts.join(' '),
			detail: detailParts.length > 0 ? detailParts.join(' · ') : undefined,
			picked: applied.has(id),
			profileName: id,
		};
	});

	const quickPick = vscode.window.createQuickPick<ProfilePickItem>();
	quickPick.title = 'SHACL Validation Profiles';
	quickPick.placeholder = 'Select the validation profiles to apply to this document:';
	quickPick.canSelectMany = true;
	quickPick.items = items;
	quickPick.selectedItems = items.filter(item => item.picked);
	quickPick.buttons = [SELECT_FILES_BUTTON, MANAGE_PROFILES_BUTTON];

	return new Promise<ProfilePickerResult | undefined>((resolve) => {
		let result: ProfilePickerResult | undefined;

		quickPick.onDidTriggerButton(button => {
			result = button === SELECT_FILES_BUTTON ? { kind: 'selectFiles' } : { kind: 'manageProfiles' };
			quickPick.hide();
		});

		quickPick.onDidAccept(() => {
			const profileNames = quickPick.selectedItems
				.map(item => item.profileName)
				.filter((name): name is string => !!name);

			result = { kind: 'accept', profileNames };
			quickPick.hide();
		});

		quickPick.onDidHide(() => {
			resolve(result);
			quickPick.dispose();
		});

		quickPick.show();
	});
}

/**
 * Shows a multi-select quick pick of the individual SHACL shape files in the workspace.
 */
function showFilePicker(
	shapeGraphUris: readonly string[],
	selectedShapes: readonly string[],
	showBackButton: boolean
): Promise<FilePickerResult | undefined> {
	let selected = new Set(selectedShapes);

	const items: ShapePickItem[] = shapeGraphUris.map(graphUri => ({
		label: toDisplayPath(graphUri),
		picked: selected.has(graphUri),
		graphUri,
	}));

	const quickPick = vscode.window.createQuickPick<ShapePickItem>();
	quickPick.title = 'SHACL Shape Files';
	quickPick.placeholder = items.length === 0
		? 'No SHACL shape files in this workspace.'
		: 'Select the SHACL shape files to apply to this document:';
	quickPick.canSelectMany = true;
	quickPick.items = items;
	quickPick.selectedItems = items.filter(item => item.picked);
	quickPick.buttons = [
		...(showBackButton ? [vscode.QuickInputButtons.Back] : []),
		MANAGE_PROFILES_BUTTON,
	];

	return new Promise<FilePickerResult | undefined>((resolve) => {
		let result: FilePickerResult | undefined;

		quickPick.onDidChangeSelection(selectedItems => {
			selected = new Set(selectedItems.map(item => item.graphUri));
		});

		quickPick.onDidTriggerButton(button => {
			result = button === vscode.QuickInputButtons.Back ? { kind: 'back' } : { kind: 'manageProfiles' };
			quickPick.hide();
		});

		quickPick.onDidAccept(() => {
			result = { kind: 'accept', shapes: [...selected] };
			quickPick.hide();
		});

		quickPick.onDidHide(() => {
			resolve(result);
			quickPick.dispose();
		});

		quickPick.show();
	});
}

/**
 * One invocation of the "Manage SHACL Shapes" command for the active document:
 * a two-level wizard that either toggles the named validation profiles applying
 * to the document (adding/removing its literal path from their `paths` lists)
 * or edits the document's own auto-created profile through an individual
 * shape-file selection.
 */
class ManageShaclShapesCommand {
	private readonly _validationService: ShaclValidationService;

	private readonly _settingsWriter = new ShaclProfileSettingsWriter();

	private readonly _documentUri: vscode.Uri;

	/**
	 * The workspace-relative location of the document being managed.
	 */
	private readonly _location: ShaclDocumentLocation;

	/**
	 * The document's settings key: its workspace-relative path, fragment-qualified
	 * for notebook cells.
	 */
	private readonly _key: string;

	private readonly _rdfExtensions: readonly string[];

	/**
	 * Whether any named profiles existed when the command started; controls the
	 * initial wizard type and the file picker's Back button.
	 */
	private readonly _hasProfiles: boolean;

	constructor(documentUri: vscode.Uri) {
		this._validationService = container.resolve<ShaclValidationService>(ServiceToken.ShaclValidationService);
		this._documentUri = documentUri;
		this._location = this._validationService.getDocumentLocation(documentUri);
		this._key = toDocumentPatternKey(this._location);
		this._rdfExtensions = this._validationService.getRdfExtensions();
		this._hasProfiles = Object.keys(this._validationService.getValidationSettings().profiles ?? {}).length > 0;
	}

	/**
	 * Runs the wizard until a selection is applied or a picker is dismissed.
	 */
	async run(): Promise<void> {
		let type: ShapeSourceType | undefined = this._getInitialLevel();

		while (type) {
			type = type === 'profiles'
				? await this._runProfilesStep()
				: await this._runFilesStep();
		}
	}

	/**
	 * Picks the wizard level to start on. When the document's own auto-created
	 * profile is the only thing applying (an individual file selection), the
	 * file picker opens directly instead of the profile picker.
	 */
	private _getInitialLevel(): ShapeSourceType {
		const settings = this._validationService.getValidationSettings();
		const state = this._validationService.getDocumentValidationState(this._documentUri);
		const documentProfileId = findDocumentProfileId(settings, this._key);

		const usesIndividualFiles = documentProfileId !== undefined
			&& state.profileNames.length === 1
			&& state.profileNames[0] === documentProfileId;

		return (this._hasProfiles && !usesIndividualFiles) ? 'profiles' : 'files';
	}

	/**
	 * Shows the profile picker and applies the accepted selection. Returns the
	 * next wizard level, or undefined when the wizard is finished.
	 */
	private async _runProfilesStep(): Promise<ShapeSourceType | undefined> {
		const settings = this._validationService.getValidationSettings();
		const state = this._validationService.getDocumentValidationState(this._documentUri);
		const broken = await this._validationService.checkShaclProfiles();
		const result = await showProfilePicker(settings, state, broken);

		if (!result) {
			return undefined;
		}

		if (result.kind === 'selectFiles') {
			return 'files';
		}

		if (result.kind === 'manageProfiles') {
			await this._openProfileSettings();

			return undefined;
		}

		await this._applyProfileSelection(settings, state, result.profileNames);

		return undefined;
	}

	/**
	 * Diffs the accepted profile selection against the currently matching
	 * profiles: checking a profile adds the document's literal path to its
	 * paths, unchecking one removes its literal entries. Pattern matches cannot
	 * be changed per file. Writes go to whichever scope each profile is stored in.
	 */
	private async _applyProfileSelection(
		settings: ShaclValidationSettings,
		state: ShaclDocumentValidationState,
		profileNames: string[]
	): Promise<void> {
		const matching = new Set(state.profileNames);
		const selected = new Set(profileNames);
		const documentProfileId = findDocumentProfileId(settings, this._key);

		const added: Record<ScopeKey, string[]> = { user: [], workspace: [] };
		const removed: Record<ScopeKey, string[]> = { user: [], workspace: [] };
		const blocked: string[] = [];

		for (const id of profileNames) {
			if (matching.has(id)) {
				continue;
			}

			const found = this._settingsWriter.findProfile(id);

			if (found) {
				added[found.scope].push(id);
			}
		}

		for (const id of state.profileNames) {
			if (selected.has(id)) {
				continue;
			}

			const found = this._settingsWriter.findProfile(id);
			const literalEntries = (found?.profile.paths ?? []).filter(entry => this._isLiteralDocumentEntry(entry));

			if (!found || literalEntries.length === 0) {
				// Applies via a pattern — not changeable per file.
				blocked.push(id);
				continue;
			}

			removed[found.scope].push(id);

			// Removing the literal entries may not stop a pattern from matching.
			const remaining = (found.profile.paths ?? []).filter(entry => !this._isLiteralDocumentEntry(entry));

			if (matchesProfilePaths(remaining, this._location, this._rdfExtensions)) {
				blocked.push(id);
			}
		}

		for (const scope of ['workspace', 'user'] as ScopeKey[]) {
			if (added[scope].length === 0 && removed[scope].length === 0) {
				continue;
			}

			await this._settingsWriter.mutateProfiles(scope, profiles => {
				for (const id of added[scope]) {
					const profile = profiles[id];

					if (profile) {
						profiles[id] = { ...profile, paths: [...(profile.paths ?? []), this._key] };
					}
				}

				for (const id of removed[scope]) {
					const profile = profiles[id];

					if (!profile) {
						continue;
					}

					const kept = (profile.paths ?? []).filter(entry => !this._isLiteralDocumentEntry(entry));

					if (kept.length === 0 && id === documentProfileId) {
						// The document's auto-created profile exists only to bind
						// shapes to this file — remove it entirely.
						delete profiles[id];
					} else {
						const next = { ...profile };

						if (kept.length > 0) {
							next.paths = kept;
						} else {
							delete next.paths;
						}

						profiles[id] = next;
					}
				}
			});
		}

		if (blocked.length > 0) {
			const names = blocked.map(id => settings.profiles?.[id]?.name ?? id);

			vscode.window.showInformationMessage(
				`The selection for ${names.map(name => `"${name}"`).join(', ')} could not be fully applied: `
				+ 'these profiles apply via path patterns. Manage them in the validation settings.'
			);
		}
	}

	/**
	 * Shows the individual shape-file picker and applies the accepted selection
	 * to the document's auto-created profile. Returns the next wizard level, or
	 * undefined when the wizard is finished.
	 */
	private async _runFilesStep(): Promise<ShapeSourceType | undefined> {
		const store = container.resolve<Store>(ServiceToken.Store);
		const candidates = getShapeGraphCandidates(store);

		// Pre-select the shapes of the document's own auto-created profile;
		// shapes contributed by pattern-matched profiles are not editable here.
		const settings = this._validationService.getValidationSettings();
		const documentProfileId = findDocumentProfileId(settings, this._key);
		const documentShapes = documentProfileId
			? toUniqueStringArray(settings.profiles?.[documentProfileId]?.shapes)
			: [];

		const result = await showFilePicker(candidates, documentShapes, this._hasProfiles);

		if (!result) {
			return undefined;
		}

		if (result.kind === 'back') {
			return 'profiles';
		}

		if (result.kind === 'manageProfiles') {
			await this._openProfileSettings();

			return undefined;
		}

		await this._applyFileSelection(settings, documentProfileId, result.shapes);

		return undefined;
	}

	/**
	 * Persists an individual shape-file selection into the document's
	 * auto-created profile: updates it in whichever scope it lives in, creates
	 * it in the workspace scope when it does not exist yet, and deletes it when
	 * the selection is empty.
	 */
	private async _applyFileSelection(
		settings: ShaclValidationSettings,
		documentProfileId: string | undefined,
		shapes: string[]
	): Promise<void> {
		const scope = documentProfileId ? this._settingsWriter.getProfileScope(documentProfileId) : 'workspace';

		await this._settingsWriter.mutateProfiles(scope, profiles => {
			const existingId = documentProfileId && profiles[documentProfileId]
				? documentProfileId
				: findDocumentProfileId({ profiles }, this._key);

			if (shapes.length === 0) {
				// Nothing selected — the document needs no dedicated profile.
				if (existingId) {
					delete profiles[existingId];
				}

				return;
			}

			if (existingId) {
				profiles[existingId] = { ...profiles[existingId], shapes };
			} else {
				const id = generateProfileId(this._key, [
					...Object.keys(settings.profiles ?? {}),
					...Object.keys(profiles),
				]);

				profiles[id] = { name: this._key, shapes, paths: [this._key] };
			}
		});
	}

	/**
	 * Whether a `paths` entry is a literal (non-pattern) reference to the
	 * managed document, i.e. one the per-file toggle may add or remove.
	 */
	private _isLiteralDocumentEntry(entry: string): boolean {
		return !isExclusionEntry(entry)
			&& !isGlobPattern(entry)
			&& matchesPathKey(entry, this._location, this._rdfExtensions);
	}

	/**
	 * Opens the Validation > Profiles section of the Mentor settings panel.
	 */
	private _openProfileSettings(): Thenable<unknown> {
		return vscode.commands.executeCommand('mentor.command.openSettings', 'validation.profiles');
	}
}
