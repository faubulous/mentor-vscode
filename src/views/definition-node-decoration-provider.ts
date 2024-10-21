import * as vscode from 'vscode';
import * as n3 from 'n3';
import { mentor } from '../mentor';
import { rdfs } from '@faubulous/mentor-rdf';

/**
 * A decoration provider that adds a badge to definition tree nodes.
 */
export class DefinitionNodeDecorationProvider implements vscode.FileDecorationProvider {
	private readonly _onDidChangeFileDecorations = new vscode.EventEmitter<vscode.Uri | vscode.Uri[] | undefined>();

	readonly onDidChangeFileDecorations? = this._onDidChangeFileDecorations.event;

	constructor() {
		mentor.settings.onDidChange("view.activeLanguage", () => {
			// When the active language changes, the decorations need to be updated.
			this._onDidChangeFileDecorations.fire(undefined);
		});
	}

	provideFileDecoration(uri: vscode.Uri, token: vscode.CancellationToken) {
		if (!mentor.activeContext) {
			return undefined;
		}

		const subject = new n3.NamedNode(uri.toString());

		if (!mentor.activeContext.references[subject.id]) {
			return undefined;
		}

		const activeLanguage = mentor.activeContext.activeLanguage;
		const graphs = mentor.activeContext.graphs;

		let found = false;

		for (let triple of mentor.vocabulary.store.match(graphs, subject, rdfs.label, null)) {
			if (triple.object.termType === "Literal" && triple.object.language === activeLanguage) {
				found = true;
				break;
			}
		}

		if (found) {
			return undefined;
		}

		// const color = new vscode.ThemeColor("disabledForeground");
		const color = new vscode.ThemeColor("list.warningForeground");
		
		// TODO: Provide a better tooltip.
		const result = new vscode.FileDecoration("●", "Test", color);
		result.propagate = true;

		return result;
	}
}