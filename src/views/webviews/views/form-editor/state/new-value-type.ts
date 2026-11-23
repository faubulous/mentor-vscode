import { XSD } from '@faubulous/mentor-rdf/ontologies';
import { PredicateRangeData } from '../form-editor-model';
import { LiteralAnnotation } from './literal-annotation';
import { RowValue } from './row-value';

/**
 * What the text typed for a new value makes: a resource, or a literal.
 */
export type NewValueType = 'resource' | 'literal';

/**
 * The type a new value of a property starts as, and the datatype of a literal where a range names
 * one.
 */
export interface DefaultValueType {
	/**
	 * Whether a new value starts as a literal or as a resource.
	 */
	type: NewValueType;

	/**
	 * The IRI of the datatype a range gives the literal, `xsd:string` included; absent where no range
	 * names one.
	 */
	datatype?: string;
}

/**
 * The type a new value of a row starts as, by the first rule that applies: the type of a resource
 * takes resources and its label text; a range or shape of the predicate decides; else the type of
 * the last value of the row; else the type of the property, as of an object property; else text.
 * @param header The kind of header the row is, if it is one.
 * @param values The values of the row.
 * @param range What the store tells about the values of the predicate, if anything.
 * @returns The type.
 */
export function getDefaultValueType(header: 'type' | 'label' | undefined, values: readonly RowValue[], range: PredicateRangeData | undefined): DefaultValueType {
	if (header) {
		return { type: header === 'type' ? 'resource' : 'literal' };
	}

	if (range?.source === 'range') {
		return range.type === 'literal' && range.datatype ? { type: 'literal', datatype: range.datatype } : { type: range.type };
	}

	const last = values[values.length - 1];

	if (last) {
		return { type: (last.kind === 'written' ? last.view.term : last.term).termType === 'Literal' ? 'literal' : 'resource' };
	}

	return { type: range?.type ?? 'literal' };
}

/**
 * Indicate whether the text typed for a new value starts a literal at once, which then takes the
 * text in its own field: where a new value starts as a literal, from the first character. Text
 * for a resource stays in the input.
 * @param text The text typed so far.
 * @param defaultType The type a new value starts as.
 * @returns `true` when the text starts a literal.
 */
export function startsLiteral(text: string, defaultType: DefaultValueType): boolean {
	return defaultType.type === 'literal' && text.trim() !== '';
}

/**
 * The annotation a literal started for a new value gets: the datatype a range names, where it is
 * not plain text.
 * @param defaultType The type a new value starts as.
 * @returns The annotation.
 */
export function getDefaultAnnotation(defaultType: DefaultValueType): LiteralAnnotation {
	return defaultType.datatype && defaultType.datatype !== XSD.string ? { datatype: defaultType.datatype } : {};
}
