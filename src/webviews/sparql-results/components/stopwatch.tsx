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
		const date = new Date(elapsedMilliseconds);

		// Use UTC methods to avoid timezone issues
		const hours = date.getUTCHours();
		const minutes = date.getUTCMinutes();
		const seconds = date.getUTCSeconds();

		// Note: Until the end time is not set, we do not show the milliseconds. This is
		// to avoid confusion when the stopwatch is still running and the UI has not been updated.
		// Usually this takes longer than the query execution time.
		const centiseconds = queryContext.endTime ? Math.round(date.getUTCMilliseconds() / 10) : 0;

		const parts = [];

		if (hours > 0) {
			parts.push(hours.toString().padStart(2, '0'));
			parts.push(minutes.toString().padStart(2, '0'));
			parts.push(seconds.toString().padStart(2, '0'));
		} else if (minutes > 0) {
			parts.push(minutes.toString().padStart(2, '0'));
			parts.push(seconds.toString().padStart(2, '0'));
		} else {
			parts.push(seconds.toString());
		}

		return `${parts.join(':')}.${centiseconds.toString().padStart(2, '0')}s`;
	}

	return (
		<span>{formatTime(elapsedTime)}</span>
	);
};

/**
 * Stopwatch component wrapped with SPARQL results context.
 */
export const Stopwatch = withSparqlResults(StopwatchBase);