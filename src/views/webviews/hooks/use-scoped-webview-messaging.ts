import { useCallback, useEffect, useMemo, useRef } from 'react';
import { WebviewMessage } from '../webview-messaging';
import { useWebviewMessaging } from './use-webview-messaging';

/**
 * React hook for section-scoped webview messaging. Auto-injects a `section` field on
 * outgoing messages so a host shell can route them to the matching section controller,
 * and filters incoming messages so the section's `onMessage` only fires for its own
 * messages (those carrying the matching `section` field).
 *
 * Messages without a `section` field still flow to the underlying webview channel but
 * are not delivered to the section's `onMessage`. Use {@link useWebviewMessaging} for
 * shell-level concerns that aren't section-scoped.
 *
 * @param section The section identifier to envelope outgoing messages with.
 * @param onMessage Callback for incoming messages tagged with the matching section.
 */
export function useScopedWebviewMessaging<M extends WebviewMessage>(
	section: string,
	onMessage?: (message: M) => void
): { postMessage: (message: M) => void } | undefined {
	const handlerRef = useRef(onMessage);

	useEffect(() => {
		handlerRef.current = onMessage;
	}, [onMessage]);

	const filtered = useCallback((msg: M & { section?: string }) => {
		if (msg.section === section && handlerRef.current) {
			handlerRef.current(msg);
		}
	}, [section]);

	const messaging = useWebviewMessaging<M & { section?: string }>(filtered);

	return useMemo(
		() => messaging
			? { postMessage: (msg: M) => messaging.postMessage({ ...msg, section } as M & { section: string }) }
			: undefined,
		[messaging, section]
	);
}
