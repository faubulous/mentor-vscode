import { SettingsSectionController } from '../settings-section-controller';
import { ConnectionsSectionController } from './connections-section-controller';

/**
 * Host-side registry of section controllers. Sections without a controller entry rely
 * on the shell's generic settings primitives ({@code GetSettings} / {@code UpdateSetting}).
 *
 * Sections that own a multi-step workflow (e.g. SPARQL connection editing) register a
 * controller here so the shell can route section-tagged messages to them.
 */
export function createSectionControllers(): SettingsSectionController[] {
	return [
		new ConnectionsSectionController(),
	];
}
