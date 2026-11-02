import { describe, expect, it } from 'vitest';
import { getEditProblemMessage } from './edit-problem-message';
import { getReadOnlyMessage } from './read-only-message';

describe('getEditProblemMessage', () => {
	it('names the term a problem is about', () => {
		expect(getEditProblemMessage({ kind: 'invalidIri', iri: 'ex: tree' })).toBe("'ex: tree' is not a valid IRI.");
		expect(getEditProblemMessage({ kind: 'invalidLanguageTag', tag: 'en_' })).toBe("'en_' is not a valid language tag.");
		expect(getEditProblemMessage({ kind: 'unsupportedOperation', op: 'renameSubject' })).toBe("The form editor cannot carry out 'renameSubject'.");
	});

	it('says of a document with syntax errors what the read-only banner says', () => {
		expect(getEditProblemMessage({ kind: 'syntaxErrors' })).toBe(getReadOnlyMessage('syntaxErrors'));
	});
});
