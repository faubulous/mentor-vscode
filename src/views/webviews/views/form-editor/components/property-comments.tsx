import { PredicateData } from '../form-editor-model';
import { CommentField } from './comment-field';
import { CommentScope } from './value-comment';

/**
 * Properties of the {@link PropertyComments} component.
 */
export interface PropertyCommentsProps {
	/**
	 * The property.
	 */
	property: PredicateData;

	/**
	 * Where the comment is written.
	 */
	scope: CommentScope;
}

/**
 * The comment lines written above a property, if it has any, shown under the values of its row and
 * edited in place.
 * @param props The property and where its comment is written.
 * @returns The comment lines.
 */
export function PropertyComments({ property, scope }: PropertyCommentsProps): React.JSX.Element | null {
	const { subject, card, version } = scope;
	const predicate = property.predicate.term;

	if (!property.comments) {
		return null;
	}

	const anchor = predicate.termType === 'NamedNode' ? { kind: 'property' as const, subject, predicate: predicate.value } : undefined;

	return <CommentField className="statement-comment" label="Comment on the property" lines={property.comments} anchor={anchor} subject={subject} card={card} version={version} />;
}
