import { QuadContext, RdfToken } from '@faubulous/mentor-rdf-parsers';
import { Term } from '@rdfjs/types';
import { getResourceId } from '@src/services/editing/resource-id';
import { isTokenOfType } from '@src/utilities/tokens';
import { ResourceId } from '@src/views/webviews/views/form-editor/form-editor-model';

/**
 * Where an anonymous blank node is written as a value: the resource holding it, the predicate,
 * and its place among the anonymous values of that predicate.
 */
interface Referrer {
	/**
	 * The resource the value belongs to.
	 */
	parent: Term;

	/**
	 * The IRI of the predicate.
	 */
	predicate: string;

	/**
	 * The place of the value among the anonymous values the resource has under the predicate.
	 */
	position: number;
}

/**
 * Names the resources of a document as the form editor knows them across versions. The parser
 * numbers anonymous blank nodes, written `[ … ]` or `( … )`, in the order of the file, so every
 * such node after one that is added or removed would change its identifier, and a card, its open
 * state and the rows being typed into would pass to another node. An anonymous node is therefore
 * named by where it is written in the graph: the resource holding it, the predicate and its place
 * among the anonymous values of that predicate. An edit elsewhere in the file leaves it its name.
 * An anonymous node that is no value, written as the subject of a block of its own, is named by
 * its place among those. A labelled blank node keeps the identifier of its label, and a resource
 * named by an IRI its IRI.
 */
export class ResourceIdentities {
	private readonly _labelled = new Set<string>();

	private readonly _referrers = new Map<string, Referrer>();

	private readonly _unreferenced = new Map<string, number>();

	private readonly _ids = new Map<string, ResourceId>();

	/**
	 * Read the blank nodes of a document.
	 * @param quadContexts The statements of the document, in document order.
	 */
	constructor(quadContexts: readonly QuadContext[]) {
		const positions = new Map<string, number>();

		for (const quad of quadContexts) {
			if (quad.subject.termType === 'BlankNode' && isTokenOfType(quad.subjectToken, RdfToken.BLANK_NODE_LABEL.name)) {
				this._labelled.add(quad.subject.value);
			}

			if (quad.object.termType !== 'BlankNode') {
				continue;
			}

			if (isTokenOfType(quad.objectToken, RdfToken.BLANK_NODE_LABEL.name)) {
				this._labelled.add(quad.object.value);
			} else if (!this._referrers.has(quad.object.value)) {
				const key = JSON.stringify([quad.subject.termType, quad.subject.value, quad.predicate.value]);
				const position = positions.get(key) ?? 0;

				positions.set(key, position + 1);
				this._referrers.set(quad.object.value, { parent: quad.subject, predicate: quad.predicate.value, position });
			}
		}

		for (const quad of quadContexts) {
			const node = quad.subject.value;

			if (quad.subject.termType === 'BlankNode' && !this._labelled.has(node) && !this._referrers.has(node) && !this._unreferenced.has(node)) {
				this._unreferenced.set(node, this._unreferenced.size);
			}
		}
	}

	/**
	 * Get the identifier of a resource.
	 * @param term The subject or object naming the resource.
	 * @returns The identifier.
	 */
	idOf(term: Term): ResourceId {
		if (term.termType !== 'BlankNode' || this._labelled.has(term.value)) {
			return getResourceId(term);
		}

		const known = this._ids.get(term.value);

		if (known !== undefined) {
			return known;
		}

		// Resolved before it is remembered, so a malformed chain that loops falls back to the
		// identifier of the parser rather than recursing for ever.
		this._ids.set(term.value, getResourceId(term));

		const id = this._anonymousIdOf(term);

		this._ids.set(term.value, id);

		return id;
	}

	/**
	 * Name an anonymous blank node by where it is written.
	 * @param term The blank node.
	 * @returns The identifier.
	 */
	private _anonymousIdOf(term: Term): ResourceId {
		const referrer = this._referrers.get(term.value);

		if (referrer) {
			return `b:${this.idOf(referrer.parent)}>${referrer.predicate}#${referrer.position}`;
		}

		const position = this._unreferenced.get(term.value);

		return position !== undefined ? `b:[${position}]` : getResourceId(term);
	}
}
