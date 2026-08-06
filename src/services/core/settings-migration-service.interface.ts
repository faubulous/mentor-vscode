/**
 * Runs all registered settings migrations on activation.
 */
export interface ISettingsMigrationService {
	/**
	 * Runs all registered migrations in order. Each migration is isolated: a
	 * failing migration is logged and does not prevent the remaining migrations
	 * from running.
	 */
	runMigrations(): Promise<void>;
}
