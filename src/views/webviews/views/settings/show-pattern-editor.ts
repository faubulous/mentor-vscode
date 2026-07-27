import * as vscode from 'vscode';

/**
 * How many matching files the interactive pattern editor lists at most.
 */
const PATTERN_EDITOR_MAX_ITEMS = 50;

/**
 * A file the edited pattern currently matches.
 */
export interface PatternEditorMatch {
	/**
	 * The path shown in the preview list.
	 */
	path: string;

	/**
	 * The file opened when the item is picked. Omit for matches that have no
	 * editable document.
	 */
	uri?: vscode.Uri;
}

export interface PatternEditorOptions {
	/**
	 * The pattern the editor opens with.
	 */
	pattern: string;

	/**
	 * The quick pick title, shown with the live match count appended.
	 */
	title?: string;

	/**
	 * The quick pick input placeholder.
	 */
	placeholder?: string;

	/**
	 * Whether a typed value can match anything at all. Values rejected here
	 * preview no files without {@link getMatches} being consulted.
	 */
	isValidPattern?: (pattern: string) => boolean;

	/**
	 * Returns the files the given (trimmed, valid) pattern matches. Called on
	 * every keystroke, so it should read from a prepared candidate list rather
	 * than walking the workspace.
	 */
	getMatches: (pattern: string) => PatternEditorMatch[];
}

/**
 * Opens the interactive pattern editor: a quick pick whose input holds the
 * pattern and whose items preview the workspace files it currently matches,
 * updating live while typing. Accepting the typed value resolves with the
 * confirmed pattern; picking a file item instead opens that file in an editor
 * and leaves the pattern unchanged. Resolves with `undefined` when dismissed.
 *
 * Shared by every settings section that edits file patterns (SHACL validation
 * profiles, workspace indexing) so the editing experience and the preview
 * semantics stay identical; each caller supplies its own matcher.
 */
export function showPatternEditor(options: PatternEditorOptions): Promise<string | undefined> {
	const {
		pattern,
		title = 'Edit Path Pattern',
		placeholder = 'Glob pattern or workspace-relative file path, e.g. ontologies/* or **/*.ttl',
		isValidPattern,
		getMatches,
	} = options;

	type PatternEditorItem = vscode.QuickPickItem & { fileUri?: vscode.Uri };

	const quickPick = vscode.window.createQuickPick<PatternEditorItem>();
	quickPick.placeholder = placeholder;
	quickPick.value = pattern;

	const updateItems = (value: string) => {
		const trimmed = value.trim();

		const matches = trimmed.length > 0 && (isValidPattern?.(trimmed) ?? true)
			? getMatches(trimmed)
			: [];

		quickPick.title = `${title} — ${matches.length} file${matches.length === 1 ? '' : 's'} match`;

		// The quick pick's built-in filtering would fight the glob input, so
		// every item opts out of it via alwaysShow. The paths live in the
		// description rather than the label: labels are fuzzy-matched against
		// the typed value and get blue/bold match highlights, descriptions are
		// not, so the items render uniformly.
		quickPick.items = matches.length === 0
			? [{ label: '$(info)', description: 'No files match this pattern.', alwaysShow: true }]
			: [
				...matches.slice(0, PATTERN_EDITOR_MAX_ITEMS).map(({ path, uri }) => ({
					label: '$(go-to-file)',
					description: path,
					alwaysShow: true,
					fileUri: uri,
				})),
				...(matches.length > PATTERN_EDITOR_MAX_ITEMS
					? [{
						label: '$(ellipsis)',
						description: `${matches.length - PATTERN_EDITOR_MAX_ITEMS} more files`,
						alwaysShow: true,
					}]
					: []),
			];

		// Keep the input's Enter bound to confirming the typed pattern: without
		// an active item, accepting does not select the first file.
		quickPick.activeItems = [];
	};

	updateItems(pattern);

	return new Promise<string | undefined>((resolve) => {
		let result: string | undefined;

		quickPick.onDidChangeValue(updateItems);

		quickPick.onDidAccept(async () => {
			const selected = quickPick.selectedItems[0];

			if (selected?.fileUri) {
				// A file item was picked — open it and leave the pattern unchanged.
				quickPick.hide();
				await vscode.window.showTextDocument(selected.fileUri);
				return;
			}

			const value = quickPick.value.trim();

			if (value.length > 0) {
				result = value;
			}

			quickPick.hide();
		});

		quickPick.onDidHide(() => {
			resolve(result);
			quickPick.dispose();
		});

		quickPick.show();
	});
}
