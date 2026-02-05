import { useEffect, useRef, useCallback, useState } from 'react';
import { WebviewMessaging, WebviewMessage } from './webview-messaging';
import { WebviewHost } from './webview-host';

/**
 * React hook for webview messaging. Provides the full messaging interface including
 * `postMessage`, `onMessage`, and `executeCommand`.
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const messaging = useWebviewMessaging<MyMessages>(message => {
 *     if (message.id === 'DataLoaded') {
 *       setData(message.data);
 *     }
 *   });
 * 
 *   const handleClick = () => {
 *     messaging?.postMessage({ id: 'LoadData' });
 *   };
 * }
 * ```
 * 
 * @param onMessage Callback invoked when a message is received from the extension host.
 * @param messaging Optional custom messaging instance. If not provided, uses WebviewHost (must be in webview context).
 * @returns The WebviewMessaging interface, or undefined if not in a webview context and no messaging was provided.
 */
export function useWebviewMessaging<M extends WebviewMessage>(
	onMessage?: (message: M) => void,
	messaging?: WebviewMessaging<M>
): WebviewMessaging<M> | undefined {
	const messagingRef = useRef<WebviewMessaging<M> | undefined>(
		messaging ?? (WebviewHost.isAvailable() ? WebviewHost.getMessaging<M>() : undefined)
	);

	useEffect(() => {
		if (onMessage && messagingRef.current) {
			const cleanup = messagingRef.current.onMessage(onMessage);
			// If onMessage returns a cleanup function, use it
			if (typeof cleanup === 'function') {
				return cleanup;
			}
		}
	}, [onMessage]);

	return messagingRef.current;
}

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

/**
 * React hook for managing VS Code element refs with automatic event listener cleanup.
 * Use this for vscode-elements web components that emit custom events.
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

	const refCallback = useCallback((element: E | null) => {
		const handler = (event: Event) => {
			if (elementRef.current) {
				handlerRef.current(elementRef.current, event as CustomEvent<V>);
			}
		};

		// Cleanup previous element
		if (elementRef.current) {
			elementRef.current.removeEventListener(eventName, handler);
		}

		elementRef.current = element;

		// Setup new element
		if (element) {
			element.addEventListener(eventName, handler);
		}

		// Return cleanup for when component unmounts
		return () => {
			if (elementRef.current) {
				elementRef.current.removeEventListener(eventName, handler);
			}
		};
	}, [eventName]);

	return refCallback;
}

/**
 * React hook for injecting stylesheets into the document head.
 * Automatically cleans up stylesheets when the component unmounts.
 * 
 * @example
 * ```tsx
 * import styles from './my-component.css';
 * 
 * function MyComponent() {
 *   useStylesheet('my-component-styles', styles);
 *   return <div>...</div>;
 * }
 * ```
 * 
 * @param id Unique ID for the stylesheet element.
 * @param content CSS content to inject.
 * @param cleanup Whether to remove the stylesheet on unmount. Defaults to false.
 */
export function useStylesheet(id: string, content: string, cleanup = false): void {
	useEffect(() => {
		if (!document.getElementById(id)) {
			const style = document.createElement('style');
			style.id = id;
			style.textContent = content;
			document.head.appendChild(style);
		}

		return () => {
			if (cleanup) {
				const style = document.getElementById(id);
				if (style) {
					style.remove();
				}
			}
		};
	}, [id, content, cleanup]);
}
