import * as vscode from 'vscode';
import * as n3 from 'n3';
import { mentor } from '../mentor';

/**
 * A decoration provider that adds a badge to definition tree nodes.
 */
export class DefinitionNodeDecorationProvider implements vscode.FileDecorationProvider {

	private readonly _disabledColor = new vscode.ThemeColor("disabledForeground");

	private _labelPredicates = new Set<string>();

	private readonly _onDidChangeFileDecorations = new vscode.EventEmitter<vscode.Uri | vscode.Uri[] | undefined>();

	readonly onDidChangeFileDecorations? = this._onDidChangeFileDecorations.event;

	constructor() {
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

	provideFileDecoration(uri: vscode.Uri, token: vscode.CancellationToken) {
		const context = mentor.activeContext;

		if (!context || !context.primaryLanguage) {
			// Note: The document may not have a language set if there are no language tags used in the document.
			return undefined;
		}

		const subject = new n3.NamedNode(uri.toString());

		if (!context.references[subject.id]) {
			return undefined;
		}

		const activeLanguage = context.activeLanguage;

		for (let triple of mentor.vocabulary.store.match(context.graphs, subject, null, null, false)) {
			if (triple.object.termType !== "Literal" || !this._labelPredicates.has(triple.predicate.value)) {
				continue;
			} else if (triple.object.language === activeLanguage) {
				// The label is in the active language and we do not need to decorate it.
				return undefined;
			}
		}

		const result = new vscode.FileDecoration(undefined, undefined, this._disabledColor);
		result.propagate = true;
		result.tooltip = `This definition is not available in the active language @${activeLanguage}.`;

		return result;
	}
}