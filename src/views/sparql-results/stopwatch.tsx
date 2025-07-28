import { SparqlQueryContext } from '@/services';
import { useState, useEffect, useRef } from 'react';

export const Stopwatch = (props: { queryContext: SparqlQueryContext }) => {
	const [elapsedTime, setElapsedTime] = useState(0);
	const intervalRef = useRef(null as ReturnType<typeof setInterval> | null);

	const updateElapsedTime = () => {
		const startTime = props.queryContext.startTime;
		const endTime = props.queryContext.endTime ? props.queryContext.endTime : Date.now();

		setElapsedTime(Math.max(0, endTime - startTime));
	};

	useEffect(() => {
		updateElapsedTime();

		if (!props.queryContext.endTime) {
			// If no end date, start interval to update every 10ms
			intervalRef.current = setInterval(updateElapsedTime, 10);
		} else if (intervalRef.current) {
			clearInterval(intervalRef.current);

			intervalRef.current = null;
		}
	}, [props.queryContext.startTime, props.queryContext.endTime]);

	const formatTime = (milliseconds: number) => {
		const totalSeconds = Math.floor(milliseconds / 1000);

		const hh = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
		const mm = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
		const ss = (totalSeconds % 60).toString().padStart(2, '0');
		const ms = Math.round((milliseconds % 1000) / 10).toString().padStart(2, '0');

		// TODO: Fix this by using a more reactive approach. This is a temporary solution.
		// Note: Until the end time is not set, we do not show the milliseconds. This is
		// to avoid confusion when the stopwatch is still running and the UI has not been updated.
		// Usually this takes longer that the query execution time.
		if (props.queryContext.endTime) {
			return `${hh}:${mm}:${ss}.${ms}s`;
		} else {
			return `${hh}:${mm}:${ss}.00s`;
		}
	}

	return (
		<span>{formatTime(elapsedTime)}</span>
	);
};