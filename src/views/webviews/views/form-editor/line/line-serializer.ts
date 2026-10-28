import { formatIri } from '@src/utilities/prefixed-name';
import { PropertyView, TermView } from '../form-editor-model';
import { LineLexer } from './line-lexer';
import { LineModel } from './line-model';
import { RDF_TYPE, XSD_NAMESPACE, XSD_STRING } from './well-known-iris';

/**
 * The IRIs of the datatypes a number or boolean takes when written without quotes, by their
 * prefixed name.
 */
const XSD_DATATYPE_IRIS: Record<string, string> = {
	'xsd:boolean': `${XSD_NAMESPACE}boolean`,
	'xsd:integer': `${XSD_NAMESPACE}integer`,
	'xsd:decimal': `${XSD_NAMESPACE}decimal`,
	'xsd:double': `${XSD_NAMESPACE}double`
};

/**
 * The placeholder a blank-node value is written as on a line.
 */
export const PLACEHOLDER_TEXT = '[…]';

/**
 * Writes the properties of a resource as statement lines: the predicate, then its values
 * single-spaced, prefixed names where a prefix is declared, literals with their tag or datatype,
 * bare numbers and booleans, lists as `( … )` and blank nodes as placeholders.
 */
export class LineSerializer {
	private readonly _lexer = new LineLexer();

	/**
	 * Create a serializer for a document.
	 * @param _namespaces Prefix to namespace IRI.
	 */
	constructor(private readonly _namespaces: Record<string, string>) { }

	/**
	 * Escape a literal value for writing between quotes.
	 * @param value The value.
	 * @returns The escaped text.
	 */
	static escapeLiteral(value: string): string {
		return value.replace(/[\\"\n\r\t]/g, character => ({ '\\': '\\\\', '"': '\\"', '\n': '\\n', '\r': '\\r', '\t': '\\t' })[character] ?? character);
	}

	/**
	 * Write a property as a statement line.
	 * @param property The property.
	 * @returns The line with the views of its terms.
	 */
	serializeProperty(property: PropertyView): LineModel {
		const model: LineModel = { text: '', terms: {}, placeholders: [] };
		const predicate = this._predicateText(property.predicate);

		model.terms[predicate] = property.predicate;

		const values = property.values.map(value => this.serializeValue(value, model));

		model.text = [predicate, ...values].join(' ');

		return model;
	}

	/**
	 * Write a value as it appears on a line.
	 * @param view The value.
	 * @param model Collects the term views and blank nodes the text refers to, when given.
	 * @returns The text of the value.
	 */
	serializeValue(view: TermView, model?: Pick<LineModel, 'terms' | 'placeholders'>): string {
		if (view.collection) {
			const items = view.collection.items.map(item => this.serializeValue(item, model));

			return items.length > 0 ? `( ${items.join(' ')} )` : '( )';
		}

		switch (view.term.kind) {
			case 'iri': {
				const text = view.prefixedName ?? formatIri(this._namespaces, view.term.iri);

				if (model) {
					model.terms[text] = view;
				}

				return text;
			}
			case 'literal':
				return this._literalText(view.term.value, view.term.language, view.term.datatype);
			default:
				model?.placeholders.push(view);

				return PLACEHOLDER_TEXT;
		}
	}

	/**
	 * Put the commas Turtle needs between the top-level values of a canonical line, leaving the
	 * items of a list alone.
	 * @param canonical The canonical text of the line.
	 * @returns The statement text.
	 */
	toStatementText(canonical: string): string {
		if (LineLexer.isComment(canonical)) {
			return canonical;
		}

		const tokens = this._lexer.tokenize(canonical);
		const items = this._lexer.items(tokens);

		if (items.length === 0) {
			return canonical;
		}

		const values = this._lexer.valueGroups(tokens).map(group => canonical.slice(group.start, group.end));

		return values.length > 0 ? `${items[0].text} ${values.join(', ')}` : items[0].text;
	}

	/**
	 * Write the predicate: `a` for `rdf:type`, otherwise its prefixed name or `<iri>`.
	 * @param predicate The view of the predicate.
	 * @returns The text.
	 */
	private _predicateText(predicate: TermView): string {
		if (predicate.term.kind === 'iri') {
			return predicate.term.iri === RDF_TYPE ? 'a' : predicate.prefixedName ?? formatIri(this._namespaces, predicate.term.iri);
		}

		return predicate.prefixedName ?? PLACEHOLDER_TEXT;
	}

	/**
	 * Write a literal: bare when it is a number or boolean of the matching datatype, otherwise
	 * quoted with its language tag or datatype. `xsd:string` is implied and not written.
	 * @param value The value of the literal.
	 * @param language Its language tag, if any.
	 * @param datatype Its datatype, if any.
	 * @returns The text.
	 */
	private _literalText(value: string, language: string | undefined, datatype: string | undefined): string {
		if (language) {
			return `"${LineSerializer.escapeLiteral(value)}"@${language}`;
		}

		const shorthandDatatype = LineLexer.getDatatypeOf(value);

		if (datatype && shorthandDatatype && XSD_DATATYPE_IRIS[shorthandDatatype] === datatype) {
			return value;
		}

		if (datatype && datatype !== XSD_STRING) {
			return `"${LineSerializer.escapeLiteral(value)}"^^${formatIri(this._namespaces, datatype)}`;
		}

		return `"${LineSerializer.escapeLiteral(value)}"`;
	}
}
