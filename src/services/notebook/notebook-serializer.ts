import * as vscode from 'vscode';
import { container } from 'tsyringe';
import { ServiceToken } from '@src/services/tokens';
import { NOTEBOOK_TYPE } from './notebook-controller';

interface NotebookData {
	metadata?: Record<string, any>;
	cells: NotebookCell[]
}

interface NotebookCell {
	language: string;
	value: string;
	kind: vscode.NotebookCellKind;
	editable?: boolean;
	metadata?: Record<string, any>;
}

/**
 * A regular expression that validates a notebook cell slug.
 * Slugs must start with a lowercase letter or digit and may contain lowercase letters, digits, and hyphens.
 */
const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]*$/;

export class NotebookSerializer implements vscode.NotebookSerializer {

	public readonly label: string = 'Mentor Notebook Serializer';

	constructor() {
		// Self-register with the extension context for automatic disposal
		const context = container.resolve<vscode.ExtensionContext>(ServiceToken.ExtensionContext);
		context.subscriptions.push(
			vscode.workspace.registerNotebookSerializer(NOTEBOOK_TYPE, this, { transientOutputs: true })
		);
	}

	public async deserializeNotebook(data: Uint8Array, _token: vscode.CancellationToken): Promise<vscode.NotebookData> {
		const contents = new TextDecoder().decode(data);

		let raw: NotebookData;

		try {
			raw = JSON.parse(contents);
		} catch {
			raw = { cells: [] };
		}

		// The cell counter is a notebook-level monotonic counter used to generate unique auto-slugs.
		// It only ever increases so that deleted cells do not cause slug reuse.
		let cellCounter: number = raw.metadata?.cellCounter ?? 0;

		// Pass 1: Count all stored slugs (auto or explicit) that have valid format.
		// Slugs appearing more than once are duplicates and cannot be preserved.
		const slugCounts = new Map<string, number>();

		for (const item of raw.cells) {
			const slug = item.metadata?.slug;

			if (slug && SLUG_PATTERN.test(slug)) {
				slugCounts.set(slug, (slugCounts.get(slug) ?? 0) + 1);
			}
		}

		// A set of all slugs that are already "taken" — used to ensure auto-slugs don't collide.
		const usedSlugs = new Set<string>();

		for (const [slug, count] of slugCounts) {
			if (count === 1) {
				usedSlugs.add(slug);
			}
		}

		// Pass 2: Build cells, assigning auto-slugs where needed.
		const cells = raw.cells.map(item => {
			const metadata: Record<string, any> = { ...(item.metadata ?? {}) };
			const existingSlug = metadata.slug as string | undefined;

			// Preserve any stored slug (whether auto or explicit) if it is valid format and unique.
			// slugIsAuto is a signal for the renumber command — not a reason to discard the slug.
			const isValidStored =
				existingSlug &&
				SLUG_PATTERN.test(existingSlug) &&
				slugCounts.get(existingSlug) === 1;

			if (!isValidStored) {
				// Assign a fresh auto-slug using the monotonic counter.
				let slug: string;

				do {
					cellCounter++;
					slug = `cell-${cellCounter}`;
				} while (usedSlugs.has(slug));

				usedSlugs.add(slug);
				metadata.slug = slug;
				metadata.slugIsAuto = true;
			}

			const cell = new vscode.NotebookCellData(item.kind, item.value, item.language);
			cell.metadata = metadata;

			return cell;
		});

		const notebookData = new vscode.NotebookData(cells);
		notebookData.metadata = { ...(raw.metadata ?? {}), cellCounter };

		return notebookData;
	}

	public async serializeNotebook(data: vscode.NotebookData, _token: vscode.CancellationToken): Promise<Uint8Array> {
		const contents: NotebookData = {
			metadata: data.metadata,
			cells: [],
		};

		for (const cell of data.cells) {
			contents.cells.push({
				kind: cell.kind,
				language: cell.languageId,
				metadata: cell.metadata,
				value: cell.value
			});
		}

		return new TextEncoder().encode(JSON.stringify(contents));
	}
}