import { Fragment } from 'react';
import { ResourceDetail } from '../form-editor-model';
import { useStatementRows } from '../hooks/use-statement-rows';
import { useStatementServices } from '../hooks/use-statement-services';
import { IResourceDataService } from '../services/resource-data-service.interface';
import { useFormEditorContext } from '../state/form-editor-context';
import { PropertyComments } from './property-comments';
import { StatementRow } from './statement-row';

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
 * whose values cannot all be kept by their place, only read.
 * @param props The resource and where the list stands.
 * @returns The rows.
 */
export function StatementList({ detail, stale = false, dataService, depth, visited }: StatementListProps): React.JSX.Element {
	const { editing, readOnly } = useFormEditorContext();
	const editable = !readOnly && editing !== undefined && depth === 0;
	const services = useStatementServices(detail, editable);
	const entries = useStatementRows({ detail, version: dataService.version, stale, editing: editable ? editing : undefined, services });

	return (
		<div className={`statement-list${editable ? ' is-editable' : ''}`}>
			{entries.map(entry => (
				<Fragment key={entry.key}>
					{entry.property && <PropertyComments property={entry.property} />}
					<StatementRow property={entry.property} editor={entry.editor} services={services} dataService={dataService} depth={depth} visited={visited} />
				</Fragment>
			))}
		</div>
	);
}
