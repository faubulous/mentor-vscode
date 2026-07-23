import * as vscode from 'vscode';
import { container } from 'tsyringe';
import { Store } from '@faubulous/mentor-rdf';
import { ServiceToken } from '@src/services/tokens';
import { ShaclValidationService } from '@src/services/validation/shacl-validation-service';
import { isValidPathKey, matchesPathKey, matchesProfilePaths, toDocumentPatternKey, toPathEntries, ShaclDocumentLocation } from '@src/services/validation/shacl-validation-configuration';
import { IWorkspaceFileService, SettingsFileStore } from '@src/services/core';
import { IDocumentContextService } from '@src/services/document';
import { WorkspaceUri } from '@src/providers/workspace-uri';
import { UserUri } from '@src/providers/user-uri';
import { ShapeGraphService } from '@src/services/validation/shape-graph-service';
import { createUserShapeFile } from '@src/commands/validation/create-user-shape';
import { writePresetShapes } from '@src/services/validation/preset-shape-writer';
import { getPresetShapeSource } from '@src/services/validation/presets';
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

		const postCandidates = () => {
			this._post({
				section: SECTION_ID,
				id: 'GetShapeCandidatesResult',
				candidates: this._getShapeCandidates(),
			});
		};

		this._disposables.push(
			documentContextService.onDidChangeDocumentContext(postCandidates),
			// User shape graphs also change without any document being open, e.g.
			// through a Settings Sync update or the orphan cleanup command.
			container.resolve<ShapeGraphService>(ServiceToken.ShapeGraphService).onDidChangeShapeGraphs(postCandidates)
		);
	}

	/**
	 * The shape graphs offered in the pickers: graphs in the store that contain
	 * shape definitions, plus every user shape file. A user shape file is a
	 * candidate by definition — its whole purpose is to hold shapes — so it is
	 * listed even while it is still empty or holds only a commented skeleton
	 * (in which case its graph is absent from the store).
	 */
	private _getShapeCandidates(): string[] {
		const store = container.resolve<Store>(ServiceToken.Store);
		const shapeGraphService = container.resolve<ShapeGraphService>(ServiceToken.ShapeGraphService);

		const userShapeUris = shapeGraphService.getUserShapeFileNames()
			.map(fileName => shapeGraphService.getUserShapeGraphUri(fileName));

		return [...new Set([...getShapeGraphCandidates(store), ...userShapeUris])].sort();
	}

	async handleMessage(message: SettingsSectionMessages): Promise<boolean> {
		switch (message.id) {
			case 'GetShapeCandidates': {
				this._post({
					section: SECTION_ID,
					id: 'GetShapeCandidatesResult',
					candidates: this._getShapeCandidates(),
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

				const validationService = container.resolve<ShaclValidationService>(ServiceToken.ShaclValidationService);
				const rdfExtensions = validationService.getRdfExtensions();

				const matches: string[] = [];

				for (const { location } of this._getMatchCandidates()) {
					if (matchesProfilePaths(entries, location, rdfExtensions)) {
						matches.push(toDocumentPatternKey(location));
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
				} else if (parsed.scheme === UserUri.uriScheme) {
					// User shape files are served by the user file system provider —
					// open the editable document, not a serialized graph copy.
					await vscode.window.showTextDocument(parsed, { preview: false });
				} else {
					// Other graphs (e.g. built-in vocabularies) are viewed through the
					// graph exporter, which serializes the store graph into an editor.
					await vscode.commands.executeCommand('mentor.command.openGraph', message.uri);
				}

				return true;
			}
			case 'OpenPresetShapeGraph': {
				// Templates ship as bundled Turtle sources with no workspace file yet.
				// Open the source in an editor so the user can adapt it and save their
				// own copy into the workspace.
				const source = getPresetShapeSource(message.presetId);

				if (!source) {
					vscode.window.showWarningMessage(`No shape graph is bundled for the template "${message.presetId}".`);

					return true;
				}

				const document = await vscode.workspace.openTextDocument({ content: source, language: 'turtle' });

				await vscode.window.showTextDocument(document);

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
			case 'CreateUserShape': {
				const uri = await createUserShapeFile();

				this._post({ section: SECTION_ID, id: 'CreateUserShapeResult', uri });

				return true;
			}
			case 'CheckOrphanedShapes': {
				await this._promptDeleteOrphanedShapes();

				return true;
			}
			default: {
				return false;
			}
		}
	}

	/**
	 * Offers to delete user shape files that are no longer referenced by any
	 * validation profile, after a profile deletion. The webview posts the check
	 * right after committing the deletion, so this first waits for the settings
	 * write to land (bounded by a timeout) before computing the orphans.
	 */
	private async _promptDeleteOrphanedShapes(): Promise<void> {
		await new Promise<void>(resolve => {
			const timer = setTimeout(() => {
				disposable.dispose();
				resolve();
			}, 1500);

			const disposable = vscode.workspace.onDidChangeConfiguration(e => {
				if (e.affectsConfiguration('mentor.shacl.validation')) {
					clearTimeout(timer);
					disposable.dispose();
					resolve();
				}
			});
		});

		const shapeGraphService = container.resolve<ShapeGraphService>(ServiceToken.ShapeGraphService);
		const orphaned = shapeGraphService.getOrphanedUserShapeFiles();

		if (orphaned.length === 0) {
			return;
		}

		const fileList = orphaned.join(', ');
		const action = await vscode.window.showWarningMessage(
			`The user shape file${orphaned.length === 1 ? '' : 's'} ${fileList} ${orphaned.length === 1 ? 'is' : 'are'} `
			+ 'no longer referenced by any validation profile in this workspace or your user settings. Delete? '
			+ 'Profiles in other workspaces may still reference them.',
			'Delete',
			'Keep'
		);

		if (action === 'Delete') {
			const files = container.resolve<SettingsFileStore>(ServiceToken.UserShapeFileStore);

			for (const fileName of orphaned) {
				await files.delete(fileName);
			}
		}
	}

	/**
	 * Returns every validate-able document location in the workspace: indexed RDF
	 * files plus notebook cells (addressed by their slug). Notebook container files
	 * are excluded — only their cells are validate-able documents — so match-count
	 * previews reflect the units validation actually runs on.
	 */
	private _getMatchCandidates(): { location: ShaclDocumentLocation; uri: vscode.Uri }[] {
		const fileService = container.resolve<IWorkspaceFileService>(ServiceToken.WorkspaceFileService);
		const contextService = container.resolve<IDocumentContextService>(ServiceToken.DocumentContextService);
		const validationService = container.resolve<ShaclValidationService>(ServiceToken.ShaclValidationService);

		// Notebook cells: their context URI is the opaque cell handle, but
		// getDocumentLocation resolves it to the slug-based path#fragment.
		const cells = Object.values(contextService.contexts)
			.filter(ctx => ctx.uri.scheme === 'vscode-notebook-cell')
			.map(ctx => ({ location: validationService.getDocumentLocation(ctx.uri), uri: ctx.uri }));

		// A cell's location.path is its notebook's workspace-relative path; use that
		// to drop the notebook container file from the enumerated files.
		const notebookPaths = new Set(cells.map(c => c.location.path));

		const files = fileService.files
			.map(uri => ({ location: validationService.getDocumentLocation(uri), uri }))
			.filter(f => !notebookPaths.has(f.location.path));

		return [...files, ...cells];
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
				for (const { location, uri } of this._getMatchCandidates()) {
					if (matchesPathKey(trimmed, location, rdfExtensions)) {
						matches.push({ path: toDocumentPatternKey(location), uri });
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
