/**
 * Properties of the {@link PredicateAnnotations} component.
 */
export interface PredicateAnnotationsProps {
	/**
	 * The annotations of the literals of the row, by the index of each value among the values.
	 */
	annotations: readonly { index: number; annotation: string }[];

	/**
	 * Open the picker of the annotation of a value, where the row is edited.
	 * @param index The index of the value.
	 */
	onOpen?: (index: number) => void;
}

/**
 * The language tags and datatypes of the literals of a row under its label, as a narrow card shows
 * them in place of the annotations at the end of the fields. Where the row is edited, one opens the
 * picker of its value.
 * @param props The annotations and what opens their pickers.
 * @returns The annotations, or nothing for a row without them.
 */
export function PredicateAnnotations({ annotations, onOpen }: PredicateAnnotationsProps): React.JSX.Element | null {
	if (annotations.length === 0) {
		return null;
	}

	return (
		<span className="statement-predicate-annotations">
			{annotations.map(({ index, annotation }) => onOpen
				? <button key={index} type="button" className="statement-predicate-annotation" title="Change the language or datatype" onClick={() => onOpen(index)}>{annotation}</button>
				: <span key={index} className="statement-predicate-annotation">{annotation}</span>)}
		</span>
	);
}
