/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
import * as path from 'path';
import * as vscode from 'vscode';
import { getOuterMostWorkspaceFolder } from '../utilities';
import { LanguageClientBase } from '../language-client';

const clients: Map<string, LanguageClientBase> = new Map();

class TurtleLanguageClient extends LanguageClientBase {
	get serverPath(): string {
		return path.join('out', 'turtle-server.js');
	}

	get languageName(): string {
		return 'Turtle';
	}

	get languageId(): string {
		return 'turtle';
	}
}

export function activate(context: vscode.ExtensionContext) {
	function didOpenTextDocument(document: vscode.TextDocument): void {
		// We are only interested in language mode text
		if (document.languageId !== 'turtle') {
			return;
		}

		let folder = vscode.workspace.getWorkspaceFolder(document.uri);

		// Files outside a folder can't be handled. This might depend on the language.
		// Single file languages like JSON might handle files outside the workspace folders.
		if (!folder) {
			return;
		}

		folder = getOuterMostWorkspaceFolder(folder);

		if (clients.has(folder.uri.toString())) {
			return;
		}

		let client = new TurtleLanguageClient(folder);
		client.activate(context);

		clients.set(folder.uri.toString(), client);
	}

	vscode.workspace.onDidOpenTextDocument(didOpenTextDocument);
	vscode.workspace.textDocuments.forEach(didOpenTextDocument);
	vscode.workspace.onDidChangeWorkspaceFolders((event) => {
		for (const folder of event.removed.map(f => f.uri.toString())) {
			const client = clients.get(folder);

			if (client) {
				clients.delete(folder);
				client.deactivate();
			}
		}
	});
}

export function deactivate(): Thenable<void> {
	const promises: Thenable<void>[] = [];

	for (const client of clients.values()) {
		promises.push(client.deactivate());
	}

	return Promise.all(promises).then(() => undefined);
}

