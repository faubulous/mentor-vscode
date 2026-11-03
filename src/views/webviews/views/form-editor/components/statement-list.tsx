import { BlankNode, NamedNode } from '@rdfjs/types';
import { RDF } from '@faubulous/mentor-rdf/ontologies';
import { Fragment, useState } from 'react';
import { ResourceDetail } from '../form-editor-model';
import { useStatementRows } from '../hooks/use-statement-rows';
import { useStatementServices } from '../hooks/use-statement-services';
import { IResourceDataService } from '../services/resource-data-service.interface';
import { useFormEditorContext } from '../state/form-editor-context';
import { StatementRowEntry } from '../state/statement-rows';
import { PropertyComments } from './property-comments';
import { BoxHeader, StatementRow } from './statement-row';
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
}

/**
 * The statements of a card as rows, in document order, each preceded by the comment lines
 * written above it. Where the document can be written, the rows are edited in place, except those
 * whose values cannot all be kept by their place, which only read. In a card of the list a row for
 * a new statement follows them. The box of a blank node is led by a header: a chevron that
 * collapses the box to the header, which then names the other properties, and the type of the
 * node, which asks to choose one while there is none. Add property opens a row for a new statement
 * in the box, and each of its rows has a button that removes its property.
 * @param props The resource and where the list stands.
 * @returns The rows.
 */
export function StatementList({ detail, stale = false, dataService, depth, visited }: StatementListProps): React.JSX.Element {
	const { editing, readOnly } = useFormEditorContext();
	const editable = !readOnly && editing !== undefined;
	const nested = depth > 0;
	const services = useStatementServices(detail, editable);
	const { entries, addRow } = useStatementRows({
		detail,
		card: visited[0] ?? detail.term,
		keepNewRowOpen: !nested,
		version: dataService.version,
		stale,
		editing: editable ? editing : undefined,
		services
	});
	const [focusedRowId, setFocusedRowId] = useState<number>();
	const [collapsed, setCollapsed] = useState(false);
	const typeEntry = nested ? entries.find(_isTypeEntry) : undefined;
	const rows = nested ? entries.filter(entry => entry !== typeEntry) : entries;

	const handleAddProperty = (): void => {
		setFocusedRowId(addRow?.()?.id);
	};

	const rowOf = (entry: StatementRowEntry | undefined, header?: BoxHeader): React.JSX.Element => (
		<StatementRow
			property={entry?.property}
			editor={entry?.editor}
			services={services}
			autoFocus={entry?.editor !== undefined && entry.editor.id === focusedRowId}
			removable={nested}
			header={header}
			dataService={dataService}
			depth={depth}
			visited={visited}
		/>
	);

	return (
		<div className={`statement-list${editable ? ' is-editable' : ''}${collapsed ? ' is-collapsed' : ''}`}>
			{nested && (
				<Fragment key={typeEntry?.key ?? 'type'}>
					{typeEntry?.property && <PropertyComments property={typeEntry.property} />}
					{rowOf(typeEntry, { collapsed, summary: _summaryOf(rows), onToggle: () => setCollapsed(current => !current) })}
				</Fragment>
			)}
			{!collapsed && rows.map(entry => (
				<Fragment key={entry.key}>
					{entry.property && <PropertyComments property={entry.property} />}
					{rowOf(entry)}
				</Fragment>
			))}
			{nested && !collapsed && addRow && (
				<button type="button" className="statement-list-add" onClick={handleAddProperty}>Add property</button>
			)}
		</div>
	);
}

/**
 * Indicate whether a row is the type of a blank node.
 * @param entry The row.
 * @returns `true` for the row of `rdf:type`.
 */
function _isTypeEntry(entry: StatementRowEntry): boolean {
	return entry.isType === true || (entry.property?.predicate.term.termType === 'NamedNode' && entry.property.predicate.term.value === RDF.type);
}

/**
 * Name the properties a collapsed box leaves out.
 * @param rows The rows of the box other than its type.
 * @returns Their predicates, by their labels.
 */
function _summaryOf(rows: readonly StatementRowEntry[]): string {
	return rows.flatMap(entry => entry.property ? [getTermLabel(entry.property.predicate)] : []).join(', ');
}
