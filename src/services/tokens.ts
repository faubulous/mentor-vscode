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
	/** Service that computes syntax and lint diagnostics for documents. */
	DocumentDiagnosticsService = "DocumentDiagnosticsService",
	/** Service for indexing workspace files. */
	WorkspaceIndexerService = "WorkspaceIndexerService",
	/** Service for discovering workspace files. */
	WorkspaceFileService = "WorkspaceFileService",
	/** Service for secure credential storage. */
	CredentialStorageService = "CredentialStorageService",
	/** Service for managing SPARQL connections. */
	SparqlConnectionRegistry = "SparqlConnectionRegistry",
	/** Service for testing the reachability of SPARQL endpoint connections. */
	SparqlEndpointTester = "SparqlEndpointTester",
	/** Service for per-document and notebook-cell SPARQL connection and inference settings. */
	DocumentConnectionService = "DocumentConnectionService",
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
	/** Service that loads the bundled preset and user shape graphs into the store. */
	ShapeGraphService = "ShapeGraphService",
	/** Settings-backed virtual file store for user-scoped files (mentor.files). */
	UserFileStore = "UserFileStore",
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
