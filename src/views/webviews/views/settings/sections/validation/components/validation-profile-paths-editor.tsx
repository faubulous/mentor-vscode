import * as React from 'react';
import { useEffect, useState } from 'react';
import { isExclusionEntry, isValidPathKey, stripExclusionPrefix } from '@src/services/validation/shacl-validation-configuration';

/**
 * Ready-made starting points offered as one-click suggestions.
 */
const PATH_SUGGESTIONS = ['**/*', 'ontologies/*', '**/*.ttl'];

export interface ValidationProfilePathsEditorProps {
	/**
	 * The raw path entries of the profile draft, exclusions carrying their `!` prefix.
	 */
	paths: string[];

	onChange: (paths: string[]) => void;

	/**
	 * Live matched-file counts per (positive) pattern; undefined entries are still loading.
	 */
	entryCounts: Record<string, number | undefined>;

	/**
	 * Requests a live match count for a (positive) pattern.
	 */
	onRequestEntryCount: (pattern: string) => void;

	/**
	 * Opens the interactive pattern editor (a host quick pick previewing the
	 * matched files); `apply` is invoked with the confirmed pattern.
	 */
	onEditEntry: (pattern: string, apply: (newPattern: string) => void) => void;

	/**
	 * Renders the lists as a read-only viewer (built-in presets).
	 */
	readOnly?: boolean;
}

/**
 * Splits raw entries into included patterns and (`!`-stripped) exclusions.
 */
function splitEntries(paths: readonly string[]): { included: string[]; excluded: string[] } {
	const included: string[] = [];
	const excluded: string[] = [];

	for (const entry of paths) {
		if (isExclusionEntry(entry)) {
			excluded.push(stripExclusionPrefix(entry));
		} else {
			included.push(entry);
		}
	}

	return { included, excluded };
}

/**
 * Merges the section lists back into the stored form, re-prefixing exclusions.
 */
function mergeEntries(included: readonly string[], excluded: readonly string[]): string[] {
	return [...included, ...excluded.map(entry => `!${entry}`)];
}

/**
 * Why an entry is invalid, or undefined when it is fine.
 */
function getEntryProblem(entry: string, isExclusion: boolean): string | undefined {
	const trimmed = entry.trim();

	if (!isExclusion && trimmed.startsWith('!')) {
		return 'Use the Excluded paths section for exclusions.';
	}

	if (trimmed.length > 0 && !isValidPathKey(trimmed)) {
		return 'Paths must be workspace-relative, without .. segments or absolute paths.';
	}

	return undefined;
}

interface PathListSectionProps {
	label: string;

	placeholder: string;

	/**
	 * Whether the section holds `!` exclusions (prefix stripped for display).
	 */
	isExclusion: boolean;

	entries: string[];

	onChange: (entries: string[]) => void;

	entryCounts: Record<string, number | undefined>;

	onEditEntry: (pattern: string, apply: (newPattern: string) => void) => void;

	/**
	 * Renders the list as a read-only viewer: no add row, no removals, no edits.
	 */
	readOnly?: boolean;

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
function PathListSection({ label, placeholder, isExclusion, entries, onChange, entryCounts, onEditEntry, readOnly, footer }: PathListSectionProps) {
	const [addValue, setAddValue] = useState('');

	const commitAddValue = () => {
		// Exclusions are entered without the prefix; strip a typed one so the
		// value stays in display form.
		const entry = isExclusion ? addValue.trim().replace(/^!+/, '') : addValue.trim();

		if (entry.length > 0) {
			onChange([...entries, entry]);
			setAddValue('');
		}
	};

	const renderStatus = (entry: string, index: number) => {
		const problem = getEntryProblem(entry, isExclusion);

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

		if (readOnly) {
			return (
				<span slot="content-after" className="setting-input-suffix">
					{count} file{count === 1 ? '' : 's'}
				</span>
			);
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
						disabled={readOnly}
						onInput={(e: React.FormEvent<HTMLElement>) => {
							const value = (e.target as HTMLInputElement).value;

							onChange(entries.map((current, i) => i === index ? value : current));
						}}
					>
						{renderStatus(entry, index)}
					</vscode-textfield>
					{readOnly ? (
						<span className="list-remove-button-spacer" />
					) : (
						<button
							className="list-remove-button"
							title="Remove"
							onClick={() => onChange(entries.filter((_, i) => i !== index))}
						>
							<i className="codicon codicon-close" />
						</button>
					)}
				</div>
			))}
			{!readOnly && (
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
			)}
			{!readOnly && footer}
		</div>
	);
}

/**
 * The profile editor's Paths tab: separate lists for included and excluded
 * paths. Exclusions are displayed without their `!` prefix and re-prefixed
 * when written back into the draft. New entries are only created when Enter
 * is pressed in the add box.
 */
export function ValidationProfilePathsEditor({ paths, onChange, entryCounts, onRequestEntryCount, onEditEntry, readOnly }: ValidationProfilePathsEditorProps) {
	const { included, excluded } = splitEntries(paths);

	// Keep the live per-entry match counts current.
	const validEntries = [...included, ...excluded]
		.map(entry => entry.trim())
		.filter(entry => entry.length > 0 && isValidPathKey(entry) && !isExclusionEntry(entry));
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
				isExclusion={false}
				entries={included}
				onChange={next => onChange(mergeEntries(next, excluded))}
				entryCounts={entryCounts}
				onEditEntry={onEditEntry}
				readOnly={readOnly}
				footer={included.length === 0 && (
					<div className="validation-pattern-chips">
						{PATH_SUGGESTIONS.map(suggestion => (
							<vscode-badge
								key={suggestion}
								className="validation-pattern-chip"
								onClick={() => onChange(mergeEntries([...included, suggestion], excluded))}
							>
								{suggestion}
							</vscode-badge>
						))}
					</div>
				)}
			/>
			<PathListSection
				label="Excluded Paths"
				placeholder="e.g. drafts/** or scratch.ttl"
				isExclusion={true}
				entries={excluded}
				onChange={next => onChange(mergeEntries(included, next))}
				entryCounts={entryCounts}
				onEditEntry={onEditEntry}
				readOnly={readOnly}
			/>
		</div>
	);
}
