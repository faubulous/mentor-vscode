import { ISettingsMigration } from './settings-migration.interface';
import { ISettingsMigrationService } from './settings-migration-service.interface';

/**
 * Owns the registry of settings migrations and runs them on activation.
 *
 * Migrations run on every activation and must be idempotent. Adding a new
 * migration is a matter of registering it where this service is constructed; no
 * change to the activation flow is required.
 */
export class SettingsMigrationService implements ISettingsMigrationService {
	constructor(private readonly migrations: ReadonlyArray<ISettingsMigration>) { }

	async runMigrations(): Promise<void> {
		for (const migration of this.migrations) {
			try {
				await migration.migrate();
			} catch (error) {
				// Isolate failures so one bad migration does not block the rest or activation.
				console.error(`Mentor: settings migration "${migration.id}" failed:`, error);
			}
		}
	}
}
