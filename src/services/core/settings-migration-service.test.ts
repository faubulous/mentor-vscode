import { describe, expect, test, vi, beforeEach } from 'vitest';
import { SettingsMigrationService } from '@src/services/core/settings-migration-service';
import { ISettingsMigration } from '@src/services/core/settings-migration.interface';

/**
 * Builds a migration double that records when its `migrate` method runs.
 */
function createMigration(id: string, order: string[], impl?: () => Promise<void>): ISettingsMigration {
	return {
		id,
		description: id,
		migrate: vi.fn(async () => {
			order.push(id);
			if (impl) {
				await impl();
			}
		}),
	};
}

describe('SettingsMigrationService', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	test('runs all migrations in registration order', async () => {
		const order: string[] = [];
		const service = new SettingsMigrationService([
			createMigration('first', order),
			createMigration('second', order),
			createMigration('third', order),
		]);

		await service.runMigrations();

		expect(order).toEqual(['first', 'second', 'third']);
	});

	test('logs a failing migration and continues with the rest', async () => {
		const order: string[] = [];
		const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

		const failing = createMigration('failing', order, async () => {
			throw new Error('boom');
		});
		const next = createMigration('next', order);

		const service = new SettingsMigrationService([failing, next]);

		await service.runMigrations();

		expect(order).toEqual(['failing', 'next']);
		expect(next.migrate).toHaveBeenCalledTimes(1);
		expect(consoleError).toHaveBeenCalledWith(
			expect.stringContaining('"failing"'),
			expect.any(Error)
		);

		consoleError.mockRestore();
	});
});
