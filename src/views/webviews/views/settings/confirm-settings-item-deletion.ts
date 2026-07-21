import * as vscode from 'vscode';
import { SettingsSectionMessages } from './settings-panel-messages';

export interface ConfirmSettingsItemDeletionOptions {
	/**
	 * The confirmation prompt, e.g. `Are you sure you want to delete the store "Foo"?`.
	 */
	message: string;

	/**
	 * Optional pre-formatted lines listing affected items, shown as a bulleted modal detail.
	 */
	affected?: string[];

	/**
	 * Intro line rendered above the affected list.
	 */
	affectedIntro?: string;

	/**
	 * The message posted back to the webview when the user confirms the deletion.
	 */
	deletedMessage: SettingsSectionMessages;
}

/**
 * Runs the shared native delete-confirmation round trip on the extension host:
 * shows a modal warning (optionally listing affected items in its detail) and,
 * when confirmed, posts the section's `*Deleted` message so the webview can
 * perform the actual settings write. Mirrors the pattern previously duplicated
 * in the stores and validation controllers.
 */
export async function confirmSettingsItemDeletion(
	post: (message: SettingsSectionMessages) => void,
	{ message, affected, affectedIntro, deletedMessage }: ConfirmSettingsItemDeletionOptions
): Promise<void> {
	const hasAffected = !!affected && affected.length > 0;
	const answer = await vscode.window.showWarningMessage(
		message,
		{
			modal: true,
			...(hasAffected
				? { detail: (affectedIntro ? `${affectedIntro}\n\n` : '') + affected!.map(item => `• ${item}`).join('\n') }
				: {}),
		},
		'Delete'
	);

	if (answer === 'Delete') {
		post(deletedMessage);
	}
}
