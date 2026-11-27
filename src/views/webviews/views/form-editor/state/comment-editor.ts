import { BlankNode, NamedNode } from '@rdfjs/types';
import { termToString } from 'rdf-string';
import { CommentAnchor } from '@src/services/editing/comment-anchor';
import { EditOperation } from '@src/services/editing/edit-operation';
import { EditProblem } from '@src/services/editing/edit-problem';
import { EditOutcome } from '../services/editing-host-service.interface';
import { IEditingController } from './editing-controller.interface';
import { EditWriter } from './edit-writer';

/**
 * The comment a field writes: one the document has, or a new one, and the edit that writes it.
 */
export interface CommentTarget {
	/**
	 * The key of the comment, by which its field keeps its editor.
	 */
	key: string;

	/**
	 * Build the edit that writes the comment.
	 * @param lines The lines of the comment; none remove it.
	 * @returns The edit.
	 */
	operationOf(lines: string[]): EditOperation;
}

/**
 * Where a comment of its own is added: before a run of the comments above a resource, directly
 * above the resource, or at the end of the document.
 */
export type NewCommentPosition = Extract<EditOperation, { op: 'addComment' }>['before'];

/**
 * What a comment field shows of its comment.
 */
export interface CommentEditorState {
	/**
	 * The Markdown text of the comment, one line per comment line, as typed.
	 */
	text: string;

	/**
	 * Why the host did not write the comment, until it is typed anew.
	 */
	rejection?: EditProblem;
}

/**
 * What a comment field writes and where it stands.
 */
export interface CommentEditorData {
	/**
	 * The resource whose card shows the comment, or the document for a comment between cards.
	 */
	subject: NamedNode | BlankNode;

	/**
	 * The resource of the card that shows the comment, which stays mounted while it writes.
	 */
	card: NamedNode | BlankNode;

	/**
	 * The Markdown text of the lines of the comment as the document writes them.
	 */
	lines: readonly string[];

	/**
	 * The document version the lines belong to.
	 */
	version: number;
}

/**
 * Edits one comment of the document: the text typed into its field, written when the field is
 * left with another text than the document has, which an empty text removes. While the edit is on
 * its way and until the document comes back with it, what was typed stays; afterwards the field
 * shows the comment as the document writes it.
 */
export class CommentEditor implements EditWriter {
	private readonly _listeners = new Set<() => void>();

	private _state: CommentEditorState;

	private _stored: string;

	private _data: CommentEditorData;

	private _wantsToWrite = false;

	private _sending = false;

	private _awaitedVersion?: number;

	private _retired = false;

	/**
	 * Create the editor of a comment.
	 * @param _editing Writes the comment.
	 * @param _target The comment and the edit that writes it.
	 * @param data The comment as the document writes it.
	 */
	constructor(private readonly _editing: IEditingController, private readonly _target: CommentTarget, data: CommentEditorData) {
		this._data = data;
		this._stored = data.lines.join('\n');
		this._state = { text: this._stored };
	}

	/**
	 * The text of the comment and why it was not written.
	 */
	get state(): CommentEditorState {
		return this._state;
	}

	get subject(): NamedNode | BlankNode {
		return this._data.subject;
	}

	get card(): NamedNode | BlankNode {
		return this._data.card;
	}

	get version(): number {
		return this._data.version;
	}

	get busy(): boolean {
		return this._wantsToWrite || this._sending || this._awaitedVersion !== undefined;
	}

	get ready(): boolean {
		return !this._sending && this._awaitedVersion === undefined;
	}

	get wantsToWrite(): boolean {
		return this._wantsToWrite;
	}

	/**
	 * Subscribe to the changes of the state.
	 * @param listener Invoked on every change.
	 * @returns A function that removes the subscription.
	 */
	subscribe(listener: () => void): () => void {
		this._listeners.add(listener);

		return () => this._listeners.delete(listener);
	}

