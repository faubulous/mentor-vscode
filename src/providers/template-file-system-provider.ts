import * as vscode from 'vscode';
import { NotSupportedError } from '@src/utilities/error';
import { getConfig } from '@src/utilities/vscode/config';

/**
 * The URI scheme for editable template documents opened from the Mentor settings UI.
 */
export const TEMPLATE_URI_SCHEME = 'mentor-template';

/**
 * Maps a Mentor language id to the file extension used in template URIs so VS Code picks the
 * matching grammar (and the triplate injection grammar) for the opened document.
 */
const LANGUAGE_EXTENSIONS: Record<string, string> = {
	turtle: '.ttl',
	sparql: '.sparql',
	trig: '.trig',
	n3: '.n3',
	ntriples: '.nt',
	nquads: '.nq',
};

function extensionForLanguage(language: string): string {
	return LANGUAGE_EXTENSIONS[language] ?? '.txt';
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

/**
 * Backs editable template documents under the `mentor-template` scheme. Two URI shapes are served:
 *
 *   `mentor-template:/global/<configKey>.<ext>` — read/write the `mentor.<configKey>` setting.
 *   `mentor-template:/scratch/<token>.<ext>`     — read/write an in-memory buffer; saving fires
 *                                                  {@link onDidSaveScratch}.
 *
 * The scratch backing exists because per-store query-template overrides live only in the settings
 * webview's transient draft until the store is saved — the host cannot read that draft. The webview
 * seeds the buffer before opening the editor and listens for the save event to fold the edit back
 * into its draft. Global templates need no such round-trip: writing the setting triggers
 * `onDidChangeConfiguration`, which re-renders the settings textarea.
 */
export class TemplateFileSystemProvider implements vscode.FileSystemProvider {
	private static readonly _scratch = new Map<string, string>();

	private static readonly _onDidSaveScratch = new vscode.EventEmitter<{ token: string; content: string }>();

	/** Fires after a scratch-backed template is saved, carrying the token and the new content. */
	static readonly onDidSaveScratch = TemplateFileSystemProvider._onDidSaveScratch.event;

	private readonly _onDidChangeFile = new vscode.EventEmitter<vscode.FileChangeEvent[]>();

	readonly onDidChangeFile = this._onDidChangeFile.event;

	constructor(context: vscode.ExtensionContext) {
		// Self-register with the extension context for automatic disposal.
		context.subscriptions.push(
			vscode.workspace.registerFileSystemProvider(TEMPLATE_URI_SCHEME, this, {
				isCaseSensitive: true,
				isReadonly: false
			})
		);
	}

	/** Seeds the in-memory buffer for a scratch token before its editor is opened. */
	static seedScratch(token: string, content: string): void {
		TemplateFileSystemProvider._scratch.set(token, content);
	}

	/** Builds the scratch URI for an opaque token and Mentor language id. */
	static scratchUri(token: string, language: string): vscode.Uri {
		return vscode.Uri.from({ scheme: TEMPLATE_URI_SCHEME, path: `/scratch/${token}${extensionForLanguage(language)}` });
	}

	/** Builds the config-backed URI for a `mentor.<configKey>` setting and Mentor language id. */
	static globalUri(configKey: string, language: string): vscode.Uri {
		return vscode.Uri.from({ scheme: TEMPLATE_URI_SCHEME, path: `/global/${configKey}${extensionForLanguage(language)}` });
	}

	/**
	 * Splits a template URI into its backing kind and identifier. The trailing extension (added only
	 * so VS Code resolves a grammar) is stripped; a config key keeps its embedded dots because only
	 * the final extension segment is removed.
	 */
	private static _parse(uri: vscode.Uri): { kind: 'global' | 'scratch'; id: string } {
		const path = uri.path.replace(/^\/+/, '');
		const slash = path.indexOf('/');
		const kind = path.slice(0, slash) as 'global' | 'scratch';

		let id = path.slice(slash + 1);
		const dot = id.lastIndexOf('.');

		if (dot >= 0) {
			id = id.slice(0, dot);
		}

		return { kind, id };
	}

	private static _currentValue(kind: 'global' | 'scratch', id: string): string {
		return kind === 'scratch'
			? TemplateFileSystemProvider._scratch.get(id) ?? ''
			: getConfig().get<string>(id) ?? '';
	}

	stat(uri: vscode.Uri): vscode.FileStat {
		const { kind, id } = TemplateFileSystemProvider._parse(uri);
		const value = TemplateFileSystemProvider._currentValue(kind, id);

		// A fixed mtime keeps VS Code from treating repeated reads as external changes.
		return { type: vscode.FileType.File, ctime: 0, mtime: 0, size: encoder.encode(value).length };
	}

	readFile(uri: vscode.Uri): Uint8Array {
		const { kind, id } = TemplateFileSystemProvider._parse(uri);

		return encoder.encode(TemplateFileSystemProvider._currentValue(kind, id));
	}

	async writeFile(uri: vscode.Uri, content: Uint8Array): Promise<void> {
		const { kind, id } = TemplateFileSystemProvider._parse(uri);
		const text = decoder.decode(content);

		if (kind === 'scratch') {
			TemplateFileSystemProvider._scratch.set(id, text);
			TemplateFileSystemProvider._onDidSaveScratch.fire({ token: id, content: text });
		} else {
			// Write to the scope that currently holds the value so the editor change is not shadowed
			// by a higher-precedence scope; default to User (Global) when the setting is unset.
			const config = getConfig();
			const inspected = config.inspect(id);
			const target = inspected?.workspaceValue !== undefined
				? vscode.ConfigurationTarget.Workspace
				: vscode.ConfigurationTarget.Global;

			await config.update(id, text, target);
		}

		this._onDidChangeFile.fire([{ type: vscode.FileChangeType.Changed, uri }]);
	}

	readDirectory(): [string, vscode.FileType][] {
		return [];
	}

	createDirectory(): void {
		throw new NotSupportedError();
	}

	delete(): void {
		throw new NotSupportedError();
	}

	rename(): void {
		throw new NotSupportedError();
	}

	watch(): vscode.Disposable {
		return new vscode.Disposable(() => { });
	}
}
