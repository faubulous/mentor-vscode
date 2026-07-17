import { DataFactory as N3DataFactory } from 'n3';
import { DatasetCore } from '@rdfjs/types';
import { RdfStore } from 'rdf-stores';
import { XSD, RDF, RDFS } from '@faubulous/mentor-rdf';

/**
 * An RDF/JS DataFactory extended with a `dataset()` method (DatasetCoreFactory),
 * as required by libraries that consume an RDF/JS environment such as shacl-engine.
 *
 * `literal()` tolerates `null` as the language/datatype argument: N3's literal()
 * throws when passed `null` (vs. `undefined`), but shacl-engine calls
 * `factory.literal(text, message.language || null)` when there is no language
 * tag, so `null` is normalized to `undefined` here. This is harmless for every
 * other caller.
 */
export const rdfDataFactory = {
	...N3DataFactory,
	literal(value: string, languageOrDataType?: any) {
		return N3DataFactory.literal(value, languageOrDataType ?? undefined);
	},
	dataset(): DatasetCore {
		return RdfStore.createDefault().asDataset();
	}
};

/**
 * The type of an RDF property derived from its range.
 */
export type PropertyType = 'objectProperty' | 'dataProperty' | 'annotationProperty';

/**
 * Classifies a property as a data property or an object property (relation)
 * based on its range or datatype IRI. Literal-valued ranges (XSD datatypes,
 * rdfs:Literal, rdf:langString) indicate a data property; everything else is
 * treated as an object property.
 *
 * This is the shared classification used by the definition tree icons and the
 * completion item kinds so that both surfaces categorize properties identically.
 *
 * @param rangeIri The IRI of the property's range or datatype, if known.
 * @returns The property type derived from the range.
 */
export function getPropertyTypeFromRange(rangeIri?: string): PropertyType {
	switch (rangeIri) {
		case RDF.langString:
		case RDFS.Literal:
		case XSD.base64Binary:
		case XSD.boolean:
		case XSD.byte:
		case XSD.date:
		case XSD.dateTime:
		case XSD.decimal:
		case XSD.double:
		case XSD.float:
		case XSD.int:
		case XSD.integer:
		case XSD.long:
		case XSD.negativeInteger:
		case XSD.nonNegativeInteger:
		case XSD.nonPositiveInteger:
		case XSD.positiveInteger:
		case XSD.short:
		case XSD.string:
		case XSD.unsignedInt:
		case XSD.unsignedShort:
		case XSD.unsingedLong:
		case XSD.usignedByte: {
			return 'dataProperty';
		}
		default: {
			return 'objectProperty';
		}
	}
}
