import { RDFS, Uri, VocabularyRepository } from '@faubulous/mentor-rdf';
import { IDocumentContext } from '@src/services/document/document-context.interface';
import { IPrefixLookupService } from '@src/services/document/prefix-lookup-service.interface';
import { RdfDataFactory } from '@src/utilities/rdf-data-factory';
import { getPrefixedName, isPlainLocalName, isValidPrefix } from '@src/utilities/prefixed-name';
import { ResourceOptionData, TermSearchKind, TermSource } from '@src/views/webviews/views/form-editor/form-editor-model';
import { StoreIconResolver } from './store-icon-resolver';

/**
 * A search of the terms a picker offers.
 */
export interface TermSearch {
	/**
	 * The kind of terms searched for.
	 */
	kind: TermSearchKind;

	/**
	 * The typed text, matched against the label, the local name and the prefixed name of a term.
	 */
	text: string;

	/**
	 * How many terms are returned at most.
	 */
	limit: number;
}

/**
 * The terms of the store by kind, read at one version of it.
 */
interface TermIndex {
	/**
	 * The version of the store the terms were read at.
	 */
	version: number;

	/**
	 * The IRIs of the terms of each kind.
	 */
	terms: Record<TermSearchKind, readonly string[]>;
}

/**
 * The terms of a document: those it describes and the predicates it uses, read at one version of
 * the store.
 */
interface DocumentTerms {
	/**
	 * The version of the store the terms were read at.
	 */
	version: number;

	/**
	 * The document the terms were read for.
	 */
	context: IDocumentContext;

	/**
	 * The IRIs the document describes or uses as predicates.
	 */
	described: ReadonlySet<string>;

	/**
	 * The IRIs the document uses as predicates.
	 */
	predicates: readonly string[];
}

/**
 * A term that matches a search, with what ranks it.
 */
interface RankedTerm {
	/**
	 * The IRI of the term.
	 */
	iri: string;

	/**
	 * The label of the term.
	 */
	label: string;

	/**
	 * Where the term comes from.
	 */
	source: TermSource;

	/**
	 * How well the term matches: `0` where a name starts with the text, `1` where a word of the
	 * label does, `2` where a name contains it.
	 */
	quality: number;
}

/**
 * The rank of each source: the document first, then the vocabularies it declares, then the rest.
 */
const SOURCE_RANK: Record<TermSource, number> = { document: 0, declared: 1, workspace: 2 };

/**
 * Answers the searches of the pickers of the form editor from the store: the predicates, classes,
 * resources and datatypes of the document, of the vocabularies it declares and of the rest of the
 * workspace, ranked in that order and then by how well they match. The terms of the store are read
 * once per version of it. A search waits until the workspace is indexed, so it never answers from a
 * store that is still being filled.
 */
export class TermCatalogueService {
	private _index?: TermIndex;

	private _documentTerms?: DocumentTerms;

	/**
	 * Create the catalogue.
	 * @param _vocabulary The vocabulary repository over the store.
	 * @param _prefixLookup Tells the prefixes the workspace uses for namespaces the document does not declare.
	 * @param _icons Tells the glyphs of terms.
	 * @param _whenIndexed Resolves once the workspace is indexed.
	 */
	constructor(
		private readonly _vocabulary: VocabularyRepository,
		private readonly _prefixLookup: IPrefixLookupService,
		private readonly _icons: StoreIconResolver,
		private readonly _whenIndexed: () => Promise<void>
	) { }

	/**
	 * Search the terms of a kind for typed text, for a document.
	 * @param search The search.
	 * @param context The document the picker edits.
	 * @returns The matching terms, best first.
	 */
	async search(search: TermSearch, context: IDocumentContext): Promise<ResourceOptionData[]> {
		await this._whenIndexed();

		const documentTerms = this._getDocumentTerms(context);
		const needle = search.text.trim().toLowerCase();
		const ranked: RankedTerm[] = [];

		for (const iri of this._candidatesOf(search.kind, documentTerms)) {
			const term = this._rank(iri, needle, context, documentTerms);

			if (term) {
				ranked.push(term);
			}
		}

		ranked.sort(_compareRanked);

		return ranked.slice(0, Math.max(0, search.limit)).map(term => this._optionOf(term, context));
	}

	/**
	 * The IRIs a search of a kind looks at: the terms of the store of that kind, and for predicates
	 * those the document uses besides.
	 * @param kind The kind of terms.
	 * @param documentTerms The terms of the document.
	 * @returns The IRIs, each once.
	 */
	private _candidatesOf(kind: TermSearchKind, documentTerms: DocumentTerms): Set<string> {
		const candidates = new Set(this._getIndex().terms[kind]);

		if (kind === 'predicate') {
			documentTerms.predicates.forEach(iri => candidates.add(iri));
		}

		return candidates;
	}

	/**
	 * Rank a term for a search.
	 * @param iri The IRI of the term.
	 * @param needle The typed text, trimmed and in lower case.
	 * @param context The document.
	 * @param documentTerms The terms of the document.
	 * @returns The ranked term, or `undefined` when it does not match.
	 */
	private _rank(iri: string, needle: string, context: IDocumentContext, documentTerms: DocumentTerms): RankedTerm | undefined {
		const label = context.getResourceLabel(iri).value;
		const quality = _matchQuality(needle, label, Uri.getLocalPart(iri) ?? '', getPrefixedName(context.namespaces, iri));

		if (quality < 0) {
			return undefined;
		}

		return { iri, label, quality, source: this._sourceOf(iri, context, documentTerms) };
	}

