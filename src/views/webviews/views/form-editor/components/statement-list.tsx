import { BlankNode, NamedNode } from '@rdfjs/types';
import { RDF } from '@faubulous/mentor-rdf/ontologies';
import { useMemo, useState } from 'react';
import { ResourceDetail } from '../form-editor-model';
import { useNestedCollapse } from '../hooks/use-nested-collapse';
import { useStatementRows } from '../hooks/use-statement-rows';
import { StatementServices, useStatementServices } from '../hooks/use-statement-services';
import { IResourceDataService } from '../services/resource-data-service.interface';
import { useFormEditorContext } from '../state/form-editor-context';
import { LeadingRow, StatementRowEntry } from '../state/statement-rows';
import { RowHeader, StatementRow } from './statement-row';
import { getTermLabel } from './term-labels';

/**
 * Properties of the {@link StatementList} component.
 */
export interface StatementListProps {
	/**
	 * The resource with its statements.
	 */
	detail: ResourceDetail;

	/**
	 * Whether the detail belongs to an earlier document version while the current one loads.
	 */
	stale?: boolean;

	/**
	 * Supplies the statements of the blank nodes the values refer to.
	 */
	dataService: IResourceDataService;

	/**
	 * The nesting depth of the list: zero for a card of the list.
	 */
	depth: number;

	/**
	 * The resources that hold the list, which guard against cycles.
	 */
	visited: readonly (NamedNode | BlankNode)[];

	/**
	 * Whether the label row leads the rows, as in an expanded card of the list.
	 */
	labelRow?: boolean;

	/**
	 * The comment lines written above a blank node, which the header of its nested card shows.
	 */
	comments?: string[];
}

/**
 * The type leads the rows of a nested card, written `a` while the node has none.
 */
const TYPE_ROW: LeadingRow = { predicates: [RDF.type], predicateText: 'a' };

/**
 * The statements of a card as rows, in document order, each with the comment lines written above
 * it. Where the document can be written, the rows are edited in place, except those whose values
 * cannot all be kept by their place, which only read, and the link that adds a property ends them:
 * it opens a row for a new statement with the focus in its predicate, and the row closes again
 * when it is left with nothing typed. The label row leads the rows of a card of the list where the
 * card asks for it: the label predicate and the label as the title of the card. The nested card of
 * a blank node is led by a header: a chevron that collapses the card to the header, which then
 * names the other properties, the type of the node, which asks to choose one while there is none,
 * and the comments of the node; each of its rows has a button that removes its property. The
 * title bar of the card collapses and expands the nested cards all at once.
 * @param props The resource and where the list stands.
 * @returns The rows.
 */
export function StatementList({ detail, stale = false, dataService, depth, visited, labelRow = false, comments }: StatementListProps): React.JSX.Element {
	const { editing, readOnly, labelPredicates } = useFormEditorContext();
	const editable = !readOnly && editing !== undefined;
	const nested = depth > 0;
	const services = useStatementServices(detail, editable);
	const leadingRow = useMemo(() => nested ? TYPE_ROW : _labelRowOf(labelRow ? labelPredicates : undefined, services), [nested, labelRow, labelPredicates, services]);
	const { entries, addRow } = useStatementRows({
		detail,
		card: visited[0] ?? detail.term,
		leadingRow,
		version: dataService.version,
		stale,
		editing: editable ? editing : undefined,
		services
	});
	const [focusedRowId, setFocusedRowId] = useState<number>();
	const collapsed = useNestedCollapse(nested);
	const leadingEntry = leadingRow ? _leadingEntryOf(entries, leadingRow) : undefined;
	const rows = entries.filter(entry => entry !== leadingEntry);
	const header: RowHeader | undefined = nested
		? { kind: 'type', collapsed: collapsed.value, summary: _summaryOf(rows), caption: comments, onToggle: collapsed.toggle }
		: labelRow ? { kind: 'label' } : undefined;
	const adding = rows.some(entry => entry.editor?.isOpen === true);

	const handleAddProperty = (): void => {
		setFocusedRowId(addRow?.()?.id);
	};

	const rowOf = (entry: StatementRowEntry | undefined, rowHeader?: RowHeader): React.JSX.Element => (
		<StatementRow
			key={entry?.key ?? 'leading'}
			property={entry?.property}
			editor={entry?.editor}
			services={services}
			autoFocus={entry?.editor !== undefined && entry.editor.id === focusedRowId}
			removable={nested}
			header={rowHeader}
			dataService={dataService}
			depth={depth}
			visited={visited}
		/>
	);

	return (
		<div className={`statement-list${editable ? ' is-editable' : ''}${collapsed.value ? ' is-collapsed' : ''}`}>
			{header && rowOf(leadingEntry, header)}
			{!collapsed.value && rows.map(entry => rowOf(entry))}
			{!collapsed.value && addRow && !adding && (
				<div className="statement-list-add-row">
					<button type="button" className="add-link statement-list-add" onClick={handleAddProperty}>Add property</button>
				</div>
			)}
		</div>
	);
}

/**
 * The label predicates that lead the rows of a card of the list, the first of them written as the
 * row that stands in for a missing label writes it.
 * @param labelPredicates The label predicates Mentor is configured with, where the card has a
 * label row.
 * @param services Names the predicates, where the rows are edited.
 * @returns The leading row, or `undefined` where the card has no label row.
 */
function _labelRowOf(labelPredicates: readonly NamedNode[] | undefined, services: StatementServices | undefined): LeadingRow | undefined {
	const first = labelPredicates?.[0];

	if (!labelPredicates || !first) {
		return undefined;
	}

	return {
		predicates: labelPredicates.map(term => term.value),
		predicateText: services?.resolver.viewOf(first).prefixedName ?? `<${first.value}>`
	};
}

/**
 * The row that leads the rows: the one the rows mark, or where the rows only read, the property of
 * the most preferred leading predicate the resource has.
 * @param entries The rows.
 * @param leadingRow The leading predicates.
 * @returns The row, or `undefined` when the resource has none of the leading predicates.
 */
function _leadingEntryOf(entries: readonly StatementRowEntry[], leadingRow: LeadingRow): StatementRowEntry | undefined {
	const marked = entries.find(entry => entry.isLeading);

	if (marked) {
		return marked;
	}

	const predicateOf = (entry: StatementRowEntry): string | undefined => entry.property?.predicate.term.termType === 'NamedNode' ? entry.property.predicate.term.value : undefined;
	const predicate = leadingRow.predicates.find(candidate => entries.some(entry => predicateOf(entry) === candidate));

	return predicate ? entries.find(entry => predicateOf(entry) === predicate) : undefined;
}

/**
 * Name the properties a collapsed nested card leaves out.
 * @param rows The rows of the card other than its type.
 * @returns Their predicates, by their labels.
 */
function _summaryOf(rows: readonly StatementRowEntry[]): string {
	return rows.flatMap(entry => entry.property ? [getTermLabel(entry.property.predicate)] : []).join(', ');
}
