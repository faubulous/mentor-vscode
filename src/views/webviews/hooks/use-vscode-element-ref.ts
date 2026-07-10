import { useCallback, useEffect, useRef } from 'react';

/**
 * React hook for managing element refs with automatic event listener cleanup.
 * Use this for vscode-elements web components that emit custom events, or for
 * native DOM events that need to be attached outside React's synthetic event
 * system (e.g. to control propagation order).
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const [selectedIndex, setSelectedIndex] = useState(0);
 *
 *   const tabsRef = useVscodeElementRef<VscodeTabs, { selectedIndex: number }>(
 *     'vsc-tabs-select',
 *     (element, event) => setSelectedIndex(event.detail.selectedIndex)
 *   );
 *
 *   return <vscode-tabs ref={tabsRef}>...</vscode-tabs>;
 * }
 * ```
 *
 * @param eventName The event name to listen for.
 * @param onEvent Callback invoked when the event fires.
 * @returns A ref callback to pass to the element's ref prop.
 */
export function useVscodeElementRef<E extends HTMLElement, V = any>(
	eventName: string,
	onEvent: (element: E, event: CustomEvent<V>) => void
): (element: E | null) => void {
	const elementRef = useRef<E | null>(null);
	const handlerRef = useRef(onEvent);

	// Keep handler ref up to date
	useEffect(() => {
		handlerRef.current = onEvent;
	}, [onEvent]);

	// The listener registered on the current element. Kept in a ref so detaching
	// removes the exact function that was added — a listener created fresh per
	// callback invocation would never match and silently leak.
	const listenerRef = useRef<((event: Event) => void) | null>(null);

	const refCallback = useCallback((element: E | null) => {
		// Cleanup previous element
		if (elementRef.current && listenerRef.current) {
			elementRef.current.removeEventListener(eventName, listenerRef.current);
			listenerRef.current = null;
		}

		elementRef.current = element;

		// Setup new element
		if (element) {
			const listener = (event: Event) => {
				if (elementRef.current) {
					handlerRef.current(elementRef.current, event as CustomEvent<V>);
				}
			};

			listenerRef.current = listener;
			element.addEventListener(eventName, listener);
		}
	}, [eventName]);

	return refCallback;
}
