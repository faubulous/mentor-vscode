import * as vscode from 'vscode';
import { mentor } from '@/mentor';
import { ReferenceProvider } from './reference-provider';

/**
 * Provides usage information for resource definitions in Turtle documents.
 */
export class CodeLensProvider implements vscode.CodeLensProvider {
	/**
	 * Indicates whether the workspace has been initialized.
	 */
	private _initialized: boolean = false;

	/**
	 * Indicates whether the provider is initializing.
	 */
	private _initializing: boolean = false;

	/**
	 * Indicates whether the provider is enabled.
	 */
	private _enabled: boolean = true;

	private readonly _referenceProvider: ReferenceProvider = new ReferenceProvider();

	private readonly _onDidChangeCodeLenses = new vscode.EventEmitter<void>();

	onDidChangeCodeLenses: vscode.Event<void> = this._onDidChangeCodeLenses.event;

	constructor() {
		vscode.workspace.onDidChangeConfiguration((e) => {
			if (e.affectsConfiguration('mentor.editor.codeLensEnabled')) {
				this._enabled = mentor.configuration.get('editor.codeLensEnabled', true);

				// Fire the event to refresh the code lenses.
				this._onDidChangeCodeLenses.fire();
			}
		});
	}

	private async _initialize() {
		this._initializing = true;
		this._initialized = false;

		this._enabled = mentor.configuration.get('editor.codeLensEnabled', true);

		mentor.workspaceIndexer.waitForIndexed().then(() => {
			if (this._enabled) {
				this._onDidChangeCodeLenses.fire();
			}
		});

		mentor.onDidChangeVocabularyContext(() => {
			if (this._enabled) {
				this._onDidChangeCodeLenses.fire();
			}
		});

		this._initialized = true;
		this._initializing = false;
	}

	provideCodeLenses(document: vscode.TextDocument, token: vscode.CancellationToken): vscode.ProviderResult<vscode.CodeLens[]> {
		return new Promise(async (resolve, reject) => {
			if (this._initializing) {
				return [];
			}

			if (!this._initialized) {
				await this._initialize();
			}

			if (!this._enabled) {
				return [];
			}

			const context = mentor.contexts[document.uri.toString()];

			if (!context) {
				return [];
			}

			const result = [];

			for (const iri of Object.keys(context.subjects)) {
				for (const range of context.subjects[iri]) {
					let n = Math.max(this._referenceProvider.provideReferencesForIri(iri).length - 1, 0);

					result.push(new vscode.CodeLens(new vscode.Range(
						new vscode.Position(range.start.line, range.start.character),
						new vscode.Position(range.end.line, range.end.character)
					), {
						command: 'mentor.action.findReferences',
						title: n + ' usages',
						arguments: [iri]
					}));
				}
			}

			resolve(result);
		});
	}

	resolveCodeLens?(codeLens: vscode.CodeLens, token: vscode.CancellationToken): vscode.ProviderResult<vscode.CodeLens> {
		throw new Error('Method not implemented.');
	}
}
