/**
 * The editor settings the style of a document falls back to where the document shows no style of
 * its own.
 */
export interface StyleFallback {
	/**
	 * The number of spaces one level of indentation takes.
	 */
	tabSize: number;

	/**
	 * Whether indentation is written with spaces rather than tabs.
	 */
	insertSpaces: boolean;

	/**
	 * The line ending of the document, detected from the text when omitted.
	 */
	eol?: string;

	/**
	 * Whether new prefix declarations keep the declarations in alphabetical order.
	 */
	sortPrefixes?: boolean;
}

/**
 * How a document is written, so that inserted text looks like its neighbours.
 */
export interface LocalStyle {
	/**
	 * The line ending of the document.
	 */
	eol: string;

	/**
	 * One level of indentation.
	 */
	indentUnit: string;

	/**
	 * The indentation most predicates of the document are written with.
	 */
	predicateIndent: string;

	/**
	 * Whether `rdf:type` is written as `a`.
	 */
	useTypeKeyword: boolean;
}
