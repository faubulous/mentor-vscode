import * as React from 'react';
import { useState, useCallback, useRef, useEffect } from 'react';
import { useDebouncedValue } from '@src/views/webviews/hooks';

interface StringListEditorProps {
	items: string[];
	placeholder?: string;
	onChange: (items: string[]) => void;

	/**
	 * Live match counts per entry, keyed by the trimmed entry. Entries without a
	 * key are still loading and render no indicator. Enables the in-input match
	 * indicator together with {@link onRequestEntryCount}.
	 */
	entryCounts?: Record<string, number | undefined>;

	/**
	 * Requests a live match count for an entry. Called for every non-empty entry
	 * once typing has settled.
	 */
	onRequestEntryCount?: (entry: string) => void;

	/**
	 * Returns why an entry is invalid, or `undefined` when it is fine. Invalid
	 * entries show a warning instead of a count.
	 */
	getEntryProblem?: (entry: string) => string | undefined;

	/**
	 * Renders the indicator label for a match count, e.g. `n => `${n} files``.
	 */
	formatCount?: (count: number) => string;

	/**
	 * Tooltip shown on the match indicator.
	 */
	countTitle?: string;

	/**
	 * Opens the interactive pattern editor for an entry; `apply` writes the
	 * confirmed pattern back to that entry. When given, the match indicator
	 * becomes a link that opens the editor.
	 */
	onEditEntry?: (entry: string, apply: (newEntry: string) => void) => void;
}

export function StringListEditor({
	items,
	placeholder = 'Enter value',
	onChange,
	entryCounts,
	onRequestEntryCount,
	getEntryProblem,
	formatCount = count => `${count} file${count === 1 ? '' : 's'}`,
	countTitle,
	onEditEntry,
}: StringListEditorProps) {
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

	// Keep the live match counts current, but off the keystroke path: each count
	// is computed by the host over every workspace file.
	const countableKey = JSON.stringify(
		onRequestEntryCount
			? items.map(item => item.trim()).filter(item => item.length > 0 && !getEntryProblem?.(item))
			: []
	);
	const settledCountableKey = useDebouncedValue(countableKey);

	useEffect(() => {
		if (!onRequestEntryCount) {
			return;
		}

		for (const entry of JSON.parse(settledCountableKey) as string[]) {
			onRequestEntryCount(entry);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [settledCountableKey]);

	/**
	 * The in-input indicator for an entry: a warning for invalid entries, the
	 * live match count once the host reported one, nothing while it loads. With
	 * {@link onEditEntry} the count opens the interactive pattern editor.
	 * @param entry The raw entry text.
	 * @param apply Writes an edited entry back to wherever it lives.
	 */
	const renderIndicator = (entry: string, apply: (newEntry: string) => void) => {
		const trimmed = entry.trim();

		if (!entryCounts || trimmed.length === 0) {
			return null;
		}

		const problem = getEntryProblem?.(trimmed);

		if (problem) {
			return (
				<vscode-icon
					slot="content-after"
					name="warning"
					className="string-list-warning"
					title={problem}
				/>
			);
		}

		const count = entryCounts[trimmed];

		if (count === undefined) {
			return null;
		}

		if (!onEditEntry) {
			return (
				<span slot="content-after" className="setting-input-suffix string-list-count" title={countTitle}>
					{formatCount(count)}
				</span>
			);
		}

		return (
			<span
				slot="content-after"
				className="setting-input-suffix string-list-count string-list-count-action"
				role="button"
				title="Preview and edit the matched files…"
				onClick={(e: React.MouseEvent) => {
					e.stopPropagation();
					onEditEntry(trimmed, apply);
				}}
			>
				{formatCount(count)}
			</span>
		);
	};

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
							{renderIndicator(item, newEntry => handleChange(i, newEntry))}
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
