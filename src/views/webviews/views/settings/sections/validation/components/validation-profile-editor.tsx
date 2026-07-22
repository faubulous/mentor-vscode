import { useMemo } from 'react';
import { ConfigurationScope, scopeToKey } from '@src/utilities/config-scope';
import { useStylesheet } from '@src/views/webviews/hooks';
import { isUserShapeUri, isValidPathKey, isWorkspaceShapeUri, requiresWorkspaceScope } from '@src/services/validation/shacl-validation-configuration';
import { useSettingsItemDraft } from '../../../hooks/use-settings-item-draft';
import { ModalSettingsItemEditor } from '../../../components/modal-settings-item-editor';
import { ValidationProfileView, VALIDATION_STYLESHEET_ID } from '../shared';
import { ValidationShapeGraphList } from './validation-shape-graph-list';
import { ValidationProfilePathsEditor } from './validation-profile-paths-editor';
import stylesheet from '../validation.css';

export interface ValidationProfileEditorProps {
	/**
	 * The profile being edited. For a new profile this is a blank draft not yet persisted.
	 */
	profile: ValidationProfileView;

	/**
	 * Whether this is a brand-new (unsaved) profile — hides the Delete action.
	 */
	isNew: boolean;

	/**
	 * Display names of the other existing profiles, used to hint at duplicate names.
	 */
	existingNames: string[];

	/**
	 * Shape graph URIs available in the store, offered in the Shapes tab.
	 */
	candidates: string[];

	/**
	 * Missing shape graph URIs for this profile.
	 */
	missingShapes: string[];

	/**
	 * Live matched-file counts per (positive) path entry; undefined entries are still loading.
	 */
	entryCounts: Record<string, number | undefined>;

	/**
	 * Requests a live match count for a (positive) path entry.
	 */
	onRequestEntryCount: (pattern: string) => void;

	/**
	 * Opens the interactive pattern editor for a path entry.
	 */
	onEditEntry: (pattern: string, apply: (newPattern: string) => void) => void;

	/**
	 * Opens a shape file in an editor.
	 */
	onOpenShape: (uri: string) => void;

	/**
	 * Creates a new user shape file on the host; `apply` receives the created
	 * `user:///` URI so the editor can assign it to the profile draft.
	 */
	onCreateShape?: (apply: (uri: string) => void) => void;

	/**
	 * Whether a workspace folder is open; disables the Workspace scope when false.
	 */
	hasWorkspace?: boolean;

	onSave: (originalId: string, originalScope: ConfigurationScope, profile: ValidationProfileView) => void;

	onDelete: (profile: ValidationProfileView) => void;

	onDirtyChange: (dirty: boolean) => void;
}

/**
 * Trims path entries and drops blanks left behind while editing.
 */
function cleanPaths(paths: readonly string[]): string[] {
	return paths.map(entry => entry.trim()).filter(entry => entry.length > 0);
}

/**
 * The form rendered inside the validation profile edit modal. Holds a local draft
 * (via {@link useSettingsItemDraft}) and commits it only when Save is clicked. The
 * shared {@link ModalSettingsItemEditor} frame handles the Save/Delete portal;
 * this component supplies the General, Shapes and Paths tabs.
 *
 * Profiles are stored under a stable id minted from the name at first save, so a
 * duplicate display name is only a cosmetic ambiguity — flagged with a
 * non-blocking hint, never a Save blocker. A profile lives in the workspace or
 * the user scope (the title-bar scope picker), and the shape candidates follow
 * that scope: user-scope profiles are available in every workspace and synced
 * via Settings Sync, so they must not reference `workspace:///` shape files —
 * such a draft cannot be saved until the scope or the shapes change. Workspace
 * profiles are shared with the team, so personal `user:///` shapes are not
 * offered; ones already assigned (e.g. after a scope switch) stay visible with
 * a non-blocking hint so they can be unchecked.
 */
