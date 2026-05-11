import * as React from 'react';
import { useState } from 'react';
import { NavSection, NAV_GROUPS } from '../settings-metadata';

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
				const isSingleItem = group.sections.length === 1 && group.sections[0].id === group.id as string;
				const isCollapsed = collapsed[group.id] ?? false;

				if (isSingleItem) {
					const item = group.sections[0];
					return (
						<div key={group.id} className="settings-nav-group">
							<div
								className={`settings-nav-group-header${activeSection === item.id ? ' active' : ''}`}
								style={{ paddingLeft: '12px' }}
								onClick={() => onSelect(item.id as NavSection)}
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
								{group.sections.map(item => (
									<div
										key={item.id}
										className={`settings-nav-item${activeSection === item.id ? ' active' : ''}`}
										onClick={() => onSelect(item.id as NavSection)}
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
