import { ReadOnlyReason } from '../form-editor-model';

/**
 * Put into words why a document cannot be edited in the form editor.
 * @param reason Why it cannot be edited.
 * @returns The message shown to the user.
 */
export function getReadOnlyMessage(reason: ReadOnlyReason): string {
	switch (reason) {
		case 'syntaxErrors':
			return 'This document has syntax errors. Fix them in the text editor to continue editing here.';
		case 'template':
			return 'Triplate templates cannot be shown in the form editor because their structure is generated.';
		case 'unsupportedSyntax':
			return 'This document cannot be shown in the form editor.';
	}
}
