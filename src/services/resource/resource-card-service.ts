import { BlankNode, NamedNode } from '@rdfjs/types';
import { termToString } from 'rdf-string';
import { Store, rdf } from '@faubulous/mentor-rdf';
import { IDocumentContext } from '@src/services/document/document-context.interface';
import { ResourceReferenceProvider } from '@src/providers/resource-reference-provider';
import { PredicateRangeResolver } from '@src/services/vocabulary/predicate-range-resolver';
import { StoreIconResolver } from '@src/services/vocabulary/store-icon-resolver';
import { getConfig } from '@src/utilities/vscode/config';
import { PinnedPropertiesService } from './pinned-properties-service';
import { ResourceCardData, ResourceCardHeaderData } from './resource-card-data';
import { ResourceIndexEntry, ResourceIndexOptions, getEntry, typeIrisOf } from './resource-index';
import { ResourceIndexBuilder } from './resource-index-builder';
import { ResourceViewBuilder } from './resource-view-builder';

/**
 * The key of the setting of the form editor that holds the pinned properties.
 */
export const PINNED_PROPERTIES_SETTING = 'pinnedProperties';

/**
 * The types of resources read from the store, inferred ones included, at one version of it.
 */
interface InferredTypeCache {
	/**
	 * The version of the store the types were read at.
	 */
	version: number;

	/**
	 * The types of each resource asked for, by the graphs read and the key of its term.
	 */
	types: Map<string, readonly string[]>;
}

/**
 * Builds what the cards of resources show besides their statements, as the form editor and the
 * tooltips of the definition tree and the text editor show it: the cards of resources read from
 * the store, the properties pinned for the types of a resource, the types it has, asserted and
 * inferred, and how often it is used.
 */
export class ResourceCardService {
	/**
	 * The types of resources read from the store, inferred ones included.
	 */
	private _inferredTypes?: InferredTypeCache;

	/**
	 * Create the service.
	 * @param _store The store, absent where Mentor has none.
	 * @param _references Counts the references to a resource across the indexed documents.
	 * @param _icons Gives the glyphs of the IRIs a card shows as values, where registered.
	 * @param _ranges Gives what values a predicate takes, where registered.
	 */
	constructor(
		private readonly _store: Store | undefined,
		private readonly _references: ResourceReferenceProvider,
		private readonly _icons?: StoreIconResolver,
		private readonly _ranges?: PredicateRangeResolver
	) { }

	/**
	 * The card of a resource as the store states it, across all its graphs: its header, with the
	 * usage count and the pins of its types, and its statements, which only read.
	 * @param resource The resource.
	 * @param context The document the card is shown for, which resolves labels and prefixes.
	 * @returns The card, or `undefined` where the store states nothing about the resource.
	 */
	getStoreCard(resource: NamedNode | BlankNode, context: IDocumentContext): ResourceCardData | undefined {
		const index = this._store ? ResourceIndexBuilder.fromStore(this._store, resource, context) : undefined;
		const entry = index ? getEntry(index, resource) : undefined;
		const listItem = index?.listItems.find(candidate => candidate.subject.equals(resource));

		if (!index || !entry || !listItem) {
			return undefined;
		}

		const usageCount = resource.termType === 'NamedNode' ? this.countUsages(resource.value) : this._countReferences(resource);

		return {
			cardHeader: { ...listItem, usageCount, ...this.getPins(entry, undefined) },
			cardBody: new ResourceViewBuilder(index, context, this.getIndexOptions(context.graphs)).buildCardBody(entry)
		};
	}

	/**
	 * The properties pinned for the types of a resource, asserted and inferred, as a card header
	 * holds them.
	 * @param entry The resource.
	 * @param graphs The graphs its inferred types are read from: those of a document, or all graphs
	 * for a resource of the store.
	 * @returns The pins, absent for a resource of no known type.
	 */
	getPins(entry: ResourceIndexEntry, graphs: string[] | undefined): Pick<ResourceCardHeaderData, 'pins'> {
		const pins = this.readPins().resolve(typeIrisOf(entry), this.getInferredTypes(graphs, entry.term));

		return pins ? { pins } : {};
	}

	/**
	 * The types of a resource, asserted and inferred, whose shapes tell what values its predicates
	 * take.
	 * @param entry The resource.
	 * @param graphs The graphs its inferred types are read from, all graphs when absent.
	 * @returns The type IRIs, each once.
	 */
	getTypes(entry: ResourceIndexEntry, graphs: string[] | undefined): string[] {
		return Array.from(new Set([...typeIrisOf(entry), ...this.getInferredTypes(graphs, entry.term)]));
	}

	/**
	 * The types of a resource the store knows, inferred ones included, which an untyped blank node
	 * of a shape gets from the reasoner. Memoized until the store changes.
	 * @param graphs The graphs to read, all graphs when absent.
	 * @param resource The resource.
	 * @returns The type IRIs, none when there is no store.
	 */
	getInferredTypes(graphs: string[] | undefined, resource: NamedNode | BlankNode): readonly string[] {
		const store = this._store;

		if (!store) {
			return [];
		}

		if (!this._inferredTypes || this._inferredTypes.version !== store.version) {
			this._inferredTypes = { version: store.version, types: new Map() };
		}

		const key = `${graphs?.join(' ') ?? '*'}|${termToString(resource)}`;
		const known = this._inferredTypes.types.get(key);

		if (known) {
			return known;
		}

		const types = new Set<string>();

		// Read with the inference graphs when the store has a reasoner; asking for them without one
		// throws.
		for (const quad of store.matchAll(graphs, resource, rdf.type, null, store.reasoner ? true : false)) {
			if (quad.object.termType === 'NamedNode') {
				types.add(quad.object.value);
			}
		}

		const result = Array.from(types);

		this._inferredTypes.types.set(key, result);

		return result;
	}

	/**
	 * How often a resource is referred to across the indexed documents, not counting the statement
	 * that defines it, as the usage code lens counts.
	 * @param iri The IRI of the resource.
	 * @returns The count.
	 */
	countUsages(iri: string): number {
		return Math.max(this._references.countReferencesForIri(iri) - 1, 0);
	}

	/**
	 * How often the statements of the store refer to a blank node, which nothing outside the document
	 * that writes it can name, as the form editor counts the usages of a blank node of its document.
	 * @param resource The blank node.
	 * @returns The count.
	 */
	private _countReferences(resource: BlankNode): number {
		let count = 0;

		for (const _ of this._store!.matchAll(undefined, null, null, resource, false)) {
			count++;
		}

		return count;
	}

	/**
	 * Options for building the statements about resources: the glyphs of the IRIs a card only
	 * mentions, and what values the predicates take, come from the store.
	 * @param graphs The graphs the inferred types of a resource are read from.
	 * @returns The options.
	 */
	getIndexOptions(graphs: string[] | undefined): ResourceIndexOptions {
		const icons = this._icons;
		const ranges = this._ranges;

		return {
			resolveObjectIcon: icons ? iri => icons.resolve(iri) : undefined,
			resolvePredicateRange: ranges ? (predicate, entry) => ranges.resolve(predicate, this.getTypes(entry, graphs)) : undefined
		};
	}

	/**
	 * Read the pinned properties from the layers of the setting: the default value and the workspace
	 * one for everyone, the user one for oneself.
	 * @returns The pins.
	 */
	readPins(): PinnedPropertiesService {
		return PinnedPropertiesService.fromSetting(getConfig('formEditor').inspect<unknown>(PINNED_PROPERTIES_SETTING));
	}
}