export function ValidationProfileEditor({
	profile,
	isNew,
	existingNames,
	candidates,
	missingShapes,
	entryCounts,
	onRequestEntryCount,
	onEditEntry,
	onOpenShape,
	onCreateShape,
	hasWorkspace,
	onSave,
	onDelete,
	onDirtyChange,
}: ValidationProfileEditorProps) {
	useStylesheet(VALIDATION_STYLESHEET_ID, stylesheet);

	const { draft, setDraft, canSave, activeTab, tabsRef } = useSettingsItemDraft(profile, {
		onDirtyChange,
		validate: d => {
			const include = cleanPaths(d.includeFiles);
			const exclude = cleanPaths(d.excludeFiles);
			const all = [...include, ...exclude];

			return d.name.trim().length > 0
				&& all.every(isValidPathKey)
				&& new Set(include).size === include.length
				&& new Set(exclude).size === exclude.length
				&& !(scopeToKey(d.scope) === 'user' && requiresWorkspaceScope(d.shapes));
		},
	});

	const trimmedName = draft.name.trim();
	const nameEmpty = trimmedName.length === 0;
	const nameDuplicate = trimmedName.length > 0 && existingNames.includes(trimmedName);

	const includeFiles = useMemo(() => cleanPaths(draft.includeFiles), [draft.includeFiles]);
	const excludeFiles = useMemo(() => cleanPaths(draft.excludeFiles), [draft.excludeFiles]);
	const hasDuplicatePaths = new Set(includeFiles).size !== includeFiles.length
		|| new Set(excludeFiles).size !== excludeFiles.length;

	const pathCount = includeFiles.length + excludeFiles.length;

	const shapeCount = draft.shapes.length;

	const isUserScope = scopeToKey(draft.scope) === 'user';

	// The candidates follow the draft's scope: a user-scope profile must be
	// portable, so workspace shape files are hidden (and block saving when
	// still assigned, e.g. after a scope switch); a workspace-scope profile is
	// shared with the team, so personal user shapes are hidden. Shapes already
	// assigned to the profile stay visible either way so they can be unchecked.
	const visibleCandidates = useMemo(
		() => isUserScope
			? candidates.filter(uri => !isWorkspaceShapeUri(uri))
			: candidates.filter(uri => !isUserShapeUri(uri)),
		[candidates, isUserScope]
	);

	const workspaceShapeConflict = isUserScope && requiresWorkspaceScope(draft.shapes);
	const hasUserShapes = !isUserScope && draft.shapes.some(isUserShapeUri);

	return (
		<ModalSettingsItemEditor
			className="validation-profile-editor"
			scope={draft.scope}
			onScopeChange={(scope) => setDraft(d => ({ ...d, scope }))}
			showScope={true}
			hasWorkspace={hasWorkspace}
			isNew={isNew}
			canSave={canSave && (hasWorkspace !== false || isUserScope)}
			onSave={() => onSave(profile.id, profile.scope, { ...draft, name: trimmedName, includeFiles, excludeFiles })}
			onDelete={() => onDelete(profile)}
			saveTitle="Save profile"
			deleteTitle="Delete profile"
		>
			<vscode-tabs ref={tabsRef} selectedIndex={activeTab}>
				<vscode-tab-header slot="header">General</vscode-tab-header>
				<vscode-tab-panel>
					<section>
						<div>
							<vscode-label>Name</vscode-label>
							<vscode-textfield
								value={draft.name}
								placeholder="Profile name"
								invalid={nameEmpty}
								onInput={(e: any) => setDraft(d => ({ ...d, name: (e.target as HTMLInputElement).value }))}
							/>
							{nameEmpty ? (
								<p className="section-description validation-error">A name is required.</p>
							) : nameDuplicate && (
								<p className="section-description validation-shape-warning">Another profile already uses this name.</p>
							)}
						</div>
						<div>
							<vscode-label>Description <span className="label-optional">(optional)</span></vscode-label>
							<vscode-textarea
								className="validation-description-input"
								value={draft.description}
								rows={3}
								placeholder="Describe what this profile validates…"
								onInput={(e: any) => setDraft(d => ({ ...d, description: (e.target as HTMLTextAreaElement).value }))}
							/>
						</div>
						<div>
							<vscode-label>Options</vscode-label>
							<div className="validation-auto-options">
								<vscode-checkbox
									checked={draft.validateOnStartup}
									onChange={(e: any) => setDraft(d => ({ ...d, validateOnStartup: (e.target as HTMLInputElement).checked }))}
								>
									Auto validate on startup
								</vscode-checkbox>
								<vscode-checkbox
									checked={draft.validateOnChange}
									onChange={(e: any) => setDraft(d => ({ ...d, validateOnChange: (e.target as HTMLInputElement).checked }))}
								>
									Auto validate on document change
								</vscode-checkbox>
							</div>
						</div>
					</section>
				</vscode-tab-panel>

				<vscode-tab-header slot="header">
					Shapes <vscode-badge slot="content-after" variant="tab-header-counter">{shapeCount}</vscode-badge>
				</vscode-tab-header>

				<vscode-tab-panel>
					<section>
						<ValidationShapeGraphList
							key={profile.id}
							selected={draft.shapes}
							candidates={visibleCandidates}
							missingShapes={missingShapes}
							onChange={(shapes) => setDraft(d => ({ ...d, shapes }))}
							onOpen={onOpenShape}
							onCreateShape={onCreateShape && isUserScope
								? () => onCreateShape((uri) => setDraft(d => d.shapes.includes(uri) ? d : { ...d, shapes: [...d.shapes, uri] }))
								: undefined}
						/>
						{workspaceShapeConflict && (
							<p className="section-description validation-error">
								This profile references workspace shape files and must be saved in the workspace scope.
							</p>
						)}
						{hasUserShapes && (
							<p className="section-description">
								User shapes (user:///…) are stored in your user settings and are not shared with your team —
								teammates will see this profile as missing its shapes.
							</p>
						)}
					</section>
				</vscode-tab-panel>

				<vscode-tab-header slot="header">
					Files <vscode-badge slot="content-after" variant="tab-header-counter">{pathCount}</vscode-badge>
				</vscode-tab-header>

				<vscode-tab-panel>
					<section>
						<ValidationProfilePathsEditor
							includeFiles={draft.includeFiles}
							excludeFiles={draft.excludeFiles}
							onIncludeChange={(next) => setDraft(d => ({ ...d, includeFiles: next }))}
							onExcludeChange={(next) => setDraft(d => ({ ...d, excludeFiles: next }))}
							entryCounts={entryCounts}
							onRequestEntryCount={onRequestEntryCount}
							onEditEntry={onEditEntry}
						/>
						{hasDuplicatePaths && (
							<p className="section-description validation-shape-warning">The lists contain duplicate entries.</p>
						)}
					</section>
				</vscode-tab-panel>
			</vscode-tabs>
		</ModalSettingsItemEditor>
	);
}