	/**
	 * Where a term comes from.
	 * @param iri The IRI of the term.
	 * @param context The document.
	 * @param documentTerms The terms of the document.
	 * @returns The source.
	 */
	private _sourceOf(iri: string, context: IDocumentContext, documentTerms: DocumentTerms): TermSource {
		if (documentTerms.described.has(iri)) {
			return 'document';
		}

		return getPrefixedName(context.namespaces, iri) !== undefined ? 'declared' : 'workspace';
	}

	/**
	 * The option of a ranked term, with its prefixed name: by the prefixes of the document, else by
	 * the prefix the workspace uses for its namespace, which the document would then declare.
	 * @param term The term.
	 * @param context The document.
	 * @returns The option.
	 */
	private _optionOf(term: RankedTerm, context: IDocumentContext): ResourceOptionData {
		const option: ResourceOptionData = {
			subject: RdfDataFactory.namedNode(term.iri),
			label: term.label,
			prefixedName: getPrefixedName(context.namespaces, term.iri),
			iconName: this._icons.resolve(term.iri),
			source: term.source
		};

		if (option.prefixedName === undefined) {
			const missingPrefix = this._missingPrefixOf(term.iri, context);

			if (missingPrefix) {
				option.prefixedName = `${missingPrefix.prefix}:${term.iri.slice(missingPrefix.namespace.length)}`;
				option.missingPrefix = missingPrefix;
			}
		}

		return option;
	}

	/**
	 * The prefix the document would declare to write a term by its prefixed name: the one the
	 * workspace uses for the namespace, where it is valid, not empty and not declared by the
	 * document for another namespace, and the rest of the IRI is a plain local name.
	 * @param iri The IRI of the term.
	 * @param context The document.
	 * @returns The prefix and the namespace, or `undefined` when the term is written by its IRI.
	 */
	private _missingPrefixOf(iri: string, context: IDocumentContext): ResourceOptionData['missingPrefix'] {
		const namespace = Uri.getNamespaceIri(iri);
		const prefix = this._prefixLookup.getPrefixForIri(context.uri.toString(), namespace, '');

		if (prefix === '' || !isValidPrefix(prefix) || context.namespaces[prefix] !== undefined || !isPlainLocalName(iri.slice(namespace.length))) {
			return undefined;
		}

		return { prefix, namespace };
	}

	/**
	 * The terms of the store by kind, read anew once the store changed.
	 * @returns The index.
	 */
	private _getIndex(): TermIndex {
		const version = this._vocabulary.store.version;

		if (this._index?.version !== version) {
			this._index = { version, terms: this._readTerms() };
		}

		return this._index;
	}

	/**
	 * Read the terms of each kind from all graphs of the store.
	 * @returns The IRIs of the terms of each kind.
	 */
	private _readTerms(): Record<TermSearchKind, readonly string[]> {
		const vocabulary = this._vocabulary;
		const predicate = Array.from(vocabulary.getProperties(undefined));
		const classes = Array.from(vocabulary.getClasses(undefined));
		const datatype = Array.from(vocabulary.getSubjectsOfType(undefined, RDFS.Datatype));
		const resources = new Set([
			...classes,
			...predicate,
			...vocabulary.getIndividuals(undefined),
			...vocabulary.getConcepts(undefined),
			...vocabulary.getConceptSchemes(undefined)
		]);

		return { predicate, class: classes, resource: Array.from(resources), datatype };
	}

	/**
	 * The terms of a document, read anew once the store changed.
	 * @param context The document.
	 * @returns The terms.
	 */
	private _getDocumentTerms(context: IDocumentContext): DocumentTerms {
		const version = this._vocabulary.store.version;
		const cached = this._documentTerms;

		if (cached?.version === version && cached.context === context) {
			return cached;
		}

		const described = new Set<string>();
		const predicates = new Set<string>();

		for (const quad of this._vocabulary.store.matchAll(context.graphs, null, null, null, false)) {
			if (quad.subject.termType === 'NamedNode') {
				described.add(quad.subject.value);
			}

			predicates.add(quad.predicate.value);
			described.add(quad.predicate.value);
		}

		this._documentTerms = { version, context, described, predicates: Array.from(predicates) };

		return this._documentTerms;
	}
}

/**
 * How well a term matches typed text.
 * @param needle The typed text, trimmed and in lower case; empty matches every term.
 * @param label The label of the term.
 * @param localName The local name of the term.
 * @param prefixedName The prefixed name of the term, if it has one.
 * @returns `0` where a name starts with the text, `1` where a word of the label does, `2` where a
 * name contains it, `-1` where it does not match.
 */
function _matchQuality(needle: string, label: string, localName: string, prefixedName: string | undefined): number {
	const names = [label, localName, prefixedName ?? ''].map(name => name.toLowerCase());

	if (needle === '' || names.some(name => name.startsWith(needle))) {
		return 0;
	}

	if (names[0].split(/[\s_\-/]+/).some(word => word.startsWith(needle))) {
		return 1;
	}

	return names.some(name => name.includes(needle)) ? 2 : -1;
}

/**
 * Order ranked terms: by source, then by how well they match, then by label and IRI.
 * @param a A term.
 * @param b Another term.
 * @returns A negative number when `a` comes first, a positive one when `b` does.
 */
function _compareRanked(a: RankedTerm, b: RankedTerm): number {
	return SOURCE_RANK[a.source] - SOURCE_RANK[b.source]
		|| a.quality - b.quality
		|| a.label.localeCompare(b.label)
		|| a.iri.localeCompare(b.iri);
}