	/**
	 * Take in the comment as the document writes it, as the field renders. A text typed and not
	 * written yet, or on its way, stays; otherwise the field shows the comment of the document.
	 * Called while the field renders, so it tells no subscriber: the field renders with it.
	 * @param data The comment.
	 */
	deliver(data: CommentEditorData): void {
		this._data = data;

		if (this._awaitedVersion !== undefined && data.version >= this._awaitedVersion) {
			this._awaitedVersion = undefined;
		}

		const stored = data.lines.join('\n');

		if (stored === this._stored) {
			return;
		}

		const typed = this._state.text !== this._stored;

		this._stored = stored;

		if (!typed && !this.busy) {
			this._state = { text: stored };
		}
	}

	/**
	 * Take the text typed into the field.
	 * @param text The text.
	 */
	input(text: string): void {
		this._update({ text });
	}

	/**
	 * Write the text when it differs from the comment of the document, as leaving the field does.
	 */
	leave(): void {
		if (this._state.text === this._stored || this._wantsToWrite) {
			return;
		}

		this._wantsToWrite = true;
		this._editing.requestWrite(this);
	}

	/**
	 * Give up what was typed, as Escape does.
	 */
	revert(): void {
		this._update({ text: this._stored });
	}

	/**
	 * Forget why the host did not write the comment, as its message is dismissed.
	 */
	dismissRejection(): void {
		this._update({ text: this._state.text });
	}

	/**
	 * Give the comment up, as its field does once it is no longer shown: an edit on its way still
	 * ends, but the document coming back with it is not waited for.
	 */
	retire(): void {
		this._retired = true;
		this._awaitedVersion = undefined;
	}

	takeEdit(): EditOperation[] | undefined {
		if (!this._wantsToWrite) {
			return undefined;
		}

		this._wantsToWrite = false;

		if (this._state.text === this._stored) {
			return undefined;
		}

		this._sending = true;

		return [this._target.operationOf(this._state.text.split('\n'))];
	}

	settle(outcome: EditOutcome): void {
		this._sending = false;

		if (outcome.ok) {
			this._awaitedVersion = this._retired ? undefined : outcome.version;
			this._update({ text: this._state.text });
		} else {
			this._update({ text: this._state.text, rejection: outcome.problem });
		}
	}

	/**
	 * Replace the state and tell the subscribers.
	 * @param state The next state.
	 */
	private _update(state: CommentEditorState): void {
		this._state = state;

		for (const listener of this._listeners) {
			listener();
		}
	}
}

/**
 * The comment the document has at an anchor, which its field rewrites.
 * @param anchor The anchor.
 * @returns The target.
 */
export function getCommentTarget(anchor: CommentAnchor): CommentTarget {
	return { key: getCommentAnchorKey(anchor), operationOf: lines => ({ op: 'setComment', at: anchor, lines }) };
}

/**
 * A comment of its own the document does not have yet, which its field adds.
 * @param before Where it is added, at the end of the document when absent.
 * @returns The target.
 */
export function getNewCommentTarget(before: NewCommentPosition): CommentTarget {
	const key = before ? `new ${termToString(before.subject)} ${before.run ?? 'resource'}` : 'new end';

	return { key, operationOf: lines => ({ op: 'addComment', before, lines }) };
}

/**
 * The key of the comment an anchor names.
 * @param anchor The anchor.
 * @returns The key.
 */
export function getCommentAnchorKey(anchor: CommentAnchor): string {
	switch (anchor.kind) {
		case 'resource':
			return `resource ${termToString(anchor.subject)} ${anchor.run}`;
		case 'node':
			return `node ${termToString(anchor.subject)}`;
		case 'property':
			return `property ${termToString(anchor.subject)} ${anchor.predicate}`;
		case 'value':
			return `value ${termToString(anchor.subject)} ${anchor.predicate} ${anchor.anchor}`;
		case 'end':
			return `end ${termToString(anchor.subject)}`;
		default:
			return `document ${anchor.run}`;
	}
}
