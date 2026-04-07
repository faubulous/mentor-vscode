// Note: This file is separate from container.ts to avoid circular dependency issues.

/**
 * Enumeration of injection tokens for dependency injection.
 */
export enum ServiceToken {
	/** VS Code ExtensionContext for accessing extension APIs. */
	ExtensionContext = "ExtensionContext",
	/** RDF quad store for storing and querying triples. */
	Store = "Store",
	/** Repository for accessing vocabulary definitions. */
	VocabularyRepository = "VocabularyRepository",
	/** Configuration service for accessing static workspace configuration parameters. */
	ConfigurationService = "ConfigurationService",
	/** Factory for creating document contexts. */
	DocumentFactory = "DocumentFactory",
	/** Service for managing document contexts. */
	DocumentContextService = "DocumentContextService",
	/** Service for indexing workspace files. */
	WorkspaceIndexerService = "WorkspaceIndexerService",
	/** Service for discovering workspace files. */
	WorkspaceFileService = "WorkspaceFileService",
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
	/** Dynamic settings that can be changed during runtime without persisting. */
	SettingsService = "SettingsService",
	/** Registry for all webview controllers. */
	WebviewControllerRegistry = "WebviewControllerRegistry",
	/** Controller for the SPARQL results webview. */
	SparqlResultsController = "SparqlResultsController",
	/** Controller for the SPARQL connection editor webview. */
	SparqlConnectionController = "SparqlConnectionController",
	/** Controller for the SPARQL connections list webview. */
	SparqlConnectionsListController = "SparqlConnectionsListController",
	/** Service for discovering VS Code workspace files and their identifiers. */
	WorkspaceService = "WorkspaceService",
	/** Factory for creating platform-specific language clients (browser Worker vs Node.js IPC). */
	LanguageClientFactory = "LanguageClientFactory"
}
