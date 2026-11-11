/**
 * Properties of the {@link CardUsage} component.
 */
export interface CardUsageProps {
	/**
	 * How often the document uses the resource.
	 */
	count: number;
}

/**
 * How often the document uses the resource of a card, in its title bar: the count and the word,
 * which a narrow card leaves out, telling it in the title instead.
 * @param props The number of usages.
 * @returns The count.
 */
export function CardUsage({ count }: CardUsageProps): React.JSX.Element {
	const word = count === 1 ? 'usage' : 'usages';

	return (
		<span className="card-usage" title={`${count} ${word}`}>
			{count}<span className="card-usage-word"> {word}</span>
		</span>
	);
}
