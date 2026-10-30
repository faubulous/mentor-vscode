import { ResourceSummary } from '../form-editor-model';

/**
 * One block of the form: a resource entry, or a comment written between resources. Each run of
 * comment lines, the runs being separated by blank lines, is a block of its own: those above a
 * resource stand over its entry, and those after the last resource close the document.
 */
export type FormBlock =
	| { kind: 'resource'; id: string; resource: ResourceSummary }
	| { kind: 'comment'; id: string; text: string };
