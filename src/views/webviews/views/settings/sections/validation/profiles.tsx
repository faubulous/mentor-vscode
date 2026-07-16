import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { SectionHeader } from '@src/views/webviews/components/section-header';
import { ModalDialog } from '@src/views/webviews/components/modal-dialog';
import { useStylesheet, useScopedWebviewMessaging } from '@src/views/webviews/hooks';
import { ConfigurationScope, scopeToKey } from '@src/utilities/config-scope';
import {
	type ShaclBrokenReferences,
	type ShaclValidationSettings,
} from '@src/services/validation/shacl-validation-configuration';
import { SettingsSectionProps } from '../../settings-section-props';
import { SettingsWorkspaceContext } from '../../components/setting-context';
import { MENTOR_SETTINGS_SOURCE } from '../../settings-types';
import { useScopedSettingValue } from '../../hooks/use-scoped-setting-value';
import type { SettingsSectionDescriptor } from '../../settings-section-descriptor';
import { ValidationProfilesList } from './components/validation-profiles-list';
import { ValidationProfileEditor } from './components/validation-profile-editor';
import { ValidationProfilesMessages } from './profiles-messages';
import { applyProfileSave, isEmptySettings, ProfileEditorMode, readSettings, templateToDraft, templateToLinkedDraft, toProfileViews, ValidationProfileView, VALIDATION_STYLESHEET_ID } from './shared';
import { VALIDATION_TEMPLATES, type ValidationTemplate } from '@src/services/validation/template-definitions';
import stylesheet from './validation.css';

export const validationProfilesSection = {
	id: 'validation.profiles',
	label: 'Profiles',
	component: ValidationProfilesSection,
	defaultScope: 'workspace',
	keys: [
		'shacl.validation',
	],
} as const satisfies SettingsSectionDescriptor;

const VALIDATION_KEY = 'shacl.validation';

/**
 * The preview-map key used for a single path entry's live match count.
 */
const entryPreviewKey = (pattern: string) => `entry:${pattern}`;

/**
 * The preview-map key used for a profile's include-only match count (before
 * exclusions), from which the excluded-file count is derived.
 */
const positivePreviewKey = (profileId: string) => `positive:${profileId}`;

