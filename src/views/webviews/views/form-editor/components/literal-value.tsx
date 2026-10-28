import { getLocalPartAndQuery } from '@src/utilities/uri';
import { NamespaceInfo, TermRef } from '../form-editor-model';
import { XSD_STRING } from '../line/well-known-iris';
import { useFormEditorContext } from '../state/form-editor-context';

/**
 * Properties of the {@link LiteralValue} component.
 */
export interface LiteralValueProps {
	/**
	 * The literal.
	 */
	term: Extract<TermRef, { kind: 'literal' }>;
}

/**
 * A literal as one block of text, wrapping like a paragraph, with its language tag or datatype
 * after it as a small tag. A plain string carries no tag.
 * @param props The literal.
 * @returns The text.
 */
export function LiteralValue({ term }: LiteralValueProps): React.JSX.Element {
	const { namespaces } = useFormEditorContext();
	const tag = term.language ?? _datatypeTagOf(term.datatype, namespaces);

	return (
		<span className="literal-value">
			<span className="literal-text">{term.value}</span>
			{tag && <span className="literal-tag">{tag}</span>}
		</span>
	);
}

/**
 * The tag a datatype is shown as: its prefixed name when a prefix is declared, else its local
 * name; none for a plain string.
 * @param datatype The IRI of the datatype.
 * @param namespaces The namespace declarations of the document.
 * @returns The tag, or `undefined` for a plain string.
 */
function _datatypeTagOf(datatype: string | undefined, namespaces: readonly NamespaceInfo[]): string | undefined {
	if (!datatype || datatype === XSD_STRING) {
		return undefined;
	}

	const namespace = namespaces.find(candidate => datatype.startsWith(candidate.iri));

	return namespace ? `${namespace.prefix}:${datatype.slice(namespace.iri.length)}` : getLocalPartAndQuery(datatype);
}
