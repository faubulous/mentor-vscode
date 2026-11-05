import { FormEvent, KeyboardEvent, useEffect, useState } from 'react';
import { VscodeTextfield } from '@vscode-elements/elements';
import { isPlainLocalName } from '@src/utilities/prefixed-name';
import { ResourceSummary } from '../form-editor-model';
import { useFormEditorContext } from '../state/form-editor-context';

/**
 * Properties of the {@link ResourceCardFooter} component.
 */
export interface ResourceCardFooterProps {
	/**
	 * The resource.
	 */
	summary: ResourceSummary;
}

/**
 * The footer of an expanded card: the button that opens the IRI of the resource in the gutter, then
 * the IRI as the document writes it. Where the document can be written, the local part is a field:
 * the text typed into it renames the resource as F2 does, when Enter is pressed or the field is
 * left; Escape gives it up. A blank node shows its identifier.
 * @param props The resource.
 * @returns The footer.
 */
export function ResourceCardFooter({ summary }: ResourceCardFooterProps): React.JSX.Element {
	const { readOnly, onOpenExternal, onRenameResource } = useFormEditorContext();
	const term = summary.term;

	if (term.termType !== 'NamedNode') {
		return <div className="resource-card-footer"><span></span><span className="resource-card-iri">_:{term.value}</span></div>;
	}

	const written = summary.prefixedName ?? term.value;
	const localPart = summary.localPart;
	const renamable = !readOnly && onRenameResource !== undefined && localPart !== undefined;

	return (
		<div className="resource-card-footer">
			<button type="button" className="resource-card-open" aria-label="Open IRI" title={term.value} onClick={() => onOpenExternal?.(term.value)}>
				<vscode-icon name="link-external" size={14}></vscode-icon>
			</button>
			{renamable
				? (
					<span className="resource-card-iri">
						<LocalPartField namespace={written.slice(0, written.length - localPart.length)} localPart={localPart} onRename={text => onRenameResource(term, text)} />
					</span>
				)
				: <span className="resource-card-iri">{written}</span>}
		</div>
	);
}

/**
 * Properties of the {@link LocalPartField} component.
 */
interface LocalPartFieldProps {
	/**
	 * What the document writes before the local part: the prefix of a prefixed name, or the
	 * namespace of an IRI.
	 */
	namespace: string;

	/**
	 * The local part the document writes.
	 */
	localPart: string;

	/**
	 * Renames the resource to another local part.
	 */
	onRename: (localPart: string) => void;
}

/**
 * The field of the local part of an IRI, plain at rest, with the namespace before it in the field.
 * It renames once the text is a local name that can be written as it is, and shows why it is none
 * otherwise.
 * @param props The namespace, the local part and what renames the resource.
 * @returns The field.
 */
function LocalPartField({ namespace, localPart, onRename }: LocalPartFieldProps): React.JSX.Element {
	const [text, setText] = useState(localPart);
	const invalid = !isPlainLocalName(text);

	// The text follows the local part the document writes, as after a rename.
	useEffect(() => setText(localPart), [localPart]);

	const commit = (): void => {
		if (text !== localPart && !invalid) {
			onRename(text);
		}
	};

	const handleKeyDown = (event: KeyboardEvent<VscodeTextfield>): void => {
		if (event.key === 'Enter') {
			event.preventDefault();
			commit();
		} else if (event.key === 'Escape') {
			event.preventDefault();
			setText(localPart);
		}
	};

	return (
		<vscode-textfield
			className="input-field resource-card-local-part"
			value={text}
			invalid={invalid}
			aria-label="Local part of the IRI"
			title={invalid ? 'A local part starts with a letter or _ and holds letters, digits, _, - and ., not ending in .' : 'Rename the resource wherever the workspace uses it'}
			autocomplete="off"
			onInput={(event: FormEvent<VscodeTextfield>) => setText(event.currentTarget.value)}
			onKeyDown={handleKeyDown}
			onBlur={commit}
		>
			<span slot="content-before" className="resource-card-namespace">{namespace}</span>
		</vscode-textfield>
	);
}
