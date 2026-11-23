import { BlankNode, NamedNode } from '@rdfjs/types';
import { useEffect, useRef, useState } from 'react';
import { termToString } from 'rdf-string';
import { PredicateData, PredicateRangeData } from '../form-editor-model';
import { useFormEditorContext } from '../state/form-editor-context';

/**
 * The range the host told for a predicate of a resource.
 */
interface AnsweredRange {
	/**
	 * The predicate asked for.
	 */
	predicate: string;

	/**
	 * The range, `undefined` where nothing tells it.
	 */
	range?: PredicateRangeData;
}

/**
 * What values the predicate of a row takes for its resource: as its property carries it, and for
 * a row for a new statement, asked of the host once its predicate is picked. Nothing is known while
 * the host has not answered.
 * @param subject The resource of the row, where the row is edited.
 * @param predicate The IRI of the predicate of the row, once it names one.
 * @param property The property of the row, where the document writes it.
 * @returns The range, or `undefined`.
 */
export function usePredicateRange(subject: NamedNode | BlankNode | undefined, predicate: string | undefined, property: PredicateData | undefined): PredicateRangeData | undefined {
	const { termSearch } = useFormEditorContext();
	const [answered, setAnswered] = useState<AnsweredRange>();
	const asks = property === undefined && predicate !== undefined && subject !== undefined;
	// The resource is told by its key, so a term made anew for the same resource asks nothing again.
	const subjectKey = subject ? termToString(subject) : undefined;
	const subjectRef = useRef(subject);

	subjectRef.current = subject;

	useEffect(() => {
		const asked = subjectRef.current;

		if (!asks || !termSearch || !predicate || !asked) {
			return undefined;
		}

		let current = true;

		void termSearch.getPredicateRange(asked, predicate).then(range => {
			if (current) {
				setAnswered({ predicate, range });
			}
		});

		return () => {
			current = false;
		};
	}, [asks, termSearch, subjectKey, predicate]);

	if (property) {
		return property.range;
	}

	return answered?.predicate === predicate ? answered?.range : undefined;
}
