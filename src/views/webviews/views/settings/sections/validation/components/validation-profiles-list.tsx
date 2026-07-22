import * as React from 'react';
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
	 * Built-in templates offered as one-click starting points.
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

	/**
	 * Opens the New Profile dialog with the given scope preselected — the group
	 * whose add button was clicked determines the default scope.
	 */
	onCreate: (scope: ConfigurationScope) => void;

	onEdit: (profile: ValidationProfileView) => void;

	/**
	 * Creates a profile from a built-in template, copying its shapes into the
	 * workspace. Opens the New Profile dialog once the copy is written.
	 */
	onUsePreset: (preset: ValidationPreset) => void;

	/**
	 * Opens a template's shape graph in an editor so it can be adapted and saved
	 * into the workspace.
	 */
	onEditPreset: (preset: ValidationPreset) => void;

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
export function ValidationProfilesList({ profiles, presets, brokenProfiles, matchCounts, excludedCounts, hasWorkspace, onCreate, onEdit, onUsePreset, onEditPreset, onValidate, onDelete }: ValidationProfilesListProps) {
	const workspaceProfiles = profiles.filter(p => p.scope === ConfigurationScope.Workspace);
	const userProfiles = profiles.filter(p => p.scope !== ConfigurationScope.Workspace);

	const addAction = (scope: ConfigurationScope) => (
		<vscode-toolbar-button className="primary" title="Add a new profile" onClick={() => onCreate(scope)}>
			<span className="codicon codicon-add" />
			<span className="label">Add Profile</span>
		</vscode-toolbar-button>
	);

	// Profiles are grouped by the scope they are stored in, like the stores
	// section. Workspace profiles are shared via version control; user profiles
	// are available in every workspace and synced via Settings Sync, referencing
	// only portable shapes (built-in graphs and user shape files).
	const sections: SettingsListSection<ValidationProfileView>[] = [
		...(hasWorkspace ? [{
			title: 'Workspace',
			description: 'Profiles are kept in the workspace settings (.vscode/settings.json), which can be shared via version control.',
			action: addAction(ConfigurationScope.Workspace),
			items: workspaceProfiles,
			emptyMessage: 'No profiles yet.',
		}] : []),
		{
			title: 'User',
			description: 'Profiles kept in your user settings — available in every workspace and synced via Settings Sync. '
				+ 'They can reference built-in and user shapes, but not workspace files.',
			action: addAction(ConfigurationScope.User),
			items: userProfiles,
			emptyMessage: 'No profiles yet.',
		},
	];

	return (
		<div className="settings-list-container">
			{presets.length > 0 && (
				<section className="settings-list-section">
					<SectionHeader title="Templates" description="Built-in SHACL shape graphs that ship with Mentor. Use one to create a profile, or edit a template's shapes and store your adapted copy in the workspace." />
					<div className="settings-list">
						{presets.map(preset => (
							<SettingsListItem
								key={preset.id}
								icon={<vscode-icon name="checklist" className="settings-item-icon" />}
								name={(
									<>
										{preset.name}
										<span className="settings-item-version" title={`Shapes version ${preset.version}`}>Version {preset.version}</span>
									</>
								)}
								tooltip={hasWorkspace
									? `Create a profile from ${preset.name} (copies the shapes into the workspace)`
									: `Open a workspace folder to create a profile from ${preset.name} (the shapes are copied into the workspace)`}
								subline={(
									<div className="settings-item-meta">
										<span className="validation-profile-description">{preset.description}</span>
									</div>
								)}
								actions={(
									<vscode-toolbar-button
										title={`Open the ${preset.name} shape graph for editing`}
										onClick={(e: React.MouseEvent) => { e.stopPropagation(); onEditPreset(preset); }}
									>
										<vscode-icon name="edit" />
									</vscode-toolbar-button>
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
