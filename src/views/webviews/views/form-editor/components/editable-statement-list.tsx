import { Fragment, useEffect, useState } from 'react';
import { PropertyView } from '../form-editor-model';
import { StatementServices, useStatementServices } from '../hooks/use-statement-services';
import { CellKey } from '../state/cell-key';
import { IEditingController } from '../state/editing-controller.interface';
import { NewStatementRows } from '../state/new-statement-rows';
import { StatementDraft } from '../state/statement-draft';
import { EditableStatementRow } from './editable-statement-row';
import { PropertyComments } from './property-comments';
import { ReadOnlyStatementRow } from './read-only-statement-row';
import { StatementListProps } from './statement-list-props';

/**
 * Properties of the {@link EditableStatementList} component.
 */
export interface EditableStatementListProps extends StatementListProps {
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
export function EditableStatementList({ detail, stale = false, dataService, depth, visited, editing }: EditableStatementListProps): React.JSX.Element {
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
