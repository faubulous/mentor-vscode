import { PredicateData, ResourceCardBodyData, TermData } from './resource-card-data';

/**
 * The values of a property split by where they come from: those the document asserts, which a row
 * edits, and those the reasoner infers, which it only shows.
 */
export interface SplitProperty {
	/**
	 * The property with the asserted values only, absent when every value is inferred.
	 */
	asserted?: PredicateData;

	/**
	 * The inferred values, in order.
	 */
	inferred: TermData[];
}

/**
 * The splits of the properties split last, so a property split again gives the same asserted
 * property: a row tells a changed property by its identity.
 */
const SPLITS = new WeakMap<PredicateData, SplitProperty>();

/**
 * Split the values of a property into those asserted and those inferred. The same property gives
 * the same split every time.
 * @param property The property.
 * @returns The asserted property, if it has asserted values, and the inferred values.
 */
export function splitInferredValues(property: PredicateData): SplitProperty {
	const known = SPLITS.get(property);

	if (known) {
		return known;
	}

	const inferred = property.values.filter(value => value.inferred);
	const values = property.values.filter(value => !value.inferred);
	const asserted = inferred.length === 0 ? property : values.length > 0 ? { ...property, values } : undefined;
	const split = { asserted, inferred };

	SPLITS.set(property, split);

	return split;
}

/**
 * The statements of a card without those the reasoner inferred: a property loses its inferred
 * values, and a property with nothing else goes.
 * @param cardBody The statements of the card.
 * @returns The statements asserted, the same object where none is inferred.
 */
export function getAssertedCardBody(cardBody: ResourceCardBodyData): ResourceCardBodyData {
	if (!cardBody.predicates.some(property => property.values.some(value => value.inferred))) {
		return cardBody;
	}

	const predicates = cardBody.predicates.flatMap(property => {
		const asserted = splitInferredValues(property).asserted;

		return asserted ? [asserted] : [];
	});

	return { ...cardBody, predicates };
}
