import * as vscode from 'vscode';
import { NotSupportedError } from '@src/utilities/error';
import { PresetGraph } from '@src/services/core/preset-graph';
import { MentorVfsUri } from './mentor-vfs-uri';

const encoder = new TextEncoder();

/**
 * Serves the sources of the preset graphs shipped with Mentor as read-only documents
 * under the `mentor-vfs:` scheme, so that definitions in the framework vocabularies
 * and the preset shape graphs can be opened in an editor.
 */
export class MentorVfsFileSystemProvider implements vscode.FileSystemProvider {
	private readonly _onDidChangeFile = new vscode.EventEmitter<vscode.FileChangeEvent[]>();

	readonly onDidChangeFile = this._onDidChangeFile.event;

	constructor(context: vscode.ExtensionContext) {
		// Self-register with the extension context for automatic disposal.
		context.subscriptions.push(
			vscode.workspace.registerFileSystemProvider(MentorVfsUri.uriScheme, this, {
				isCaseSensitive: true,
				isReadonly: true
			})
		);
	}

	/**
	 * Returns the preset graph a URI addresses.
	 * @param uri A `mentor-vfs:` URI.
	 * @throws A `FileNotFound` error if the URI does not address a preset graph.
	 */
	private _getGraph(uri: vscode.Uri): PresetGraph {
		const graph = MentorVfsUri.getGraph(uri);

		if (!graph) {
			throw vscode.FileSystemError.FileNotFound(uri);
		}

		return graph;
	}

	stat(uri: vscode.Uri): vscode.FileStat {
		const graph = this._getGraph(uri);

		// A fixed mtime keeps VS Code from treating repeated reads as external changes.
		return { type: vscode.FileType.File, ctime: 0, mtime: 0, size: encoder.encode(graph.source).length };
	}

	readFile(uri: vscode.Uri): Uint8Array {
		return encoder.encode(this._getGraph(uri).source);
	}

	writeFile(): void {
		throw new NotSupportedError();
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
