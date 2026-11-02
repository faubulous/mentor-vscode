import { QuadContext, RdfToken } from '@faubulous/mentor-rdf-parsers';
import { BlankNode, Term } from '@rdfjs/types';
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
 * Registers the blank nodes of a document under identifiers that stay as they are across versions
 * of the document. The parser numbers anonymous blank nodes, written `[ … ]` or `( … )`, in the
 * order of the file, so every such node after one that is added or removed would change its
 * identifier, and a card, its open state and the rows being typed into would pass to another node.
 * An anonymous node is therefore registered by where it is written in the graph: the resource
 * holding it, the predicate and its place among the anonymous values of that predicate. An edit
 * elsewhere in the file leaves it its identifier. An anonymous node that is no value, written as
 * the subject of a block of its own, is registered by its place among those, and a labelled blank
 * node by its label, as {@link getResourceId} does.
 */
export class BlankNodeIdRegister {
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
	 * Get the identifier of a blank node.
	 * @param node The blank node, as a subject or an object.
	 * @returns The identifier.
	 */
	idOf(node: BlankNode): ResourceId {
		if (this._labelled.has(node.value)) {
			return getResourceId(node);
		}

		const known = this._ids.get(node.value);

		if (known !== undefined) {
			return known;
		}

		// Resolved before it is remembered, so a malformed chain that loops falls back to the
		// identifier of the parser rather than recursing for ever.
		this._ids.set(node.value, getResourceId(node));

		const id = this._anonymousIdOf(node);

		this._ids.set(node.value, id);

		return id;
	}

	/**
	 * Identify an anonymous blank node by where it is written.
	 * @param node The blank node.
	 * @returns The identifier.
	 */
	private _anonymousIdOf(node: BlankNode): ResourceId {
		const referrer = this._referrers.get(node.value);

		if (referrer) {
			const parent = referrer.parent.termType === 'BlankNode' ? this.idOf(referrer.parent) : getResourceId(referrer.parent);

			return `b:${parent}>${referrer.predicate}#${referrer.position}`;
		}

		const position = this._unreferenced.get(node.value);

		return position !== undefined ? `b:[${position}]` : getResourceId(node);
	}
}
