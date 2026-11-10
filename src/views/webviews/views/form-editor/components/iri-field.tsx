import { FormEvent, KeyboardEvent, useEffect, useState } from 'react';
import { VscodeTextfield } from '@vscode-elements/elements';
import { isPlainLocalName } from '@src/utilities/prefixed-name';

/**
 * Properties of the {@link IriField} component.
 */
export interface IriFieldProps {
	/**
	 * The IRI of the resource.
	 */
	iri: string;

	/**
	 * The namespace of the IRI, which a rename keeps: only the local part after it can change.
	 */
	namespace: string;

	/**
	 * Renames the resource to another IRI.
	 */
	onRename: (iri: string) => void;
}

/**
 * The field of the IRI of a resource, plain at rest, holding the whole IRI. It renames once the
 * text keeps the namespace and ends in a local name that can be written as it is, when Enter is
 * pressed or the field is left, and shows why the text is no such IRI otherwise; Escape gives the
 * text up.
 * @param props The IRI, its namespace and what renames the resource.
 * @returns The field.
 */
export function IriField({ iri, namespace, onRename }: IriFieldProps): React.JSX.Element {
	const [text, setText] = useState(iri);
	const problem = _problemOf(text, namespace);

	// The text follows the IRI the document writes, as after a rename.
	useEffect(() => setText(iri), [iri]);

	const commit = (): void => {
		if (text !== iri && !problem) {
			onRename(text);
		}
	};

	const handleKeyDown = (event: KeyboardEvent<VscodeTextfield>): void => {
		if (event.key === 'Enter') {
			event.preventDefault();
			commit();
		} else if (event.key === 'Escape') {
			event.preventDefault();
			setText(iri);
		}
	};

	return (
		<vscode-textfield
			className="input-field resource-card-iri-field"
			value={text}
			invalid={problem !== undefined}
			aria-label="IRI"
			title={problem ?? 'Rename the resource wherever the workspace uses it'}
			autocomplete="off"
			onInput={(event: FormEvent<VscodeTextfield>) => setText(event.currentTarget.value)}
			onKeyDown={handleKeyDown}
			onBlur={commit}
		/>
	);
}

/**
 * Why an IRI typed into the field cannot be renamed to, if it cannot.
 * @param text The text of the field.
 * @param namespace The namespace a rename keeps.
 * @returns The reason, or `undefined` for an IRI the resource can be renamed to.
 */
function _problemOf(text: string, namespace: string): string | undefined {
	if (!text.startsWith(namespace)) {
		return `The namespace ${namespace} cannot be changed here: only the local part after it can.`;
	}

	if (!isPlainLocalName(text.slice(namespace.length))) {
		return 'A local part starts with a letter or _ and holds letters, digits, _, - and ., not ending in .';
	}

	return undefined;
}
