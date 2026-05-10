import * as React from 'react';
import { useState } from 'react';

export type NavSection =
	| 'appearance.display'
	| 'appearance.definitions-tree'
	| 'editor.general'
	| 'editor.formatting'
	| 'editor.sorting'
	| 'editor.templates'
	| 'indexing'
	| 'connections'
	| 'query'
	| 'namespaces'
	| 'validation'
	| 'inference';

interface NavGroup {
	id: string;
	label: string;
	items: { id: NavSection; label: string }[];
}

const NAV_GROUPS: NavGroup[] = [
	{
		id: 'appearance',
		label: 'Appearance',
		items: [
			{ id: 'appearance.display', label: 'Display' },
			{ id: 'appearance.definitions-tree', label: 'Definitions Tree' },
		],
	},
	{
		id: 'editor',
		label: 'Editor',
		items: [
			{ id: 'editor.general', label: 'General' },
			{ id: 'editor.formatting', label: 'Formatting' },
			{ id: 'editor.sorting', label: 'Sorting' },
			{ id: 'editor.templates', label: 'Templates' },
		],
	},
	{
		id: 'indexing',
		label: 'Indexing',
		items: [{ id: 'indexing', label: 'Indexing' }],
	},
	{
		id: 'connections',
		label: 'Connections',
		items: [{ id: 'connections', label: 'Connections' }],
	},
	{
		id: 'query',
		label: 'Query',
		items: [{ id: 'query', label: 'Query' }],
	},
	{
		id: 'namespaces',
		label: 'Namespaces',
		items: [{ id: 'namespaces', label: 'Namespaces' }],
	},
	{
		id: 'validation',
		label: 'Validation',
		items: [{ id: 'validation', label: 'Validation' }],
	},
	{
		id: 'inference',
		label: 'Inference',
		items: [{ id: 'inference', label: 'Inference' }],
	},
];

interface SettingsNavProps {
	activeSection: NavSection;
	onSelect: (section: NavSection) => void;
}

export function SettingsNav({ activeSection, onSelect }: SettingsNavProps) {
	const initialCollapsed: Record<string, boolean> = {};
	const [collapsed, setCollapsed] = useState<Record<string, boolean>>(initialCollapsed);

	const toggleGroup = (id: string) => {
		setCollapsed(prev => ({ ...prev, [id]: !prev[id] }));
	};

	return (
		<nav className="settings-nav">
			{NAV_GROUPS.map(group => {
				const isSingleItem = group.items.length === 1 && group.items[0].id === group.id as string;
				const isCollapsed = collapsed[group.id] ?? false;

				if (isSingleItem) {
					const item = group.items[0];
					return (
						<div key={group.id} className="settings-nav-group">
							<div
								className={`settings-nav-group-header${activeSection === item.id ? ' active' : ''}`}
								style={{ paddingLeft: '12px' }}
								onClick={() => onSelect(item.id)}
							>
								{group.label}
							</div>
						</div>
					);
				}

				return (
					<div key={group.id} className="settings-nav-group">
						<div
							className={`settings-nav-group-header${isCollapsed ? ' collapsed' : ''}`}
							onClick={() => toggleGroup(group.id)}
						>
							<i className={`codicon codicon-chevron-down`} />
							{group.label}
						</div>
						{!isCollapsed && (
							<div className="settings-nav-items">
								{group.items.map(item => (
									<div
										key={item.id}
										className={`settings-nav-item${activeSection === item.id ? ' active' : ''}`}
										onClick={() => onSelect(item.id)}
									>
										{item.label}
									</div>
								))}
							</div>
						)}
					</div>
				);
			})}
		</nav>
	);
}
