import * as vscode from 'vscode';
import { ProfileValidationSummary } from '@src/services/validation/shacl-validation-service';

/**
 * Shows a consolidated notification for a batch SHACL validation run and offers
 * to open the Problems panel when issues were found.
 * @param summary The aggregated validation outcome.
 * @param emptyMessage The message shown when no files were matched.
 */
export async function reportProfileValidation(summary: ProfileValidationSummary, emptyMessage: string): Promise<void> {
	if (!summary.hasShapes) {
		vscode.window.showInformationMessage('SHACL validation: no shape graphs are configured.');
		return;
	}

	// Note skipped files (data graphs over the mentor.shacl.maxGraphSize limit) so the user
	// understands why some matched files carry no diagnostics.
	const skippedSuffix = summary.skipped > 0
		? ` (${summary.skipped} large file${summary.skipped === 1 ? '' : 's'} skipped)`
		: '';

	if (summary.cancelled) {
		vscode.window.showInformationMessage(`SHACL validation cancelled after ${summary.validated} file${summary.validated === 1 ? '' : 's'}.${skippedSuffix}`);
		return;
	}

	if (summary.matched === 0) {
		vscode.window.showInformationMessage(emptyMessage);
		return;
	}

	// Every matched file was over the size limit — nothing was actually validated.
	if (summary.validated === 0 && summary.skipped > 0) {
		vscode.window.showInformationMessage(`SHACL validation: ${summary.skipped} file${summary.skipped === 1 ? '' : 's'} skipped because they exceed the mentor.shacl.maxGraphSize limit.`);
		return;
	}

	if (summary.issues === 0) {
		const files = summary.validated;
		vscode.window.showInformationMessage(`SHACL validation: no issues found in ${files} file${files === 1 ? '' : 's'}.${skippedSuffix}`);
		return;
	}

	const issues = `${summary.issues} issue${summary.issues === 1 ? '' : 's'}`;
	const fileCount = summary.issueFiles.length;
	const files = `${fileCount} file${fileCount === 1 ? '' : 's'}`;

	const action = await vscode.window.showWarningMessage(`SHACL validation: ${issues} in ${files}.${skippedSuffix}`, 'View');

	if (action === 'View') {
		// VS Code exposes no command to set the Problems panel filter text. When a
		// single file is affected we open it first so its issues are front and
		// centre (the panel groups issues by file); otherwise we just focus the panel.
		if (summary.issueFiles.length === 1) {
			await vscode.window.showTextDocument(summary.issueFiles[0], { preview: false, preserveFocus: true });
		}

		await vscode.commands.executeCommand('workbench.panel.markers.view.focus');
	}
}
