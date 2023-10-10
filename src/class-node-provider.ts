import * as vscode from 'vscode';
import * as path from 'path';
import * as n3 from 'n3';
import { ClassRepository, StoreFactory } from '@faubulous/mentor-rdf';
import { UriHelper } from './uri-helper';
import { ClassNode } from './class-node';

export class ClassNodeProvider implements vscode.TreeDataProvider<string> {
	protected readonly nodes: any = {};

	protected store: n3.Store | undefined;

	protected repository: ClassRepository | undefined;

	protected tokens: { [key: string]: n3.Token[] } = {};

	protected namespaces: { [key: string]: string } = {};

	private editor: vscode.TextEditor | undefined;

	private _onDidChangeTreeData: vscode.EventEmitter<string | undefined> = new vscode.EventEmitter<string | undefined>();

	readonly onDidChangeTreeData: vscode.Event<string | undefined> = this._onDidChangeTreeData.event;

	constructor() {
		vscode.workspace.onDidChangeTextDocument((e) => this.onDocumentChanged(e));
		vscode.window.onDidChangeActiveTextEditor(() => this.onActiveEditorChanged());

		this.onActiveEditorChanged();
	}

	private onActiveEditorChanged(): void {
		this.editor = vscode.window.activeTextEditor;

		if (this.editor) {
			if (this.editor.document.uri.scheme === 'file') {
				const file = this.editor.document.uri.fsPath;
				const ext = path.extname(file);
				const enabled = ext === '.ttl' || ext === '.nt';

				vscode.commands.executeCommand('setContext', 'jsonOutlineEnabled', enabled);

				if (enabled) {
					StoreFactory.createFromFile(file).then(store => {
						this.store = store;
						this.repository = new ClassRepository(store);

						this.refresh();
					});

					this.tokens = {};

					const text = this.editor.document.getText();
					const tokens = new n3.Lexer().tokenize(text);

					tokens.forEach((t, i) => {
						if (!t.value) {
							return;
						}

						let v = t.value;

						switch (t.type) {
							case 'prefix': {
								let u = tokens[i + 1].value;

								if (u) {
									this.namespaces[v] = u;
								}

								break;
							}
							case 'prefixed': {
								if (t.prefix) {
									v = this.namespaces[t.prefix] + t.value;

									if (!this.tokens[v]) {
										this.tokens[v] = [];
									}

									this.tokens[v].push(t);
								}
								break;
							}
							case 'IRI': {
								if (!this.tokens[v]) {
									this.tokens[v] = [];
								}

								this.tokens[v].push(t);
								break;
							}
						}
					});
				}
			}
		} else {
			vscode.commands.executeCommand('setContext', 'jsonOutlineEnabled', false);
		}
	}

	private onDocumentChanged(changeEvent: vscode.TextDocumentChangeEvent): void {
		// if (this.tree && this.autoRefresh && changeEvent.document.uri.toString() === this.editor?.document.uri.toString()) {
		// 	for (const change of changeEvent.contentChanges) {
		// 		const path = json.getLocation(this.text, this.editor.document.offsetAt(change.range.start)).path;
		// 		path.pop();
		// 		const node = path.length ? json.findNodeAtLocation(this.tree, path) : void 0;
		// 		this.parseTree();
		// 		this._onDidChangeTreeData.fire(node ? node.offset : void 0);
		// 	}
		// }
	}

	refresh(offset?: number): void {
		this._onDidChangeTreeData.fire(undefined);
	}

	getChildren(uri: string): string[] {
		if (!this.repository) {
			return [];
		}

		const result = this.repository.getSubClasses(uri).sort().map(u => this.getNode(u));

		return result;
	}

	getTreeItem(uri: string): vscode.TreeItem {
		if (!this.repository) {
			throw new Error('Invalid repostory.');
		}

		if (!this.editor) {
			throw new Error('Invalid editor.');
		}

		const collapsible = this.repository.hasSubClasses(uri) ?
			vscode.TreeItemCollapsibleState.Collapsed :
			vscode.TreeItemCollapsibleState.None;

		// const workbench = vscode.workspace.getConfiguration("workbench");

		// const colorCustomizations: any = workbench.get("colorCustomizations");

		// workbench.update(
		// 	"colorCustomizations",
		// 	{
		// 		...colorCustomizations,
		// 		"rdf.ns0": "#006EAE",
		// 	},
		// 	1,
		// );

		return new ClassNode(
			vscode.Uri.parse(uri),
			this._getNodeLabel(uri),
			this._getNodeIcon(uri),
			collapsible
		);
	}

	select(uri: string) {
		if (this.editor && this.tokens[uri]) {
			const t = this.tokens[uri].sort((a: any, b: any) => a.start - b.start)[0] as any;
			const r = new vscode.Range(t.line - 1, t.start, t.line - 1, t.end);

			this.editor.selection = new vscode.Selection(r.start, r.end);
			this.editor.revealRange(r, vscode.TextEditorRevealType.InCenter);
		}
	}

	getParent(uri: string): string | undefined {
		return undefined;
	}

	getNode(uri: string): string {
		if (!this.nodes[uri]) {
			this.nodes[uri] = uri;
		}

		return this.nodes[uri];
	}

	private _getNodeLabel(uri: string): vscode.TreeItemLabel {
		let label: string;
		let n = uri.lastIndexOf('#');

		if (n > -1) {
			label = uri.substring(n + 1);
		} else {
			label = uri.substring(uri.lastIndexOf('/') + 1);
		}

		return {
			label: label,
			highlights: uri.length > 1 ? [[uri.length - 2, uri.length - 1]] : void 0
		}
	}

	private _getNodeIcon(uri: string) {
		const id = UriHelper.toJsonId(UriHelper.getNamespaceUri(uri));
		const color = new vscode.ThemeColor('mentor.colors.' + id);

		let icon = 'rdf-class';

		if (!this.repository) {
			return new vscode.ThemeIcon(icon, color);
		}

		if (!this.repository.hasSubject(uri)) {
			icon += '-ref';
		}

		if (this.repository.hasEquivalentClass(uri)) {
			icon += '-eq';
		}

		return new vscode.ThemeIcon(icon, color);
	}
}