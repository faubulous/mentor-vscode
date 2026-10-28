import { ValueKind } from '@src/utilities/value-kind';
import { FieldCompletionScope } from './field-completion-scope';
import { FieldId } from './field-id';
import { StatementFields } from './statement-fields';
import { ValueFieldParser } from './value-field-parser';
import { RDF_TYPE } from './well-known-iris';

const PREFIX_ONLY = /^([A-Za-z][\w.-]*):$/;

/**
 * What decides the completions of a field.
 */
export interface FieldCompletionInput {
	/**
	 * The field that has the focus.
	 */
	focused?: FieldId;

	/**
	 * The fields of the row.
	 */
	fields: StatementFields;

	/**
	 * The text of the field for a new value.
	 */
	pending: string;

	/**
	 * The index of the value whose pill is being edited as text.
	 */
	editingPill?: number;

	/**
	 * What the predicate takes.
	 */
	range: ValueKind;

	/**
	 * The IRI of the predicate, which offers classes for `rdf:type`.
	 */
	predicateIri?: string;

	/**
	 * Prefix to namespace IRI.
	 */
	namespaces: Readonly<Record<string, string>>;
}

/**
 * Decides what the popup offers in the field that has the focus: predicates in the predicate,
 * resources (classes for a type) in a resource being typed, languages or datatypes after a
 * literal, and the prefix when an undeclared one is typed. Literals offer nothing.
 */
export class FieldCompletionResolver {
	/**
	 * Create a resolver.
	 * @param _parser Tells whether a typed text expects a resource.
	 */
	constructor(private readonly _parser: ValueFieldParser) { }

	/**
	 * Resolve the scope of the focused field.
	 * @param input The field and the row.
	 * @returns The scope, or `undefined` when the field offers nothing.
	 */
	resolveScope(input: FieldCompletionInput): FieldCompletionScope | undefined {
		const { focused, fields } = input;

		if (!focused) {
			return undefined;
		}

		switch (focused.kind) {
			case 'predicate':
				return _withPrefix({ kind: 'predicate', query: fields.predicate }, input.namespaces);
			case 'newValue':
				return this._resolveNewValueScope(input);
			case 'tag':
				return _resolveSuffixScope(fields, focused.index ?? -1);
			case 'value':
				return _resolvePillScope(input, focused.index ?? -1);
		}
	}

	/**
	 * The completions of the field for a new value: resources while it reads as a name.
	 * @param input The field and the row.
	 * @returns The scope, or `undefined` while a literal or list is typed.
	 */
	private _resolveNewValueScope(input: FieldCompletionInput): FieldCompletionScope | undefined {
		const typed = input.pending.trimStart();

		if (/^["([]/.test(typed) || !this._parser.expectsResource(input.range, typed)) {
			return undefined;
		}

		return _withPrefix({ kind: _resourceKind(input.predicateIri), query: typed }, input.namespaces);
	}
}

/**
 * The completions of the suffix of a literal: languages after `@`, datatypes after `^^`.
 * @param fields The fields of the row.
 * @param index The index of the literal.
 * @returns The scope, or `undefined` when the field is no suffix of a literal.
 */
function _resolveSuffixScope(fields: StatementFields, index: number): FieldCompletionScope | undefined {
	const field = fields.values[index];

	if (field?.kind !== 'literal') {
		return undefined;
	}

	if (field.suffix.startsWith('@')) {
		return { kind: 'language', query: field.suffix.slice(1) };
	}

	return field.suffix.startsWith('^^') ? { kind: 'datatype', query: field.suffix.slice(2) } : undefined;
}

/**
 * The completions of a pill: resources while it is edited as text.
 * @param input The field and the row.
 * @param index The index of the value.
 * @returns The scope, or `undefined` while the pill is not edited.
 */
function _resolvePillScope(input: FieldCompletionInput, index: number): FieldCompletionScope | undefined {
	const field = input.fields.values[index];

	if (field?.kind !== 'resource' || input.editingPill !== index) {
		return undefined;
	}

	return _withPrefix({ kind: _resourceKind(input.predicateIri), query: field.text }, input.namespaces);
}

/**
 * Offer the prefix itself when the text is an undeclared prefix followed by a colon.
 * @param scope The scope so far.
 * @param namespaces Prefix to namespace IRI.
 * @returns The scope of the prefix, or the scope as it was.
 */
function _withPrefix(scope: FieldCompletionScope, namespaces: Readonly<Record<string, string>>): FieldCompletionScope {
	const prefix = PREFIX_ONLY.exec(scope.query.trim());

	return prefix && namespaces[prefix[1]] === undefined ? { kind: 'prefix', query: prefix[1] } : scope;
}

/**
 * Classes are offered as the values of a type, resources otherwise.
 * @param predicateIri The IRI of the predicate.
 * @returns The kind.
 */
function _resourceKind(predicateIri: string | undefined): 'class' | 'resource' {
	return predicateIri === RDF_TYPE ? 'class' : 'resource';
}
