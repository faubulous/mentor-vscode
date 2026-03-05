/**
 * Dependency injection tokens for services and VS Code APIs.
 * Use with @inject(InjectionToken.TokenName).
 * 
 * This file is separate from container.ts to avoid circular dependency issues.
 * Service files can safely import InjectionToken from here without triggering
 * container.ts's imports of those same services.
 */
export enum InjectionToken {
	/** VS Code ExtensionContext for accessing extension APIs. */
	ExtensionContext = "ExtensionContext",
	/** VS Code SecretStorage for secure credential storage. */
	SecretStorage = "SecretStorage",
	/** RDF quad store for storing and querying triples. */
	Store = "Store",
	/** Repository for accessing vocabulary definitions. */
	VocabularyRepository = "VocabularyRepository",
	/** Provider for accessing VS Code workspace configuration. */
	ConfigurationProvider = "ConfigurationProvider",
	/** Factory for creating document contexts. */
	DocumentFactory = "DocumentFactory",
	/** Service for managing document contexts. */
	DocumentContextService = "DocumentContextService",
	/** Repository for workspace file operations. */
	WorkspaceRepository = "WorkspaceRepository",
	/** Service for indexing workspace files. */
	WorkspaceIndexer = "WorkspaceIndexer",
	/** Service for workspace-scoped storage. */
	WorkspaceStorageService = "WorkspaceStorageService",
	/** Service for global storage. */
	GlobalStorageService = "GlobalStorageService",
	/** Service for secure credential storage. */
	CredentialStorageService = "CredentialStorageService",
	/** Service for managing SPARQL connections. */
	SparqlConnectionService = "SparqlConnectionService",
	/** Serializer for SPARQL query results. */
	SparqlQueryResultSerializer = "SparqlQueryResultSerializer",
	/** Service for executing SPARQL queries. */
	SparqlQueryService = "SparqlQueryService",
	/** Service for looking up namespace prefixes. */
	PrefixLookupService = "PrefixLookupService",
	/** Service for downloading prefix definitions. */
	PrefixDownloaderService = "PrefixDownloaderService",
	/** Service for Turtle prefix definitions. */
	TurtlePrefixDefinitionService = "TurtlePrefixDefinitionService",
	/** Application settings manager. */
	SettingsService = "SettingsService"
}
