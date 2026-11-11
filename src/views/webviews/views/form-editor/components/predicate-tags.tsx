/**
 * Properties of the {@link PredicateTags} component.
 */
export interface PredicateTagsProps {
	/**
	 * The tags of the literals of the row, by the index of each value among the values.
	 */
	tags: readonly { index: number; tag: string }[];

	/**
	 * Open the picker of the tag of a value, where the row is edited.
	 * @param index The index of the value.
	 */
	onOpen?: (index: number) => void;
}

/**
 * The language tags and datatypes of the literals of a row under its label, as a narrow card shows
 * them in place of the tags at the end of the fields. Where the row is edited, a tag opens the
 * picker of its value.
 * @param props The tags and what opens their pickers.
 * @returns The tags, or nothing for a row without them.
 */
export function PredicateTags({ tags, onOpen }: PredicateTagsProps): React.JSX.Element | null {
	if (tags.length === 0) {
		return null;
	}

	return (
		<span className="statement-predicate-tags">
			{tags.map(({ index, tag }) => onOpen
				? <button key={index} type="button" className="statement-predicate-tag" title="Change the language or datatype" onClick={() => onOpen(index)}>{tag}</button>
				: <span key={index} className="statement-predicate-tag">{tag}</span>)}
		</span>
	);
}
