import { useState, useEffect, useRef } from 'react';
import { useStylesheet } from '../webview-hooks';
import stylesheet from './section-header-context-menu.css';

/**
 * Represents a separator item in the context menu, which is 
 * used to visually divide groups of menu items.
 */
export interface SectionHeaderContextMenuSeparator  {
	/**
	 * Indicates that this item is a separator, which should 
	 * be rendered as a horizontal line dividing groups of menu 
	 * items.
	 */
	separator: true;
}

/**
 * Command in the context menu for a section header.
 * @property label The text to display for the menu item.
 * @property onClick The function to call when the menu item is clicked.
 */
export interface SectionHeaderContextMenuCommand {
	/**
	 * The text to display for the menu item.
	 */
	label: string;

	/**
	 * Handler function to call when the menu item is clicked.
	 */
	onClick: () => void;

	/**
	 * When true, the item is shown greyed out and is not clickable. Useful for keeping a
	 * menu's layout stable while an action is temporarily unavailable.
	 */
	disabled?: boolean;
}

/**
 * Menu item in the context menu for a section header.
 */
export type SectionHeaderContextMenuItem = SectionHeaderContextMenuCommand | SectionHeaderContextMenuSeparator;

/**
 * Type guard that returns `true` if the given menu item is a separator.
 * @param item The menu item to check.
 * @returns `true` if the item is a separator, `false` if it is a command.
 */
function isSeparator(item: SectionHeaderContextMenuItem): item is SectionHeaderContextMenuSeparator {
	return (item as SectionHeaderContextMenuSeparator).separator === true;
}

/**
 * A simple "more options" menu (three vertical dots) for section headers and setting rows,
 * which can contain additional actions applied to the section or setting.
 * @param param0 Items to show in the menu, each with a label and onClick handler.
 * @returns A JSX element representing the context menu.
 */
export function SectionHeaderContextMenu({ items }: { items: SectionHeaderContextMenuItem[] }) {
	useStylesheet('mentor-section-header-context-menu-styles', stylesheet);

	const [open, setOpen] = useState(false);
	const containerRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!open) {
			return;
		}

		const handler = (e: MouseEvent) => {
			if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
				setOpen(false);
			}
		};

		document.addEventListener('mousedown', handler);

		return () => document.removeEventListener('mousedown', handler);
	}, [open]);

	// Drop leading/trailing separators and collapse consecutive ones, so that
	// callers can compose item lists without worrying about dangling dividers.
	const normalizedItems = items.filter((item, index) => {
		if (!isSeparator(item)) {
			return true;
		}

		const hasCommandBefore = items.slice(0, index).some(i => !isSeparator(i));
		const hasCommandAfter = items.slice(index + 1).some(i => !isSeparator(i));
		const previousIsSeparator = index > 0 && isSeparator(items[index - 1]);

		return hasCommandBefore && hasCommandAfter && !previousIsSeparator;
	});

	if (normalizedItems.every(isSeparator)) {
		return null;
	}

	return (
		<div className="more-vert-container" ref={containerRef}>
			<button className="more-vert-button" onClick={() => setOpen(o => !o)} title="More actions">
				<vscode-icon name="kebab-vertical"></vscode-icon>
			</button>
			{open && (
				<div className="more-vert-menu">
					{normalizedItems.map((item, index) =>
						isSeparator(item) ? (
							<div key={`separator-${index}`} className="more-vert-separator" role="separator" />
						) : (
							<button
								key={`${item.label}-${index}`}
								className="more-vert-item"
								disabled={item.disabled}
								onClick={() => { item.onClick(); setOpen(false); }}
							>
								{item.label}
							</button>
						)
					)}
				</div>
			)}
		</div>
	);
}
