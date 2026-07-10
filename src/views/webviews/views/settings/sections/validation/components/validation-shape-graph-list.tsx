import * as React from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useVscodeElementRef } from '@src/views/webviews/hooks';

export interface ValidationShapeGraphListProps {
	/**
	 * The shape graph URIs currently selected for the profile.
	 */
	selected: string[];

	/**
	 * Shape graphs available in the store: workspace files under their canonical
	 * `workspace:///` URI, built-in vocabularies under their namespace URI.
	 */
	candidates: string[];

	/**
	 * Missing shape graph URIs for this profile.
	 */
	missingShapes: string[];

	onChange: (selected: string[]) => void;

	/**
	 * Opens a shape graph in an editor. The open button is omitted when absent.
	 */
	onOpen?: (uri: string) => void;

	/**
	 * Renders the checklist as a read-only viewer (built-in presets): only the
	 * assigned graphs are shown and the selection cannot be changed.
	 */
	readOnly?: boolean;
}

/**
 * Which subset of shape graphs the list shows: the assigned graphs, or every
 * available graph (the "Edit" mode used to check new ones).
 */
type ShapeFilterMode = 'assigned' | 'all';

/**
 * A filterable checklist of SHACL shape graphs for the profile editor.
 *
 * By default it shows the assigned graphs. The "Edit" button switches to the
 * full list so new graphs can be checked; "Done" returns to the assigned
 * graphs. The search box filters within the current scope. Rows show the graph
 * URI — the scheme distinguishes workspace file graphs (`workspace:///…`) from
 * built-in vocabulary graphs (`http…`).
 */
export function ValidationShapeGraphList({ selected, candidates, missingShapes, onChange, onOpen, readOnly }: ValidationShapeGraphListProps) {
	// Start on the full list when nothing is assigned yet so graphs can be added.
	const [mode, setMode] = useState<ShapeFilterMode>(selected.length === 0 ? 'all' : 'assigned');
	const [filter, setFilter] = useState('');

	const filterRef = useRef(filter);
	filterRef.current = filter;

	// Switch to the full list whenever the last assigned graph is unchecked, so the
	// user can immediately add another one instead of facing an empty list.
	useEffect(() => {
		if (selected.length === 0 && !readOnly) {
			setMode('all');
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [selected.length]);

	const effectiveMode: ShapeFilterMode = readOnly ? 'assigned' : mode;

	// Escape clears the search box; only an already-empty box lets the event reach
	// the dialog (which closes it). Handled with a native listener so propagation
	// can be stopped before the modal's window-level keydown listener runs.
	const searchRef = useVscodeElementRef<HTMLElement>('keydown', (_element, event) => {
		const keyEvent = event as unknown as KeyboardEvent;

		if (keyEvent.key === 'Escape' && filterRef.current.length > 0) {
			keyEvent.preventDefault();
			keyEvent.stopPropagation();
			setFilter('');
		}
	});

	const selectedSet = useMemo(() => new Set(selected), [selected]);
	const missingSet = useMemo(() => new Set(missingShapes), [missingShapes]);

	// The universe is the union of candidate graphs and the current selection —
	// this keeps selected graphs that are not loaded (e.g. missing) visible.
	const universe = useMemo<string[]>(
		() => [...new Set([...candidates, ...selected])].sort((a, b) => a.localeCompare(b)),
		[candidates, selected]
	);

	const query = filter.trim().toLowerCase();

	const matchesQuery = (uri: string): boolean =>
		!query || uri.toLowerCase().includes(query);

	const inScope = (uri: string): boolean =>
		effectiveMode === 'all' || selectedSet.has(uri);

	const visible = universe.filter(matchesQuery).filter(inScope);

	const toggle = (uri: string) => {
		if (selectedSet.has(uri)) {
			onChange(selected.filter(s => s !== uri));
		} else {
			onChange([...selected, uri]);
		}
	};

	const emptyMessage = effectiveMode === 'all'
		? (query ? 'No shape graphs match the search.' : 'No shape graphs available in this workspace.')
		: (query ? 'No assigned shape graphs match the search.' : 'No assigned shape graphs.');

	const body = visible.length === 0 ? (
		<p className="validation-empty-message">{emptyMessage}</p>
	) : (
		<div className="validation-shape-list">
			{visible.map(uri => {
				const checked = selectedSet.has(uri);
				const missing = missingSet.has(uri);

				return (
					<div key={uri} className={`validation-shape-row${missing ? ' validation-shape-missing' : ''}`}>
						<vscode-checkbox
							className="validation-shape-checkbox"
							checked={checked}
							disabled={readOnly}
							onChange={() => { if (!readOnly) toggle(uri); }}
						>
							<span className="validation-shape-label">
								<span className="validation-shape-path validation-path-pattern" title={uri}>{uri}</span>
							</span>
						</vscode-checkbox>
						{missing && (
							<span className="validation-shape-error">
								<span className="validation-shape-error-label">Missing</span>
							</span>
						)}
						{onOpen && !missing && (
							<vscode-toolbar-button
								className="validation-shape-open"
								title="Open in editor"
								onClick={(e: React.MouseEvent) => { e.stopPropagation(); onOpen(uri); }}
							>
								<vscode-icon name="go-to-file" />
							</vscode-toolbar-button>
						)}
					</div>
				);
			})}
		</div>
	);

	return (
		<div className="validation-shape-list-editor">
			<div className="validation-paths-header">
				<vscode-label>Included Shapes</vscode-label>
			</div>
			<div className="validation-shape-toolbar">
				<div className="search-field-wrapper">
					<vscode-textfield
						ref={searchRef}
						className="validation-shape-search"
						value={filter}
						placeholder="Filter graphs…"
						onInput={(e: React.FormEvent<HTMLElement>) => setFilter((e.target as HTMLInputElement).value)}
					>
						<vscode-icon slot="content-before" name="search" title="search" />
						{filter.length > 0 && (
							<vscode-icon
								slot="content-after"
								name="close"
								title="Clear search"
								action-icon
								onClick={() => setFilter('')}
							/>
						)}
					</vscode-textfield>
				</div>
				{!readOnly && (effectiveMode === 'all' ? (
					<vscode-toolbar-button className="primary" onClick={() => setMode('assigned')}>
						<span className="codicon codicon-check" />
						<span className="label">Done</span>
					</vscode-toolbar-button>
				) : (
					<vscode-toolbar-button className="primary" onClick={() => setMode('all')}>
						<span className="codicon codicon-edit" />
						<span className="label">Edit</span>
					</vscode-toolbar-button>
				))}
			</div>
			{body}
		</div>
	);
}
