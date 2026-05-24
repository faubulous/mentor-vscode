import { SettingsSectionController } from '../settings-section-controller';
import { ConnectionsSectionController } from './query/connections-controller';

/**
 * Create instances of all section controllers.
 * @note The controllers for sections that require more complex logic 
 * or state management must be instantiated here.
 */
export function createSectionControllers(): SettingsSectionController[] {
	return [
		new ConnectionsSectionController(),
	];
}
