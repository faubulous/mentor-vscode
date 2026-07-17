import { ConfigurationScope } from '@src/utilities/config-scope';
import { ValidationPreset } from '@src/services/validation/preset-definitions';
import { SectionHeader } from '@src/views/webviews/components/section-header';
import { SettingsList, SettingsListSection } from '../../../components/settings-list';
import { SettingsListItem } from '../../../components/settings-list-item';
import { ValidationProfileView } from '../shared';
import { ValidationProfileListItem } from './validation-profile-list-item';

export interface ValidationProfilesListProps {
	profiles: ValidationProfileView[];

	/**
	 * Built-in presets offered as one-click starting points.
	 */
	presets: ValidationPreset[];

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

	hasWorkspace: boolean;

	onCreate: (scope: ConfigurationScope) => void;

	onEdit: (profile: ValidationProfileView) => void;

	/**
	 * Creates a profile from a built-in preset, copying its shapes into the
	 * workspace. Opens the New Profile dialog once the copy is written.
	 */
	onUsePreset: (preset: ValidationPreset) => void;

	/**
	 * Runs SHACL validation for the profile's matched files. Omitted (and the
	 * validate button hidden) when SHACL validation is disabled.
	 */
	onValidate?: (profile: ValidationProfileView) => void;

	onDelete: (profile: ValidationProfileView) => void;
}

/**
 * Stable per-row id — an id may appear in both the user and workspace scopes.
 */
const profileKey = (profile: ValidationProfileView) => `${profile.scope}:${profile.id}`;

/**
 * Lists the defined SHACL validation profiles, grouped by where they are stored
 * (workspace and user settings), preceded by the built-in presets. A profile
 * is self-contained: it bundles shape files with the paths they apply to. All
 * edits happen in the modal opened from a row; clicking a preset opens the
 * New Profile dialog pre-filled from it.
 */
export function ValidationProfilesList({ profiles, presets, brokenProfiles, matchCounts, excludedCounts, hasWorkspace, onCreate, onEdit, onUsePreset, onValidate, onDelete }: ValidationProfilesListProps) {
	const workspaceProfiles = profiles.filter(p => p.scope === ConfigurationScope.Workspace);
	const userProfiles = profiles.filter(p => p.scope !== ConfigurationScope.Workspace);

	const addAction = (scope: ConfigurationScope) => (
		<vscode-toolbar-button className="primary" title="Add a new profile" onClick={() => onCreate(scope)}>
			<span className="codicon codicon-add" />
			<span className="label">Add Profile</span>
		</vscode-toolbar-button>
	);

	const sections: SettingsListSection<ValidationProfileView>[] = [
		...(hasWorkspace ? [{
			title: 'Workspace',
			description: 'Profiles kept in the workspace settings (.vscode/settings.json), which can be shared via version control.',
			action: addAction(ConfigurationScope.Workspace),
			items: workspaceProfiles,
			emptyMessage: 'No workspace profiles yet.',
		}] : []),
		{
			title: 'User',
			description: 'Profiles kept in your user settings, available in all your workspaces on this machine.',
			action: addAction(ConfigurationScope.User),
			items: userProfiles,
			emptyMessage: 'No user profiles yet.',
		},
	];

	return (
		<div className="settings-list-container">
			{presets.length > 0 && (
				<section className="settings-list-section">
					<SectionHeader title="Presets" description="Built-in starting points that ship with Mentor. Use one to create a new profile you can edit." />
					<div className="settings-list">
						{presets.map(preset => (
							<SettingsListItem
								key={preset.id}
								icon={<vscode-icon name="checklist" className="settings-item-icon" />}
								name={preset.name}
								tooltip={hasWorkspace
									? `Create a profile from ${preset.name} (copies the shapes into the workspace)`
									: `Open a workspace folder to create a profile from ${preset.name} (the shapes are copied into the workspace)`}
								subline={(
									<div className="settings-item-meta">
										<span className="validation-profile-description">{preset.description}</span>
									</div>
								)}
								onClick={() => onUsePreset(preset)}
							/>
						))}
					</div>
				</section>
			)}

			<SettingsList<ValidationProfileView>
				sections={sections}
				getItemId={profileKey}
				renderItem={(profile, navProps) => (
					<ValidationProfileListItem
						profile={profile}
						missingShapes={brokenProfiles[profile.id]}
						matchCount={matchCounts[profile.id]}
						excludedCount={excludedCounts[profile.id]}
						navProps={navProps}
						onEdit={onEdit}
						onValidate={onValidate}
						onDelete={onDelete}
					/>
				)}
				onActivate={onEdit}
			/>
		</div>
	);
}
