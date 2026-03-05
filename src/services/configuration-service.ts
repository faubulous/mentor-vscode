import * as vscode from "vscode";

/**
 * Injectable wrapper providing configuration getter.
 * Returns fresh configuration on each call to capture updates.
 */
export class ConfigurationService {
	config(): vscode.WorkspaceConfiguration {
		return vscode.workspace.getConfiguration('mentor');
	}

	/**
	 * Gets the list of patterns to exclude from indexing operations.
	 * @param workspaceUri The workspace URI to get patterns for.
	 * @returns An array of glob patterns to exclude.
	 */
	async getExcludePatterns(workspaceUri: vscode.Uri): Promise<string[]> {
		const config = this.config();
		const result = new Set<string>();

		// Add the patterns from the configuration.
		for (const pattern of config.get<string[]>('index.ignoreFolders', [])) {
			result.add(pattern);
		}

		// Add the patterns from the .gitignore file if enabled.
		if (config.get<boolean>('index.useGitIgnore')) {
			const gitignore = vscode.Uri.joinPath(workspaceUri, '.gitignore');

			try {
				const content = await vscode.workspace.fs.readFile(gitignore);

				const excludePatterns = new TextDecoder().decode(content)
					.split('\n')
					.filter(line => !line.startsWith('#') && line.trim() !== '');

				for (const pattern of excludePatterns) {
					result.add(pattern);
				}
			} catch {
				// If the .gitignore file does not exist, ignore it.
			}
		}

		return Array.from(result);
	}
}
