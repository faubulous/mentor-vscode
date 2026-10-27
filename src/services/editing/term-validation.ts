import { EditRejectionError } from './edit-rejection';

const LANGUAGE_TAG = /^[a-zA-Z]{1,8}(-[a-zA-Z0-9]{1,8})*(--(ltr|rtl))?$/;

const PREFIX = /^(?:[A-Za-zÀ-￿](?:[\wÀ-￿.-]*[\wÀ-￿-])?)?$/;

/**
 * Check that a string can be written as an IRI reference.
 * @param iri The IRI to check.
 * @throws When the IRI is empty or holds characters an IRI reference cannot contain.
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
 * @throws When the tag is not well formed.
 */
export function validateLanguageTag(tag: string): void {
	if (!LANGUAGE_TAG.test(tag)) {
		throw new EditRejectionError('invalidTerm', `'${tag}' is not a valid language tag.`);
	}
}

/**
 * Check that a string can be used as a namespace prefix.
 * @param prefix The prefix to check, without the trailing colon.
 * @throws When the prefix is not well formed.
 */
export function validatePrefix(prefix: string): void {
	if (!PREFIX.test(prefix)) {
		throw new EditRejectionError('invalidTerm', `'${prefix}' is not a valid prefix.`);
	}
}
