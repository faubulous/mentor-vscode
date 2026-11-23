import { RDF, RDFS, Uri, VocabularyRepository, rdf } from '@faubulous/mentor-rdf';
import { TermSerializer } from '@faubulous/mentor-rdf-serializers';
import { ITokenizedDocumentContext } from '@src/services/document/document-context.interface';
import { IPrefixLookupService } from '@src/services/document/prefix-lookup-service.interface';
import { RdfDataFactory } from '@src/utilities/rdf-data-factory';
import { getPrefixedName, isPlainLocalName, isValidPrefix } from '@src/utilities/prefixed-name';
import { PredicateRangeResolver } from './predicate-range-resolver';
import { ResourceOptionData, TermFit, TermSearch, TermSearchStatement, TermSearchTargetType, TermSource } from './term-search';
import { TermFitResolver } from './term-fit-resolver';
import { TermRankingKeys, getRankingKeys, rankTerms } from '@src/utilities/term-ranking';
import { StoreIconResolver } from './store-icon-resolver';

/**
 * The terms of the store by type, read at one version of it.
 */
interface TermIndex {
	/**
	 * The version of the store the terms were read at.
	 */
	version: number;

	/**
	 * The IRIs of the terms of each type.
	 */
	terms: Record<TermSearchTargetType, readonly string[]>;
}

/**
 * A term as a document sees it: its label, its prefixed name, the prefix it would declare and
 * where it comes from.
 */
interface TermEntry extends TermRankingKeys {
	/**
	 * Where the term comes from.
	 */
	source: TermSource;

	/**
	 * The prefix the document would declare to write the term by its prefixed name.
	 */
	missingPrefix?: ResourceOptionData['missingPrefix'];
}

/**
 * The terms of the store as one document sees them, read at one version of the store and by the
 * prefixes the document declared then: those the document describes, those it uses by type, and
 * the entries of the terms searched so far.
 */
interface DocumentTerms {
	/**
	 * The version of the store the terms were read at.
	 */
	version: number;

	/**
	 * The document the terms were read for.
	 */
	context: ITokenizedDocumentContext;

	/**
	 * The prefixes the document declared, which the prefixed names were read by.
	 */
	namespacesKey: string;

	/**
	 * Whether the syntax of the document writes prefixed names, and so can declare a prefix.
	 */
	writesPrefixedNames: boolean;

	/**
	 * The IRIs the document describes or uses as predicates.
	 */
	described: ReadonlySet<string>;

	/**
	 * The IRIs the document uses as terms of each type, which a search of the type offers though
	 * the store may not say they are: its predicates, the classes it types resources with, and the
	 * resources it describes or types.
	 */
	uses: Partial<Record<TermSearchTargetType, readonly string[]>>;

	/**
	 * The entry of each term searched so far.
	 */
	entries: Map<string, TermEntry>;

	/**
	 * The prefix proposed for each namespace looked up so far, `undefined` where none is.
	 */
	proposals: Map<string, ResourceOptionData['missingPrefix']>;
}

/**
 * Answers the searches of the pickers of the form editor from the store: the predicates, classes,
 * resources and datatypes of the document, of the vocabularies it declares and of the rest of the
 * workspace, ranked in that order and then by how well they match, and the languages the workspace
 * tags its literals with. The terms of the store, and
 * their labels and prefixed names as the document sees them, are read once per version of it, so
 * a keystroke only matches and ranks them. A search waits until the workspace is indexed, so it
 * never answers from a store that is still being filled.
 */
export class TermCatalogueService {
	private _index?: TermIndex;

	private _documentTerms?: DocumentTerms;

	private _languages?: { version: number; languages: readonly string[] };

	/**
	 * Create the catalogue.
	 * @param _vocabulary The vocabulary repository over the store.
	 * @param _prefixLookup Tells the prefixes the workspace uses for namespaces the document does not declare.
	 * @param _icons Tells the glyphs of terms.
	 * @param _ranges Tells the classes the values of a predicate are instances of.
	 * @param _fits Tells how terms fit the statement they are picked for.
	 * @param _whenIndexed Resolves once the workspace is indexed.
	 */
	constructor(
		private readonly _vocabulary: VocabularyRepository,
		private readonly _prefixLookup: IPrefixLookupService,
		private readonly _icons: StoreIconResolver,
		private readonly _ranges: PredicateRangeResolver,
		private readonly _fits: TermFitResolver,
		private readonly _whenIndexed: () => Promise<void>
	) { }

