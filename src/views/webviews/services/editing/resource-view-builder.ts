import { QuadContext } from '@faubulous/mentor-rdf-parsers';
import { Quad_Object, Quad_Subject, Term } from '@rdfjs/types';
import { OWL, RDF, RDFS, SH, Uri } from '@faubulous/mentor-rdf';
import { IDocumentContext } from '@src/services/document/document-context.interface';
import { getIriResourceId, getResourceId, toTermRef } from '@src/services/editing/resource-id';
import { DEFAULT_ICON, getSubjectIconName } from '@src/utilities/subject-icon';
import { hasSourcePosition } from '@src/utilities/tokens';
import { ValueKind, ValueKindHint } from '@src/utilities/value-kind';
import {
	NestedResourceRef,
	PropertyView,
	ResourceDetail,
	ResourceId,
	ResourceSummary,
	TermRef,
	TermView
} from '@src/views/webviews/views/form-editor/form-editor-model';
import { AnnotationResolver } from './annotation-resolver';
import { CollectionItem, ResourceIndex, ResourceIndexEntry, ResourceIndexOptions, isCollectionChainPredicate, typeIrisOf } from './resource-index';
import { leadingCommentRunsOf, splitLeadingComments } from './statement-comments';

/**
 * The display text of a term, with the language it was read in.
 */
interface ResolvedLabel {
	/**
	 * The text.
	 */
	text: string;

	/**
	 * The language tag of the text, when it was read from a language tagged literal.
	 */
	language?: string;
}

/**
 * Builds what the webview shows of the indexed resources: the rows of the resource list, the
 * properties of an open resource, and the predicates they are written with.
 */
export class ResourceViewBuilder {
	private readonly _annotations: AnnotationResolver;

	/**
	 * Create a builder for the resources of a document.
	 * @param _index The resource index of the document.
	 * @param _context The document context, used to resolve labels and prefixes.
	 * @param _options Options controlling how the views are built.
	 */
	constructor(
		private readonly _index: ResourceIndex,
		private readonly _context: IDocumentContext,
		private readonly _options: ResourceIndexOptions = {}
	) {
		this._annotations = new AnnotationResolver(_context.predicates.label, _context.predicates.description, _context.activeLanguageTag);
	}

	/**
	 * Build the list row of a resource. The row is described only with what the document states,
	 * as looking every resource up in the store costs a rebuild of a large document dearly.
	 * @param entry The resource.
	 * @returns The resource summary.
	 */
	buildSummary(entry: ResourceIndexEntry): ResourceSummary {
		const typeIris = typeIrisOf(entry);
		const typeLabels = this._resolveTypeLabels(typeIris);
		const primaryType = _primaryTypeIndex(typeIris);
		const label = this._resolveLabel(entry.term);

		return {
			id: entry.id,
			term: entry.term,
			label: label.text,
			description: this._annotations.findDescription(entry)?.text,
			prefixedName: this._toPrefixedName(entry.term),
			iconName: this._resolveIconName(entry, typeIris),
			typeIri: typeIris[primaryType],
			typeLabel: typeLabels?.[primaryType],
			propertyCount: _countProperties(entry),
			hasLabel: this._annotations.findLabel(entry) !== undefined,
			comments: entry.nested ? undefined : leadingCommentRunsOf(entry)
		};
	}

	/**
	 * Build the property rows of a resource, grouping the statements by predicate in document
	 * order. Nested blank node objects are linked to their own entry so the webview can render
	 * them inline or as a placeholder.
	 * @param entry The resource.
	 * @returns The resource detail.
	 */
	buildDetail(entry: ResourceIndexEntry): ResourceDetail {
		const { groups, resourceComments } = this._collectProperties(entry);

		return {
			id: entry.id,
			term: entry.term,
			properties: groups.map(group => ({ ...group, valueKind: _valueKindOf(group.values) })),
			// A resource of its own shows them above its card, where they were written; a node
			// written inside another has no card of its own to stand outside of.
			comments: entry.nested && resourceComments.length > 0 ? resourceComments : undefined
		};
	}

	/**
	 * Group the statements of a resource by predicate in document order, giving the comments
	 * written above each statement to what they introduce: the resource for its first statement,
	 * the property for the first statement of a later predicate, and otherwise the value.
	 * @param entry The resource.
	 * @returns The property rows and the comment lines introducing the resource.
	 */
	private _collectProperties(entry: ResourceIndexEntry): { groups: PropertyView[]; resourceComments: string[] } {
		const groups = new Map<string, PropertyView>();
		const resourceComments: string[] = [];
		let isFirstStatement = true;

		for (const quad of entry.quads) {
			const predicateIri = quad.predicate.value;

			if (isCollectionChainPredicate(predicateIri)) {
				continue;
			}

			const { aboveProperty, aboveValue } = splitLeadingComments(quad);
			let group = groups.get(predicateIri);

			// A comment above a later statement of a predicate introduces that value, not the row.
			// So does one above a statement whose object is a blank node: the node stands in the
			// value column, and a shape lists its property shapes that way, each under its own
			// comment.
			const introducesValue = group !== undefined || (!isFirstStatement && quad.object.termType === 'BlankNode');

			if (!group) {
				group = { predicate: this._toTermView(quad.predicate, quad.predicateToken), values: [] };

				if (isFirstStatement) {
					resourceComments.push(...aboveProperty);
				} else if (!introducesValue && aboveProperty.length > 0) {
					group.comments = aboveProperty;
				}

				groups.set(predicateIri, group);
			}

			const value = this._toObjectTermView(quad);
			const comments = introducesValue ? [...aboveProperty, ...aboveValue] : aboveValue;

			group.values.push(comments.length > 0 ? { ...value, comments } : value);
			isFirstStatement = false;
		}

		return { groups: Array.from(groups.values()), resourceComments };
	}

