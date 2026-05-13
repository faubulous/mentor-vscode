import { useState, useEffect, useRef } from 'react';

/**
 * Menu item in the context menu for a section header.
 * @property label The text to display for the menu item.
 * @property onClick The function to call when the menu item is clicked.
 */
export interface SectionHeaderContextMenuItem {
	label: string;

	onClick: () => void;
}

/**
 * A simple "more options" menu (three vertical dots) for section headers and setting rows, 
 * which can contain additional actions applied to the section or setting.
 * @param param0 Items to show in the menu, each with a label and onClick handler.
 * @returns A JSX element representing the context menu.
 */
export function SectionHeaderContextMenu({ items }: { items: SectionHeaderContextMenuItem[] }) {
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

	if (items.length === 0) {
		return null;
	}

	return (
		<div className="more-vert-container" ref={containerRef}>
			<button className="more-vert-button" onClick={() => setOpen(o => !o)} title="More actions">
				<vscode-icon name="kebab-vertical"></vscode-icon>
			</button>
			{open && (
				<div className="more-vert-menu">
					{items.map(item => (
						<button
							key={item.label}
							className="more-vert-item"
							onClick={() => { item.onClick(); setOpen(false); }}
						>
							{item.label}
						</button>
					))}
				</div>
			)}
		</div>
	);
}