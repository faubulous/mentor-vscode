import * as React from 'react';
import { ListItemNavProps } from '../../../hooks/use-list-keyboard-navigation';
import { SettingsListItem } from '../../../components/settings-list-item';
import { SettingsItemDescription } from '../../../components/settings-item-description';
import { ValidationProfileView } from '../shared';

export interface ValidationProfileListItemProps {
	profile: ValidationProfileView;

	/**
	 * Missing shape file URIs, if the profile has broken references.
	 */
	missingShapes?: string[];

	/**
	 * Live count of workspace files the profile applies to; undefined while loading.
	 */
	matchCount?: number;

	/**
	 * Live count of files the profile's exclusions carve out; undefined while loading or without exclusions.
	 */
	excludedCount?: number;

	navProps?: ListItemNavProps;

	onEdit: (profile: ValidationProfileView) => void;

	/**
	 * Runs SHACL validation for the profile's matched files. Omitted (and the
	 * validate button hidden) when SHACL validation is disabled.
	 */
	onValidate?: (profile: ValidationProfileView) => void;

	onDelete: (profile: ValidationProfileView) => void;
}

/**
 * A single row in the validation profiles list. A thin field-mapper over
 * {@link SettingsListItem}: shows the description, shape graph count, live
 * target and excluded file counts, and a warning when the profile has no
 * shape graphs or references missing graphs.
 */
export function ValidationProfileListItem({ profile, missingShapes, matchCount, excludedCount, navProps, onEdit, onValidate, onDelete }: ValidationProfileListItemProps) {
	const displayName = profile.name.trim() || profile.id;
	const shapeCount = profile.shapes.length;
	const missingCount = missingShapes?.length ?? 0;
	const isEmpty = shapeCount === 0;

	const warningText = isEmpty
		? 'No shape graphs defined'
		: missingCount > 0 ? `${missingCount} missing graph${missingCount === 1 ? '' : 's'}` : '';

	const subline = (
		<div className="settings-item-meta">
			<SettingsItemDescription text={profile.description} className="validation-profile-description" />
			<span className="validation-profile-stats">
				{(profile.validateOnStartup || profile.validateOnChange) && (
					<span>{[profile.validateOnStartup && 'startup', profile.validateOnChange && 'on change'].filter(Boolean).join(', ')}</span>
				)}
				{matchCount !== undefined && (
					<span>{matchCount} target file{matchCount === 1 ? '' : 's'}</span>
				)}
				{excludedCount !== undefined && (
					<span>{excludedCount} excluded file{excludedCount === 1 ? '' : 's'}</span>
				)}
				{!isEmpty && <span>{shapeCount} graph{shapeCount === 1 ? '' : 's'}</span>}
			</span>
		</div>
	);

	return (
		<SettingsListItem
			icon={<vscode-icon name="checklist" className="settings-item-icon" />}
			name={displayName}
			tooltip={`Edit ${displayName}`}
			actions={(
				<>
					{onValidate && (
						<vscode-toolbar-button
							title="Validate profile using SHACL"
							onClick={(e: React.MouseEvent) => { e.stopPropagation(); onValidate(profile); }}
						>
							<vscode-icon name="run-coverage" />
						</vscode-toolbar-button>
					)}
					<vscode-toolbar-button
						title="Delete profile"
						onClick={(e: React.MouseEvent) => { e.stopPropagation(); onDelete(profile); }}
					>
						<vscode-icon name="trash" />
					</vscode-toolbar-button>
				</>
			)}
			subline={subline}
			status={warningText ? 'warning' : undefined}
			statusMessage={warningText || undefined}
			statusTooltip={missingCount > 0 ? missingShapes?.join(', ') : undefined}
			keyboardNavProps={navProps}
			onClick={() => onEdit(profile)}
		/>
	);
}
