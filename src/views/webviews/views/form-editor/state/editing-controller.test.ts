import { describe, expect, it } from 'vitest';
import { EditOperation } from '@src/services/editing/edit-operation';
import { getTermRefResourceId } from '@src/services/editing/resource-id';
import { EditOutcome, IEditingHostService, SubmittedEdit } from '../services/editing-host-service.interface';
import { CellKey } from './cell-key';
import { EditingController } from './editing-controller';

const subject = { kind: 'iri' as const, iri: 'http://example.org/s' };
const resourceId = getTermRefResourceId(subject)!;
const operation: EditOperation = { op: 'deleteProperty', subject, predicate: 'http://example.org/p' };
const cell = new CellKey({ resourceId, column: 'statement', propertyIndex: 1 });

/**
 * A host whose outcomes the test settles.
 */
function createHost(): { host: IEditingHostService; settle: (outcome: EditOutcome) => void; sent: EditOperation[][] } {
	const sent: EditOperation[][] = [];
	let resolve: ((outcome: EditOutcome) => void) | undefined;

	const host: IEditingHostService = {
		applyEdit: (operations, baseVersion): SubmittedEdit => {
			expect(baseVersion).toBe(1);
			sent.push(operations);

			return { editId: `edit-${sent.length}`, outcome: new Promise(settle => { resolve = settle; }) };
		}
	};

	return { host, sent, settle: outcome => resolve?.(outcome) };
}

describe('EditingController', () => {
	it('hands an edit to the host, keeps it pending and asks for the focus the host names once applied', async () => {
		const { host, settle, sent } = createHost();
		const controller = new EditingController(host);
		let changes = 0;

		controller.subscribe(() => changes++);
		void controller.submit([operation], cell, 1);

		expect(sent).toEqual([[operation]]);
		expect(controller.pendingEditsFor(resourceId)).toMatchObject([{ editId: 'edit-1', status: 'inFlight' }]);

		settle({ ok: true, version: 2, focus: { resourceId, target: 'predicate', propertyIndex: 0 }, renamedIds: [] });
		await Promise.resolve();

		expect(controller.state.focusRequest?.toString()).toBe(`${resourceId}|statement|0|`);
		expect(controller.pendingEditsFor(resourceId)).toMatchObject([{ status: 'applied', appliedVersion: 2 }]);
		expect(changes).toBeGreaterThan(1);

		controller.settleDelivered(2, [resourceId]);
		controller.focusFulfilled();

		expect(controller.pendingEditsFor(resourceId)).toEqual([]);
		expect(controller.state.focusRequest).toBeUndefined();
	});

	it('falls back to the predicted focus when the host names none', async () => {
		const { host, settle } = createHost();
		const controller = new EditingController(host);
		const predicted = new CellKey({ resourceId, column: 'statement', propertyIndex: 0 });

		void controller.submit([operation], cell, 1, predicted);
		settle({ ok: true, version: 2, renamedIds: [] });
		await Promise.resolve();

		expect(controller.state.focusRequest).toBe(predicted);
	});

	it('shows a rejected edit at its cell, drops it and brings the focus back there', async () => {
		const { host, settle } = createHost();
		const controller = new EditingController(host);

		void controller.submit([operation], cell, 1);
		settle({ ok: false, reason: 'notFound', message: 'Gone', version: 1 });
		await Promise.resolve();

		expect(controller.state.errorForRow(resourceId, 1)).toMatchObject({ message: 'Gone', reason: 'notFound' });
		expect(controller.state.focusRequest).toBe(cell);
		expect(controller.pendingEditsFor(resourceId)).toEqual([]);

		controller.dismissError(cell);

		expect(controller.state.errorForRow(resourceId, 1)).toBeUndefined();
	});

	it('clears the error of a cell when it is edited again', () => {
		const { host } = createHost();
		const controller = new EditingController(host);

		controller.requestFocus(cell);
		void controller.submit([operation], cell, 1);

		expect(controller.state.focusRequest).toBe(cell);
		expect(controller.state.errorForCell(cell)).toBeUndefined();
	});
});
