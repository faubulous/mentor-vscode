import { SettingsSectionController } from '../settings-section-controller';
import { ConnectionsSectionController } from './query/connections-controller';
import { StoresSectionController } from './query/stores-controller';
import { IndexingSectionController } from './workspace/indexing-controller';

/**
 * Create instances of all section controllers.
 * @note The controllers for sections that require more complex logic
 * or state management must be instantiated here.
 */
export function createSectionControllers(): SettingsSectionController[] {
	return [
		new ConnectionsSectionController(),
		new StoresSectionController(),
		new IndexingSectionController(),
	];
}
