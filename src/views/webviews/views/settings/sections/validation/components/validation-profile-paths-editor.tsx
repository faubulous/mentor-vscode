import * as React from 'react';
import { useEffect, useState } from 'react';
import { isValidPathKey } from '@src/services/validation/shacl-validation-configuration';
import { useDebouncedValue } from '@src/views/webviews/hooks';

/**
 * Ready-made starting points offered as one-click suggestions.
 */
const PATH_SUGGESTIONS = ['**/*', '**/*.ttl', '**/*.(ttl|n3)'];

/**
 * Live file counts for the profile draft as a whole.
 */
export interface ValidationProfileDraftCounts {
	/**
	 * Files the profile applies to (includes minus excludes); undefined while loading.
	 */
	matched?: number;

	/**
	 * Files the exclusions carve out of the includes; undefined while loading or
	 * without exclusions.
	 */
	excluded?: number;
}

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
	 * Live counts for the draft as a whole, shown as the summary line.
	 */
	draftCounts: ValidationProfileDraftCounts;

	/**
	 * Requests the draft's aggregate counts for the given lists.
	 */
	onRequestDraftCounts: (includeFiles: string[], excludeFiles: string[]) => void;

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

/**
 * Trims entries, keeps only the ones that can be matched, and drops duplicates.
 * Used to build the lists the counts are requested for, which combine the
 * committed entries with the text currently typed into an add box.
 */
export function toValidEntries(entries: readonly (string | undefined)[]): string[] {
	const result: string[] = [];

	for (const entry of entries) {
		const trimmed = entry?.trim() ?? '';

		if (trimmed.length > 0 && isValidPathKey(trimmed) && !result.includes(trimmed)) {
			result.push(trimmed);
		}
	}

	return result;
}

interface PathListSectionProps {
	label: string;

	placeholder: string;

	entries: string[];

	onChange: (entries: string[]) => void;

	/**
	 * The uncommitted text of the add box. Owned by the parent so the summary can
	 * count it alongside the committed entries.
	 */
	addValue: string;

	onAddValueChange: (value: string) => void;

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
 * entries), and an add box that commits on Enter. The add box shows the same
 * live count while typing, so the effect of a pattern is visible before it is
 * committed — which matters most for the first entry of a list, where there is
 * no committed row to read a count from yet.
 */
function PathListSection({ label, placeholder, entries, onChange, addValue, onAddValueChange, entryCounts, onEditEntry, footer }: PathListSectionProps) {
	const commitAddValue = () => {
		const entry = addValue.trim();

		if (entry.length > 0) {
			onChange([...entries, entry]);
			onAddValueChange('');
		}
	};

	/**
	 * The in-input indicator: a warning for an invalid entry, otherwise the live
	 * match count, which opens the interactive pattern editor when clicked.
	 * @param entry The raw entry text.
	 * @param apply Writes an edited pattern back to wherever the entry lives.
	 */
	const renderStatus = (entry: string, apply: (newPattern: string) => void) => {
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

		const trimmed = entry.trim();
		const count = trimmed.length > 0 ? entryCounts[trimmed] : undefined;

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
					onEditEntry(trimmed, apply);
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
						{renderStatus(entry, newPattern =>
							onChange(entries.map((current, i) => i === index ? newPattern : current)))}
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
					onInput={(e: React.FormEvent<HTMLElement>) => onAddValueChange((e.target as HTMLInputElement).value)}
					onKeyDown={(e: React.KeyboardEvent<HTMLElement>) => {
						if (e.key === 'Enter') {
							e.preventDefault();
							e.stopPropagation();
							commitAddValue();
						}
					}}
				>
					{renderStatus(addValue, onAddValueChange)}
				</vscode-textfield>
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
 *
 * Every count — per pattern and the summary — is computed over the committed
 * entries *plus* whatever is currently typed into the two add boxes. A pattern
 * that shows its own match count has to be reflected in the totals as well;
 * counting only committed entries would report the unexcluded total next to an
 * exclusion that visibly matches files.
 */
export function ValidationProfilePathsEditor({ includeFiles, excludeFiles, onIncludeChange, onExcludeChange, entryCounts, onRequestEntryCount, draftCounts, onRequestDraftCounts, onEditEntry }: ValidationProfilePathsEditorProps) {
	const [pendingInclude, setPendingInclude] = useState('');
	const [pendingExclude, setPendingExclude] = useState('');

	const effectiveIncludes = toValidEntries([...includeFiles, pendingInclude]);
	const effectiveExcludes = toValidEntries([...excludeFiles, pendingExclude]);

	// Keep the live per-entry and aggregate match counts current, off the
	// keystroke path: every count walks the workspace file list on the host.
	const draftKey = JSON.stringify([effectiveIncludes, effectiveExcludes]);
	const settledDraftKey = useDebouncedValue(draftKey);

	useEffect(() => {
		const [includes, excludes] = JSON.parse(settledDraftKey) as [string[], string[]];

		for (const entry of new Set([...includes, ...excludes])) {
			onRequestEntryCount(entry);
		}

		onRequestDraftCounts(includes, excludes);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [settledDraftKey]);

	return (
		<div className="validation-paths-editor">
			<PathListSection
				label="Included Files"
				placeholder="e.g. **/* or ontologies/*.ttl"
				entries={includeFiles}
				onChange={onIncludeChange}
				addValue={pendingInclude}
				onAddValueChange={setPendingInclude}
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
								<span className="label">{suggestion}</span>
							</vscode-toolbar-button>
						))}
					</div>
				)}
			/>
			<PathListSection
				label="Excluded Files"
				placeholder="e.g. drafts/** or scratch.ttl"
				entries={excludeFiles}
				onChange={onExcludeChange}
				addValue={pendingExclude}
				onAddValueChange={setPendingExclude}
				entryCounts={entryCounts}
				onEditEntry={onEditEntry}
			/>
			<ValidationProfilePathsSummary
				hasIncludes={effectiveIncludes.length > 0}
				hasExcludes={effectiveExcludes.length > 0}
				counts={draftCounts}
			/>
		</div>
	);
}

interface ValidationProfilePathsSummaryProps {
	hasIncludes: boolean;

	hasExcludes: boolean;

	counts: ValidationProfileDraftCounts;
}

/**
 * The aggregate effect of the draft's path lists: the files the profile applies
 * to and, when exclusions are present, how many files they carve out.
 */
function ValidationProfilePathsSummary({ hasIncludes, hasExcludes, counts }: ValidationProfilePathsSummaryProps) {
	if (!hasIncludes) {
		return (
			<p className="section-description validation-paths-summary">
				Without an included path this profile matches no files.
			</p>
		);
	}

	if (counts.matched === undefined) {
		return null;
	}

	return (
		<p className="section-description validation-paths-summary">
			<span className="validation-paths-summary-matched">
				{counts.matched} matched file{counts.matched === 1 ? '' : 's'}
			</span>
			{hasExcludes && counts.excluded !== undefined && (
				<span> · {counts.excluded} excluded file{counts.excluded === 1 ? '' : 's'}</span>
			)}
		</p>
	);
}
