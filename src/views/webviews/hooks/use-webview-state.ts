import { useCallback, useState } from 'react';
import { WebviewHost } from '../webview-host';

/**
 * React hook for webview state persistence. Wraps WebviewHost.getState/setState
 * and provides React-style state management that persists across webview lifecycle.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const [state, setState] = useWebviewState({ count: 0 });
 *
 *   return (
 *     <button onClick={() => setState({ count: state.count + 1 })}>
 *       Count: {state.count}
 *     </button>
 *   );
 * }
 * ```
 *
 * @param initialState The initial state to use if no persisted state exists.
 * @returns A tuple of [state, setState] similar to React's useState.
 */
export function useWebviewState<T>(initialState: T): [T, (newState: T | ((prev: T) => T)) => void] {
	const [state, setStateInternal] = useState<T>(() => {
		const persisted = WebviewHost.getState();
		return persisted ?? initialState;
	});

	const setState = useCallback((newState: T | ((prev: T) => T)) => {
		setStateInternal(prev => {
			const next = typeof newState === 'function'
				? (newState as (prev: T) => T)(prev)
				: newState;

			WebviewHost.setState(next);

			return next;
		});
	}, []);

	return [state, setState];
}
