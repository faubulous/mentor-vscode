import * as vscode from "vscode";
import { container, VocabularyRepository } from "@src/container";
import { ConceptClassNode } from "./concept-class-node";

export class ConceptsNode extends ConceptClassNode {
	private get vocabulary() {
		return container.resolve(VocabularyRepository);
	}

	override getContextValue(): string {
		return 'concepts';
	}

	override getIcon(): vscode.ThemeIcon | undefined {
		return undefined;
	}

	override getLabel(): vscode.TreeItemLabel {
		return { label: 'Concepts' };
	}

	override getDescription(): string {
		const graphs = this.getDocumentGraphs();
		const concepts = [...this.vocabulary.getConcepts(graphs)];

		return concepts.length.toString();
	}

	override *getSubClassIris(): IterableIterator<string> {
		const graphs = this.getDocumentGraphs();
		const subject = this.getQueryOptions().definedBy ?? this.uri;

		yield* this.vocabulary.getNarrowerConcepts(graphs, subject);
	}

	override getTooltip(): vscode.MarkdownString | undefined {
		return undefined;
	}
}