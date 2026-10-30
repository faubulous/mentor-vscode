import { Fragment } from 'react';
import { PropertyComments } from './property-comments';
import { ReadOnlyStatementRow } from './read-only-statement-row';
import { StatementListProps } from './statement-list-props';

/**
 * The rows of a resource as they are read.
 * @param props The resource and where the list stands.
 * @returns The rows.
 */
export function ReadOnlyStatementList({ detail, dataService, depth, visited }: StatementListProps): React.JSX.Element {
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
