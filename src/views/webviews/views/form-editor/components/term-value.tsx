import { TermView } from '../form-editor-model';
import { useIriNavigation } from '../hooks/use-iri-navigation';
import { LiteralValue } from './literal-value';
import { NestedCardActions } from './nested-card-menu';
import { NestedResourceCard } from './nested-resource-card';
import { StatementRowContext } from './statement-row-context';
import { ValuePill } from './value-pill';

/**
 * Properties of the {@link TermValue} component.
 */
export interface TermValueProps extends StatementRowContext {
	/**
	 * The value.
	 */
	view: TermView;

	/**
	 * What the row can do with a blank node shown as a nested card; absent where the row only reads.
	 */
	nestedActions?: NestedCardActions;
}

/**
 * One value as it is read: a pill for a resource that leads to it, the text of a literal with
 * its tag, the items of a list, or the card of a blank node.
 * @param props The value and where it stands.
 * @returns The value.
 */
export function TermValue({ view, dataService, depth, visited, nestedActions }: TermValueProps): React.JSX.Element {
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
		return <NestedResourceCard nested={view.nested} dataService={dataService} depth={depth + 1} visited={visited} actions={nestedActions} />;
	}

	switch (view.term.termType) {
		case 'Literal':
			return <LiteralValue term={view.term} />;
		case 'NamedNode': {
			const iri = view.term.value;

			return <ValuePill view={view} onNavigate={() => navigate(iri)} />;
		}
		default:
			return <ValuePill view={view} />;
	}
}
