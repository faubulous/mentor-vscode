/**
 * A single settings migration. Migrations are run on every activation and must
 * therefore be idempotent: when there is nothing to migrate they must be a no-op.
 */
export interface ISettingsMigration {
	/** 
	 * Stable identifier, used for logging.
	 */
	readonly id: string;

	/**
	 * Human-readable description of what this migration does.
	 */
	readonly description: string;

	/**
	 * Performs the migration. Must be idempotent and safe to run on every activation.
	 */
	migrate(): Promise<void>;
}
