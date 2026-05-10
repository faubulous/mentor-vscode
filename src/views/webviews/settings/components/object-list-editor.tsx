import * as React from 'react';
import { useCallback } from 'react';

import '@vscode-elements/elements/dist/vscode-textfield';

export interface FieldDef {
	key: string;
	label: string;
	placeholder?: string;
	className?: string;
}

interface ObjectListEditorProps {
	items: Record<string, string>[];
	fields: FieldDef[];
	onChange: (items: Record<string, string>[]) => void;
}

export function ObjectListEditor({ items, fields, onChange }: ObjectListEditorProps) {
	const handleChange = useCallback((index: number, key: string, value: string) => {
		const next = items.map((item, i) => i === index ? { ...item, [key]: value } : item);
		onChange(next);
	}, [items, onChange]);

	const handleRemove = useCallback((index: number) => {
		onChange(items.filter((_, i) => i !== index));
	}, [items, onChange]);

	const handleAdd = useCallback(() => {
		const empty: Record<string, string> = {};
		for (const f of fields) empty[f.key] = '';
		onChange([...items, empty]);
	}, [items, fields, onChange]);

	return (
		<div className="object-list-editor">
			{items.length > 0 && (
				<div className="object-list-header">
					{fields.map(f => (
						<span key={f.key} className={`object-list-col-header${f.className ? ` ${f.className}` : ''}`}>
							{f.label}
						</span>
					))}
					<span className="object-list-remove-spacer" />
				</div>
			)}
			{items.map((item, i) => (
				<div key={i} className="object-list-item">
					{fields.map(f => (
						<vscode-textfield
							key={f.key}
							className={f.className}
							value={item[f.key] ?? ''}
							placeholder={f.placeholder ?? f.label}
							onInput={(e: React.FormEvent<HTMLElement>) => handleChange(i, f.key, (e.target as HTMLInputElement).value)}
						/>
					))}
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
