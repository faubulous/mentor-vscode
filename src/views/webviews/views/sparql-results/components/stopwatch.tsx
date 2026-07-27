import { SparqlResultsContextType, withSparqlResults } from '../helpers';
import { useState, useEffect, useRef } from 'react';

interface StopwatchProps {
	sparqlResults: SparqlResultsContextType;
}

/**
 * Stopwatch component to display the elapsed time of a SPARQL query execution.
 * @param param0 Props containing the SPARQL results context.
 */
function StopwatchBase({ sparqlResults }: StopwatchProps) {
	const { queryContext } = sparqlResults;

	const [elapsedTime, setElapsedTime] = useState(0);
	const intervalRef = useRef(null as ReturnType<typeof setInterval> | null);

	useEffect(() => {
		const updateElapsedTime = () => {
			const startTime = queryContext.startTime;

			if (!startTime) {
				return;
			}

			const endTime = queryContext.endTime ? queryContext.endTime : Date.now();

			setElapsedTime(Math.max(0, endTime - startTime));
		};

		updateElapsedTime();

		if (queryContext.startTime && !queryContext.endTime) {
			// While the query is running, update at 10 Hz: faster intervals burn
			// renderer CPU without a readable gain in precision.
			intervalRef.current = setInterval(updateElapsedTime, 100);
		}

		return () => {
			if (intervalRef.current) {
				clearInterval(intervalRef.current);
				intervalRef.current = null;
			}
		};
	}, [queryContext.startTime, queryContext.endTime]);

	if (!queryContext.startTime) {
		return null;
	}

	const formatTime = (elapsedMilliseconds: number) => {
		return `${Math.round(elapsedMilliseconds)}ms`;
	}

	return (
		<span className="sparql-results-stopwatch">{formatTime(elapsedTime)}</span>
	);
};

/**
 * Stopwatch component wrapped with SPARQL results context.
 */
export const Stopwatch = withSparqlResults(StopwatchBase);