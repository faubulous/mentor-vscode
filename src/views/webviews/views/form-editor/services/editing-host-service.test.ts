import { describe, expect, it } from 'vitest';
import { EditOperation } from '@src/services/editing/edit-operation';
import { FormEditorWebviewMessage } from '../form-editor-messages';
import { EditingHostService } from './editing-host-service';

const subject = { kind: 'iri' as const, iri: 'http://example.org/s' };

/**
 * Build an operation making a literal the one value of a predicate.
 */
function operation(value: string): EditOperation {
	return { op: 'setValues', subject, predicate: 'http://example.org/p', values: [{ kind: 'term', term: { kind: 'literal', value } }] };
}

/**
 * Create a service recording the messages it posts.
 */
function createService(): { service: EditingHostService; posted: FormEditorWebviewMessage[] } {
	const posted: FormEditorWebviewMessage[] = [];
	const service = new EditingHostService(message => posted.push(message));

	service.setVersion(3);

	return { service, posted };
}

describe('EditingHostService', () => {
	it('sends one edit at a time and stamps the next with the version the host reported', async () => {
		const { service, posted } = createService();

		const first = service.applyEdit([operation('a')]);
		const second = service.applyEdit([operation('b')]);

		expect(posted).toHaveLength(1);
		expect(posted[0]).toMatchObject({ id: 'ApplyEdit', editId: first.editId, baseVersion: 3 });

		service.accept({ id: 'EditApplied', editId: first.editId, version: 4 });

		await expect(first.outcome).resolves.toMatchObject({ ok: true, version: 4, renamedIds: [] });
		expect(service.version).toBe(4);
		expect(posted).toHaveLength(2);
		expect(posted[1]).toMatchObject({ id: 'ApplyEdit', editId: second.editId, baseVersion: 4 });
	});

	it('resolves a rejection with its reason and sends the next edit', async () => {
		const { service, posted } = createService();
		const edit = service.applyEdit([operation('a')]);
		const next = service.applyEdit([operation('b')]);

		service.accept({ id: 'EditRejected', editId: edit.editId, reason: 'notFound', message: 'gone', version: 3 });

		await expect(edit.outcome).resolves.toEqual({ ok: false, reason: 'notFound', message: 'gone', version: 3 });
		expect(posted[1]).toMatchObject({ id: 'ApplyEdit', editId: next.editId });
	});

	it('ignores an answer for an edit that is not in flight', () => {
		const { service, posted } = createService();

		service.applyEdit([operation('a')]);

		expect(service.accept({ id: 'EditApplied', editId: 'edit-99', version: 9 })).toBe(true);
		expect(posted).toHaveLength(1);
	});

	it('leaves the messages of other kinds to others', () => {
		const { service } = createService();

		expect(service.accept({ id: 'ScrollToResource', resourceId: 'i:x' })).toBe(false);
	});
});
