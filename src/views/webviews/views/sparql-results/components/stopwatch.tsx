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

	if (!queryContext.startTime) {
		return null;
	}

	const [elapsedTime, setElapsedTime] = useState(0);
	const intervalRef = useRef(null as ReturnType<typeof setInterval> | null);

	const updateElapsedTime = () => {
		const startTime = queryContext.startTime;
		const endTime = queryContext.endTime ? queryContext.endTime : Date.now();

		setElapsedTime(Math.max(0, endTime - startTime));
	};

	useEffect(() => {
		updateElapsedTime();

		if (!queryContext.endTime) {
			// If no end date, start interval to update every 10ms
			intervalRef.current = setInterval(updateElapsedTime, 10);
		} else {
            updateElapsedTime();
        }

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, [queryContext.startTime, queryContext.endTime]);

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