import { ResourceOptionData } from '../form-editor-model';

/**
 * The prefix a picked term is written with where the document declares none for its namespace,
 * which the edit that first writes the term declares.
 */
export type PrefixProposal = NonNullable<ResourceOptionData['missingPrefix']>;
