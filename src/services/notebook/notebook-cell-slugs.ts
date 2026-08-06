import * as vscode from 'vscode';

/**
 * Returns the highest auto-generated slug number (`cell-<n>`) in the notebook.
 * @param notebook The notebook document.
 * @returns The highest auto-generated slug number, or 0 if none exist.
 */
export function getMaxCellSlugNumber(notebook: vscode.NotebookDocument): number {
	const slugPattern = /^cell-(\d+)$/;

	let maxNumber = 0;

	for (const c of notebook.getCells()) {
		const slug: string | undefined = c.metadata?.slug;
		const match = typeof slug === 'string' ? slug.match(slugPattern) : null;

		if (match) {
			const n = parseInt(match[1], 10);

			if (n > maxNumber) {
				maxNumber = n;
			}
		}
	}

	return maxNumber;
}
