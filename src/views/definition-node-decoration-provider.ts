import * as vscode from 'vscode';
import * as n3 from 'n3';
import { mentor } from '@/mentor';

/**
 * Indicates the where missing language tags should be decorated.
 */
export enum MissingLanguageTagDecorationScope {
	/**
	 * Disable the decoration of missing language tags.
	 */
	Disabled,
	/**
	 * Decorate missing language tags in all sources.
	 */
	All,
	/**
	 * Decorate missing language tags only in the active document.
	 */
	Document
}

/**
 * A decoration provider that adds a badge to definition tree nodes.
 */
export class DefinitionNodeDecorationProvider implements vscode.FileDecorationProvider {

	private readonly _disabledColor = new vscode.ThemeColor("disabledForeground");

	private _labelPredicates = new Set<string>();

	private readonly _onDidChangeFileDecorations = new vscode.EventEmitter<vscode.Uri | vscode.Uri[] | undefined>();

	readonly onDidChangeFileDecorations? = this._onDidChangeFileDecorations.event;

	private _decorationScope: MissingLanguageTagDecorationScope;

	constructor() {
		this._decorationScope = this._getDecorationScopeFromConfiguration();

		// If the configuration for decorating missing language tags changes, update the decoration provider.
		vscode.workspace.onDidChangeConfiguration((e) => {
			if (e.affectsConfiguration('mentor.definitionTree.decorateMissingLanguageTags')) {
				this._decorationScope = this._getDecorationScopeFromConfiguration();

				this._onDidChangeFileDecorations.fire(undefined);
			}
		});

		mentor.onDidChangeVocabularyContext((context) => {
			if (context) {
				// When the context changes, the label predicates need to be updated.
				this._labelPredicates = new Set(context?.predicates.label ?? []);
			} else {
				this._labelPredicates = new Set();
			}
		});

		mentor.settings.onDidChange("view.activeLanguage", () => {
			// When the active language changes, the decorations need to be updated.
			this._onDidChangeFileDecorations.fire(undefined);
		});
	}

	private _getDecorationScopeFromConfiguration(): MissingLanguageTagDecorationScope {
		const result = mentor.configuration.get('definitionTree.decorateMissingLanguageTags');

		switch (result) {
			case 'Document': {
				return MissingLanguageTagDecorationScope.Document;
			}
			case 'All': {
				return MissingLanguageTagDecorationScope.All;
			}
			default: {
				return MissingLanguageTagDecorationScope.Disabled;
			}
		}
	}

	provideFileDecoration(uri: vscode.Uri, token: vscode.CancellationToken) {
		if (!this._decorationScope) {
			return undefined;
		}

		const context = mentor.activeContext;

		if (!context || !context.primaryLanguage || !context.activeLanguage) {
			// Note: The document may not have a language set if there are no language tags used in the document.
			return undefined;
		}

		const subject = new n3.NamedNode(uri.toString());

		if (!context.references[subject.id]) {
			return undefined;
		}

		let hasLabels = false;

		const graphUris = this._decorationScope === MissingLanguageTagDecorationScope.Document ? context.graphs : undefined;
		const activeLanguage = context.activeLanguage;

		for (let triple of mentor.vocabulary.store.matchAll(graphUris, subject, null, null, false)) {
			if (triple.object.termType !== "Literal" || !this._labelPredicates.has(triple.predicate.value)) {
				// Only enable the decoration if the subject is a subject in the configured graphs (document or entire background).
				hasLabels = true;
				continue;
			}

			// Either there is no language tag (valid for all languages) or the language tag is in the active language.
			if (!triple.object.language || triple.object.language.startsWith(activeLanguage)) {
				return undefined;
			}
		}

		if (!hasLabels) {
			return undefined;
		}

		const result = new vscode.FileDecoration(undefined, undefined, this._disabledColor);
		result.propagate = true;
		result.tooltip = `This definition is not available in the active language @${activeLanguage}.`;

		return result;
	}
}