import * as vscode from 'vscode';
import { container } from 'tsyringe';
import { Store } from '@faubulous/mentor-rdf';
import { ServiceToken } from '@src/services/tokens';
import { ShaclValidationService } from '@src/services/validation/shacl-validation-service';
import { isValidPathKey, matchesPathKey, matchesProfilePaths, toPathEntries } from '@src/services/validation/shacl-validation-configuration';
import { IWorkspaceFileService } from '@src/services/core';
import { IDocumentContextService } from '@src/services/document';
import { WorkspaceUri } from '@src/providers/workspace-uri';
import { writePresetShapes } from '@src/services/validation/preset-shape-writer';
import { getShapeGraphCandidates } from '@src/utilities';
import { SettingsSectionId } from '..';
import { SettingsSectionController } from '../../settings-section-controller';
import { SettingsSectionMessages } from '../../settings-panel-messages';
import { confirmSettingsItemDeletion } from '../../confirm-settings-item-deletion';

const SECTION_ID = 'validation.profiles' satisfies SettingsSectionId;

/**
 * How many matching file paths are sent back with a match preview.
 */
const MATCH_PREVIEW_SAMPLE_SIZE = 3;

/**
 * How many matching files the interactive pattern editor lists at most.
 */
const PATTERN_EDITOR_MAX_ITEMS = 50;

/**
 * Section controller for the Validation > Profiles settings section.
 *
 * Enumerates the SHACL shape graphs in the workspace for the profile editor,
 * reports broken shape references, resolves live "N files match" previews for a
 * profile's paths against the indexed workspace files (using the exact same
 * matcher as the runtime resolver), and runs the native delete confirmation on
 * the extension host — the webview performs the actual settings write,
 * mirroring the stores section.
 */
export class ValidationProfilesSectionController implements SettingsSectionController {
	readonly id: SettingsSectionId = SECTION_ID;

	private _post: (message: SettingsSectionMessages) => void = () => { };

	private _disposables: vscode.Disposable[] = [];

	initialize(post: (message: SettingsSectionMessages) => void): void {
		this._post = post;

		// Shape graphs appear as documents are indexed; keep the candidate list live.
		const documentContextService = container.resolve<IDocumentContextService>(ServiceToken.DocumentContextService);

		this._disposables.push(
			documentContextService.onDidChangeDocumentContext(() => {
				this._post({
					section: SECTION_ID,
					id: 'GetShapeCandidatesResult',
					candidates: getShapeGraphCandidates(container.resolve<Store>(ServiceToken.Store)),
				});
			})
		);
	}

	async handleMessage(message: SettingsSectionMessages): Promise<boolean> {
		switch (message.id) {
			case 'GetShapeCandidates': {
				this._post({
					section: SECTION_ID,
					id: 'GetShapeCandidatesResult',
					candidates: getShapeGraphCandidates(container.resolve<Store>(ServiceToken.Store)),
				});

				return true;
			}
			case 'GetValidationHealth': {
				const validationService = container.resolve<ShaclValidationService>(ServiceToken.ShaclValidationService);
				const broken = await validationService.checkShaclProfiles();

				this._post({ section: SECTION_ID, id: 'GetValidationHealthResult', broken });

				return true;
			}
			case 'GetProfileMatchPreview': {
				const { key, includeFiles, excludeFiles } = message;
				const entries = toPathEntries(includeFiles, excludeFiles);

				const fileService = container.resolve<IWorkspaceFileService>(ServiceToken.WorkspaceFileService);
				const validationService = container.resolve<ShaclValidationService>(ServiceToken.ShaclValidationService);
				const rdfExtensions = validationService.getRdfExtensions();

				const matches: string[] = [];

				for (const uri of fileService.files) {
					const location = validationService.getDocumentLocation(uri);

					if (matchesProfilePaths(entries, location, rdfExtensions)) {
						matches.push(location.path);
					}
				}

				this._post({
					section: SECTION_ID,
					id: 'GetProfileMatchPreviewResult',
					key,
					count: matches.length,
					sample: matches.slice(0, MATCH_PREVIEW_SAMPLE_SIZE),
				});

				return true;
			}
			case 'EditPathPattern': {
				const pattern = await this._showPatternEditor(message.pattern);

				this._post({ section: SECTION_ID, id: 'EditPathPatternResult', pattern });

				return true;
			}
			case 'OpenShapeGraph': {
				let parsed: vscode.Uri | undefined;

				try {
					parsed = vscode.Uri.parse(message.uri, true);
				} catch {
					parsed = undefined;
				}

				if (!parsed) {
					vscode.window.showWarningMessage(`Cannot open shape graph: ${message.uri}`);

					return true;
				}

				if (parsed.scheme === WorkspaceUri.uriScheme) {
					// Workspace graphs are backed by files — open the file directly.
					const fileUri = WorkspaceUri.tryToFileUri(parsed);

					if (fileUri) {
						await vscode.window.showTextDocument(fileUri);
					} else {
						vscode.window.showWarningMessage(`Cannot open shape graph: ${message.uri}`);
					}
				} else {
					// Other graphs (e.g. built-in vocabularies) are viewed through the
					// graph exporter, which serializes the store graph into an editor.
					await vscode.commands.executeCommand('mentor.command.openGraph', message.uri);
				}

				return true;
			}
			case 'WritePresetShapes': {
				try {
					const { uri } = await writePresetShapes(message.presetId);

					this._post({ section: SECTION_ID, id: 'WritePresetShapesResult', presetId: message.presetId, uri });
				} catch (error) {
					const reason = error instanceof Error ? error.message : String(error);

					vscode.window.showErrorMessage(`Could not copy the preset shapes into the workspace: ${reason}`);

					this._post({ section: SECTION_ID, id: 'WritePresetShapesResult', presetId: message.presetId, error: reason });
				}

				return true;
			}
			case 'ValidateProfile': {
				await vscode.commands.executeCommand('mentor.command.validateProfile', message.profileId);

				return true;
			}
			case 'DeleteValidationProfile': {
				const { profileId, name, scope } = message;

				await confirmSettingsItemDeletion(this._post, {
					message: `Are you sure you want to delete the validation profile "${name}"?`,
					deletedMessage: { section: SECTION_ID, id: 'ValidationProfileDeleted', profileId, scope },
				});

				return true;
			}
			default: {
				return false;
			}
		}
	}

