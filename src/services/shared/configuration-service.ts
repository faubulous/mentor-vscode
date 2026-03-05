import * as vscode from "vscode";

/**
 * Provides access to the extension's configuration settings. This service abstracts 
 * away direct calls to vscode.workspace.getConfiguration and provides typed access to 
 * configuration values. It also includes helper methods for retrieving specific 
 * configuration values, such as exclude patterns for indexing.
 */
export class ConfigurationService {
	/**
	 * Gets the VS Code workspace configuration for the 'mentor' extension.
	 */
	get config(): vscode.WorkspaceConfiguration {
		return vscode.workspace.getConfiguration('mentor');
	}

	/**
	 * Return a value from the configuration, or undefined if it doesn't exist.
	 * @param key The key of the configuration value to get.
	 * @param defaultValue An optional default value to return if the configuration value is not set.
	 */
	get<T>(key: string): T | undefined;
	get<T>(key: string, defaultValue: T): T;
	get<T>(key: string, defaultValue?: T): T | undefined {
		return this.config.get<T>(key, defaultValue!);
	}

	/**
	 * Gets the list of patterns to exclude from indexing operations.
	 * @param workspaceUri The workspace URI to get patterns for.
	 * @returns An array of glob patterns to exclude.
	 */
	async getExcludePatterns(workspaceUri: vscode.Uri): Promise<string[]> {
		const result = new Set<string>();

		// Add the patterns from the configuration.
		for (const pattern of this.get<string[]>('index.ignoreFolders', [])) {
			result.add(pattern);
		}

		// Add the patterns from the .gitignore file if enabled.
		if (this.get<boolean>('index.useGitIgnore')) {
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
