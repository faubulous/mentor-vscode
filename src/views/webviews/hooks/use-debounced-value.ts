import { useEffect, useState } from 'react';

/**
 * Returns the value delayed until it has stopped changing for `delayMs`.
 *
 * Used to keep host round-trips off the keystroke path: match-count previews
 * are computed by walking every workspace file, so requesting one per
 * keystroke would flood the extension host while the user is still typing.
 * @param value The live value.
 * @param delayMs The trailing delay in milliseconds.
 */
export function useDebouncedValue<T>(value: T, delayMs = 250): T {
	const [debounced, setDebounced] = useState(value);

	useEffect(() => {
		const timer = setTimeout(() => setDebounced(value), delayMs);

		return () => clearTimeout(timer);
	}, [value, delayMs]);

	return debounced;
}
