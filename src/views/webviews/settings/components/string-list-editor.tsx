import * as React from 'react';
import { useState, useCallback } from 'react';

import '@vscode-elements/elements/dist/vscode-textfield';

interface StringListEditorProps {
	items: string[];
	placeholder?: string;
	onChange: (items: string[]) => void;
}

export function StringListEditor({ items, placeholder = 'Enter value', onChange }: StringListEditorProps) {
	const [dragIndex, setDragIndex] = useState<number | null>(null);
	const [dropIndex, setDropIndex] = useState<number | null>(null);

	const handleChange = useCallback((index: number, value: string) => {
		const next = [...items];
		next[index] = value;
		onChange(next);
	}, [items, onChange]);

	const handleRemove = useCallback((index: number) => {
		onChange(items.filter((_, i) => i !== index));
	}, [items, onChange]);

	const handleAdd = useCallback(() => {
		onChange([...items, '']);
	}, [items, onChange]);

	const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
		setDragIndex(index);
		e.dataTransfer.effectAllowed = 'move';
		e.dataTransfer.setData('text/plain', String(index));
		const row = (e.target as HTMLElement).closest('.string-list-item');
		if (row) e.dataTransfer.setDragImage(row as HTMLElement, 20, 10);
	}, []);

	const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
		e.preventDefault();
		e.dataTransfer.dropEffect = 'move';
		if (index !== dragIndex) setDropIndex(index);
	}, [dragIndex]);

	const handleDrop = useCallback((e: React.DragEvent, index: number) => {
		e.preventDefault();
		if (dragIndex === null || dragIndex === index) {
			setDropIndex(null);
			return;
		}
		const next = [...items];
		const [removed] = next.splice(dragIndex, 1);
		next.splice(index, 0, removed);
		onChange(next);
		setDragIndex(null);
		setDropIndex(null);
	}, [dragIndex, items, onChange]);

	const handleDragEnd = useCallback(() => {
		setDragIndex(null);
		setDropIndex(null);
	}, []);

	return (
		<div className="string-list-editor">
			{items.map((item, i) => (
				<div
					key={i}
					className={[
						'string-list-item',
						dragIndex === i ? 'dragging' : '',
						dropIndex === i && dragIndex !== i ? 'drop-target' : '',
					].filter(Boolean).join(' ')}
					onDragOver={e => handleDragOver(e, i)}
					onDrop={e => handleDrop(e, i)}
				>
					<i
						className="codicon codicon-gripper drag-handle"
						draggable
						onDragStart={(e: any) => handleDragStart(e, i)}
						onDragEnd={handleDragEnd as any}
					/>
					<vscode-textfield
						value={item}
						placeholder={placeholder}
						onInput={(e: React.FormEvent<HTMLElement>) => handleChange(i, (e.target as HTMLInputElement).value)}
					/>
					<button className="list-remove-button" title="Remove" onClick={() => handleRemove(i)}>
						<i className="codicon codicon-close" />
					</button>
				</div>
			))}
			<div className="string-list-add">
				<button className="text-button" onClick={handleAdd}>+ Add</button>
			</div>
		</div>
	);
}
