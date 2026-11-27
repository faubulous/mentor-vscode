import { PredicateData } from '../form-editor-model';
import { getCommentTarget } from '../state/comment-editor';
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
 * The comment lines written above a property, shown under the values of its row and edited in
 * place; once asked for, an empty field for a property without a comment, which writes one.
 * @param props The property and where its comment is written.
 * @returns The comment lines, or nothing for a property without them.
 */
export function PropertyComments({ property, scope }: PropertyCommentsProps): React.JSX.Element | null {
	const { subject, card, version, draft, onDraftDone } = scope;
	const predicate = property.predicate.term;
	const anchor = predicate.termType === 'NamedNode' ? { kind: 'property' as const, subject, predicate: predicate.value } : undefined;
	const asked = draft === 'property' && anchor !== undefined;

	if (!property.comments && !asked) {
		return null;
	}

	return (
		<CommentField
			className="statement-comment"
			label="Comment on the property"
			lines={property.comments ?? []}
			target={anchor ? getCommentTarget(anchor) : undefined}
			subject={subject}
			card={card}
			version={version}
			autoFocus={asked}
			onLeave={asked ? onDraftDone : undefined}
		/>
	);
}
