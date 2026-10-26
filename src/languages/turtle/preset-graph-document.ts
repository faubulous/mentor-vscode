import * as vscode from 'vscode';
import { LanguageTagUsageStats, Store, VocabularyRepository } from '@faubulous/mentor-rdf';
import { RdfSyntax } from '@faubulous/mentor-rdf-parsers';
import { ISettingsService } from '@src/services/core';
import { PresetGraph } from '@src/services/core/preset-graph';
import { addLanguageTagUsage } from '@src/utilities/rdf';
import { TurtleDocument } from './turtle-document';

/**
 * A document context for the read-only source of a preset graph shipped with Mentor,
 * such as a framework vocabulary or a preset shape graph.
 *
 * The store loads the preset graphs at startup and on reindexing, so the context only
 * borrows the graph: loading the document never writes to the store and removing the
 * context never deletes the graph. The context provides the source ranges for language
 * features such as go to definition.
 */
export class PresetGraphDocument extends TurtleDocument {
	/**
	 * The preset graph whose source the document shows.
	 */
	readonly graph: PresetGraph;

	constructor(uri: vscode.Uri, graph: PresetGraph, store: Store, vocabulary: VocabularyRepository, settings: ISettingsService) {
		super(uri, RdfSyntax.Turtle, store, vocabulary, settings);

		this.graph = graph;
	}

	override get isPreset(): boolean {
		return true;
	}

	/**
	 * Points the context to the preset graph in the store and counts the language tags
	 * of the document, without adding its triples to the store again.
	 * @param data The document text.
	 */
	override async loadTriples(data: string): Promise<void> {
		const languageTagStats: LanguageTagUsageStats = {};

		this.graphs.length = 0;
		this.graphs.push(this.graph.graphIri);

		for (const quad of this.getParseResult(data)?.quads ?? []) {
			addLanguageTagUsage(languageTagStats, quad.object);
		}

		this._releaseParsedContent();

		this.languageTagStats = languageTagStats;
	}

	/**
	 * Does nothing: the inference for the preset graph is executed when the store loads it.
	 */
	override async infer(): Promise<void> { }
}
