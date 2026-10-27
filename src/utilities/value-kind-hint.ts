import type { ValueKind } from '@src/utilities/value-kind';

/**
 * What kind of values a predicate takes, as far as the host could tell, in wire form. Shared by
 * the form editor host and webview; free of imports from 'vscode'.
 */
export interface ValueKindHint {
	kind: ValueKind;
	/** Where the kind was read from: so far only the values the predicate has in the document. */
	source: 'usage';
}