	/**
	 * Search the terms of a type for typed text, for a document, those that fit the statement they
	 * are picked for first where the search tells the statement: a predicate by its domain and the
	 * shapes of the types of the resource, a resource for a value by the classes the range of the
	 * predicate names.
	 * @param search The search.
	 * @param context The document the terms are picked for.
	 * @param subjectTypes The types of the resource of the statement, where the caller knows them
	 * from the document; else they are read from the store.
	 * @returns The matching terms, best first.
	 */
	async search(search: TermSearch, context: ITokenizedDocumentContext, subjectTypes?: readonly string[]): Promise<ResourceOptionData[]> {
		await this._whenIndexed();

		const fitOf = search.statement ? this._fitOf(search.targetType, search.statement, subjectTypes ?? this._typesOf(search.statement.subject, context)) : undefined;
		const documentTerms = this._getDocumentTerms(context);
		const entries = Array.from(this._candidatesOf(search.targetType, documentTerms), iri => this._entryOf(iri, documentTerms));
		const fits = new Map<string, TermFit | undefined>();
		const fitOfEntry = (entry: TermEntry): TermFit | undefined => {
			if (!fits.has(entry.iri)) {
				fits.set(entry.iri, fitOf?.(entry.iri));
			}

			return fits.get(entry.iri);
		};
		const ranked = rankTerms(entries, search.text, entry => getRankingKeys(search.targetType, entry.iri, entry.label, entry.prefixedName, entry.source, fitOfEntry(entry)));

		return ranked.slice(0, Math.max(0, search.limit)).map(entry => this._optionOf(entry, fitOfEntry(entry)));
	}

	/**
	 * How the terms of a search fit the statement they are picked for: a predicate by its domain and
	 * the shapes of the types of the resource; a resource for a value by the classes the range of
	 * the predicate names.
	 * @param targetType The type of terms searched.
	 * @param statement The statement the terms are picked for.
	 * @param types The types of the resource of the statement.
	 * @returns Tells the fit of a term, or `undefined` where nothing tells how terms of the type fit.
	 */
	private _fitOf(targetType: TermSearchTargetType, statement: TermSearchStatement, types: readonly string[]): ((iri: string) => TermFit) | undefined {
		if (targetType === 'predicate') {
			return iri => this._fits.predicateFit(iri, types);
		}

		if (targetType === 'resource' && statement.predicate) {
			const rangeClasses = this._ranges.rangeClassesOf(statement.predicate, types);

			return rangeClasses.length > 0 ? iri => this._fits.valueFit(iri, rangeClasses) : undefined;
		}

		return undefined;
	}

	/**
	 * The types of a resource the store knows in the graphs of a document, inferred ones included
	 * where the store has a reasoner.
	 * @param subject The resource.
	 * @param context The document.
	 * @returns The type IRIs, each once.
	 */
	private _typesOf(subject: TermSearchStatement['subject'], context: ITokenizedDocumentContext): string[] {
		const store = this._vocabulary.store;
		const types = new Set<string>();

		for (const quad of store.matchAll(context.graphs, subject, rdf.type, null, store.reasoner ? true : false)) {
			if (quad.object.termType === 'NamedNode') {
				types.add(quad.object.value);
			}
		}

		return Array.from(types);
	}

	/**
	 * The languages the literals of the workspace are tagged with, the most used first, which the
	 * tag picker offers after those of the card. They are read once per version of the store, and
	 * only once the workspace is indexed.
	 * @returns The language tags, as the store holds them.
	 */
	async getWorkspaceLanguages(): Promise<readonly string[]> {
		await this._whenIndexed();

		const version = this._vocabulary.store.version;

		if (this._languages?.version !== version) {
			const usage = this._vocabulary.getLanguageTagUsageStats(undefined);
			const languages = Object.keys(usage).sort((a, b) => usage[b] - usage[a] || a.localeCompare(b));

			this._languages = { version, languages };
		}

		return this._languages.languages;
	}

	/**
	 * The IRIs a search of a type looks at: the terms of the store of that type, and those the
	 * document uses as that type besides.
	 * @param targetType The type of terms.
	 * @param documentTerms The terms of the document.
	 * @returns The IRIs, each once.
	 */
	private _candidatesOf(targetType: TermSearchTargetType, documentTerms: DocumentTerms): Set<string> {
		return new Set([...this._getIndex().terms[targetType], ...documentTerms.uses[targetType] ?? []]);
	}

	/**
	 * The entry of a term for a document, read once per version of the store: its label, its
	 * prefixed name by the prefixes of the document, else by the prefix the workspace uses for its
	 * namespace, which the document would then declare, and where it comes from.
	 * @param iri The IRI of the term.
	 * @param documentTerms The terms of the document.
	 * @returns The entry.
	 */
	private _entryOf(iri: string, documentTerms: DocumentTerms): TermEntry {
		const cached = documentTerms.entries.get(iri);

		if (cached) {
			return cached;
		}

		const context = documentTerms.context;
		const label = context.getResourceLabel(iri).value;
		const prefixedName = getPrefixedName(context.namespaces, iri);
		const described = documentTerms.described.has(iri);
		const entry: TermEntry = prefixedName !== undefined
			? { iri, label, prefixedName, source: described ? 'document' : 'declared' }
			: { iri, label, source: described ? 'document' : 'workspace', ...this._proposalOf(iri, documentTerms) };

		documentTerms.entries.set(iri, entry);

		return entry;
	}

