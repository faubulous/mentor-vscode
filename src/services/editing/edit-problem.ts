/**
 * Why an edit of the form editor was not applied. The host tells what went wrong, with the terms
 * it concerns, and the webview puts it into words. Free of imports from 'vscode'.
 */
export type EditProblem =
	/**
	 * The document changed after the edit was built from it.
	 */
	| { kind: 'staleVersion' }
	/**
	 * The text of the document does not parse, so an edit could not be verified against it.
	 */
	| { kind: 'syntaxErrors' }
	/**
	 * The form editor cannot write the document, such as a template or a document of a syntax it
	 * does not edit.
	 */
	| { kind: 'readOnly' }
	/**
	 * A value the edit refers to is no longer written where the form showed it.
	 */
	| { kind: 'valueMoved' }
	/**
	 * The resource the edit is about is no longer described in the document.
	 */
	| { kind: 'resourceGone' }
	/**
	 * The resource no longer carries the predicate the edit changes.
	 */
	| { kind: 'predicateGone' }
	/**
	 * The resource already carries the predicate a predicate is to be renamed to.
	 */
	| { kind: 'predicateTaken' }
	/**
	 * The edit would remove the last statements about a resource.
	 */
	| { kind: 'lastStatements' }
	/**
	 * A value is listed twice among the values of a predicate.
	 */
	| { kind: 'duplicateValue' }
	/**
	 * The values are written in separate statements, which keep the order they are written in.
	 */
	| { kind: 'separateStatements' }
	/**
	 * Comments stand between the values, which therefore cannot change their order.
	 */
	| { kind: 'commentsBetweenValues' }
	/**
	 * The statement the edit continues is not ended by a period.
	 */
	| { kind: 'statementNotEnded' }
	/**
	 * The syntax of the document has no lists.
	 */
	| { kind: 'listsNotSupported' }
	/**
	 * The syntax of the document has no anonymous blank nodes written in place.
	 */
	| { kind: 'nodesNotSupported' }
	/**
	 * An IRI is empty.
	 */
	| { kind: 'emptyIri' }
	/**
	 * An IRI is not valid.
	 */
	| { kind: 'invalidIri'; iri: string }
	/**
	 * A language tag is not valid.
	 */
	| { kind: 'invalidLanguageTag'; tag: string }
	/**
	 * A term that is neither an IRI nor a blank node stands as a subject.
	 */
	| { kind: 'invalidSubject' }
	/**
	 * A term that is neither an IRI, a blank node nor a literal stands as an object.
	 */
	| { kind: 'invalidObject' }
	/**
	 * An anonymous blank node is referred to by name, which the syntax cannot write.
	 */
	| { kind: 'anonymousBlankNode' }
	/**
	 * The operations of one action change overlapping parts of the document.
	 */
	| { kind: 'overlappingEdits' }
	/**
	 * The host does not know an operation.
	 */
	| { kind: 'unsupportedOperation'; op: string }
	/**
	 * The edited text would not state what the edit meant to change.
	 */
	| { kind: 'verificationFailed' }
	/**
	 * VS Code did not apply the edit as it was planned.
	 */
	| { kind: 'notApplied' };
