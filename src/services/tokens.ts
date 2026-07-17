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
	/** Factory for creating document contexts. */
	DocumentFactory = "DocumentFactory",
	/** Service for managing document contexts. */
	DocumentContextService = "DocumentContextService",
	/** Source that supplies documents with tokens and coordinates concurrent loads. */
	DocumentTokenSource = "DocumentTokenSource",
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
	SparqlConnectionRegistry = "SparqlConnectionRegistry",
	/** Service for testing the reachability of SPARQL endpoint connections. */
	SparqlEndpointTester = "SparqlEndpointTester",
	/** Service for per-document and notebook-cell SPARQL connection and inference settings. */
	DocumentConnectionService = "DocumentConnectionService",
	/** Factory for Comunica-compatible SPARQL query sources. */
	SparqlQuerySourceFactory = "SparqlQuerySourceFactory",
	/** Service for reading and resolving SPARQL store configurations. */
	StoreConfigService = "StoreConfigService",
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
	/** Service for SPARQL prefix definitions. */
	SparqlPrefixDefinitionService = "SparqlPrefixDefinitionService",
	/** Dynamic settings that can be changed during runtime without persisting. */
	SettingsService = "SettingsService",
	/** Registry for all webview controllers. */
	WebviewControllerRegistry = "WebviewControllerRegistry",
	/** Controller for the SPARQL results webview. */
	SparqlResultsController = "SparqlResultsController",
	/** Service for discovering VS Code workspace files and their identifiers. */
	WorkspaceService = "WorkspaceService",
	/** Service for validating RDF documents against SHACL shapes. */
	ShaclProfileSettingsService = "ShaclProfileSettingsService",
	ShaclValidationService = "ShaclValidationService",
	/** Service that shows SPARQL activity (query execution, connection testing) in the status bar. */
	SparqlStatusBarService = "SparqlStatusBarService",
	/** Service for updating workspace: URI references across all indexed documents on rename. */
	ReferenceUpdateService = "ReferenceUpdateService",
	/** Controller for the custom Mentor settings panel. */
	SettingsPanelController = "SettingsPanelController",
	/** Generic navigation router between webview panels. */
	WebviewRouter = "WebviewRouter",
	/** Service that loads, caches, and retrieves named graphs for SPARQL connections. */
	GraphManagementService = "GraphManagementService",
	/** Service that runs registered settings migrations on activation. */
	SettingsMigrationService = "SettingsMigrationService",
	/** Controller for the Mentor Notebook kernel. */
	NotebookController = "NotebookController"
}
