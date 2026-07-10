import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { SectionHeader } from '@src/views/webviews/components/section-header';
import { ModalDialog } from '@src/views/webviews/components/modal-dialog';
import { useStylesheet, useScopedWebviewMessaging } from '@src/views/webviews/hooks';
import { ConfigurationScope, scopeToKey } from '@src/utilities/config-scope';
import {
	generateProfileId,
	isExclusionEntry,
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
import { isEmptySettings, readSettings, toProfileViews, ValidationProfileView, VALIDATION_STYLESHEET_ID } from './shared';
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
 * The preview-map key used for a profile's positive-entries-only match count.
 */
const positivePreviewKey = (profileId: string) => `positive:${profileId}`;

/**
 * The positive (non-`!`) entries of a profile's paths list.
 */
const positiveEntries = (paths: readonly string[]) =>
	paths.filter(entry => !isExclusionEntry(entry));

/**
 * Whether a profile's paths list contains `!` exclusions.
 */
const hasExclusions = (paths: readonly string[]) =>
	paths.some(isExclusionEntry);

/**
 * Serializes a profile view into the stored profile value (omitting empty fields).
 */
function toProfileValue(profile: ValidationProfileView) {
	const name = profile.name.trim();
	const description = profile.description.trim();

	return {
		...(name ? { name } : {}),
		...(profile.shapes.length > 0 ? { shapes: profile.shapes } : {}),
		...(profile.paths.length > 0 ? { paths: profile.paths } : {}),
		...(description ? { description } : {}),
	};
}

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
		// Built-in presets ship as the package.json default of the settings key
		// and are rendered protected. On an id collision the higher-precedence
		// definition wins the row, matching the runtime merge in
		// getValidationSettings (workspace > user > built-in default).
		const defaults = toProfileViews(readSettings(settings[VALIDATION_KEY]?.defaultValue), ConfigurationScope.User, true);
		const user = toProfileViews(userValue, ConfigurationScope.User);
		const workspace = toProfileViews(workspaceValue, ConfigurationScope.Workspace);

		const workspaceIds = new Set(workspace.map(p => p.id));
		const editableIds = new Set([...user, ...workspace].map(p => p.id));

		return [
			...defaults.filter(p => !editableIds.has(p.id)),
			...user.filter(p => !workspaceIds.has(p.id)),
			...workspace,
		];
	}, [settings[VALIDATION_KEY]?.defaultValue, userValue, workspaceValue]);

	const [candidates, setCandidates] = useState<string[]>([]);
	const [broken, setBroken] = useState<ShaclBrokenReferences>({ profiles: {} });
	const [matchPreviews, setMatchPreviews] = useState<Record<string, { count: number; sample: string[] }>>({});
	const [editing, setEditing] = useState<ValidationProfileView | undefined>(undefined);
	const [isNew, setIsNew] = useState(false);
	const [editorDirty, setEditorDirty] = useState(false);

	// The pending apply-callback of the interactive pattern editor; only one
	// host quick pick can be open at a time.
	const patternEditRef = useRef<((pattern: string) => void) | undefined>(undefined);

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
			if (profile.paths.length > 0) {
				messaging?.postMessage({ id: 'GetProfileMatchPreview', key: profile.id, paths: profile.paths });

				if (hasExclusions(profile.paths)) {
					messaging?.postMessage({
						id: 'GetProfileMatchPreview',
						key: positivePreviewKey(profile.id),
						paths: positiveEntries(profile.paths),
					});
				}
			}
		}
	}, [profiles]);

	const matchCounts = useMemo(() => {
		const counts: Record<string, number | undefined> = {};

		for (const profile of profiles) {
			counts[profile.id] = profile.paths.length > 0 ? matchPreviews[profile.id]?.count : 0;
		}

		return counts;
	}, [profiles, matchPreviews]);

	const excludedCounts = useMemo(() => {
		const counts: Record<string, number | undefined> = {};

		for (const profile of profiles) {
			if (!hasExclusions(profile.paths)) {
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

	const handleCreate = () => {
		setIsNew(true);
		setEditing({
			id: '',
			name: '',
			shapes: [],
			paths: [],
			description: '',
			scope: hasWorkspace ? ConfigurationScope.Workspace : ConfigurationScope.User,
		});
	};

	const handleEdit = (profile: ValidationProfileView) => {
		setIsNew(false);
		// Seed the editable name with the id fallback so profiles stored without a
		// name field show their effective name; saving persists it explicitly.
		setEditing({ ...profile, name: profile.name.trim() || profile.id });
	};

	const handleSave = (originalId: string, originalScope: ConfigurationScope, next: ValidationProfileView) => {
		if (next.isProtected) {
			return;
		}

		const userProfiles = { ...(userRef.current.profiles ?? {}) };
		const workspaceProfiles = { ...(workspaceRef.current.profiles ?? {}) };

		// The id is minted once at first save and frozen afterwards — renames only
		// change the name field. Ids are disambiguated across all scopes including
		// the built-in presets, since the runtime resolves against the merged record.
		const defaultIds = Object.keys(readSettings(settings[VALIDATION_KEY]?.defaultValue).profiles ?? {});
		const id = isNew
			? generateProfileId(next.name, [...defaultIds, ...Object.keys(userProfiles), ...Object.keys(workspaceProfiles)])
			: originalId;

		// Remove the profile from its original scope (may differ from the target on a move).
		if (!isNew) {
			if (scopeToKey(originalScope) === 'user') {
				delete userProfiles[originalId];
			} else {
				delete workspaceProfiles[originalId];
			}
		}

		const value = toProfileValue(next);

		if (scopeToKey(next.scope) === 'user') {
			userProfiles[id] = value;
		} else {
			workspaceProfiles[id] = value;
		}

		commit(
			Object.keys(userProfiles).length > 0 ? { ...userRef.current, profiles: userProfiles } : {},
			Object.keys(workspaceProfiles).length > 0 ? { ...workspaceRef.current, profiles: workspaceProfiles } : {}
		);

		closeEditor();
	};

	const handleDelete = (profile: ValidationProfileView) => {
		if (profile.isProtected) {
			return;
		}

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

	const otherNames = editing
		? profiles
			.filter(p => isNew || p.id !== editing.id || p.scope !== editing.scope)
			.map(p => p.name.trim() || p.id)
		: [];

	return (
		<div>
			<SectionHeader title={validationProfilesSection.label} variant="title" />

			<ValidationProfilesList
				profiles={profiles}
				brokenProfiles={broken.profiles}
				matchCounts={matchCounts}
				excludedCounts={excludedCounts}
				onCreate={handleCreate}
				onEdit={handleEdit}
				onDelete={handleDelete}
			/>

			<ModalDialog
				open={!!editing}
				title={isNew ? 'New Profile' : editing?.isProtected ? 'View Profile' : 'Edit Profile'}
				onClose={closeEditor}
				requireCloseConfirmation={editorDirty}
				closeConfirmationMessage="You have unsaved changes. Discard them?"
				closeConfirmLabel="Discard"
				hideCloseButton
			>
				{editing && (
					<ValidationProfileEditor
						profile={editing}
						isNew={isNew}
						readOnly={!!editing.isProtected}
						existingNames={otherNames}
						candidates={candidates}
						missingShapes={broken.profiles[editing.id] ?? []}
						entryCounts={entryCounts}
						onRequestEntryCount={(pattern) => messaging?.postMessage({
							id: 'GetProfileMatchPreview',
							key: entryPreviewKey(pattern),
							paths: [pattern],
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
