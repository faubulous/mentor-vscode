import * as vscode from 'vscode';
import * as path from 'path';
import * as n3 from 'n3';
import { OwlReasoner, StoreFactory } from '@faubulous/mentor-rdf';
import { mentor, VocabularyContext } from './mentor';

export abstract class TreeNodeProvider<T> implements vscode.TreeDataProvider<string> {
	protected readonly nodes: any = {};

	protected context: VocabularyContext | undefined;

	protected repository: T | undefined;

	protected tokens: { [key: string]: n3.Token[] } = {};

	protected namespaces: { [key: string]: string } = {};

	protected showReferenced: boolean = false;

	protected autoRefresh: boolean = true;

	protected editor: vscode.TextEditor | undefined;

	private _onDidChangeTreeData: vscode.EventEmitter<string | undefined> = new vscode.EventEmitter<string | undefined>();

	readonly onDidChangeTreeData: vscode.Event<string | undefined> = this._onDidChangeTreeData.event;

	constructor() {
		vscode.workspace.onDidChangeTextDocument((e) => this.onDocumentChanged(e));
		vscode.window.onDidChangeActiveTextEditor(() => this.onActiveEditorChanged());

		this.onActiveEditorChanged();
	}

	protected onActiveEditorChanged(): void {
		this.editor = vscode.window.activeTextEditor;

		if (this.editor && this.editor.document.uri.scheme === 'file') {
			let enabled = false;

			const uri = this.editor.document.uri.toString();

			this.context = mentor.contexts[uri];

			if (!this.context) {
				enabled = this.loadDocument(uri);
			} else {
				this.onStoreInitialized();
			}

			vscode.commands.executeCommand('setContext', 'jsonOutlineEnabled', enabled);
		} else {
			vscode.commands.executeCommand('setContext', 'jsonOutlineEnabled', false);
		}
	}

	private loadDocument(uri: string): boolean {
		if (!this.editor) {
			return false;
		}

		const ext = path.extname(this.editor.document.uri.fsPath);
		const enabled = ext === '.ttl' || ext === '.nt';

		if (enabled) {
			const graphUri = this.editor.document.uri.toString();
			const text = this.editor.document.getText();

			StoreFactory.createFromStream(text, graphUri).then(store => {
				new OwlReasoner().expand(store, graphUri, graphUri + "#inference");

				this.context = new VocabularyContext(store);

				mentor.contexts[uri] = this.context;

				this.onStoreInitialized();
			});

			this.tokens = {};

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

		return enabled;
	}

	protected onDocumentChanged(changeEvent: vscode.TextDocumentChangeEvent): void {
		if (this.autoRefresh && changeEvent.document.uri.toString() === this.editor?.document.uri.toString()) {
			for (const change of changeEvent.contentChanges) {
				console.warn(change);

				// const path = json.getLocation(this.text, this.editor.document.offsetAt(change.range.start)).path;
				// path.pop();
				// const node = path.length ? json.findNodeAtLocation(this.tree, path) : void 0;
				// this.parseTree();
				// this._onDidChangeTreeData.fire(node ? node.offset : void 0);


				this._onDidChangeTreeData.fire(void 0);
			}
		}
	}

	protected abstract onStoreInitialized(): void;

	toggleReferenced() {
		this.showReferenced = !this.showReferenced;
	}

	refresh(): void {
		this._onDidChangeTreeData.fire(void 0);
	}

	select(uri: string) {
		if (this.editor && this.tokens[uri]) {
			const t = this.tokens[uri].sort((a: any, b: any) => a.start - b.start)[0] as any;
			const r = new vscode.Range(t.line - 1, t.start, t.line - 1, t.end);

			this.editor.selection = new vscode.Selection(r.start, r.end);
			this.editor.revealRange(r, vscode.TextEditorRevealType.InCenter);
		}
	}

	getNode(uri: string): string {
		if (!this.nodes[uri]) {
			this.nodes[uri] = uri;
		}

		return this.nodes[uri];
	}

	abstract getParent(uri: string): string | undefined;

	abstract getChildren(uri: string): string[];

	abstract getTreeItem(uri: string): vscode.TreeItem;
}