export function ValidationProfilesSection({ settings, setScope }: SettingsSectionProps) {
	useStylesheet(VALIDATION_STYLESHEET_ID, stylesheet);

	const hasWorkspace = useContext(SettingsWorkspaceContext);

	// Profiles are self-contained (they own their paths), so they can live in
	// either the user or the workspace scope; the shared hook owns the
	// read/diff/write mechanics (clearing a scope that ends up empty).
	const { userValue, workspaceValue, userRef, workspaceRef, commit } = useScopedSettingValue<ShaclValidationSettings>({
		source: MENTOR_SETTINGS_SOURCE,
		key: VALIDATION_KEY,
		settings,
		setScope,
		read: readSettings,
		isEmpty: isEmptySettings,
	});

	const profiles = useMemo(() => {
		// Profiles live in the user and workspace scopes; a same-id workspace
		// entry shadows the user one, matching the runtime merge in
		// getValidationSettings (workspace > user).
		const user = toProfileViews(userValue, ConfigurationScope.User);
		const workspace = toProfileViews(workspaceValue, ConfigurationScope.Workspace);

		const workspaceIds = new Set(workspace.map(p => p.id));

		return [
			...user.filter(p => !workspaceIds.has(p.id)),
			...workspace,
		];
	}, [userValue, workspaceValue]);

	const [candidates, setCandidates] = useState<string[]>([]);
	const [broken, setBroken] = useState<ShaclBrokenReferences>({ profiles: {} });
	const [matchPreviews, setMatchPreviews] = useState<Record<string, { count: number; sample: string[] }>>({});
	const [editing, setEditing] = useState<ValidationProfileView | undefined>(undefined);
	const [editorMode, setEditorMode] = useState<ProfileEditorMode>('edit');
	const [editorDirty, setEditorDirty] = useState(false);

	// The pending apply-callback of the interactive pattern editor; only one
	// host quick pick can be open at a time.
	const patternEditRef = useRef<((pattern: string) => void) | undefined>(undefined);

	// The template awaiting a shapes-copy result from the host, keyed by template
	// id, so the editor can be opened once the workspace copies are written.
	const pendingTemplateRef = useRef<Record<string, { template: ValidationTemplate; scope: ConfigurationScope }>>({});

	const handleMessage = useCallback((message: ValidationProfilesMessages) => {
		switch (message.id) {
			case 'GetShapeCandidatesResult':
				setCandidates(message.candidates);
				return;
			case 'GetValidationHealthResult':
				setBroken(message.broken);
				return;
			case 'GetProfileMatchPreviewResult':
				setMatchPreviews(prev => ({
					...prev,
					[message.key]: { count: message.count, sample: message.sample },
				}));
				return;
			case 'EditPathPatternResult': {
				const apply = patternEditRef.current;

				patternEditRef.current = undefined;

				if (message.pattern !== undefined) {
					apply?.(message.pattern);
				}

				return;
			}
			case 'MaterializeTemplateShapesResult': {
				const pending = pendingTemplateRef.current[message.templateId];

				delete pendingTemplateRef.current[message.templateId];

				// On failure the host has already surfaced an error; leave the editor closed.
				if (pending && message.uri) {
					setEditorMode('create');
					setEditing(templateToDraft(pending.template, pending.scope, [message.uri]));
				}

				return;
			}
			case 'ValidationProfileDeleted': {
				// The host confirmed the deletion — remove the profile from its scope.
				// Nothing references profiles, so no other entry needs rewriting.
				const { profileId, scope } = message;

				const userProfiles = { ...(userRef.current.profiles ?? {}) };
				const workspaceProfiles = { ...(workspaceRef.current.profiles ?? {}) };

				if (scope === 'user') {
					delete userProfiles[profileId];
				} else {
					delete workspaceProfiles[profileId];
				}

				commit(
					Object.keys(userProfiles).length > 0 ? { ...userRef.current, profiles: userProfiles } : {},
					Object.keys(workspaceProfiles).length > 0 ? { ...workspaceRef.current, profiles: workspaceProfiles } : {}
				);

				setEditing(prev => (prev?.id === profileId && scopeToKey(prev.scope) === scope) ? undefined : prev);
				setEditorDirty(false);
				return;
			}
		}
	}, []);

	const messaging = useScopedWebviewMessaging<ValidationProfilesMessages>('validation.profiles', handleMessage);

	useEffect(() => {
		messaging?.postMessage({ id: 'GetShapeCandidates' });
		messaging?.postMessage({ id: 'GetValidationHealth' });
	}, []);

	// Refresh the health report whenever the settings value changes.
	useEffect(() => {
		messaging?.postMessage({ id: 'GetValidationHealth' });
	}, [settings[VALIDATION_KEY]?.userValue, settings[VALIDATION_KEY]?.workspaceValue]);

	// Keep the per-row matching-file counts current. Profiles with exclusions
	// additionally get a positives-only count, whose difference to the target
	// count is the number of excluded files.
	useEffect(() => {
		for (const profile of profiles) {
			if (profile.includeFiles.length > 0) {
				messaging?.postMessage({
					id: 'GetProfileMatchPreview',
					key: profile.id,
					includeFiles: profile.includeFiles,
					excludeFiles: profile.excludeFiles,
				});

				if (profile.excludeFiles.length > 0) {
					messaging?.postMessage({
						id: 'GetProfileMatchPreview',
						key: positivePreviewKey(profile.id),
						includeFiles: profile.includeFiles,
						excludeFiles: [],
					});
				}
			}
		}
	}, [profiles]);

	const matchCounts = useMemo(() => {
		const counts: Record<string, number | undefined> = {};

		for (const profile of profiles) {
			counts[profile.id] = profile.includeFiles.length > 0 ? matchPreviews[profile.id]?.count : 0;
		}

		return counts;
	}, [profiles, matchPreviews]);

	const excludedCounts = useMemo(() => {
		const counts: Record<string, number | undefined> = {};

		for (const profile of profiles) {
			if (profile.excludeFiles.length === 0) {
				continue;
			}

			const target = matchPreviews[profile.id]?.count;
			const positive = matchPreviews[positivePreviewKey(profile.id)]?.count;

			if (target !== undefined && positive !== undefined) {
				counts[profile.id] = Math.max(0, positive - target);
			}
		}

		return counts;
	}, [profiles, matchPreviews]);

	// Per-entry counts shown inside the editor's path rows.
	const entryCounts = useMemo(() => {
		const counts: Record<string, number | undefined> = {};

		for (const [key, preview] of Object.entries(matchPreviews)) {
			if (key.startsWith('entry:')) {
				counts[key.slice('entry:'.length)] = preview.count;
			}
		}

		return counts;
	}, [matchPreviews]);

	const closeEditor = () => {
		setEditorDirty(false);
		setEditing(undefined);
	};

	const handleCreate = (scope: ConfigurationScope) => {
		setEditorMode('create');
		setEditing({
			id: '',
			name: '',
			shapes: [],
			includeFiles: [],
			excludeFiles: [],
			description: '',
			scope,
		});
	};

	const handleEdit = (profile: ValidationProfileView) => {
		setEditorMode('edit');
		// Seed the editable name with the id fallback so profiles stored without a
		// name field show their effective name; saving persists it explicitly.
		setEditing({ ...profile, name: profile.name.trim() || profile.id });
	};

	// Creates a profile from a built-in template. By default the template's shapes
	// are copied into the workspace (frozen, version-controlled) and the New Profile
	// dialog opens once the host has written them; without a workspace to copy into,
	// falls back to linking the built-in graph.
	const handleUseTemplate = (template: ValidationTemplate) => {
		if (hasWorkspace) {
			pendingTemplateRef.current[template.id] = { template, scope: ConfigurationScope.Workspace };
			messaging?.postMessage({ id: 'MaterializeTemplateShapes', templateId: template.id });
		} else {
			handleLinkTemplate(template);
		}
	};

	// Creates a profile that links the built-in (in-memory) shape graph, which stays
	// in sync with Mentor updates; the version is recorded so later changes surface.
	const handleLinkTemplate = (template: ValidationTemplate) => {
		setEditorMode('create');
		setEditing(templateToLinkedDraft(template, hasWorkspace ? ConfigurationScope.Workspace : ConfigurationScope.User));
	};

	const handleSave = (originalId: string, originalScope: ConfigurationScope, next: ValidationProfileView) => {
		const result = applyProfileSave({
			mode: editorMode,
			originalId,
			originalScope,
			next,
			userProfiles: userRef.current.profiles ?? {},
			workspaceProfiles: workspaceRef.current.profiles ?? {},
		});

		commit(
			Object.keys(result.user).length > 0 ? { ...userRef.current, profiles: result.user } : {},
			Object.keys(result.workspace).length > 0 ? { ...workspaceRef.current, profiles: result.workspace } : {}
		);

		closeEditor();
	};

	const handleValidate = (profile: ValidationProfileView) => {
		messaging?.postMessage({ id: 'ValidateProfile', profileId: profile.id });
	};

	const handleDelete = (profile: ValidationProfileView) => {
		messaging?.postMessage({
			id: 'DeleteValidationProfile',
			profileId: profile.id,
			name: profile.name.trim() || profile.id,
			scope: scopeToKey(profile.scope),
		});
	};

	const handleEditEntry = (pattern: string, apply: (newPattern: string) => void) => {
		patternEditRef.current = apply;
		messaging?.postMessage({ id: 'EditPathPattern', pattern });
	};

	// The names shown in the duplicate-name hint: everything except the profile
	// being edited. A create draft is not persisted yet, so every existing name counts.
	const otherNames = editing
		? profiles
			.filter(p => editorMode === 'create' || p.id !== editing.id || p.scope !== editing.scope)
			.map(p => p.name.trim() || p.id)
		: [];

	return (
		<div>
			<SectionHeader
				title={validationProfilesSection.label}
				variant="title"
				description={'Named sets of SHACL shape files, each applied to the workspace paths it defines. '
					+ 'The shapes of all profiles matching a document are combined. '
					+ 'Without a profile, no documents are validated.'}
			/>

			<ValidationProfilesList
				profiles={profiles}
				templates={VALIDATION_TEMPLATES}
				brokenProfiles={broken.profiles}
				matchCounts={matchCounts}
				excludedCounts={excludedCounts}
				hasWorkspace={hasWorkspace}
				onCreate={handleCreate}
				onEdit={handleEdit}
				onUseTemplate={handleUseTemplate}
				onLinkTemplate={handleLinkTemplate}
				onValidate={settings['shacl.enabled']?.value === true ? handleValidate : undefined}
				onDelete={handleDelete}
			/>

			<ModalDialog
				open={!!editing}
				title={editorMode === 'create' ? 'New Profile' : 'Edit Profile'}
				onClose={closeEditor}
				requireCloseConfirmation={editorDirty}
				closeConfirmationMessage="You have unsaved changes. Discard them?"
				closeConfirmLabel="Discard"
				hideCloseButton
			>
				{editing && (
					<ValidationProfileEditor
						profile={editing}
						isNew={editorMode === 'create'}
						existingNames={otherNames}
						candidates={candidates}
						missingShapes={broken.profiles[editing.id] ?? []}
						entryCounts={entryCounts}
						onRequestEntryCount={(pattern) => messaging?.postMessage({
							id: 'GetProfileMatchPreview',
							key: entryPreviewKey(pattern),
							includeFiles: [pattern],
							excludeFiles: [],
						})}
						onEditEntry={handleEditEntry}
						onOpenShape={(uri) => messaging?.postMessage({ id: 'OpenShapeGraph', uri })}
						hasWorkspace={hasWorkspace}
						onSave={handleSave}
						onDelete={handleDelete}
						onDirtyChange={setEditorDirty}
					/>
				)}
			</ModalDialog>
		</div>
	);
}
