import { useStylesheet } from '@src/views/webviews/hooks';
import tokens from './webview-tokens.css';
import utilities from './webview-utilities.css';

/**
 * Injects the shared Mentor webview design tokens and utility classes.
 * Call once from each webview root component. The underlying
 * {@link useStylesheet} hook guards against duplicate injection, so calling
 * from multiple roots within the same document is safe.
 */
export function useSharedStylesheets(): void {
	useStylesheet('mentor-webview-tokens', tokens);
	useStylesheet('mentor-webview-utilities', utilities);
}
