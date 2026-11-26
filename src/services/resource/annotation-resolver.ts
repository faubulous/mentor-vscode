import { ResourceIndexEntry } from './resource-index';

/**
 * A literal a resource is named or described with, together with the predicate it was found under.
 */
export interface Annotation {
	/**
	 * The predicate the literal was found under.
	 */
	predicate: string;

	/**
	 * The text of the literal.
	 */
	text: string;

	/**
	 * The language tag of the literal, when it has one.
	 */
	language?: string;
}

/**
 * A literal without the predicate it was found under.
 */
type AnnotationLiteral = Omit<Annotation, 'predicate'>;

/**
 * Reads the labels and descriptions resources state for themselves, with the configured
 * predicates and the language the document is read in.
 */
export class AnnotationResolver {
	/**
	 * Create a resolver.
	 * @param _labelPredicates The configured label predicates, most preferred first.
	 * @param _descriptionPredicates The configured description predicates, most preferred first.
	 * @param _activeLanguage The language tag the document is being read in, if any.
	 */
	constructor(
		private readonly _labelPredicates: readonly string[],
		private readonly _descriptionPredicates: readonly string[],
		private readonly _activeLanguage?: string
	) { }

	/**
	 * Find the label a resource states for itself.
	 * @param entry The resource.
	 * @returns The label, or `undefined` when the resource states none.
	 */
	findLabel(entry: ResourceIndexEntry): Annotation | undefined {
		return this._findAnnotation(entry, this._labelPredicates);
	}

	/**
	 * Find the description a resource states for itself.
	 * @param entry The resource.
	 * @returns The description, or `undefined` when the resource states none.
	 */
	findDescription(entry: ResourceIndexEntry): Annotation | undefined {
		return this._findAnnotation(entry, this._descriptionPredicates);
	}

	/**
	 * Find the literal a resource states for the first of the given predicates it has one for, in
	 * the language preferred: the active language exactly, then a regional variant of it, then the
	 * first value written.
	 * @param entry The resource.
	 * @param predicates The predicates to look for, most preferred first.
	 * @returns The annotation, or `undefined` when the resource states none.
	 */
	private _findAnnotation(entry: ResourceIndexEntry, predicates: readonly string[]): Annotation | undefined {
		for (const predicate of predicates) {
			const literals = AnnotationResolver._literalsOf(entry, predicate);

			if (literals.length > 0) {
				return { predicate, ...this._preferLanguage(literals) };
			}
		}

		return undefined;
	}


	/**
	 * Pick the literal in the active language, a regional variant of it, or the first one.
	 * @param literals The literals to pick from, in document order.
	 * @returns The preferred literal.
	 */
	private _preferLanguage(literals: readonly AnnotationLiteral[]): AnnotationLiteral {
		const activeLanguage = this._activeLanguage;

		if (!activeLanguage) {
			return literals[0];
		}

		const base = activeLanguage.split('-')[0].toLowerCase();
		const exact = literals.find(literal => literal.language?.toLowerCase() === activeLanguage.toLowerCase());
		const variant = literals.find(literal => literal.language?.toLowerCase().startsWith(base));

		return exact ?? variant ?? literals[0];
	}


	/**
	 * The literal values a resource states for a predicate, in document order.
	 * @param entry The resource.
	 * @param predicate The predicate.
	 * @returns The literals.
	 */
	private static _literalsOf(entry: ResourceIndexEntry, predicate: string): AnnotationLiteral[] {
		const literals: AnnotationLiteral[] = [];

		for (const quad of entry.quads) {
			if (quad.predicate.value === predicate && quad.object.termType === 'Literal') {
				const literal = quad.object as { value: string; language?: string };

				literals.push({ text: literal.value, language: literal.language || undefined });
			}
		}

		return literals;
	}
}
