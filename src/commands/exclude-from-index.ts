import * as vscode from 'vscode';
import { Utils } from 'vscode-uri';
import { container } from 'tsyringe';
import { ServiceToken } from '@src/services/tokens';
import { IViewRouter } from '@src/views/webviews';
import { WorkspaceUri } from '@src/providers/workspace-uri';
import { getConfig } from '@src/utilities/vscode/config';

const EXCLUDE_KEY = 'index.excludeFiles';
const DEFAULT_EXCLUDES = ['**/.vscode/**', '**/.git/**', '**/node_modules/**'];

/**
 * Computes the exclude glob for a single tree node URI, relative to the
 * effective monorepo root. This matches the path space used by the indexer's
 * include/exclude matching (via {@link WorkspaceUri}), so a path like
 * `mentor-rdf-parsers/src/n3` is scoped to that subproject rather than every
 * workspace folder.
 * @param uri The node URI string from the workspace tree.
 * @returns The glob pattern, or `undefined` if a relative path cannot be derived.
 */
export function getExcludeGlobForUri(uri: string): string | undefined {
	const resourceUri = vscode.Uri.parse(uri);
	const isDirectory = Utils.extname(resourceUri) === '';

	const workspaceUri = WorkspaceUri.toWorkspaceUri(resourceUri);

	// Strip the leading slash so the pattern is root-relative (e.g. `a/b/**`).
	const relativePath = workspaceUri?.path.replace(/^\/+/, '');

	// Guard against empty results and the root itself, which would otherwise
	// produce a meaningless `/**` pattern.
	if (!relativePath) {
		return undefined;
	} else {
		return isDirectory ? `${relativePath}/**` : relativePath;
	}
}

/**
 * Adds the selected workspace tree node(s) to the `mentor.index.excludeFiles`
 * setting and opens the Indexing settings page. The workspace is not reindexed
 * automatically — the user applies the changes from that page when ready.
 */
export const excludeFromIndex = {
	id: 'mentor.command.excludeFromIndex',
	handler: async (clicked: string, selected?: string[]) => {
		// Context menu invocations pass the clicked node plus the full selection.
		const uris = Array.from(new Set(selected?.length ? selected : clicked ? [clicked] : []));

		if (uris.length === 0) {
			return;
		}

		const globs: string[] = [];

		for (const uri of uris) {
			const glob = getExcludeGlobForUri(uri);

			if (glob && !globs.includes(glob)) {
				globs.push(glob);
			}
		}

		if (globs.length === 0) {
			return;
		}

		const config = getConfig();
		const current = config.get<string[]>(EXCLUDE_KEY, DEFAULT_EXCLUDES);
		const merged = [...current];

		for (const glob of globs) {
			if (!merged.includes(glob)) {
				merged.push(glob);
			}
		}

		await config.update(EXCLUDE_KEY, merged, vscode.ConfigurationTarget.Workspace);

		// Open the Indexing settings so the user can review the exclude patterns
		// and reindex from there. The workspace is intentionally not reindexed here.
		const router = container.resolve<IViewRouter>(ServiceToken.WebviewRouter);
		await router.open({ kind: 'settings', section: 'workspace.indexing' });
	}
};
