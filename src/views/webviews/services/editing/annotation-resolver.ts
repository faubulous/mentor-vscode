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
 * The predicates a document names and describes its resources with, by IRI.
 */
export interface AnnotationPredicates {
	/**
	 * The predicate most resources are labelled with.
	 */
	labelPredicate?: string;

	/**
	 * The predicate most resources are described with.
	 */
	descriptionPredicate?: string;
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
		return this.findAnnotation(entry, this._labelPredicates);
	}

	/**
	 * Find the description a resource states for itself.
	 * @param entry The resource.
	 * @returns The description, or `undefined` when the resource states none.
	 */
	findDescription(entry: ResourceIndexEntry): Annotation | undefined {
		return this.findAnnotation(entry, this._descriptionPredicates);
	}

	/**
	 * Find the literal a resource states for the first of the given predicates it has one for, in
	 * the language preferred: the active language exactly, then a regional variant of it, then the
	 * first value written.
	 * @param entry The resource.
	 * @param predicates The predicates to look for, most preferred first.
	 * @returns The annotation, or `undefined` when the resource states none.
	 */
	findAnnotation(entry: ResourceIndexEntry, predicates: readonly string[]): Annotation | undefined {
		for (const predicate of predicates) {
			const literals = AnnotationResolver._literalsOf(entry, predicate);

			if (literals.length > 0) {
				return { predicate, ...this._preferLanguage(literals) };
			}
		}

		return undefined;
	}

	/**
	 * Detect the predicates a document names and describes its resources with: of the configured
	 * ones, the predicate most resources state a literal for. Ties go to the more preferred
	 * predicate, and a document that uses none of them gets the most preferred one.
	 * @param entries The resources of the document.
	 * @returns The predicates of the document.
	 */
	detectScheme(entries: Iterable<ResourceIndexEntry>): AnnotationPredicates {
		const resources = Array.from(entries);

		return {
			labelPredicate: AnnotationResolver._mostUsed(resources, this._labelPredicates),
			descriptionPredicate: AnnotationResolver._mostUsed(resources, this._descriptionPredicates)
		};
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
	 * The predicate the most resources state a literal for, or the first when none of them is used.
	 * @param entries The resources of the document.
	 * @param predicates The predicates to choose from, most preferred first.
	 * @returns The predicate, or `undefined` when none is configured.
	 */
	private static _mostUsed(entries: readonly ResourceIndexEntry[], predicates: readonly string[]): string | undefined {
		let best: string | undefined = predicates[0];
		let bestCount = 0;

		for (const predicate of predicates) {
			const count = entries.filter(entry => AnnotationResolver._literalsOf(entry, predicate).length > 0).length;

			if (count > bestCount) {
				best = predicate;
				bestCount = count;
			}
		}

		return best;
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
