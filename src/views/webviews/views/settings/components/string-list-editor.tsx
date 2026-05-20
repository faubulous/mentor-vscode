import * as React from 'react';
import { useState, useCallback, useRef } from 'react';

interface StringListEditorProps {
	items: string[];
	placeholder?: string;
	onChange: (items: string[]) => void;
}

export function StringListEditor({ items, placeholder = 'Enter value', onChange }: StringListEditorProps) {
	const [dragIndex, setDragIndex] = useState<number | null>(null);
	const [dropIndex, setDropIndex] = useState<number | null>(null);
	const [dropBefore, setDropBefore] = useState(true);
	// Tracks which item's handle was pressed so we only allow drag from the handle.
	const activeHandle = useRef<number | null>(null);

	const handleChange = useCallback((index: number, value: string) => {
		const next = [...items];
		next[index] = value;
		onChange(next);
	}, [items, onChange]);

	const handleRemove = useCallback((index: number) => {
		onChange(items.filter((_, i) => i !== index));
	}, [items, onChange]);

	const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
		if (activeHandle.current !== index) {
			e.preventDefault();
			return;
		}
		setDragIndex(index);
		e.dataTransfer.effectAllowed = 'move';
		e.dataTransfer.setData('text/plain', String(index));
		const row = (e.currentTarget as HTMLElement);
		e.dataTransfer.setDragImage(row, 20, 10);
	}, []);

	const handleItemDragOver = useCallback((e: React.DragEvent, index: number) => {
		if (dragIndex === null) return;
		e.preventDefault();
		e.dataTransfer.dropEffect = 'move';
		if (index === dragIndex) return;
		const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
		const before = e.clientY < rect.top + rect.height / 2;
		setDropIndex(index);
		setDropBefore(before);
	}, [dragIndex]);

	// Container-level handlers ensure drops succeed even if they land on a
	// nested element (textfield, icon) or on the dragged row itself, by
	// driving the move from tracked dropIndex/dropBefore state rather than
	// from the DOM drop target.
	const handleListDragOver = useCallback((e: React.DragEvent) => {
		if (dragIndex === null) return;
		e.preventDefault();
		e.dataTransfer.dropEffect = 'move';
	}, [dragIndex]);

	const handleListDrop = useCallback((e: React.DragEvent) => {
		e.preventDefault();
		if (dragIndex !== null && dropIndex !== null) {
			const insertIndex = dropBefore ? dropIndex : dropIndex + 1;
			const targetIndex = dragIndex < insertIndex ? insertIndex - 1 : insertIndex;
			if (targetIndex !== dragIndex) {
				const next = [...items];
				const [removed] = next.splice(dragIndex, 1);
				next.splice(targetIndex, 0, removed);
				onChange(next);
			}
		}
		setDragIndex(null);
		setDropIndex(null);
	}, [dragIndex, dropIndex, dropBefore, items, onChange]);

	const handleDragEnd = useCallback(() => {
		activeHandle.current = null;
		setDragIndex(null);
		setDropIndex(null);
	}, []);

	const allItems = [...items, ''];

	return (
		<div
			className="string-list-editor"
			onDragOver={handleListDragOver}
			onDrop={handleListDrop}
		>
			{allItems.map((item, i) => {
				const isGhost = i === items.length;

				if (isGhost) {
					return (
						<div key={i} className="string-list-item">
							<div className="drag-handle-spacer" />
							<vscode-textfield
								value=""
								placeholder={placeholder}
								onInput={(e: React.FormEvent<HTMLElement>) => {
									const value = (e.target as HTMLInputElement).value;
									if (value) onChange([...items, value]);
								}}
							/>
						</div>
					);
				}

				const isDropTarget = dropIndex === i && dragIndex !== i;
				return (
					<div
						key={i}
						className={[
							'string-list-item',
							dragIndex === i ? 'dragging' : '',
							isDropTarget ? (dropBefore ? 'drop-before' : 'drop-after') : '',
						].filter(Boolean).join(' ')}
						draggable
						onDragStart={e => handleDragStart(e, i)}
						onDragEnd={handleDragEnd}
						onDragOver={e => handleItemDragOver(e, i)}
					>
						<div
							className="drag-handle"
							onPointerDown={() => { activeHandle.current = i; }}
							onPointerUp={() => { activeHandle.current = null; }}
						>
							<vscode-icon name="gripper" title="Drag to reorder"></vscode-icon>
						</div>
						<vscode-textfield
							value={item}
							placeholder={placeholder}
							onInput={(e: React.FormEvent<HTMLElement>) => handleChange(i, (e.target as HTMLInputElement).value)}
						>
							<vscode-icon
								slot="content-after"
								name="close"
								title="Remove"
								action-icon
								onClick={() => handleRemove(i)}
							></vscode-icon>
						</vscode-textfield>
					</div>
				);
			})}
		</div>
	);
}
