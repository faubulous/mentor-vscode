import { XSD } from '@faubulous/mentor-rdf/ontologies';
import { useEffect, useMemo, useRef, useState } from 'react';
import { VscodeTextfield } from '@vscode-elements/elements';
import { StatementServices } from '../hooks/use-statement-services';
import { LiteralDatatypes } from '../services/statement/literal-datatypes';
import { LiteralTag } from '../state/literal-tag';
import { Combobox, ComboboxOption } from './combobox';
import { getDatatypeLabel } from './datatype-labels';

/**
 * The shape of a language tag such as `en` or `de-CH`.
 */
const LANGUAGE_TAG = /^[A-Za-z]{2,8}(-[A-Za-z0-9]{1,8})*$/;

/**
 * Properties of the {@link TagPicker} component.
 */
export interface TagPickerProps {
	/**
	 * The text of the literal, which decides the datatypes on offer.
	 */
	text: string;

	/**
	 * The languages of the card, on offer after the datatypes.
	 */
	languages: readonly string[];

	/**
	 * Reads a typed datatype and names the datatypes on offer.
	 */
	services: StatementServices;

	/**
	 * Called with the tag picked or typed.
	 */
	onPick: (tag: LiteralTag) => void;

	/**
	 * Called when the picker is left without a pick.
	 */
	onCancel: () => void;
}

/**
 * The picker of the language tag or datatype of a literal: a combobox offering the datatypes the
 * text fits, plain text first, then the languages of the card. A typed language code is taken as
 * a language, a typed prefixed name or `<iri>` as a datatype. Leaving it cancels.
 * @param props The literal and what to do with the pick.
 * @returns The picker.
 */
export function TagPicker({ text, languages, services, onPick, onCancel }: TagPickerProps): React.JSX.Element {
	const [typed, setTyped] = useState('');
	const fieldRef = useRef<VscodeTextfield>(null);
	const options = useMemo(() => _optionsOf(text, languages, services), [text, languages, services]);

	useEffect(() => {
		const field = fieldRef.current;

		void Promise.resolve(field?.updateComplete).then(() => field?.focus());
	}, []);

	const create = (value: string): void => {
		const trimmed = value.trim();

		if (LANGUAGE_TAG.test(trimmed)) {
			onPick({ language: trimmed });

			return;
		}

		const reading = services.reader.readIri(trimmed);

		if (reading.term) {
			onPick({ datatype: reading.term.iri });
		}
	};

	return (
		<span className="tag-picker" onBlur={event => !event.currentTarget.contains(event.relatedTarget as Node | null) && onCancel()}>
			<Combobox text={typed} onTextChange={setTyped} options={options} onPick={onPick} onCreate={create} onCancel={onCancel} label="Language or datatype" placeholder="language or datatype" className="is-tag" fieldRef={fieldRef} />
		</span>
	);
}

/**
 * The tags on offer for a text.
 * @param text The text of the literal.
 * @param languages The languages of the card.
 * @param services Names the datatypes by their prefixed names.
 * @returns The options.
 */
function _optionsOf(text: string, languages: readonly string[], services: StatementServices): ComboboxOption<LiteralTag>[] {
	const datatypes = LiteralDatatypes.fitting(text).map(iri => {
		const prefixedName = services.resolver.viewOf({ kind: 'iri', iri }).prefixedName;

		return { label: getDatatypeLabel(iri) ?? prefixedName ?? iri, detail: prefixedName ?? iri, keywords: prefixedName, value: iri === XSD.string ? {} : { datatype: iri } };
	});

	return [...datatypes, ...languages.map(language => ({ label: language, detail: 'Language', value: { language } }))];
}
