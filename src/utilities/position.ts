import * as vscode from 'vscode';

/**
 * Maps a 0-based character offset to a {@link vscode.Position}. Satisfied by
 * `vscode.TextDocument.positionAt` and by {@link createPositionMapper}.
 */
export type PositionMapper = (offset: number) => vscode.Position;

/**
 * Builds an offset → {@link vscode.Position} mapper for a string, mirroring
 * `vscode.TextDocument.positionAt`. This lets diagnostics be computed from raw
 * file content — as produced by the workspace indexer — without opening a
 * `vscode.TextDocument`, which is the dominant per-file cost during indexing.
 *
 * Lines are split on `\n`; a `\r` in a `\r\n` sequence counts as a character of
 * the preceding line, matching the raw offsets the lexer/parser produce over the
 * same string. Offsets are clamped to `[0, content.length]`.
 * @param content The document text.
 * @returns A function mapping a 0-based character offset to a position.
 */
export function createPositionMapper(content: string): PositionMapper {
	// Start offset of each line: line 0 starts at 0, every char after a '\n'
	// begins a new line.
	const lineStarts: number[] = [0];

	for (let i = 0; i < content.length; i++) {
		if (content.charCodeAt(i) === 10 /* \n */) {
			lineStarts.push(i + 1);
		}
	}

	return (offset: number): vscode.Position => {
		const clamped = Math.max(0, Math.min(offset, content.length));

		// Binary search for the last line whose start offset is <= clamped.
		let low = 0;
		let high = lineStarts.length - 1;

		while (low < high) {
			const mid = (low + high + 1) >> 1;

			if (lineStarts[mid] <= clamped) {
				low = mid;
			} else {
				high = mid - 1;
			}
		}

		return new vscode.Position(low, clamped - lineStarts[low]);
	};
}