	/**
	 * Build the view of a predicate the document does not state for a resource yet, resolved as
	 * the predicates of its rows are, so the two are named alike.
	 * @param iri The IRI of the predicate.
	 * @returns The view of the predicate.
	 */
	buildPredicateView(iri: string): TermView {
		const term: TermRef = { kind: 'iri', iri };
		const label = this._resolveLabel(term);

		return { term, label: label.text, prefixedName: this._toPrefixedName(term), editable: true };
	}

	/**
	 * Build the view of a term written at a token.
	 * @param term The term.
	 * @param token The token the term is written at, which positions and anchors the view.
	 * @returns The view.
	 */
	private _toTermView(term: Quad_Subject | Quad_Object, token: QuadContext['objectToken']): TermView {
		const termRef = toTermRef(term);
		const label = this._resolveLabel(termRef);
		const written = hasSourcePosition(token);

		return {
			term: termRef,
			label: label.text,
			prefixedName: this._toPrefixedName(termRef),
			anchor: written ? token.startOffset : undefined,
			editable: written
		};
	}

	/**
	 * Build the view of the object of a statement. An inline blank node is linked to its own
	 * entry, and a collection stands in for its items.
	 * @param quad The statement.
	 * @returns The view.
	 */
	private _toObjectTermView(quad: QuadContext): TermView {
		return this._decorateValue(this._toTermView(quad.object, quad.objectToken), quad.object, true);
	}

	/**
	 * Build the view of an item of a collection. The item is positioned by the token of its
	 * `rdf:first` statement, which the reader points at the item itself, so an item can be edited
	 * in place like any other value. A blank node item may still have a form of its own.
	 * @param item The item.
	 * @returns The view.
	 */
	private _toItemTermView(item: CollectionItem): TermView {
		return this._decorateValue(this._toTermView(item.term as Quad_Object, item.quad.objectToken), item.term, false);
	}

	/**
	 * Add to the view of a value what tells a resource apart from a literal: the glyph of an IRI,
	 * the items of a collection, or the nested form of a blank node.
	 * @param view The view of the value.
	 * @param term The value.
	 * @param inlineOnly Whether only a blank node written inline gets a nested form.
	 * @returns The decorated view.
	 */
	private _decorateValue(view: TermView, term: Term, inlineOnly: boolean): TermView {
		if (term.termType === 'NamedNode') {
			return term.value === RDF.nil ? { ...view, collection: { items: [] } } : this._withResourceMark(view, term.value);
		}

		if (term.termType !== 'BlankNode') {
			return view;
		}

		const id = getResourceId(term);
		const items = this._index.collections.get(id);

		if (items) {
			return { ...view, collection: { items: items.map(item => this._toItemTermView(item)) } };
		}

		const nested = this._toNestedRef(id, inlineOnly);

		return nested ? { ...view, nested } : view;
	}

	/**
	 * Build the reference from a value to the blank node resource it denotes.
	 * @param id The identifier of the blank node.
	 * @param inlineOnly Whether only a blank node written inline is referred to.
	 * @returns The reference, or `undefined` when the node has no form of its own.
	 */
	private _toNestedRef(id: ResourceId, inlineOnly: boolean): NestedResourceRef | undefined {
		const nested = this._index.entries.get(id);

		if (!nested || (inlineOnly && !nested.nested)) {
			return undefined;
		}

		const typeIris = typeIrisOf(nested);

		return {
			id,
			propertyCount: _countProperties(nested),
			label: this._resolveLabel(nested.term).text || undefined,
			typeLabel: typeIris.length > 0 ? this._resolveLabel({ kind: 'iri', iri: typeIris[0] }).text : undefined
		};
	}

	/**
	 * Mark an IRI value with the glyph of the resource it denotes. A resource the document
	 * describes is marked by its own statements, as in the resource list; any other IRI is marked
	 * by what the store knows about it. Nothing is inferred here: what a resource is, is for the
	 * reasoner to say.
	 * @param view The view of the value.
	 * @param iri The IRI.
	 * @returns The marked view.
	 */
	private _withResourceMark(view: TermView, iri: string): TermView {
		const entry = this._index.entries.get(getIriResourceId(iri));
		const stated = entry ? this._resolveIconName(entry, typeIrisOf(entry)) : undefined;
		const iconName = stated && stated !== DEFAULT_ICON ? stated : this._options.resolveObjectIcon?.(iri) ?? stated;

		return { ...view, iconName };
	}

