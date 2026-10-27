import { describe, expect, it } from 'vitest';
import { EditOperation } from '@src/services/editing/edit-operation';
import { FormEditorWebviewMessage } from '../form-editor-messages';
import { MessagingEditingHost } from './messaging-editing-host';

const subject = { kind: 'iri' as const, iri: 'http://example.org/s' };

/**
 * Build an operation rewriting a statement.
 */
function operation(text: string): EditOperation {
	return { op: 'replaceStatement', subject, predicate: 'http://example.org/p', text };
}

/**
 * Create a host recording the messages it posts.
 */
function createHost(): { host: MessagingEditingHost; posted: FormEditorWebviewMessage[] } {
	const posted: FormEditorWebviewMessage[] = [];
	const host = new MessagingEditingHost(message => posted.push(message));

	host.setVersion(3);

	return { host, posted };
}

describe('MessagingEditingHost', () => {
	it('sends one edit at a time and stamps the next with the version the host reported', async () => {
		const { host, posted } = createHost();

		const first = host.applyEdit([operation('ex:p "a"')]);
		const second = host.applyEdit([operation('ex:p "b"')]);

		expect(posted).toHaveLength(1);
		expect(posted[0]).toMatchObject({ id: 'ApplyEdit', editId: first.editId, baseVersion: 3 });

		host.accept({ id: 'EditApplied', editId: first.editId, version: 4 });

		await expect(first.outcome).resolves.toMatchObject({ ok: true, version: 4, renamedIds: [] });
		expect(host.version).toBe(4);
		expect(posted).toHaveLength(2);
		expect(posted[1]).toMatchObject({ id: 'ApplyEdit', editId: second.editId, baseVersion: 4 });
	});

	it('resolves a rejection with its reason and sends the next edit', async () => {
		const { host, posted } = createHost();
		const edit = host.applyEdit([operation('ex:p "a"')]);
		const next = host.applyEdit([operation('ex:p "b"')]);

		host.accept({ id: 'EditRejected', editId: edit.editId, reason: 'notFound', message: 'gone', version: 3 });

		await expect(edit.outcome).resolves.toEqual({ ok: false, reason: 'notFound', message: 'gone', version: 3 });
		expect(posted[1]).toMatchObject({ id: 'ApplyEdit', editId: next.editId });
	});

	it('ignores an answer for an edit that is not in flight', () => {
		const { host, posted } = createHost();

		host.applyEdit([operation('ex:p "a"')]);

		expect(host.accept({ id: 'EditApplied', editId: 'edit-99', version: 9 })).toBe(true);
		expect(posted).toHaveLength(1);
	});

	it('leaves the messages of other kinds to others', () => {
		const { host } = createHost();

		expect(host.accept({ id: 'ScrollToResource', resourceId: 'i:x' })).toBe(false);
	});
});
