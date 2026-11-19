import { useEffect, useState } from 'react';

/**
 * How far the pointer must move from where it was when an indicator appeared before the indicator
 * takes the pointer, in CSS pixels.
 */
const GUARD_DISTANCE = 4;

/**
 * How long an indicator ignores the pointer after it appeared, in milliseconds.
 */
const GUARD_DELAY = 400;

/**
 * Where the pointer was last seen on the page, as one listener on the document tracks it for all
 * guards; `undefined` before the pointer was used.
 */
let lastPointer: { x: number; y: number } | undefined;

let tracking = false;

/**
 * Start tracking the pointer on the page, once.
 */
function _trackPointer(): void {
	if (tracking) {
		return;
	}

	tracking = true;

	const remember = (event: PointerEvent): void => {
		lastPointer = { x: event.clientX, y: event.clientY };
	};

	document.addEventListener('pointermove', remember, { capture: true, passive: true });
	document.addEventListener('pointerdown', remember, { capture: true, passive: true });
}

/**
 * Guard an indicator that appears because of what the user just did, such as the kind of a new
 * value or a suggested datatype, against a click meant for the text: it takes the pointer only
 * once the pointer has moved more than a few pixels from where it was when the indicator appeared
 * and a moment has passed. The guard starts when the component mounts, so an indicator that hides
 * and shows again is guarded again. The keyboard is never guarded.
 * @param enabled Whether the indicator is guarded at all; a tag shown at rest is not.
 * @returns Whether the indicator ignores the pointer.
 */
export function useClickGuard(enabled: boolean): boolean {
	const [guarded, setGuarded] = useState(enabled);

	useEffect(() => {
		if (!enabled) {
			setGuarded(false);

			return;
		}

		_trackPointer();
		setGuarded(true);

		const origin = lastPointer;
		let moved = origin === undefined;
		let waited = false;

		const release = (): void => {
			if (moved && waited) {
				setGuarded(false);
				document.removeEventListener('pointermove', watch, true);
			}
		};

		const watch = (event: PointerEvent): void => {
			if (!moved && origin && Math.hypot(event.clientX - origin.x, event.clientY - origin.y) > GUARD_DISTANCE) {
				moved = true;
				release();
			}
		};

		const timer = window.setTimeout(() => {
			waited = true;
			release();
		}, GUARD_DELAY);

		document.addEventListener('pointermove', watch, true);

		return () => {
			window.clearTimeout(timer);
			document.removeEventListener('pointermove', watch, true);
		};
	}, [enabled]);

	return enabled && guarded;
}