	/**
	 * The prefixed name of a term whose namespace the document declares no prefix for, by the prefix
	 * the workspace uses for the namespace, which the document would declare. The prefix is looked
	 * up once per namespace. A document whose syntax writes no prefixed names, such as N-Triples,
	 * is proposed none.
	 * @param iri The IRI of the term.
	 * @param documentTerms The terms of the document.
	 * @returns The prefixed name and the prefix to declare, or nothing where the term is written by
	 * its IRI.
	 */
	private _proposalOf(iri: string, documentTerms: DocumentTerms): Pick<TermEntry, 'prefixedName' | 'missingPrefix'> {
		const namespace = Uri.getNamespaceIri(iri);
		const localName = iri.slice(namespace.length);

		if (!documentTerms.writesPrefixedNames || !isPlainLocalName(localName)) {
			return {};
		}

		if (!documentTerms.proposals.has(namespace)) {
			documentTerms.proposals.set(namespace, this._missingPrefixOf(namespace, documentTerms.context));
		}

		const missingPrefix = documentTerms.proposals.get(namespace);

		return missingPrefix ? { prefixedName: `${missingPrefix.prefix}:${localName}`, missingPrefix } : {};
	}

	/**
	 * The prefix the document would declare for a namespace: the one the workspace uses for it,
	 * where it is valid, not empty and not declared by the document for another namespace.
	 * @param namespace The namespace IRI.
	 * @param context The document.
	 * @returns The prefix and the namespace, or `undefined` when none is proposed.
	 */
	private _missingPrefixOf(namespace: string, context: ITokenizedDocumentContext): ResourceOptionData['missingPrefix'] {
		const prefix = this._prefixLookup.getPrefixForIri(context.uri.toString(), namespace, '');

		if (prefix === '' || !isValidPrefix(prefix) || context.namespaces[prefix] !== undefined) {
			return undefined;
		}

		return { prefix, namespace };
	}

	/**
	 * The option of a term.
	 * @param entry The entry of the term.
	 * @param fit How the term fits the statement it is picked for, if anything tells.
	 * @returns The option.
	 */
	private _optionOf(entry: TermEntry, fit: TermFit | undefined): ResourceOptionData {
		return {
			subject: RdfDataFactory.namedNode(entry.iri),
			label: entry.label,
			prefixedName: entry.prefixedName,
			iconName: this._icons.resolve(entry.iri),
			source: entry.source,
			fit,
			missingPrefix: entry.missingPrefix
		};
	}

	/**
	 * The terms of the store by type, read anew once the store changed.
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
	 * Read the terms of each type from all graphs of the store.
	 * @returns The IRIs of the terms of each type.
	 */
	private _readTerms(): Record<TermSearchTargetType, readonly string[]> {
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
	 * The terms of a document, read anew once the store or the prefixes of the document changed: a
	 * prefix declared changes no statement, and so not the store.
	 * @param context The document.
	 * @returns The terms.
	 */
	private _getDocumentTerms(context: ITokenizedDocumentContext): DocumentTerms {
		const version = this._vocabulary.store.version;
		const namespacesKey = JSON.stringify(Object.entries(context.namespaces));
		const cached = this._documentTerms;

		if (cached?.version === version && cached.context === context && cached.namespacesKey === namespacesKey) {
			return cached;
		}

		const subjects = new Set<string>();
		const predicates = new Set<string>();
		const types = new Set<string>();

		for (const quad of this._vocabulary.store.matchAll(context.graphs, null, null, null, false)) {
			if (quad.subject.termType === 'NamedNode') {
				subjects.add(quad.subject.value);
			}

			if (quad.predicate.value === RDF.type && quad.object.termType === 'NamedNode') {
				types.add(quad.object.value);
			}

			predicates.add(quad.predicate.value);
		}

		const described = new Set([...subjects, ...predicates]);
		const uses = { predicate: Array.from(predicates), class: Array.from(types), resource: Array.from(new Set([...subjects, ...types])) };

		const writesPrefixedNames = TermSerializer.forSyntax(context.syntax).abbreviates;

		this._documentTerms = { version, context, namespacesKey, writesPrefixedNames, described, uses, entries: new Map(), proposals: new Map() };

		return this._documentTerms;
	}
}
