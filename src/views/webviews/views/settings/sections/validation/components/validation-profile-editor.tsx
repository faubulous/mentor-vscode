import { useMemo } from 'react';
import { ConfigurationScope } from '@src/utilities/config-scope';
import { useStylesheet } from '@src/views/webviews/hooks';
import { isValidPathKey } from '@src/services/validation/shacl-validation-configuration';
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
	 * Renders the editor as a read-only viewer (built-in presets).
	 */
	readOnly?: boolean;

	/**
	 * Shown as a Customize action in the read-only viewer: creates an
	 * independent, editable copy of the built-in preset.
	 */
	onCustomize?: () => void;

	/**
	 * Blocks Save while the draft name matches an existing profile name.
	 * Used by the customize flow so a preset copy must get its own name.
	 */
	requireUniqueName?: boolean;

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
 * non-blocking hint, never a Save blocker. Profiles are self-contained, so they
 * can live in either the user or the workspace scope.
 */
export function ValidationProfileEditor({
	profile,
	isNew,
	readOnly,
	onCustomize,
	requireUniqueName,
	existingNames,
	candidates,
	missingShapes,
	entryCounts,
	onRequestEntryCount,
	onEditEntry,
	onOpenShape,
	hasWorkspace,
	onSave,
	onDelete,
	onDirtyChange,
}: ValidationProfileEditorProps) {
	useStylesheet(VALIDATION_STYLESHEET_ID, stylesheet);

	const { draft, setDraft, canSave, activeTab, tabsRef } = useSettingsItemDraft(profile, {
		onDirtyChange,
		validate: d => {
			const paths = cleanPaths(d.paths);

			return d.name.trim().length > 0
				&& (!requireUniqueName || !existingNames.includes(d.name.trim()))
				&& paths.every(isValidPathKey)
				&& new Set(paths).size === paths.length;
		},
	});

	const trimmedName = draft.name.trim();
	const nameDuplicate = trimmedName.length > 0 && existingNames.includes(trimmedName);

	const paths = useMemo(() => cleanPaths(draft.paths), [draft.paths]);
	const hasDuplicatePaths = new Set(paths).size !== paths.length;

	const shapeCount = draft.shapes.length;

	return (
		<ModalSettingsItemEditor
			className="validation-profile-editor"
			scope={draft.scope}
			onScopeChange={scope => setDraft(d => ({ ...d, scope }))}
			hasWorkspace={hasWorkspace}
			isNew={isNew}
			readOnly={readOnly}
			readOnlyLabel="Built-in preset — not editable"
			readOnlyActions={onCustomize && (
				<vscode-button title="Create an editable copy of this preset" onClick={onCustomize}>
					Customize
				</vscode-button>
			)}
			canSave={canSave}
			onSave={() => onSave(profile.id, profile.scope, { ...draft, name: trimmedName, paths })}
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
								disabled={readOnly}
								onInput={(e: any) => setDraft(d => ({ ...d, name: (e.target as HTMLInputElement).value }))}
							/>
							{nameDuplicate && (
								<p className="section-description validation-shape-warning">
									{requireUniqueName
										? 'Another profile already uses this name — the copy needs a name of its own.'
										: 'Another profile already uses this name.'}
								</p>
							)}
						</div>
						<div>
							<vscode-label>Description <span className="label-optional">(optional)</span></vscode-label>
							<vscode-textarea
								className="validation-description-input"
								value={draft.description}
								rows={3}
								placeholder="Describe what this profile validates…"
								disabled={readOnly}
								onInput={(e: any) => setDraft(d => ({ ...d, description: (e.target as HTMLTextAreaElement).value }))}
							/>
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
							candidates={candidates}
							missingShapes={missingShapes}
							readOnly={readOnly}
							onChange={(shapes) => setDraft(d => ({ ...d, shapes }))}
							onOpen={onOpenShape}
						/>
					</section>
				</vscode-tab-panel>

				<vscode-tab-header slot="header">
					Files <vscode-badge slot="content-after" variant="tab-header-counter">{paths.length}</vscode-badge>
				</vscode-tab-header>

				<vscode-tab-panel>
					<section>
						<ValidationProfilePathsEditor
							paths={draft.paths}
							readOnly={readOnly}
							onChange={(next) => setDraft(d => ({ ...d, paths: next }))}
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
