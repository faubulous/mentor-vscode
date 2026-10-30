import { useCallback, useSyncExternalStore } from 'react';
import { EditingController } from '../state/editing-controller';

/**
 * Follow the resources whose writes are not done yet.
 * @param controller The editing controller.
 * @returns The identifiers of the resources.
 */
export function useBusyResources(controller: EditingController): ReadonlySet<string> {
	const subscribe = useCallback((listener: () => void) => controller.subscribe(listener), [controller]);

	return useSyncExternalStore(subscribe, () => controller.busyResourceIds);
}
