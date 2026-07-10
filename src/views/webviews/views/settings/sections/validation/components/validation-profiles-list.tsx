import { SettingsList } from '../../../components/settings-list';
import { ValidationProfileView } from '../shared';
import { ValidationProfileListItem } from './validation-profile-list-item';

export interface ValidationProfilesListProps {
	profiles: ValidationProfileView[];

	/**
	 * Missing shape file URIs per profile id.
	 */
	brokenProfiles: Record<string, string[]>;

	/**
	 * Live matching-file counts per profile id; undefined entries are still loading.
	 */
	matchCounts: Record<string, number | undefined>;

	/**
	 * Live excluded-file counts per profile id; undefined entries are loading or have no exclusions.
	 */
	excludedCounts: Record<string, number | undefined>;

	onCreate: () => void;

	onEdit: (profile: ValidationProfileView) => void;

	onDelete: (profile: ValidationProfileView) => void;
}

/**
 * Stable per-row id — an id may appear in both the user and workspace scopes.
 */
const profileKey = (profile: ValidationProfileView) => `${profile.scope}:${profile.id}`;

/**
 * Lists the defined SHACL validation profiles via the shared {@link SettingsList}.
 * A profile is self-contained: it bundles shape files with the paths they apply
 * to. All edits happen in the modal opened from a row.
 */
export function ValidationProfilesList({ profiles, brokenProfiles, matchCounts, excludedCounts, onCreate, onEdit, onDelete }: ValidationProfilesListProps) {
	return (
		<SettingsList<ValidationProfileView>
			sections={[
				{
					title: 'Profiles',
					description: 'Named sets of SHACL shape files, each applied to the workspace paths it defines. '
						+ 'The shapes of all profiles matching a document are combined.',
					action: (
						<vscode-toolbar-button className="primary" title="Add a new profile" onClick={onCreate}>
							<span className="codicon codicon-add" />
							<span className="label">Add Profile</span>
						</vscode-toolbar-button>
					),
					items: profiles,
					emptyMessage: 'No profiles yet. Without one, no documents are validated.',
				},
			]}
			getItemId={profileKey}
			renderItem={(profile, navProps) => (
				<ValidationProfileListItem
					profile={profile}
					missingShapes={brokenProfiles[profile.id]}
					matchCount={matchCounts[profile.id]}
					excludedCount={excludedCounts[profile.id]}
					navProps={navProps}
					onEdit={onEdit}
					onDelete={onDelete}
				/>
			)}
			onActivate={onEdit}
		/>
	);
}
