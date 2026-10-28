import { Fragment } from 'react';
import { PropertyView, ResourceDetail, TermView } from '../form-editor-model';
import { useIriNavigation } from '../hooks/use-iri-navigation';
import { IResourceDataService } from '../services/resource-data-service.interface';
import { LiteralValue } from './literal-value';
import { NestedResourceCard } from './nested-resource-card';
import { ValuePill } from './value-pill';

/**
 * Properties of the {@link StatementList} component.
 */
export interface StatementListProps {
	/**
	 * The resource with its statements.
	 */
	detail: ResourceDetail;

	/**
	 * Supplies the statements of the blank nodes the values refer to.
	 */
	dataService: IResourceDataService;

	/**
	 * The nesting depth of the list: zero for a card of the list.
	 */
	depth: number;

	/**
	 * The resources that hold this list, which guard against cycles.
	 */
	visited: readonly string[];
}

/**
 * The statements of a card as rows, in document order: each property one row, preceded by the
 * comment lines written above it, with the label of the predicate beside its values, each value
 * on a line of its own. Resources are pills that lead to their card, literals are their text
 * with their tag, and a blank node is its own card below the line that refers to it.
 * @param props The resource and where the list stands.
 * @returns The rows.
 */
export function StatementList({ detail, dataService, depth, visited }: StatementListProps): React.JSX.Element {
	return (
		<div className="statement-list">
			{detail.properties.map((property, index) => (
				<Fragment key={index}>
					{property.comments && <div className="statement-comment">{property.comments.join('\n')}</div>}
					<StatementRow property={property} dataService={dataService} depth={depth} visited={visited} />
				</Fragment>
			))}
		</div>
	);
}

/**
 * Properties of the {@link StatementRow} component.
 */
export interface StatementRowProps extends Omit<StatementListProps, 'detail'> {
	/**
	 * The property of the row.
	 */
	property: PropertyView;
}

/**
 * One statement: the predicate by its label, then each value on a line of its own with the
 * comment lines written above it.
 * @param props The property and where the row stands.
 * @returns The row.
 */
export function StatementRow({ property, ...rest }: StatementRowProps): React.JSX.Element {
	const predicate = property.predicate;
	const title = predicate.term.kind === 'iri' ? predicate.term.iri : undefined;
	const label = predicate.label || predicate.prefixedName || title;

	return (
		<div className="statement-line" role="group" aria-label={label}>
			<span className="statement-predicate" title={title}>{label}</span>
			<span className="statement-values">
				{property.values.map((value, index) => (
					<span key={index} className={`statement-value${value.nested ? ' is-node' : ''}`}>
						{value.comments && <span className="statement-value-comment">{value.comments.join('\n')}</span>}
						<TermValue view={value} {...rest} />
					</span>
				))}
			</span>
		</div>
	);
}

/**
 * Properties of the {@link TermValue} component.
 */
interface TermValueProps extends Omit<StatementListProps, 'detail'> {
	/**
	 * The value.
	 */
	view: TermView;
}

/**
 * One value: a pill for a resource, the text of a literal, the items of a list, or the card of
 * a blank node.
 * @param props The value and where it stands.
 * @returns The value.
 */
function TermValue({ view, dataService, depth, visited }: TermValueProps): React.JSX.Element {
	const navigate = useIriNavigation();

	if (view.collection) {
		return (
			<span className="statement-list-items" role="list">
				{view.collection.items.map((item, index) => (
					<span key={index} className={`statement-list-item${item.nested ? ' is-node' : ''}`} role="listitem">
						<TermValue view={item} dataService={dataService} depth={depth} visited={visited} />
					</span>
				))}
			</span>
		);
	}

	if (view.nested) {
		return <NestedResourceCard nested={view.nested} dataService={dataService} depth={depth + 1} visited={visited} />;
	}

	switch (view.term.kind) {
		case 'literal':
			return <LiteralValue term={view.term} />;
		case 'iri': {
			const iri = view.term.iri;

			return <ValuePill label={view.label || view.prefixedName || iri} title={iri} iconName={view.iconName} onNavigate={() => navigate(iri)} />;
		}
		default: {
			const title = view.term.kind === 'bnode' ? `_:${view.term.id}` : undefined;

			return <ValuePill label={view.label || view.prefixedName || title || ''} title={title} iconName={view.iconName} />;
		}
	}
}
