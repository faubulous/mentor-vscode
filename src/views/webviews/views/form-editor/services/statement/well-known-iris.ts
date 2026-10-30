/**
 * The IRIs the statement rows treat specially. Spelled out here rather than imported from
 * mentor-rdf, because that library is not tree-shaken and importing one constant of it adds
 * about 740 KB to the webview bundle; this is the one place in the browser side that names them.
 */

/**
 * The predicate the keyword `a` stands for.
 */
export const RDF_TYPE = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type';

/**
 * The namespace of the XML Schema datatypes.
 */
export const XSD_NAMESPACE = 'http://www.w3.org/2001/XMLSchema#';

/**
 * The datatype a plain literal carries, which is never written.
 */
export const XSD_STRING = `${XSD_NAMESPACE}string`;

/**
 * The datatype of whole numbers, whose fields step with the arrows.
 */
export const XSD_INTEGER = `${XSD_NAMESPACE}integer`;
