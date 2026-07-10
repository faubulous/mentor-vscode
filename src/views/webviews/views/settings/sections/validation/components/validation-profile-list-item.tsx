import * as React from 'react';
import { ScopeBadge } from '@src/views/webviews/components/scope-badge';
import { ListItemNavProps } from '../../../hooks/use-list-keyboard-navigation';
import { SettingsListItem } from '../../../components/settings-list-item';
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

	onDelete: (profile: ValidationProfileView) => void;
}

/**
 * A single row in the validation profiles list. A thin field-mapper over
 * {@link SettingsListItem}: shows the description, shape graph count, live
 * target and excluded file counts, a scope badge, and a warning when the
 * profile has no shape graphs or references missing graphs. Built-in presets
 * render locked (viewable, not editable or deletable).
 */
export function ValidationProfileListItem({ profile, missingShapes, matchCount, excludedCount, navProps, onEdit, onDelete }: ValidationProfileListItemProps) {
	const displayName = profile.name.trim() || profile.id;
	const shapeCount = profile.shapes.length;
	const missingCount = missingShapes?.length ?? 0;
	const isEmpty = shapeCount === 0;

	const warningText = isEmpty
		? 'No shape graphs defined'
		: missingCount > 0 ? `${missingCount} missing graph${missingCount === 1 ? '' : 's'}` : '';

	const description = profile.description.trim();

	const subline = (
		<div className="settings-item-meta">
			{description && (
				<span className="validation-profile-description">{description}</span>
			)}
			{!isEmpty && <span>{shapeCount} shape graph{shapeCount === 1 ? '' : 's'}</span>}
			{matchCount !== undefined && (
				<span>{matchCount} target file{matchCount === 1 ? '' : 's'}</span>
			)}
			{excludedCount !== undefined && (
				<span>{excludedCount} excluded file{excludedCount === 1 ? '' : 's'}</span>
			)}
			{warningText && (
				<span className="validation-item-warning">
					<vscode-icon name="warning" />
					{warningText}
				</span>
			)}
		</div>
	);

	return (
		<SettingsListItem
			icon={<vscode-icon name="checklist" className="settings-item-icon" />}
			name={displayName}
			tooltip={profile.isProtected ? `View ${displayName}` : `Edit ${displayName}`}
			locked={profile.isProtected}
			lockTitle="Built-in preset — not editable"
			actions={!profile.isProtected && (
				<vscode-toolbar-button
					title="Delete profile"
					onClick={(e: React.MouseEvent) => { e.stopPropagation(); onDelete(profile); }}
				>
					<vscode-icon name="trash" />
				</vscode-toolbar-button>
			)}
			subline={subline}
			badge={profile.isProtected ? undefined : <ScopeBadge scope={profile.scope} />}
			keyboardNavProps={navProps}
			onClick={() => onEdit(profile)}
		/>
	);
}
