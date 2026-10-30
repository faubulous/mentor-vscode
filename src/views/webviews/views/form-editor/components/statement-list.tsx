import { Fragment, useEffect, useState } from 'react';
import { PropertyView, ResourceDetail } from '../form-editor-model';
import { StatementServices, useStatementServices } from '../hooks/use-statement-services';
import { IResourceDataService } from '../services/resource-data-service.interface';
import { CellKey } from '../state/cell-key';
import { IEditingController } from '../state/editing-controller.interface';
import { useFormEditorContext } from '../state/form-editor-context';
import { NewStatementRows } from '../state/new-statement-rows';
import { StatementDraft } from '../state/statement-draft';
import { EditableStatementRow, ReadOnlyStatementRow } from './statement-row';

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
	visited: readonly string[];
}

/**
 * The statements of a card as rows, in document order, each preceded by the comment lines
 * written above it. Where the document can be written, the rows of a card of the list are edited
 * in place and a row for a new statement follows them; the rows of a nested blank node, and those
 * whose values cannot all be kept by their place, are read.
 * @param props The resource and where the list stands.
 * @returns The rows.
 */
export function StatementList(props: StatementListProps): React.JSX.Element {
	const { editing, readOnly } = useFormEditorContext();

	return !readOnly && editing && props.depth === 0
		? <EditableStatementList {...props} editing={editing} />
		: <ReadOnlyStatementList {...props} />;
}

/**
 * The rows of a resource as they are read.
 * @param props The resource and where the list stands.
 * @returns The rows.
 */
function ReadOnlyStatementList({ detail, dataService, depth, visited }: StatementListProps): React.JSX.Element {
	return (
		<div className="statement-list">
			{detail.properties.map((property, index) => (
				<Fragment key={index}>
					<PropertyComments property={property} />
					<ReadOnlyStatementRow property={property} dataService={dataService} depth={depth} visited={visited} />
				</Fragment>
			))}
		</div>
	);
}

/**
 * Properties of the {@link EditableStatementList} component.
 */
interface EditableStatementListProps extends StatementListProps {
	/**
	 * Hands the edits to the host.
	 */
	editing: IEditingController;
}

/**
 * The rows of a resource as fields, followed by the rows for new statements: the one being typed
 * into, and those handed to the host, which are read until the host shows their statements.
 * @param props The resource, the means to edit and where the list stands.
 * @returns The rows.
 */
function EditableStatementList({ detail, stale = false, dataService, depth, visited, editing }: EditableStatementListProps): React.JSX.Element {
	const services = useStatementServices(detail);
	const [newRows, setNewRows] = useState(NewStatementRows.NONE);
	const context = { dataService, depth, visited };

	// The host delivered the card again: the rows it shows the statements of now go.
	useEffect(() => setNewRows(current => current.pruneSubmitted()), [detail]);

	// A row for a new statement is always at hand after the statements.
	useEffect(() => {
		if (!newRows.open) {
			setNewRows(current => current.opened());
		}
	}, [newRows]);

	return (
		<div className="statement-list is-editable">
			{detail.properties.map((property, index) => (
				<Fragment key={index}>
					<PropertyComments property={property} />
					{StatementDraft.canEdit(property)
						? <EditableStatementRow cellKey={new CellKey({ resourceId: detail.id, column: 'statement', propertyIndex: index })} subject={detail.term} property={property} stale={stale} services={services} editing={editing} {...context} />
						: <ReadOnlyStatementRow property={property} {...context} />}
				</Fragment>
			))}
			{newRows.all.map(row => row.submitted
				? <ReadOnlyStatementRow key={`new-${row.id}`} property={_propertyOf(row.submitted, services)} {...context} />
				: (
					<EditableStatementRow
						key={`new-${row.id}`}
						cellKey={new CellKey({ resourceId: detail.id, column: 'draft', propertyIndex: row.id })}
						subject={detail.term}
						stale={stale}
						services={services}
						editing={editing}
						onSubmitted={statement => setNewRows(current => current.submitted(row.id, statement))}
						{...context}
					/>
				))}
		</div>
	);
}

/**
 * Properties of the {@link PropertyComments} component.
 */
interface PropertyCommentsProps {
	/**
	 * The property.
	 */
	property: PropertyView;
}

/**
 * The comment lines written above a property, if it has any.
 * @param props The property.
 * @returns The comment lines.
 */
function PropertyComments({ property }: PropertyCommentsProps): React.JSX.Element | null {
	return property.comments ? <div className="statement-comment">{property.comments.join('\n')}</div> : null;
}

/**
 * The property a statement handed to the host stands for until the host shows it.
 * @param statement The statement.
 * @param services Gives the terms their views.
 * @returns The property.
 */
function _propertyOf(statement: StatementDraft, services: StatementServices): PropertyView {
	return {
		predicate: services.resolver.viewOf({ kind: 'iri', iri: statement.predicate ?? '' }),
		values: statement.values.map(value => value.kind === 'written' ? value.view : services.resolver.viewOf(value.term))
	};
}
