import { SettingsSectionController } from '../settings-section-controller';
import { ConnectionsSectionController } from './query/connections-controller';

/**
 * Host-side registry of section controllers. Sections without a controller entry rely
 * on the shell's generic settings primitives ({@code GetSettings} / {@code UpdateSetting}).
 *
 * Sections that own a multi-step workflow (e.g. SPARQL connection editing) register a
 * controller here so the shell can route section-tagged messages to them.
 *
 * Kept separate from `index.ts` so the webview bundle never pulls in host-only
 * `vscode` API code through the section descriptor graph.
 */
export function createSectionControllers(): SettingsSectionController[] {
	return [
		new ConnectionsSectionController(),
	];
}
