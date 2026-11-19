import { Literal } from '@rdfjs/types';
import { useFormEditorContext } from '../state/form-editor-context';
import { getLiteralTag, getPrefixedNameIn } from './datatype-labels';
import { getResourceTooltipAttributes } from './resource-tooltip';

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
 * after it as a small tag, a datatype by its name and with its IRI in its tooltip. A plain string
 * carries no tag.
 * @param props The literal.
 * @returns The text.
 */
export function LiteralValue({ term }: LiteralValueProps): React.JSX.Element {
	const { namespaces } = useFormEditorContext();
	const tag = getLiteralTag(term, getPrefixedNameIn(namespaces));

	return (
		<span className="literal-value">
			<span className="literal-text">{term.value}</span>
			{tag && <span className="literal-tag" {...getResourceTooltipAttributes(term.language ? undefined : term.datatype, 'end')}>{tag}</span>}
		</span>
	);
}
