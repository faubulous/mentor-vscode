import { QuadContext } from '@faubulous/mentor-rdf-parsers';
import { IDocumentContext } from '@src/services/document/document-context.interface';
import { FocusTarget } from '@src/services/editing/edit-plan';
import { getResourceId } from '@src/services/editing/resource-id';
import { FocusHint, PropertyView, TermView } from '@src/views/webviews/views/form-editor/form-editor-model';
import { ResourceIndex, ResourceIndexEntry, ResourceIndexOptions } from './resource-index';
import { ResourceViewBuilder } from './resource-view-builder';
import { leadingCommentsOf } from './statement-comments';

/**
 * The resource identifier a focus on the comments closing the document is reported with.
 */
export const DOCUMENT_RESOURCE_ID = 'document';

/**
 * Where an edit put the term the focus should move to, in the edited text.
 */
export interface FocusPoint {
	/**
	 * The offset of the term in the edited text.
	 */
	offset: number;

	/**
	 * Which cell of the row the focus goes to.
	 */
	target: FocusTarget;
}

/**
 * A value located among the property rows of a resource.
 */
interface ValueLocation {
	/**
	 * The index of the property row.
	 */
	propertyIndex: number;

	/**
	 * The index of the value within the row.
	 */
	valueIndex: number;

	/**
	 * The value.
	 */
	value: TermView;
}

/**
 * Resolves where the focus goes after an edit against the re-parsed document, so the webview can
 * focus the cell that was edited or created even though blank node identifiers and value indices
 * may have changed.
 */
export class FocusHintResolver {
	private readonly _views: ResourceViewBuilder;

	/**
	 * Create a resolver for the edited document.
	 * @param _index The resource index of the edited document.
	 * @param context The document context, used to build the resource details.
	 * @param options The options the details are built with.
	 */
	constructor(private readonly _index: ResourceIndex, context: IDocumentContext, options?: ResourceIndexOptions) {
		this._views = new ResourceViewBuilder(_index, context, options);
	}

	/**
	 * Resolve a focus point to the cell holding the term written there.
	 * @param point The focus point.
	 * @returns The hint, or `undefined` if the term cannot be found.
	 */
	resolve(point: FocusPoint): FocusHint | undefined {
		switch (point.target) {
			case 'subject':
				return this._resolveSubject(point.offset);
			case 'predicate':
				return this._resolvePredicate(point.offset);
			case 'comment':
				return this._resolveComment(point.offset);
			default:
				return this._resolveValue(point.offset);
		}
	}

	/**
	 * Find the resource whose subject token starts at an offset.
	 * @param offset The offset.
	 * @returns The hint, or `undefined` when no subject starts there.
	 */
	private _resolveSubject(offset: number): FocusHint | undefined {
		const entry = this._findEntry(quad => quad.subjectToken.startOffset === offset);

		return entry ? { resourceId: entry.id, target: 'subject' } : undefined;
	}

	/**
	 * Find the resource whose statements a comment starting at an offset is written above. A
	 * comment the reader attached to the last statement but written after it closes the document.
	 * @param offset The offset.
	 * @returns The hint, or `undefined` when no comment starts there.
	 */
	private _resolveComment(offset: number): FocusHint | undefined {
		const entry = this._findEntry(quad => leadingCommentsOf(quad).some(comment => comment.startOffset === offset));

		if (entry) {
			return { resourceId: entry.id, target: 'comment' };
		}

		const closesDocument = this._findEntry(quad => (quad.leadingComments ?? []).some(comment => comment.startOffset === offset));

		return closesDocument ? { resourceId: DOCUMENT_RESOURCE_ID, target: 'comment' } : undefined;
	}

	/**
	 * Find the property row whose predicate token starts at an offset.
	 * @param offset The offset.
	 * @returns The hint, or `undefined` when no predicate starts there.
	 */
	private _resolvePredicate(offset: number): FocusHint | undefined {
		const entry = this._findEntry(quad => quad.predicateToken.startOffset === offset);

		if (!entry) {
			return undefined;
		}

		const propertyIndex = this._views.buildDetail(entry).properties.findIndex(property => property.predicate.anchor === offset);

		return propertyIndex < 0 ? undefined : { resourceId: entry.id, propertyIndex, target: 'predicate' };
	}

	/**
	 * Find the value whose token starts at an offset. A value that is a nested blank node hands the
	 * focus to the node itself, so the user can start filling it in.
	 * @param offset The offset.
	 * @returns The hint, or `undefined` when no value starts there.
	 */
	private _resolveValue(offset: number): FocusHint | undefined {
		const entry = this._findEntry(quad => quad.objectToken.startOffset === offset && !this._index.collectionNodes.has(getResourceId(quad.subject)));

		if (!entry) {
			return this._resolveCollectionItem(offset);
		}

		const location = _locateValue(this._views.buildDetail(entry).properties, value => value.anchor === offset);

		if (!location) {
			return undefined;
		}

		const nested = location.value.nested;

		if (nested && this._index.entries.has(nested.id)) {
			return { resourceId: nested.id, parentId: entry.id, propertyIndex: location.propertyIndex, valueIndex: location.valueIndex, target: 'addProperty' };
		}

		return { resourceId: entry.id, propertyIndex: location.propertyIndex, valueIndex: location.valueIndex, target: 'value' };
	}

	/**
	 * Find the collection item whose token starts at an offset, addressed through the value that
	 * holds the collection.
	 * @param offset The offset.
	 * @returns The hint, or `undefined` when no item starts there.
	 */
	private _resolveCollectionItem(offset: number): FocusHint | undefined {
		for (const entry of this._index.entries.values()) {
			if (this._index.collectionNodes.has(entry.id)) {
				continue;
			}

			const location = _locateValue(this._views.buildDetail(entry).properties, value => value.collection?.items.some(item => item.anchor === offset) ?? false);

			if (location) {
				const itemIndex = location.value.collection?.items.findIndex(item => item.anchor === offset);

				return { resourceId: entry.id, propertyIndex: location.propertyIndex, valueIndex: location.valueIndex, itemIndex, target: 'value' };
			}
		}

		return undefined;
	}

	/**
	 * Find the entry holding a statement that satisfies a condition.
	 * @param matches The condition.
	 * @returns The entry, or `undefined` when no statement satisfies it.
	 */
	private _findEntry(matches: (quad: QuadContext) => boolean): ResourceIndexEntry | undefined {
		for (const entry of this._index.entries.values()) {
			if (entry.quads.some(matches)) {
				return entry;
			}
		}

		return undefined;
	}
}

/**
 * Locate a value within the property rows of a detail.
 * @param properties The property rows.
 * @param matches The condition the value satisfies.
 * @returns The location, or `undefined` when no value satisfies it.
 */
function _locateValue(properties: readonly PropertyView[], matches: (value: TermView) => boolean): ValueLocation | undefined {
	for (let propertyIndex = 0; propertyIndex < properties.length; propertyIndex++) {
		const valueIndex = properties[propertyIndex].values.findIndex(matches);

		if (valueIndex >= 0) {
			return { propertyIndex, valueIndex, value: properties[propertyIndex].values[valueIndex] };
		}
	}

	return undefined;
}
