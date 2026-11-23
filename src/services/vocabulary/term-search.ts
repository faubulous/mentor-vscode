import type { BlankNode, NamedNode } from '@rdfjs/types';

/**
 * The type of terms a search targets, by the place the picked term takes in a statement: the
 * predicates of statements, the classes a resource is typed with, the resources a value refers to,
 * or the datatypes of literals. A picker of the form editor and the completion of the text editor
 * search by it.
 */
export type TermSearchTargetType = 'predicate' | 'class' | 'resource' | 'datatype';

/**
 * Where a term a picker offers comes from, which ranks it: the document itself, a vocabulary whose
 * namespace the document declares, or another vocabulary of the workspace.
 */
export type TermSource = 'document' | 'declared' | 'workspace';

/**
 * How a term a picker offers fits the statement it is picked for, which ranks it before anything
 * else: it fits, as a predicate whose domain is a type of the resource or a value of a class the
 * range of the predicate names; nothing tells, as a predicate without a domain; or it fits other
 * statements, as a predicate whose domain is another class.
 */
export type TermFit = 'fits' | 'general' | 'other';

/**
 * The statement a picker picks a term for: the resource, and for a value its predicate, by which
 * the terms that fit it are ranked first.
 */
export interface TermSearchStatement {
	/**
	 * The resource the statement is about.
	 */
	subject: NamedNode | BlankNode;

	/**
	 * The IRI of the predicate, where a value is picked.
	 */
	predicate?: string;
}

/**
 * A term as an option of a picker shows it.
 */
export interface ResourceOptionData {
	/**
	 * The IRI of the term.
	 */
	subject: NamedNode;

	/**
	 * The label of the term, as the cards show it.
	 */
	label: string;

	/**
	 * The prefixed name of the term, with the prefixes of the document or the one it would declare.
	 */
	prefixedName?: string;

	/**
	 * The glyph of the term, by its types.
	 */
	iconName?: string;

	/**
	 * Where the term comes from.
	 */
	source: TermSource;

	/**
	 * How the term fits the statement it is picked for, where the search was told the statement.
	 */
	fit?: TermFit;

	/**
	 * The prefix the document would declare for the namespace of the term to write it by its
	 * prefixed name, where the document declares none for it.
	 */
	missingPrefix?: {
		/**
		 * The prefix, without the colon.
		 */
		prefix: string;

		/**
		 * The namespace IRI.
		 */
		namespace: string;
	};
}

/**
 * A search of terms, as a picker of the form editor and the completion of the text editor search:
 * the terms of a type that match typed text, those that fit the statement first where it is told.
 */
export interface TermSearch {
	/**
	 * The type of terms searched for.
	 */
	targetType: TermSearchTargetType;

	/**
	 * The typed text, matched against the label, the local name and the prefixed name of a term.
	 */
	text: string;

	/**
	 * How many terms are returned at most.
	 */
	limit: number;

	/**
	 * The statement the terms are picked for, whose fitting terms come first.
	 */
	statement?: TermSearchStatement;
}
