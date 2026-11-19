import { _RDF, RDF, XSD } from '@faubulous/mentor-rdf/ontologies';
import { useEffect, useMemo, useRef, useState } from 'react';
import { VscodeTextfield } from '@vscode-elements/elements';
import { RdfDataFactory } from '@src/utilities/rdf-data-factory';
import { getDatatypeIconName } from '@src/utilities/resource-icon';
import { getLocalPartAndQuery } from '@src/utilities/uri';
import { ResourceOptionData } from '../form-editor-model';
import { StatementServices } from '../hooks/use-statement-services';
import { useTermOptions } from '../hooks/use-term-options';
import { useWorkspaceLanguages } from '../hooks/use-workspace-languages';
import { LiteralDatatypes } from '../services/statement/literal-datatypes';
import { narrowByMatch } from '../services/term-ranking';
import { useFormEditorContext } from '../state/form-editor-context';
import { LiteralTag } from '../state/literal-tag';
import { Combobox, ComboboxOption } from './combobox';
import { getDatatypeLabel } from './datatype-labels';
import { getTermOption } from './term-picker';

/**
 * The shape of a language tag such as `en` or `de-CH`.
 */
const LANGUAGE_TAG = /^[A-Za-z]{2,8}(-[A-Za-z0-9]{1,8})*$/;

/**
 * The glyph of a language.
 */
const LANGUAGE_ICON = 'globe';

/**
 * The datatypes of the store no literal of the picker takes, as they need a language.
 */
const LANGUAGE_DATATYPES: ReadonlySet<string> = new Set([RDF.langString, `${_RDF}dirLangString`]);

/**
 * Names languages in the language of the editor.
 */
const LANGUAGE_NAMES = new Intl.DisplayNames(undefined, { type: 'language' });

/**
 * What picking an option of the picker yields: the tag, and the datatype of the workspace it was
 * picked from, which may need its prefix declared.
 */
interface TagChoice {
	/**
	 * The tag.
	 */
	tag: LiteralTag;

	/**
	 * The datatype of the workspace picked, if one was.
	 */
	datatype?: ResourceOptionData;
}

/**
 * An option of the picker, with the names it is matched by.
 */
interface TagEntry {
	/**
	 * The option.
	 */
	option: ComboboxOption<TagChoice>;

	/**
	 * The names the typed text is matched against, the label first.
	 */
	names: readonly (string | undefined)[];
}

/**
 * Properties of the {@link TagPicker} component.
 */
export interface TagPickerProps {
	/**
	 * The text of the literal, which decides the datatypes on offer.
	 */
	text: string;

	/**
	 * The languages of the card, on offer before those of the workspace.
	 */
	languages: readonly string[];

	/**
	 * Reads a typed datatype and names the datatypes on offer.
	 */
	services: StatementServices;

	/**
	 * Called with the tag picked or typed, and the datatype of the workspace it was picked from.
	 */
	onPick: (tag: LiteralTag, datatype?: ResourceOptionData) => void;

	/**
	 * Called when the picker is left without a pick.
	 */
	onCancel: () => void;
}

/**
 * The picker of the language tag or datatype of a literal: a combobox offering the datatypes the
 * literal fields know that the text fits, then the languages of the card and those of the
 * workspace, the most used first, then the other datatypes of the workspace the text may fit, each
 * matched against the typed text as every picker matches. It opens over the end of the field
 * with its list open. A typed language code is taken as a language, a typed prefixed name or
 * `<iri>` as a datatype. Leaving it cancels.
 * @param props The literal and what to do with the pick.
 * @returns The picker.
 */
