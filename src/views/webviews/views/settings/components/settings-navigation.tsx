import { useState } from 'react';
import { SETTINGS_GROUPS, SettingsSectionId } from '../sections';

interface SettingsNavigationProps {
	activeSection: SettingsSectionId;
	onSelect: (section: SettingsSectionId) => void;
}

/**
 * The section navigation of the settings panel, keyboard-operable like a
 * native VS Code list: the tree is a single Tab stop (a roving tabindex on the
 * active row), Up/Down and Home/End move the focus, Enter and Space activate
 * the focused row, and Left/Right collapse and expand a group header. The
 * selection colors follow the focus state (see settings-panel.css): the active
 * row uses the active-selection colors while the navigation has focus and the
 * inactive-selection colors otherwise.
 */
export function SettingsNavigation({ activeSection, onSelect }: SettingsNavigationProps) {
	const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

	const toggleGroup = (id: string) => {
		setCollapsed(prev => ({ ...prev, [id]: !prev[id] }));
	};

	// The roving tab stop: the active section's row when visible, else the first
	// row — Tab enters the tree exactly once, arrow keys take over from there.
	const rowKeys: string[] = [];

	for (const group of SETTINGS_GROUPS) {
		const isSingleItem = group.sections.length === 1 && group.sections[0].id === (group.id as string);
		const isCollapsed = collapsed[group.id] ?? false;

		if (isSingleItem) {
			rowKeys.push(`item:${group.sections[0].id}`);
		} else {
			rowKeys.push(`header:${group.id}`);

			if (!isCollapsed) {
				for (const item of group.sections) {
					rowKeys.push(`item:${item.id}`);
				}
			}
		}
	}

	const tabStopKey = rowKeys.includes(`item:${activeSection}`) ? `item:${activeSection}` : rowKeys[0];

	const rowTabIndex = (key: string) => key === tabStopKey ? 0 : -1;

	const handleKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
		const rows = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('[data-nav-row]'));
		const current = rows.indexOf(document.activeElement as HTMLElement);

		const focusRow = (index: number) => {
			rows[Math.max(0, Math.min(rows.length - 1, index))]?.focus();
		};

		switch (e.key) {
			case 'ArrowDown':
				e.preventDefault();
				focusRow(current + 1);
				break;
			case 'ArrowUp':
				e.preventDefault();
				focusRow(current - 1);
				break;
			case 'Home':
				e.preventDefault();
				focusRow(0);
				break;
			case 'End':
				e.preventDefault();
				focusRow(rows.length - 1);
				break;
			case 'Enter':
			case ' ':
				e.preventDefault();
				(document.activeElement as HTMLElement)?.click();
				break;
			case 'ArrowLeft':
			case 'ArrowRight': {
				// Collapse/expand when a group header row is focused.
				const groupId = (document.activeElement as HTMLElement)?.dataset?.navGroup;

				if (groupId) {
					e.preventDefault();
					setCollapsed(prev => ({ ...prev, [groupId]: e.key === 'ArrowLeft' }));
				}

				break;
			}
		}
	};

	return (
		<nav className="settings-nav" role="tree" aria-label="Settings sections" onKeyDown={handleKeyDown}>
			{SETTINGS_GROUPS.map(group => {
				const isSingleItem = group.sections.length === 1 && group.sections[0].id === group.id as string;
				const isCollapsed = collapsed[group.id] ?? false;

				if (isSingleItem) {
					const item = group.sections[0];

					return (
						<div key={group.id} className="settings-nav-group">
							<div
								className={`settings-nav-group-header${activeSection === item.id ? ' active' : ''}`}
								style={{ paddingLeft: '12px' }}
								role="treeitem"
								aria-selected={activeSection === item.id}
								data-nav-row
								tabIndex={rowTabIndex(`item:${item.id}`)}
								onClick={() => onSelect(item.id as SettingsSectionId)}
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
							role="treeitem"
							aria-expanded={!isCollapsed}
							data-nav-row
							data-nav-group={group.id}
							tabIndex={rowTabIndex(`header:${group.id}`)}
							onClick={() => toggleGroup(group.id)}
						>
							<i className={`codicon codicon-chevron-down`} />
							{group.label}
						</div>
						{!isCollapsed && (
							<div className="settings-nav-items" role="group">
								{group.sections.map(item => (
									<div
										key={item.id}
										className={`settings-nav-item${activeSection === item.id ? ' active' : ''}`}
										role="treeitem"
										aria-selected={activeSection === item.id}
										data-nav-row
										tabIndex={rowTabIndex(`item:${item.id}`)}
										onClick={() => onSelect(item.id as SettingsSectionId)}
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
