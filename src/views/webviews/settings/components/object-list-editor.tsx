import * as React from 'react';
import { useCallback } from 'react';

/**
 * Definition for a single field in the ObjectListEditor. Each field 
 * corresponds to a text input in each row of the editor.
 */
export interface ObjectListEditorFieldDef {
	key: string;

	label: string;

	placeholder?: string;

	className?: string;
}

interface ObjectListEditorProps {
	items: Record<string, string>[];

	fields: ObjectListEditorFieldDef[];

	onChange: (items: Record<string, string>[]) => void;
}

export function ObjectListEditor({ items, fields, onChange }: ObjectListEditorProps) {
	const emptyItem = useCallback((): Record<string, string> => {
		const empty: Record<string, string> = {};

		for (const f of fields) {
			empty[f.key] = '';
		}

		return empty;
	}, [fields]);

	const handleChange = useCallback((index: number, key: string, value: string) => {
		const next = items.map((item, i) => i === index ? { ...item, [key]: value } : item);
		onChange(next);
	}, [items, onChange]);

	const handleRemove = useCallback((index: number) => {
		onChange(items.filter((_, i) => i !== index));
	}, [items, onChange]);

	const allItems = [...items, emptyItem()];

	return (
		<div className="object-list-editor">
			<div className="object-list-header">
				{fields.map(f => (
					<span key={f.key} className={`object-list-col-header${f.className ? ` ${f.className}` : ''}`}>
						{f.label}
					</span>
				))}
				<span className="object-list-remove-spacer" />
			</div>
			{allItems.map((item, i) => {
				const isGhost = i === items.length;
				
				return (
					<div key={isGhost ? 'ghost' : i} className="object-list-item">
						{fields.map(f => (
							<vscode-textfield
								key={f.key}
								className={f.className}
								value={item[f.key] ?? ''}
								placeholder={f.placeholder ?? f.label}
								onInput={(e: React.FormEvent<HTMLElement>) => {
									const value = (e.target as HTMLInputElement).value;
									if (isGhost) {
										const newItem = emptyItem();
										newItem[f.key] = value;
										onChange([...items, newItem]);
									} else {
										handleChange(i, f.key, value);
									}
								}}
							/>
						))}
						{isGhost
							? <span className="object-list-remove-spacer" />
							: (
								<button className="list-remove-button" title="Remove" onClick={() => handleRemove(i)}>
									<i className="codicon codicon-close" />
								</button>
							)
						}
					</div>
				);
			})}
		</div>
	);
}
