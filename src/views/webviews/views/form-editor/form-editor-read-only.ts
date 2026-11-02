import { isTemplate } from 'triplate';
import { DocumentSyntaxError } from '@src/services/document/document-syntax-error';
import { ReadOnlyReason } from './form-editor-model';

/**
 * Tell why the form editor cannot write a document: it is a Triplate template, whose structure
 * is generated, or its text does not parse, so an edit could not be verified against it. Whether
 * the text parses is read from the parse of that very text, not from the diagnostics, which arrive
 * later and also report lint findings and validation results of a document that parses.
 * @param text The text of the document.
 * @param syntaxErrors Where the text does not follow the grammar of its syntax.
 * @returns The reason, or `undefined` when the form can write the document.
 */
export function getFormReadOnlyReason(text: string, syntaxErrors: readonly DocumentSyntaxError[]): ReadOnlyReason | undefined {
	if (isTemplate(text)) {
		return 'template';
	}

	if (syntaxErrors.length > 0) {
		return 'syntaxErrors';
	}

	return undefined;
}
