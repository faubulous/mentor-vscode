declare module 'rdf-validation' {
	import { Literal } from '@rdfjs/types';

	/**
	 * Checks the lexical forms of literals against the XSD datatypes, by the rules SHACL validation
	 * checks them with; a literal of any other datatype passes.
	 */
	export class XsdValidation {
		/**
		 * Indicate whether the lexical form of a literal is a value of its datatype.
		 * @param term The literal.
		 * @returns `true` when the literal is valid.
		 */
		validateSimple(term: Literal): boolean;
	}
}
