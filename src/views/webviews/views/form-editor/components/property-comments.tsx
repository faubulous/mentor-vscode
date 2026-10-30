import { PropertyView } from '../form-editor-model';

/**
 * Properties of the {@link PropertyComments} component.
 */
export interface PropertyCommentsProps {
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
export function PropertyComments({ property }: PropertyCommentsProps): React.JSX.Element | null {
	return property.comments ? <div className="statement-comment">{property.comments.join('\n')}</div> : null;
}
