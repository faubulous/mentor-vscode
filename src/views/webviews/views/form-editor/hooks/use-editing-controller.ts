import { useCallback, useSyncExternalStore } from 'react';
import { EditingController } from '../state/editing-controller';
import { EditingState } from '../state/editing-state';

/**
 * Follow an editing controller: re-render on every change it goes through.
 * @param controller The controller.
 * @returns Its editing state.
 */
export function useEditingController(controller: EditingController): EditingState {
	const subscribe = useCallback((listener: () => void) => controller.subscribe(listener), [controller]);

	useSyncExternalStore(subscribe, () => controller.revision);

	return controller.state;
}
