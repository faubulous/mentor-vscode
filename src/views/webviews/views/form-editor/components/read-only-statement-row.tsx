import { PropertyView } from '../form-editor-model';
import { StatementRowContext } from './statement-row-context';
import { getTermLabel, getTermTitle } from './term-labels';
import { TermValue } from './term-value';

/**
 * Properties of the {@link ReadOnlyStatementRow} component.
 */
export interface ReadOnlyStatementRowProps extends StatementRowContext {
	/**
	 * The property the row shows.
	 */
	property: PropertyView;
}

/**
 * A statement as it is read: the predicate by its label, then each value on a line of its own,
 * with the comment lines written above it.
 * @param props The property and where the row stands.
 * @returns The row.
 */
export function ReadOnlyStatementRow({ property, ...context }: ReadOnlyStatementRowProps): React.JSX.Element {
	const label = getTermLabel(property.predicate);

	return (
		<div className="statement-line" role="group" aria-label={label}>
			<span className="statement-gutter"></span>
			<span className="statement-predicate" title={getTermTitle(property.predicate.term)}>{label}</span>
			<span className="statement-values">
				{property.values.map((value, index) => (
					<span key={index} className={`statement-value${value.nested ? ' is-node' : ''}`}>
						{value.comments && <span className="statement-value-comment">{value.comments.join('\n')}</span>}
						<TermValue view={value} {...context} />
					</span>
				))}
			</span>
			<span className="statement-actions"></span>
		</div>
	);
}
