/**
 * Debounce a function call.
 * @param func The function to debounce.
 * @param wait The time to wait before calling the function.
 * @returns The debounced function.
 */
export function debounce<T extends (...args: any[]) => any>(func: T, wait: number): T {
	let timeout: NodeJS.Timeout | undefined;

	return function (this: any, ...args: any[]) {
		const later = () => {
			timeout = undefined;
			func.apply(this, args);
		};

		clearTimeout(timeout);
		timeout = setTimeout(later, wait);
	} as any;
}