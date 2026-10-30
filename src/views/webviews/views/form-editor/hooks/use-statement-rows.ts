import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react';
import { PropertyView, ResourceDetail } from '../form-editor-model';
import { IEditingController } from '../state/editing-controller.interface';
import { StatementRowEntry, StatementRows } from '../state/statement-rows';
import { StatementServices } from './use-statement-services';

/**
 * What the rows of a card are made from.
 */
export interface StatementRowsOptions {
	/**
	 * The resource of the card.
	 */
	detail: ResourceDetail;

	/**
	 * The document version the detail belongs to.
	 */
	version: number;

	/**
	 * Whether the detail belongs to an earlier version while the current one loads.
	 */
	stale: boolean;

	/**
	 * Writes the rows; absent where the card only reads.
	 */
	editing?: IEditingController;

	/**
	 * Reads what is typed and names the terms; absent where the card only reads.
	 */
	services?: StatementServices;
}

/**
 * The rows of a card: where the card can be written, the rows of {@link StatementRows}, which
 * keep their editors across renders and are written through the editing controller; otherwise a
 * row per property that only reads. Writes that waited for the data of the card go out once it
 * rendered.
 * @param options What the rows are made from.
 * @returns The rows in the order they are shown.
 */
export function useStatementRows({ detail, version, stale, editing, services }: StatementRowsOptions): readonly StatementRowEntry[] {
	const edited = services !== undefined;

	// A list shows one resource throughout: the cards are keyed by it.
	const rows = useMemo(() => editing && edited ? new StatementRows(editing) : undefined, [editing, edited]);
	const subscribe = useCallback((listener: () => void) => rows?.subscribe(listener) ?? (() => undefined), [rows]);
	const revision = useSyncExternalStore(subscribe, () => rows?.revision ?? 0);

	const entries = useMemo(() => {
		if (!rows || !services) {
			return detail.properties.map((property, index) => ({ key: `read-${index}`, property }));
		}

		return rows.reconcile({ resourceId: detail.id, subject: detail.term, properties: detail.properties, version, stale, reader: services.reader, predicateTextOf: property => _predicateText(property, services) });
		// The revision tells that rows opened or went outside of a render.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [rows, detail, version, stale, services, revision]);

	useEffect(() => editing?.flush());

	return entries;
}

/**
 * How the predicate of a property is written in its field: its prefixed name, else its IRI.
 * @param property The property.
 * @param services Gives the predicate its prefixed name.
 * @returns The text.
 */
function _predicateText(property: PropertyView, services: StatementServices): string {
	const term = property.predicate.term;

	return property.predicate.prefixedName ?? services.resolver.viewOf(term).prefixedName ?? (term.kind === 'iri' ? `<${term.iri}>` : '');
}
