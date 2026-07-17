import * as React from 'react';
import { useEffect, useState } from 'react';
import { isValidPathKey } from '@src/services/validation/shacl-validation-configuration';

/**
 * Ready-made starting points offered as one-click suggestions.
 */
const PATH_SUGGESTIONS = ['**/*', '**/*.ttl', '**/*.(ttl|n3)'];

export interface ValidationProfilePathsEditorProps {
	/**
	 * Glob/path patterns the profile applies to.
	 */
	includeFiles: string[];

	/**
	 * Glob/path patterns excluded from the profile.
	 */
	excludeFiles: string[];

	onIncludeChange: (includeFiles: string[]) => void;

	onExcludeChange: (excludeFiles: string[]) => void;

	/**
	 * Live matched-file counts per pattern; undefined entries are still loading.
	 */
	entryCounts: Record<string, number | undefined>;

	/**
	 * Requests a live match count for a pattern.
	 */
	onRequestEntryCount: (pattern: string) => void;

	/**
	 * Opens the interactive pattern editor (a host quick pick previewing the
	 * matched files); `apply` is invoked with the confirmed pattern.
	 */
	onEditEntry: (pattern: string, apply: (newPattern: string) => void) => void;
}

/**
 * Why an entry is invalid, or undefined when it is fine.
 */
function getEntryProblem(entry: string): string | undefined {
	const trimmed = entry.trim();

	if (trimmed.length > 0 && !isValidPathKey(trimmed)) {
		return 'Paths must be workspace-relative, without .. segments or absolute paths.';
	}

	return undefined;
}

interface PathListSectionProps {
	label: string;

	placeholder: string;

	entries: string[];

	onChange: (entries: string[]) => void;

	entryCounts: Record<string, number | undefined>;

	onEditEntry: (pattern: string, apply: (newPattern: string) => void) => void;

	/**
	 * Extra content rendered below the rows (e.g. suggestion chips).
	 */
	footer?: React.ReactNode;
}

/**
 * One editable path list: in-place editable entry rows with a live match count
 * (clickable to open the interactive pattern editor; a warning for invalid
 * entries), and an add box that commits on Enter.
 */
function PathListSection({ label, placeholder, entries, onChange, entryCounts, onEditEntry, footer }: PathListSectionProps) {
	const [addValue, setAddValue] = useState('');

	const commitAddValue = () => {
		const entry = addValue.trim();

		if (entry.length > 0) {
			onChange([...entries, entry]);
			setAddValue('');
		}
	};

	const renderStatus = (entry: string, index: number) => {
		const problem = getEntryProblem(entry);

		if (problem) {
			return (
				<vscode-icon
					slot="content-after"
					name="warning"
					className="validation-entry-warning"
					title={problem}
				/>
			);
		}

		const count = entryCounts[entry.trim()];

		if (count === undefined) {
			return null;
		}

		return (
			<span
				slot="content-after"
				className="setting-input-suffix validation-entry-count"
				role="button"
				title="Preview and edit the matched files…"
				onClick={(e: React.MouseEvent) => {
					e.stopPropagation();
					onEditEntry(entry.trim(), newPattern =>
						onChange(entries.map((current, i) => i === index ? newPattern : current)));
				}}
			>
				{count} file{count === 1 ? '' : 's'}
			</span>
		);
	};

	return (
		<div className="validation-paths-section">
			<div className="validation-paths-header">
				<vscode-label>{label}</vscode-label>
			</div>
			{entries.map((entry, index) => (
				<div key={index} className="validation-paths-row">
					<vscode-textfield
						className="validation-paths-field"
						value={entry}
						placeholder={placeholder}
						onInput={(e: React.FormEvent<HTMLElement>) => {
							const value = (e.target as HTMLInputElement).value;

							onChange(entries.map((current, i) => i === index ? value : current));
						}}
					>
						{renderStatus(entry, index)}
					</vscode-textfield>
					<button
						className="list-remove-button"
						title="Remove"
						onClick={() => onChange(entries.filter((_, i) => i !== index))}
					>
						<i className="codicon codicon-close" />
					</button>
				</div>
			))}
			<div className="validation-paths-row">
				<vscode-textfield
					className="validation-paths-field"
					value={addValue}
					placeholder={placeholder}
					onInput={(e: React.FormEvent<HTMLElement>) => setAddValue((e.target as HTMLInputElement).value)}
					onKeyDown={(e: React.KeyboardEvent<HTMLElement>) => {
						if (e.key === 'Enter') {
							e.preventDefault();
							e.stopPropagation();
							commitAddValue();
						}
					}}
				/>
				<span className="list-remove-button-spacer" />
			</div>
			{footer}
		</div>
	);
}

/**
 * The profile editor's Files tab: separate lists for included and excluded
 * paths, mirroring the index section's `includeFiles` / `excludeFiles`. New
 * entries are only created when Enter is pressed in the add box.
 */
export function ValidationProfilePathsEditor({ includeFiles, excludeFiles, onIncludeChange, onExcludeChange, entryCounts, onRequestEntryCount, onEditEntry }: ValidationProfilePathsEditorProps) {
	// Keep the live per-entry match counts current.
	const validEntries = [...includeFiles, ...excludeFiles]
		.map(entry => entry.trim())
		.filter(entry => entry.length > 0 && isValidPathKey(entry));
	const validEntriesKey = JSON.stringify(validEntries);

	useEffect(() => {
		for (const entry of validEntries) {
			onRequestEntryCount(entry);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [validEntriesKey]);

	return (
		<div className="validation-paths-editor">
			<PathListSection
				label="Included Files"
				placeholder="e.g. **/* or ontologies/*.ttl"
				entries={includeFiles}
				onChange={onIncludeChange}
				entryCounts={entryCounts}
				onEditEntry={onEditEntry}
				footer={includeFiles.length === 0 && (
					<div className="validation-pattern-chips">
						{PATH_SUGGESTIONS.map(suggestion => (
							<vscode-toolbar-button
								className="primary"
								key={suggestion}
								onClick={() => onIncludeChange([...includeFiles, suggestion])}
							>
								{suggestion}
							</vscode-toolbar-button>
						))}
					</div>
				)}
			/>
			<PathListSection
				label="Excluded Paths"
				placeholder="e.g. drafts/** or scratch.ttl"
				entries={excludeFiles}
				onChange={onExcludeChange}
				entryCounts={entryCounts}
				onEditEntry={onEditEntry}
			/>
		</div>
	);
}
