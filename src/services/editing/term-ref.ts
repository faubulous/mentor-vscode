/**
 * A term in wire form.
 */
export type TermRef =
	| { kind: 'iri'; iri: string }
	| { kind: 'bnode'; id: string }
	| { kind: 'literal'; value: string; datatype?: string; language?: string };
