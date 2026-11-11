import { DCAT, OWL, RDF, SKOS } from '@faubulous/mentor-rdf';
import { QuadContext } from '@faubulous/mentor-rdf-parsers';
import { BlankNode, NamedNode } from '@rdfjs/types';
import { termToString } from 'rdf-string';
import { ITokenizedDocumentContext } from '@src/services/document/document-context.interface';
import { getFileName } from '@src/utilities/uri';
import { RdfDataFactory } from '@src/utilities/rdf-data-factory';
import { DocumentProblem, DocumentSnapshot, ReadOnlyReason, ResourceSummary } from '@src/views/webviews/views/form-editor/form-editor-model';
import { ExternalDeclarationDetector } from './external-declaration-detector';
import { ScopeKey } from '@src/utilities/config-scope';
import { PinnedPropertiesService } from './pinned-properties-service';
import { ResourceIndex, ResourceIndexEntry, getEntry, typeIrisOf } from './resource-index';
import { ResourceIndexBuilder } from './resource-index-builder';
import { getLanguageTagSpellings } from '@faubulous/mentor-rdf-serializers';

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
	 * Which build of the snapshots of the document this one is.
	 */
	revision: number;

	/**
	 * The URI of the document.
	 */
	uri: string;

	/**
	 * The quad contexts of the document.
	 */
	quadContexts: readonly QuadContext[];

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

	/**
	 * The properties pinned for the types of resources; none when absent.
	 */
	pins?: PinnedPropertiesService;

	/**
	 * The types of a resource the store infers besides those the document asserts, as of an
	 * untyped blank node that a property shape is; none when absent.
	 */
	inferredTypesOf?: (resource: NamedNode | BlankNode) => readonly string[];

	/**
	 * The settings a property can be pinned in, in the order the pin menu offers them: the user
	 * settings, and the workspace settings where a workspace is open.
	 */
	pinScopes?: readonly ScopeKey[];
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
export class EditorSnapshotService {
	/**
	 * Create the service for one build of a snapshot.
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
		const documentResource = EditorSnapshotService._findDocumentResource(index);
		const resources = index.summaries.map(summary => ({
			...summary,
			usageCount: this._countUsages(summary, index),
			externalDeclaration: externals.isExternalDeclaration(getEntry(index, summary.term)!) || undefined,
			...this._pinsOf(summary, getEntry(index, summary.term)!)
		}));

		return {
			index,
			snapshot: {
				version: this._input.version,
				revision: this._input.revision,
				uri: this._input.uri,
				fileName: getFileName(this._input.uri),
				namespaces: index.namespaces,
				resources,
				documentResource,
				trailingComments: index.trailingComments.length > 0 ? index.trailingComments : undefined,
				languageTags: getLanguageTagSpellings(this._input.context.tokens),
				activeLanguage: this._input.context.activeLanguageTag?.toLowerCase() || undefined,
				readOnly: this._input.readOnly,
				problems: this._input.problems ?? [],
				labelPredicates: context.predicates.label.map(predicate => RdfDataFactory.namedNode(predicate)),
				descriptionPredicates: context.predicates.description.map(predicate => RdfDataFactory.namedNode(predicate)),
				pinScopes: this._input.pinScopes,
				dominantTypeIri: _dominantTypeOf(resources.filter(resource => !documentResource?.equals(resource.term)))
			}
		};
	}


	/**
	 * The pins of a resource, from its asserted types and those the store infers. The type and the
	 * label of a resource are what its card shows anyway, so they are never pins.
	 * @param summary The resource.
	 * @param entry The entry of the resource.
	 * @returns The pins, or none for a resource of no known type, which cannot pin.
	 */
	private _pinsOf(summary: ResourceSummary, entry: ResourceIndexEntry): Pick<ResourceSummary, 'pins'> {
		const asserted = typeIrisOf(entry);
		const inferred = this._input.inferredTypesOf?.(summary.term) ?? [];

		if (!PinnedPropertiesService.pinTypeOf(asserted, inferred)) {
			return {};
		}

		const fixed = new Set([RDF.type, ...this._input.context.predicates.label]);
		const pins = (this._input.pins?.pinsOf(Array.from(new Set([...asserted, ...inferred]))) ?? [])
			.filter(pin => !fixed.has(pin.predicate))
			.map(pin => ({ predicate: RdfDataFactory.namedNode(pin.predicate), scope: pin.scope }));

		return { pins };
	}

	/**
	 * How often a resource is used: across the indexed documents for an IRI, which other documents
	 * can refer to, and within this document for a blank node, which nothing outside it can name.
	 * @param summary The resource.
	 * @param index The index of the document.
	 * @returns The count, or `undefined` when it is not known.
	 */
	private _countUsages(summary: ResourceSummary, index: ResourceIndex): number | undefined {
		if (summary.term.termType === 'NamedNode') {
			return this._input.countUsages?.(summary.term.value);
		}

		return index.referenceCounts.get(termToString(summary.term)) ?? 0;
	}

	/**
	 * Find the resource describing the document, if it has an IRI: an ontology before a concept
	 * scheme or a dataset, and one that says something about itself before one that is only
	 * declared, as a file written by Protégé declares the ontology it is about besides its own.
	 * @param index The index of the document.
	 * @returns The resource, or `undefined` when none describes the document.
	 */
	private static _findDocumentResource(index: ResourceIndex): NamedNode | undefined {
		const candidates = Array.from(index.entries.values())
			.filter(entry => entry.term.termType === 'NamedNode' && typeIrisOf(entry).some(type => DOCUMENT_TYPES.has(type)));
		const described = candidates.filter(entry => !ExternalDeclarationDetector.statesNothingOfItsOwn(entry));
		const entry = described.find(_isOntology) ?? candidates.find(_isOntology) ?? described[0] ?? candidates[0];

		return entry?.term as NamedNode | undefined;
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