export function TagPicker({ text, languages, services, onPick, onCancel }: TagPickerProps): React.JSX.Element {
	const [typed, setTyped] = useState('');
	const fieldRef = useRef<VscodeTextfield>(null);
	const { languageTags } = useFormEditorContext();
	const datatypes = useTermOptions('datatype', typed, true);
	const workspaceLanguages = useWorkspaceLanguages();
	const options = useMemo(() => {
		const entries = [
			..._knownDatatypeEntriesOf(text, services),
			..._languageEntriesOf([...languages, ...workspaceLanguages.map(language => languageTags[language] ?? language)]),
			..._storeDatatypeEntriesOf(text, datatypes)
		];

		return narrowByMatch(entries, typed, entry => entry.names).map(entry => entry.option);
	}, [text, typed, languages, workspaceLanguages, languageTags, datatypes, services]);

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
			onPick({ datatype: reading.term.value });
		}
	};

	return (
		<span className="tag-picker" onBlur={event => !event.currentTarget.contains(event.relatedTarget as Node | null) && onCancel()}>
			<Combobox text={typed} onTextChange={setTyped} options={options} openOnFocus onPick={choice => onPick(choice.tag, choice.datatype)} onCreate={create} onCancel={onCancel} label="Language or datatype" placeholder="language or datatype" className="is-tag" fieldRef={fieldRef} />
		</span>
	);
}

/**
 * The datatypes the literal fields know that a text fits, in the order the fields know them, by
 * the names the fields give them.
 * @param text The text of the literal.
 * @param services Names the datatypes by their prefixed names.
 * @returns The entries.
 */
function _knownDatatypeEntriesOf(text: string, services: StatementServices): TagEntry[] {
	return LiteralDatatypes.fitting(text).map(iri => {
		const prefixedName = services.resolver.viewOf(RdfDataFactory.namedNode(iri)).prefixedName;
		const label = getDatatypeLabel(iri) ?? prefixedName ?? iri;
		const tag = iri === XSD.string ? {} : { datatype: iri };

		return {
			option: { label, detail: iri, iconName: getDatatypeIconName(iri), value: { tag } },
			names: [label, prefixedName, getLocalPartAndQuery(iri)]
		};
	});
}

/**
 * The languages on offer, each once, in the order given, by their tags with their names after them.
 * @param languages The language tags, those of the card first.
 * @returns The entries.
 */
function _languageEntriesOf(languages: readonly string[]): TagEntry[] {
	const seen = new Set<string>();
	const entries: TagEntry[] = [];

	for (const language of languages) {
		const key = language.toLowerCase();

		if (seen.has(key)) {
			continue;
		}

		const name = _languageNameOf(language);

		seen.add(key);
		entries.push({ option: { label: language, detail: name ?? 'Language', iconName: LANGUAGE_ICON, value: { tag: { language } } }, names: [language, name] });
	}

	return entries;
}

/**
 * The other datatypes of the workspace a text may fit, as the host ranked them: not those the
 * literal fields know, which come first, nor those that need a language.
 * @param text The text of the literal.
 * @param datatypes The datatypes of the workspace that match the typed text, best first.
 * @returns The entries.
 */
function _storeDatatypeEntriesOf(text: string, datatypes: readonly ResourceOptionData[]): TagEntry[] {
	return datatypes
		.filter(datatype => {
			const iri = datatype.subject.value;

			return !LiteralDatatypes.isKnown(iri) && !LANGUAGE_DATATYPES.has(iri) && LiteralDatatypes.fits(iri, text);
		})
		.map(datatype => ({
			option: getTermOption(datatype, { tag: { datatype: datatype.subject.value }, datatype }),
			names: [datatype.label, getLocalPartAndQuery(datatype.subject.value), datatype.prefixedName]
		}));
}

/**
 * The name of a language in the language of the editor, such as English for `en`.
 * @param language The language tag.
 * @returns The name, or `undefined` where the tag names no language the editor knows.
 */
function _languageNameOf(language: string): string | undefined {
	try {
		const name = LANGUAGE_NAMES.of(language);

		return name && name.toLowerCase() !== language.toLowerCase() ? name : undefined;
	} catch {
		return undefined;
	}
}
