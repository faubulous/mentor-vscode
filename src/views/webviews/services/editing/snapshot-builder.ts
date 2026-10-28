import { DCAT, OWL, RDF, SKOS } from '@faubulous/mentor-rdf';
import { QuadContext } from '@faubulous/mentor-rdf-parsers';
import { ITokenizedDocumentContext } from '@src/services/document/document-context.interface';
import { getFileName } from '@src/utilities/uri';
import { AnnotationScheme, DocumentProblem, DocumentSnapshot, ReadOnlyReason, ResourceId, ResourceSummary } from '@src/views/webviews/views/form-editor/form-editor-model';
import { AnnotationResolver } from './annotation-resolver';
import { ExternalDeclarationDetector } from './external-declaration-detector';
import { ResourceIndex, ResourceIndexEntry, typeIrisOf } from './resource-index';
import { ResourceIndexBuilder } from './resource-index-builder';
import { ResourceViewBuilder } from './resource-view-builder';

/**
 * The types of the resources that describe a document as a whole.
 */
const DOCUMENT_TYPES = new Set([OWL.Ontology, SKOS.ConceptScheme, DCAT.Dataset, DCAT.Catalog]);

/**
 * What a snapshot of a document is built from.
 */
export interface SnapshotInput {
	/**
	 * The version of the text document.
	 */
	version: number;

	/**
	 * The URI of the document.
	 */
	uri: string;

	/**
	 * The quad contexts of the document.
	 */
	quadContexts: QuadContext[];

	/**
	 * The document context, used to resolve labels and prefixes.
	 */
	context: ITokenizedDocumentContext;

	/**
	 * Why the document cannot be edited, when it cannot.
	 */
	readOnly?: ReadOnlyReason;

	/**
	 * The parse problems of the document.
	 */
	problems?: DocumentProblem[];

	/**
	 * Count how often an IRI is referred to across the indexed documents, for the usage counts.
	 */
	countUsages?: (iri: string) => number;
}

/**
 * A snapshot together with the index it was built from, so the session can serve resource
 * detail requests without rebuilding the index.
 */
export interface SnapshotResult {
	/**
	 * The snapshot.
	 */
	snapshot: DocumentSnapshot;

	/**
	 * The index the snapshot was built from.
	 */
	index: ResourceIndex;
}

/**
 * Builds the snapshot of a document: everything needed to render it except the properties of
 * individual resources, which are requested for the rows that are actually visible. This keeps
 * the cost of a re-parse proportional to the viewport rather than to the size of the document.
 */
export class SnapshotBuilder {
	/**
	 * Create a builder.
	 * @param _input The document data to build the snapshot from.
	 */
	constructor(private readonly _input: SnapshotInput) { }

	/**
	 * Build the snapshot.
	 * @returns The snapshot and the index it was built from.
	 */
	build(): SnapshotResult {
		const { context, quadContexts } = this._input;
		const index = new ResourceIndexBuilder(quadContexts, context).build();
		const externals = new ExternalDeclarationDetector(index, context.namespaces);
		const documentResourceId = SnapshotBuilder._findDocumentResource(index);
		const resources = index.summaries.map(summary => ({
			...summary,
			usageCount: this._countUsages(summary, index),
			externalDeclaration: externals.isExternalDeclaration(index.entries.get(summary.id)!) || undefined
		}));

		return {
			index,
			snapshot: {
				version: this._input.version,
				uri: this._input.uri,
				fileName: getFileName(this._input.uri),
				syntax: String(context.syntax ?? ''),
				baseIri: context.baseIri,
				namespaces: index.namespaces,
				annotationScheme: this._buildAnnotationScheme(index),
				activeLanguage: context.activeLanguageTag,
				resources,
				documentResourceId,
				datatypes: index.datatypes,
				trailingComments: index.trailingComments.length > 0 ? index.trailingComments : undefined,
				readOnly: this._input.readOnly,
				problems: this._input.problems ?? [],
				dominantTypeIri: _dominantTypeOf(resources.filter(resource => resource.id !== documentResourceId))
			}
		};
	}

	/**
	 * Detect the predicates the document names and describes its resources with, resolved as the
	 * predicates of the rows are.
	 * @param index The index of the document.
	 * @returns The scheme.
	 */
	private _buildAnnotationScheme(index: ResourceIndex): AnnotationScheme {
		const { context } = this._input;
		const detected = new AnnotationResolver(context.predicates.label, context.predicates.description, context.activeLanguageTag)
			.detectScheme(index.entries.values());
		const views = new ResourceViewBuilder(index, context);

		return {
			label: detected.labelPredicate ? views.buildPredicateView(detected.labelPredicate) : undefined,
			description: detected.descriptionPredicate ? views.buildPredicateView(detected.descriptionPredicate) : undefined
		};
	}

	/**
	 * How often a resource is used: across the indexed documents for an IRI, which other documents
	 * can refer to, and within this document for a blank node, which nothing outside it can name.
	 * @param summary The resource.
	 * @param index The index of the document.
	 * @returns The count, or `undefined` when it is not known.
	 */
	private _countUsages(summary: ResourceSummary, index: ResourceIndex): number | undefined {
		if (summary.term.kind === 'iri') {
			return this._input.countUsages?.(summary.term.iri);
		}

		return summary.term.kind === 'bnode' ? index.referenceCounts.get(summary.id) ?? 0 : undefined;
	}

	/**
	 * Find the resource describing the document, if it has an IRI: an ontology before a concept
	 * scheme or a dataset, and one that says something about itself before one that is only
	 * declared, as a file written by Protégé declares the ontology it is about besides its own.
	 * @param index The index of the document.
	 * @returns The identifier of the resource, or `undefined` when none describes the document.
	 */
	private static _findDocumentResource(index: ResourceIndex): ResourceId | undefined {
		const candidates = Array.from(index.entries.values())
			.filter(entry => entry.term.kind === 'iri' && typeIrisOf(entry).some(type => DOCUMENT_TYPES.has(type)));
		const described = candidates.filter(entry => !ExternalDeclarationDetector.statesNothingOfItsOwn(entry));
		const entry = described.find(_isOntology) ?? candidates.find(_isOntology) ?? described[0] ?? candidates[0];

		return entry?.id;
	}
}

/**
 * Indicate whether a resource is typed as an ontology, which heads a document before a concept
 * scheme or a dataset does.
 * @param entry The resource.
 * @returns `true` for an ontology.
 */
function _isOntology(entry: ResourceIndexEntry): boolean {
	return entry.quads.some(quad => quad.predicate.value === RDF.type && quad.object.value === OWL.Ontology);
}

/**
 * The type most definitions have, which their entries do not repeat.
 * @param resources The definitions.
 * @returns The type IRI, or `undefined` when no definition has a type.
 */
function _dominantTypeOf(resources: readonly ResourceSummary[]): string | undefined {
	const counts = new Map<string, number>();

	for (const resource of resources) {
		if (resource.typeIri) {
			counts.set(resource.typeIri, (counts.get(resource.typeIri) ?? 0) + 1);
		}
	}

	let dominant: string | undefined;

	for (const [type, count] of counts) {
		if (dominant === undefined || count > counts.get(dominant)!) {
			dominant = type;
		}
	}

	return dominant;
}
