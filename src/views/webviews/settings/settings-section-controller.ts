import * as vscode from 'vscode';
import { SettingsNavigationSection } from './settings-metadata';

/**
 * A {@link SettingsSectionController} owns the host-side message handling and lifecycle
 * for a single section of the Settings panel. The Settings panel acts as a shell that
 * routes section-tagged messages to the matching controller without inspecting their
 * contents — keeping section-specific business logic out of the shell.
 *
 * Sections that only read/write generic settings keys do not need a controller; the
 * shell's built-in `GetSettings`/`UpdateSetting` handlers cover them.
 */
export interface SettingsSectionController extends vscode.Disposable {
	/** The section identifier this controller is registered for. */
	readonly id: SettingsNavigationSection;

	/**
	 * Called once after the panel is shown. The section receives a `post` callback for
	 * sending messages back to the webview. Sections may set up domain event
	 * subscriptions here.
	 */
	initialize(post: (message: unknown) => void): void;

	/**
	 * Handle an incoming message targeted at this section (matched by the `section` field).
	 * @returns `true` if the message was handled, `false` otherwise.
	 */
	handleMessage(message: { section: SettingsNavigationSection; id: string } & Record<string, unknown>): Promise<boolean>;

	/**
	 * Called when the panel is activated with a deep-link targeting this section.
	 * The section interprets `params` (e.g. a connection to open in the editor) and
	 * posts the appropriate messages.
	 */
	onActivate?(params: Record<string, unknown> | undefined): void;
}
