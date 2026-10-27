/**
 * The icon glyphs Mentor shows for RDF resources, shared by the definition tree and the form
 * editor so that the same kind of thing looks the same in both.
 *
 * Note: Do not import from 'vscode' here. This file is bundled into the form editor webview.
 */

import { _SH, OWL, RDF, RDFS, SH, SKOS, XSD } from '@faubulous/mentor-rdf';
import type { ValueKind } from '@src/utilities/value-kind';

/**
 * The glyph shown for a property whose range says nothing more specific.
 */
const DEFAULT_PROPERTY_ICON = 'rdf-object-property';

/**
 * Get the glyph of a literal datatype: the shape of the values it holds, which is how a date is
 * told from a number at a glance. Shared by the property glyphs of the definition tree and the
 * value type markers of the form editor, so a datatype looks the same wherever it appears.
 * @param datatypeIri The IRI of the datatype, or `undefined` for a plain literal.
 * @returns The name of the icon to show, or `undefined` for a datatype with no glyph of its own.
 */
export function getDatatypeIconName(datatypeIri?: string): string | undefined {
	switch (datatypeIri) {
		case XSD.date:
		case XSD.dateTime:
			return 'calendar';
		case XSD.boolean:
			return 'symbol-boolean';
		case XSD.base64Binary:
			return 'file-binary';
		case XSD.byte:
		case XSD.decimal:
		case XSD.double:
		case XSD.float:
		case XSD.int:
		case XSD.integer:
		case XSD.short:
		case XSD.nonNegativeInteger:
		case XSD.nonPositiveInteger:
		case XSD.negativeInteger:
		case XSD.positiveInteger:
		case XSD.long:
		case XSD.unsignedInt:
		case XSD.unsignedShort:
		case XSD.unsignedLong:
		case XSD.unsignedByte:
			return 'symbol-number';
		case undefined:
		case XSD.string:
		case RDF.langString:
		case RDFS.Literal:
			return 'symbol-text';
		default:
			return undefined;
	}
}

/**
 * Get the glyph of a property from the type of value it takes. A data property is shown by the
 * shape of its values rather than by a glyph of its own, which is what distinguishes it from an
 * object property at a glance.
 * @param rangeIri The IRI of the property's range or datatype, if it declares one.
 * @param valueKind The kind of values the property takes, when known; decides the glyph of a
 * literal-valued property whose datatype is not one of the well-known XSD types.
 * @returns The name of the icon to show.
 */
export function getPropertyIconName(rangeIri?: string, valueKind?: ValueKind): string {
	// A property that declares no range at all is a relation until something says otherwise.
	if (rangeIri === undefined) {
		return valueKind === 'literal' ? 'symbol-text' : DEFAULT_PROPERTY_ICON;
	}

	return getDatatypeIconName(rangeIri) ?? (valueKind === 'literal' ? 'symbol-text' : DEFAULT_PROPERTY_ICON);
}

/**
 * Glyphs by type IRI, most specific first. Properties are absent: their glyph comes from the
 * range through {@link getPropertyIconName}.
 */
const TYPE_ICONS: [string, string][] = [
	[OWL.Ontology, 'rdf-ontology'],
	[SKOS.ConceptScheme, 'rdf-concept-scheme'],
	[SKOS.Concept, 'rdf-concept'],
	[SH.NodeShape, 'rdf-shape'],
	[SH.PropertyShape, 'rdf-shape-property'],
	[OWL.NamedIndividual, 'rdf-individual'],
	[OWL.Class, 'rdf-class'],
	[RDFS.Class, 'rdf-class'],
	[RDF.List, 'rdf-list']
];

/**
 * The types that make a resource a property.
 */
const PROPERTY_TYPES = new Set([
	OWL.ObjectProperty,
	OWL.DatatypeProperty,
	OWL.AnnotationProperty,
	RDF.Property
]);

/**
 * What is known about a resource beyond the types it asserts.
 */
export interface ResourceIconContext {
	/** The range of the resource, when it is a property. */
	rangeIri?: string;
	/** The kind of values the resource takes, when it is a property. */
	valueKind?: ValueKind;
	/** The predicates the resource uses, which identify a shape that declares no type. */
	predicateIris?: readonly string[];
	/** The value type a property shape constrains, which refines its glyph. */
	datatypeIri?: string;
}

/**
 * Get the glyph of a resource from the types it asserts, falling back to what its statements say
 * about it.
 * @param typeIris The IRIs of the resource's types.
 * @param context What else is known about the resource.
 * @returns The name of the icon to show, or `undefined` for an unrecognized resource.
 */
export function getResourceIconName(
	typeIris: readonly string[],
	context: ResourceIconContext = {}
): string | undefined {
	const types = new Set(typeIris);

	for (const [iri, icon] of TYPE_ICONS) {
		if (types.has(iri)) {
			return icon;
		}
	}

	for (const type of PROPERTY_TYPES) {
		if (types.has(type)) {
			return getPropertyIconName(context.rangeIri, context.valueKind);
		}
	}

	return getInferredIconName(context.predicateIris ?? [], context.datatypeIri);
}

/**
 * Get the glyph of a resource that declares no type, from the statements made about it.
 *
 * Shapes are written inline far more often than they are typed: a property shape is usually just
 * `[ sh:path … ]`, with nothing saying what it is. SHACL defines a property shape as a shape with
 * a `sh:path`, which is what is used here, so such a node is marked as the shape it is rather
 * than as an anonymous node.
 * @param predicateIris The predicates the resource uses.
 * @param datatypeIri The value type a property shape constrains.
 * @returns The name of the icon to show, or `undefined` when nothing identifies the resource.
 */
function getInferredIconName(
	predicateIris: readonly string[],
	datatypeIri?: string
): string | undefined {
	const predicates = new Set(predicateIris);

	if (predicates.has(SH.path)) {
		return datatypeIri ? getPropertyIconName(datatypeIri) : 'rdf-shape-property';
	}

	if (predicateIris.some(iri => iri.startsWith(_SH))) {
		return 'rdf-shape';
	}

	// The head of a collection, which the writer spelled as `( … )`.
	if (predicates.has(RDF.first)) {
		return 'rdf-list';
	}

	return undefined;
}