	/**
	 * Resolve the display text of a term: what the definition tree calls it, so a card and the
	 * tree node of one resource carry the same name, falling back to the prefixed name or the
	 * local part of an IRI.
	 * @param term The term.
	 * @returns The text and its language.
	 */
	private _resolveLabel(term: TermRef): ResolvedLabel {
		if (term.kind === 'literal') {
			return { text: term.value, language: term.language };
		}

		if (term.kind === 'bnode') {
			// A blank node has no name of its own, but the label predicates include `sh:path`, so a
			// property shape is named by the path it constrains, exactly as in the definition tree.
			// The resolver falls back to the identifier when it finds nothing. That identifier is
			// assigned by the parser and means nothing to a reader, so it is treated as no label.
			const label = this._context.getResourceLabel(term.id);

			return { text: label?.value === term.id ? '' : (label?.value ?? ''), language: label?.language };
		}

		const label = this._context.getResourceLabel(term.iri);

		if (label?.value) {
			return { text: label.value, language: label.language };
		}

		return { text: this._toPrefixedName(term) ?? Uri.getLocalPart(term.iri) ?? term.iri };
	}


	/**
	 * Resolve the labels of the types a resource asserts, as the labels of any other terms are.
	 * @param typeIris The type IRIs.
	 * @returns The labels, or `undefined` when the resource asserts no type.
	 */
	private _resolveTypeLabels(typeIris: readonly string[]): string[] | undefined {
		if (typeIris.length === 0) {
			return undefined;
		}

		return typeIris.map(iri => this._resolveLabel({ kind: 'iri', iri }).text);
	}

	/**
	 * Resolve the glyph that marks what kind of resource this is, from its types, its range and
	 * the statements that identify a shape declaring no type of its own.
	 * @param entry The resource.
	 * @param typeIris The types the resource asserts.
	 * @returns The icon name.
	 */
	private _resolveIconName(entry: ResourceIndexEntry, typeIris: readonly string[]): string {
		return getSubjectIconName(typeIris, {
			rangeIri: _objectIriOf(entry, RDFS.range),
			predicateIris: entry.quads.map(quad => quad.predicate.value),
			datatypeIri: _objectIriOf(entry, SH.datatype)
		});
	}

	/**
	 * Render a term as a prefixed name when a prefix is declared for its namespace.
	 * @param term The term.
	 * @returns The prefixed name, or `undefined` for a blank node, a literal or an undeclared namespace.
	 */
	private _toPrefixedName(term: TermRef): string | undefined {
		if (term.kind !== 'iri') {
			return undefined;
		}

		const namespaceIri = Uri.getNamespaceIri(term.iri);
		const prefix = this._context.getPrefixForNamespaceIri(namespaceIri);

		return prefix === undefined ? undefined : `${prefix}:${term.iri.slice(namespaceIri.length)}`;
	}
}

/**
 * The position of the type a resource is shown by among the types it asserts: the first, passing
 * over `owl:NamedIndividual` when it asserts another, as an individual is better told by its class.
 * @param typeIris The types the resource asserts.
 * @returns The index, or `-1` when the resource asserts no type.
 */
function _primaryTypeIndex(typeIris: readonly string[]): number {
	const index = typeIris.findIndex(type => type !== OWL.NamedIndividual);

	return index >= 0 ? index : typeIris.length > 0 ? 0 : -1;
}

/**
 * Count the predicates of a resource, leaving out those that chain a collection.
 * @param entry The resource.
 * @returns The number of predicates.
 */
function _countProperties(entry: ResourceIndexEntry): number {
	return new Set(entry.quads.map(quad => quad.predicate.value).filter(iri => !isCollectionChainPredicate(iri))).size;
}

/**
 * Get the IRI a resource states for a predicate, if it states one.
 * @param entry The resource.
 * @param predicateIri The predicate.
 * @returns The IRI, or `undefined`.
 */
function _objectIriOf(entry: ResourceIndexEntry, predicateIri: string): string | undefined {
	return entry.quads.find(quad => quad.predicate.value === predicateIri && quad.object.termType === 'NamedNode')?.object.value;
}

/**
 * Tell what kind of values a predicate takes from the values it has: literals, resources, or
 * either when it has both.
 * @param values The values of the predicate.
 * @returns The hint, or `undefined` when the predicate has no value.
 */
function _valueKindOf(values: readonly TermView[]): ValueKindHint | undefined {
	const kinds = new Set<ValueKind>(values.map(value => value.term.kind === 'literal' ? 'literal' : 'resource'));

	if (kinds.size === 0) {
		return undefined;
	}

	return { kind: kinds.size === 1 ? [...kinds][0] : 'any', source: 'usage' };
}

