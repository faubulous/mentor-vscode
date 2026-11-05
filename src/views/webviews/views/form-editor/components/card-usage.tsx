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
 * How often the document uses the resource of a card, at the end of its header or label row.
 * @param props The number of usages.
 * @returns The count.
 */
export function CardUsage({ count }: CardUsageProps): React.JSX.Element {
	return <span className="card-usage">{count} {count === 1 ? 'usage' : 'usages'}</span>;
}
