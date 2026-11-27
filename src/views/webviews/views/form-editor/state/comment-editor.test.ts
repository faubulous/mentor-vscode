import { describe, expect, it } from 'vitest';
import { createEditingHostStub } from '@src/utilities/mocks/editing-host-fixtures';
import { TEST_SUBJECT } from '@src/utilities/mocks/statement-fixtures';
import { CommentAnchor } from '@src/services/editing/comment-anchor';
import { CommentEditor } from './comment-editor';
import { EditingController } from './editing-controller';

const ANCHOR: CommentAnchor = { kind: 'resource', subject: TEST_SUBJECT, run: 0 };

/**
 * An editor of a comment written over two lines, whose writes go to a recording host.
 */
function createEditor(lines = ['first', 'second']) {
	const host = createEditingHostStub();
	const editor = new CommentEditor(new EditingController(host), ANCHOR, { subject: TEST_SUBJECT, card: TEST_SUBJECT, lines, version: 1 });

	return { host, editor };
}

describe('CommentEditor', () => {
	it('shows the comment as the document writes it, a line per comment line', () => {
		expect(createEditor().editor.state).toEqual({ text: 'first\nsecond' });
	});

	it('writes the text typed when the field is left, as the lines of the comment', () => {
		const { host, editor } = createEditor();

		editor.input('first\nchanged');
		editor.leave();

		expect(host.submitted.map(edit => edit.operations)).toEqual([[{ op: 'setComment', at: ANCHOR, lines: ['first', 'changed'] }]]);
		expect(editor.busy).toBe(true);
	});

	it('writes nothing when the field is left with the text of the document', () => {
		const { host, editor } = createEditor();

		editor.input('first\nsecond');
		editor.leave();

		expect(host.submitted).toEqual([]);
		expect(editor.busy).toBe(false);
	});

	it('writes an emptied comment, which removes it', () => {
		const { host, editor } = createEditor();

		editor.input('');
		editor.leave();

		expect(host.submitted[0].operations).toEqual([{ op: 'setComment', at: ANCHOR, lines: [''] }]);
	});

	it('gives up what was typed on Escape', () => {
		const { host, editor } = createEditor();

		editor.input('typed');
		editor.revert();
		editor.leave();

		expect(editor.state.text).toBe('first\nsecond');
		expect(host.submitted).toEqual([]);
	});

	it('keeps what was typed until the document comes back with it, and then shows the document', async () => {
		const { host, editor } = createEditor();

		editor.input('changed');
		editor.leave();
		await host.settle({ ok: true, version: 2 });

		editor.deliver({ subject: TEST_SUBJECT, card: TEST_SUBJECT, lines: ['first', 'second'], version: 1 });

		expect(editor.state.text).toBe('changed');
		expect(editor.busy).toBe(true);

		editor.deliver({ subject: TEST_SUBJECT, card: TEST_SUBJECT, lines: ['changed'], version: 2 });

		expect(editor.state.text).toBe('changed');
		expect(editor.busy).toBe(false);

		editor.deliver({ subject: TEST_SUBJECT, card: TEST_SUBJECT, lines: ['written elsewhere'], version: 3 });

		expect(editor.state.text).toBe('written elsewhere');
	});

	it('keeps the text typed and tells why the host did not write it, until the message is dismissed', async () => {
		const { host, editor } = createEditor();

		editor.input('changed');
		editor.leave();
		await host.settle({ ok: false, problem: { kind: 'commentGone' }, version: 1 });

		expect(editor.state).toEqual({ text: 'changed', rejection: { kind: 'commentGone' } });

		editor.dismissRejection();

		expect(editor.state).toEqual({ text: 'changed' });
	});

	it('waits for no document once retired, as its field is no longer shown', async () => {
		const { host, editor } = createEditor();

		editor.input('changed');
		editor.leave();
		editor.retire();
		await host.settle({ ok: true, version: 2 });

		expect(editor.busy).toBe(false);
	});
});
