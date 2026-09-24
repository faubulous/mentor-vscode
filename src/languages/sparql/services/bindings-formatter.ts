import { Term } from '@rdfjs/types';
import { Uri } from '@faubulous/mentor-rdf';
import { BindingsResult, BooleanResult } from './sparql-query-state';

/**
 * The textual formats the query results can be serialized to.
 */
export type BindingsFormat = 'csv' | 'markdown' | 'json';

/**
 * Determines whether named nodes are rendered as full IRIs or with their namespace prefix.
 */
export type IriForm = 'full' | 'prefixed';

/**
 * Where the results toolbar sends the serialized query results. Declared here, next to the
 * formats, so the webview can use it without reaching into a module that reads settings.
 */
export type ResultsExportTarget = 'document' | 'clipboard';

/**
 * Options controlling how a result is rendered as text.
 */
export interface BindingsFormatOptions {
	/**
	 * The target format of the serialization.
	 */
	format: BindingsFormat;

	/**
	 * The rendering of named nodes. Defaults to 'full'.
	 */
	iriForm?: IriForm;
}

/**
 * Returns the plain-text representation of a term. With `iriForm` set to 'prefixed' this
 * mirrors the bindings table, which shows prefixed IRIs (`foaf:Person`), literal values,
 * `_:blank` ids and quads serialized as `s p o .`. Literals are rendered as their bare
 * value, without language tag or datatype, as the table does.
 * @param term The term to render, or `undefined` for an unbound cell.
 * @param namespaceMap Maps namespace IRIs to prefixes, used when `iriForm` is 'prefixed'.
 * @param iriForm Whether to render named nodes as full IRIs or prefixed. Defaults to 'full'.
 * @returns The text of the term, or an empty string for an unbound cell.
 */
export function getTermText(term: Term | undefined, namespaceMap?: Record<string, string>, iriForm: IriForm = 'full'): string {
	if (!term) {
		return '';
	}

	switch (term.termType) {
		case 'NamedNode': {
			if (iriForm === 'full') {
				return term.value;
			}

			const namespaceIri = Uri.getNamespaceIri(term.value);
			const prefix = namespaceMap ? namespaceMap[namespaceIri] : undefined;

			return prefix !== undefined ? `${prefix}:${term.value.replace(namespaceIri, '')}` : term.value;
		}
		case 'BlankNode':
			return `_:${term.value}`;
		case 'Literal':
			return term.value;
		case 'Quad':
			return `${getTermText(term.subject, namespaceMap, iriForm)} ${getTermText(term.predicate, namespaceMap, iriForm)} ${getTermText(term.object, namespaceMap, iriForm)} .`;
		default:
			return term.value ?? '';
	}
}

/**
 * Escapes a value for a CSV field according to RFC 4180. The field is always quoted so that
 * embedded delimiters, quotes and line breaks are preserved verbatim.
 * @param value The raw cell text.
 * @returns The quoted and escaped field.
 */
function escapeCsvField(value: string): string {
	return `"${value.replace(/"/g, '""')}"`;
}

/**
 * Escapes a value for a Markdown table cell. Pipes would end the cell and line breaks would
 * end the row, so both are replaced by representations that survive the table layout.
 *
 * Backslashes are escaped first, because they are the escape character themselves: a value
 * containing a backslash before a pipe would otherwise produce an escaped backslash followed
 * by a bare pipe, which ends the cell.
 * @param value The raw cell text.
 * @returns The escaped cell text.
 */
function escapeMarkdownCell(value: string): string {
	return value
		.replace(/\\/g, '\\\\')
		.replace(/\|/g, '\\|')
		.replace(/\r\n|\r|\n/g, '<br>');
}

/**
 * Renders a bindings result as an RFC 4180 CSV document.
 * @param result The bindings to render.
 * @param iriForm The rendering of named nodes.
 * @returns The CSV text, without a trailing newline.
 */
function formatBindingsAsCsv(result: BindingsResult, iriForm: IriForm): string {
	const lines = [result.columns.map(escapeCsvField).join(',')];

	for (const row of result.rows) {
		const cells = result.columns.map(column => escapeCsvField(getTermText(row[column], result.namespaceMap, iriForm)));

		lines.push(cells.join(','));
	}

	return lines.join('\n');
}

/**
 * Renders a bindings result as a GitHub flavoured Markdown table.
 * @param result The bindings to render.
 * @param iriForm The rendering of named nodes.
 * @returns The Markdown table, without a trailing newline.
 */
function formatBindingsAsMarkdown(result: BindingsResult, iriForm: IriForm): string {
	const lines = [
		`| ${result.columns.map(escapeMarkdownCell).join(' | ')} |`,
		`| ${result.columns.map(() => '---').join(' | ')} |`
	];

	for (const row of result.rows) {
		const cells = result.columns.map(column => escapeMarkdownCell(getTermText(row[column], result.namespaceMap, iriForm)));

		lines.push(`| ${cells.join(' | ')} |`);
	}

	return lines.join('\n');
}

/**
 * Renders a bindings result in the SPARQL 1.1 Query Results JSON format. Unbound variables are
 * omitted from a binding, as the specification requires.
 * @param result The bindings to render.
 * @returns The indented JSON text.
 */
function formatBindingsAsJson(result: BindingsResult): string {
	const bindings = result.rows.map(row => {
		const binding: Record<string, unknown> = {};

		for (const column of result.columns) {
			const term = row[column];

			if (term) {
				binding[column] = toJsonTerm(term);
			}
		}

		return binding;
	});

	return JSON.stringify({ head: { vars: result.columns }, results: { bindings } }, null, 2);
}

/**
 * Converts a term into its SPARQL Query Results JSON representation.
 * @param term The term to convert.
 * @returns The JSON object describing the term.
 */
function toJsonTerm(term: Term): Record<string, string> {
	switch (term.termType) {
		case 'NamedNode':
			return { type: 'uri', value: term.value };
		case 'BlankNode':
			return { type: 'bnode', value: term.value };
		case 'Literal': {
			const result: Record<string, string> = { type: 'literal', value: term.value };

			if (term.language) {
				result['xml:lang'] = term.language;
			} else if (term.datatype?.value) {
				result.datatype = term.datatype.value;
			}

			return result;
		}
		default:
			return { type: 'literal', value: term.value ?? '' };
	}
}

/**
 * Renders a query result as text in the requested format. Boolean results carry no table, so
 * they are rendered as their literal value in every text format.
 * @param result The bindings or boolean result to render, or `undefined`.
 * @param options The target format and the rendering of named nodes.
 * @returns The serialized result, or an empty string if there is no result.
 */
export function formatQueryResult(result: BindingsResult | BooleanResult | undefined, options: BindingsFormatOptions): string {
	if (!result) {
		return '';
	}

	if (result.type === 'boolean') {
		return options.format === 'json'
			? JSON.stringify({ head: {}, boolean: result.value }, null, 2)
			: String(result.value);
	}

	const iriForm = options.iriForm ?? 'full';

	switch (options.format) {
		case 'markdown':
			return formatBindingsAsMarkdown(result, iriForm);
		case 'json':
			return formatBindingsAsJson(result);
		default:
			return formatBindingsAsCsv(result, iriForm);
	}
}

/**
 * Returns the language identifier a document should use to display the given format.
 * @param format The format the content was serialized to.
 * @returns The VS Code language identifier.
 */
export function getLanguageIdForFormat(format: BindingsFormat): string {
	switch (format) {
		case 'markdown':
			return 'markdown';
		case 'json':
			return 'json';
		default:
			return 'csv';
	}
}
