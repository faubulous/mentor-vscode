import { EditRejectionError } from './edit-rejection';

/**
 * The shape of a language tag: a primary subtag and optional subtags.
 */
const LANGUAGE_TAG = /^[a-zA-Z]{1,8}(-[a-zA-Z0-9]{1,8})*(--(ltr|rtl))?$/;

/**
 * Check that a string can be written as an IRI reference.
 * @param iri The IRI to check.
 * @throws {EditRejectionError} If the IRI is empty or holds characters an IRI reference cannot contain.
 */
export function validateIri(iri: string): void {
	if (iri.trim().length === 0) {
		throw new EditRejectionError('invalidTerm', 'An IRI must not be empty.');
	}

	if (/[\s<>"{}|^`\\]/.test(iri)) {
		throw new EditRejectionError('invalidTerm', `'${iri}' is not a valid IRI.`);
	}
}

/**
 * Check that a string is a language tag.
 * @param tag The tag to check.
 * @throws {EditRejectionError} If the tag is not well formed.
 */
export function validateLanguageTag(tag: string): void {
	if (!LANGUAGE_TAG.test(tag)) {
		throw new EditRejectionError('invalidTerm', `'${tag}' is not a valid language tag.`);
	}
}
