import * as vscode from 'vscode';
import type { CstNode } from 'chevrotain';
import { Quad } from '@rdfjs/types';
import { Store, VocabularyRepository } from '@faubulous/mentor-rdf';
import { RdfSyntax, SparqlReader } from '@faubulous/mentor-rdf-parsers';
import { ISettingsService } from '@src/services/core';
import { getConfig } from '@src/utilities/vscode/config';
import { ParserFactory } from '@src/languages/parser-factory';
import { TurtleDocument } from '@src/languages/turtle/turtle-document';
import { WorkspaceUri } from '@src/providers/workspace-uri';

/**
 * A document context for SPARQL documents.
 */
export class SparqlDocument extends TurtleDocument {
	constructor(uri: vscode.Uri, store: Store, vocabulary: VocabularyRepository, settings: ISettingsService) {
		super(uri, RdfSyntax.Sparql, store, vocabulary, settings);
	}

	/**
	 * Indicates whether SPARQL queries are parsed into RDF triples using the
	 * SPARQL Syntax Vocabulary (sparql:) and loaded into the workspace store.
	 */
	protected get parseQueriesEnabled(): boolean {
		return getConfig().get('index.parseSparqlQueries', false);
	}

	/**
	 * SPARQL documents are considered loaded when tokens are available.
	 * Unlike RDF documents, SPARQL queries don't necessarily produce graphs.
	 */
	override get isLoaded(): boolean {
		return this.isParsed;
	}

	protected override readQuads(cst: CstNode): Quad[] {
		const reader = ParserFactory.createReader(this.syntax) as SparqlReader;

		// Emit the root query or update node as the workspace URI of the
		// document instead of a blank node, so queries are addressable by
		// the IRI of the file or notebook cell that contains them.
		reader.rootIri = this._store.dataFactory.namedNode(WorkspaceUri.toCanonicalString(this.graphIri));

		return reader.visit(cst) as Quad[];
	}

	public override async infer(): Promise<void> {
		if (this.parseQueriesEnabled) {
			await super.infer();
		}
	}

	public override async loadTriples(data: string): Promise<void> {
		if (this.parseQueriesEnabled) {
			await super.loadTriples(data);
		}
	}
}