	/**
	 * Opens the interactive pattern editor: a quick pick whose input holds the
	 * pattern and whose items preview the workspace files it currently matches,
	 * updating live while typing. Accepting the typed value resolves with the
	 * confirmed pattern; picking a file item instead opens that file in an
	 * editor and leaves the pattern unchanged. Resolves with undefined when
	 * dismissed.
	 */
	private _showPatternEditor(pattern: string): Promise<string | undefined> {
		const fileService = container.resolve<IWorkspaceFileService>(ServiceToken.WorkspaceFileService);
		const validationService = container.resolve<ShaclValidationService>(ServiceToken.ShaclValidationService);
		const rdfExtensions = validationService.getRdfExtensions();

		type PatternEditorItem = vscode.QuickPickItem & { fileUri?: vscode.Uri };

		const quickPick = vscode.window.createQuickPick<PatternEditorItem>();
		quickPick.placeholder = 'Glob pattern or workspace-relative file path, e.g. ontologies/* or **/*.ttl';
		quickPick.value = pattern;

		const updateItems = (value: string) => {
			const trimmed = value.trim();
			const matches: { path: string; uri: vscode.Uri }[] = [];

			if (trimmed.length > 0 && isValidPathKey(trimmed)) {
				for (const uri of fileService.files) {
					const location = validationService.getDocumentLocation(uri);

					if (matchesPathKey(trimmed, location, rdfExtensions)) {
						matches.push({ path: location.path, uri });
					}
				}
			}

			quickPick.title = `Edit Path Pattern — ${matches.length} file${matches.length === 1 ? '' : 's'} match`;

			// The quick pick's built-in filtering would fight the glob input, so
			// every item opts out of it via alwaysShow. The paths live in the
			// description rather than the label: labels are fuzzy-matched against
			// the typed value and get blue/bold match highlights, descriptions are
			// not, so the items render uniformly.
			quickPick.items = matches.length === 0
				? [{ label: '$(info)', description: 'No files match this pattern.', alwaysShow: true }]
				: [
					...matches.slice(0, PATTERN_EDITOR_MAX_ITEMS).map(({ path, uri }) => ({
						label: '$(go-to-file)',
						description: path,
						alwaysShow: true,
						fileUri: uri,
					})),
					...(matches.length > PATTERN_EDITOR_MAX_ITEMS
						? [{
							label: '$(ellipsis)',
							description: `${matches.length - PATTERN_EDITOR_MAX_ITEMS} more files`,
							alwaysShow: true,
						}]
						: []),
				];

			// Keep the input's Enter bound to confirming the typed pattern: without
			// an active item, accepting does not select the first file.
			quickPick.activeItems = [];
		};

		updateItems(pattern);

		return new Promise<string | undefined>((resolve) => {
			let result: string | undefined;

			quickPick.onDidChangeValue(updateItems);

			quickPick.onDidAccept(async () => {
				const selected = quickPick.selectedItems[0];

				if (selected?.fileUri) {
					// A file item was picked — open it and leave the pattern unchanged.
					quickPick.hide();
					await vscode.window.showTextDocument(selected.fileUri);
					return;
				}

				const value = quickPick.value.trim();

				if (value.length > 0) {
					result = value;
				}

				quickPick.hide();
			});

			quickPick.onDidHide(() => {
				resolve(result);
				quickPick.dispose();
			});

			quickPick.show();
		});
	}

	dispose(): void {
		for (const d of this._disposables) {
			d.dispose();
		}

		this._disposables = [];
	}
}
