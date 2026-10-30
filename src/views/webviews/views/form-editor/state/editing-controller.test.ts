import { describe, expect, it } from 'vitest';
import { EditOperation } from '@src/services/editing/edit-operation';
import { createEditingHostStub } from '@src/utilities/mocks/editing-host-fixtures';
import { EditOutcome } from '../services/editing-host-service.interface';
import { EditWriter } from './edit-writer';
import { EditingController } from './editing-controller';

const subject = { kind: 'iri' as const, iri: 'http://example.org/s' };

/**
 * A writer that writes one operation of its predicate per request, recording how its edits end.
 */
class TestWriter implements EditWriter {
	version = 1;

	ready = true;

	writes = 0;

	readonly outcomes: EditOutcome[] = [];

	/**
	 * Create a writer.
	 * @param predicate The predicate its operations delete.
	 * @param onTake Called while it builds its edit.
	 */
	constructor(private readonly predicate: string, private readonly onTake?: () => void) { }

	get wantsToWrite(): boolean {
		return this.writes > 0;
	}

	takeEdit(): EditOperation[] | undefined {
		this.writes--;
		this.onTake?.();

		return [{ op: 'deleteProperty', subject, predicate: this.predicate }];
	}

	settle(outcome: EditOutcome): void {
		this.outcomes.push(outcome);
	}

	/**
	 * Ask for a write.
	 * @returns The writer.
	 */
	wanting(): this {
		this.writes++;

		return this;
	}
}

/**
 * The predicates of the edits a host was handed, in order.
 */
function predicatesOf(submitted: { operations: EditOperation[] }[]): string[] {
	return submitted.map(edit => (edit.operations[0] as { predicate: string }).predicate);
}

describe('EditingController', () => {
	it('sends one edit at a time, in the order the writes were asked for, each from the version of its writer', async () => {
		const host = createEditingHostStub();
		const controller = new EditingController(host);
		const first = new TestWriter('p1');
		const second = new TestWriter('p2');

		controller.requestWrite(first.wanting());
		controller.requestWrite(second.wanting());

		expect(predicatesOf(host.submitted)).toEqual(['p1']);

		await host.settle();
		second.version = 2;
		controller.flush();

		expect(first.outcomes).toEqual([{ ok: true, version: 2 }]);
		expect(host.submitted.map(edit => edit.baseVersion)).toEqual([1, 2]);
		expect(predicatesOf(host.submitted)).toEqual(['p1', 'p2']);
	});

	it('builds no edit from data older than the version the last edit produced', async () => {
		const host = createEditingHostStub();
		const controller = new EditingController(host);
		const first = new TestWriter('p1');
		const second = new TestWriter('p2');

		controller.requestWrite(first.wanting());
		controller.requestWrite(second.wanting());
		await host.settle();

		expect(host.submitted).toHaveLength(1);

		second.version = 2;
		controller.flush();

		expect(host.submitted).toHaveLength(2);
	});

	it('passes over a writer that is not ready and sends it once it is', () => {
		const host = createEditingHostStub();
		const controller = new EditingController(host);
		const waiting = new TestWriter('p1');
		const other = new TestWriter('p2');

		waiting.ready = false;
		controller.requestWrite(waiting.wanting());
		controller.requestWrite(other.wanting());

		expect(predicatesOf(host.submitted)).toEqual(['p2']);
	});

	it('drops a writer once it has nothing left to write', async () => {
		const host = createEditingHostStub();
		const controller = new EditingController(host);
		const writer = new TestWriter('p1');

		controller.requestWrite(writer.wanting());
		await host.settle();
		writer.version = 2;
		controller.flush();

		expect(host.submitted).toHaveLength(1);
	});

	it('sends a write asked for while another writer builds its edit after that edit', async () => {
		const host = createEditingHostStub();
		const controller = new EditingController(host);
		const target = new TestWriter('p2');
		const merging = new TestWriter('p1', () => controller.requestWrite(target.wanting()));

		controller.requestWrite(merging.wanting());
		await host.settle();
		target.version = 2;
		controller.flush();

		expect(predicatesOf(host.submitted)).toEqual(['p1', 'p2']);
	});

	it('hands a refusal to its writer and goes on with the next write', async () => {
		const host = createEditingHostStub();
		const controller = new EditingController(host);
		const refused = new TestWriter('p1');
		const next = new TestWriter('p2');

		controller.requestWrite(refused.wanting());
		controller.requestWrite(next.wanting());
		await host.settle({ ok: false, reason: 'notFound', message: 'Gone', version: 1 });

		expect(refused.outcomes).toEqual([{ ok: false, reason: 'notFound', message: 'Gone', version: 1 }]);
		expect(predicatesOf(host.submitted)).toEqual(['p1', 'p2']);
	});
});
