import { useEffect } from 'react';

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
