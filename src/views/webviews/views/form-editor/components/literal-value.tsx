import { Literal } from '@rdfjs/types';
import { useFormEditorContext } from '../state/form-editor-context';
import { getLiteralTag } from './datatype-labels';

/**
 * Properties of the {@link LiteralValue} component.
 */
export interface LiteralValueProps {
	/**
	 * The literal.
	 */
	term: Literal;
}

/**
 * A literal as one block of text, wrapping like a paragraph, with its language tag or datatype
 * after it as a small tag. A plain string carries no tag.
 * @param props The literal.
 * @returns The text.
 */
export function LiteralValue({ term }: LiteralValueProps): React.JSX.Element {
	const { namespaces, languageTags } = useFormEditorContext();
	const tag = getLiteralTag(term, languageTags, namespaces);

	return (
		<span className="literal-value">
			<span className="literal-text">{term.value}</span>
			{tag && <span className="literal-tag">{tag}</span>}
		</span>
	);
}
