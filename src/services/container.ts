import * as vscode from 'vscode';
import { container } from 'tsyringe';
import { Store, OwlReasoner, GraphUriGenerator, VocabularyRepository } from '@faubulous/mentor-rdf';
import { Quad_Graph } from '@rdfjs/types';
import { ServiceToken } from './tokens';
import { InferenceUri } from '../providers/inference-uri';
import { DocumentFactory } from './document/document-factory';
import { WorkspaceIndexerService } from './core/workspace-indexer-service';
import { WorkspaceFileService } from './core/workspace-file-service';
import { WorkspaceService } from './core/workspace-service';
import { DocumentContextService } from './document/document-context-service';
import { DocumentLintingService } from './document/document-linting-service';
import { NotebookController } from './notebook/notebook-controller';
import { DocumentTokenSource } from './document/document-token-source';
import { DocumentDiagnosticsService } from './document/document-diagnostics-service';
import { SettingsService } from './core/settings-service';
import { CredentialStorageService } from './core/credential-storage-service';
import { PrefixDownloaderService } from './document/prefix-downloader-service';
import { PrefixLookupService } from './document/prefix-lookup-service';
import { SparqlQueryService } from '@src/languages/sparql/services/sparql-query-service';
import { SparqlStatusBarService } from '@src/languages/sparql/services/sparql-status-bar-service';
import { SparqlConnectionRegistry } from '@src/languages/sparql/services/sparql-connection-registry';
import { SparqlEndpointTester } from '@src/languages/sparql/services/sparql-endpoint-tester';
import { DocumentConnectionService } from '@src/languages/sparql/services/document-connection-service';
import { SparqlQuerySourceFactory } from '@src/languages/sparql/services/sparql-query-source-factory';
import { TripleStoreConfigService } from '@src/languages/sparql/services/triple-store-config-service';
import { SparqlResultSerializer } from '@src/languages/sparql/services/sparql-result-serializer';
import { GraphManagementService } from '@src/languages/sparql/services/graph-management-service';
import { TurtlePrefixDefinitionService } from '@src/languages/turtle/services/turtle-prefix-definition-service';
import { SparqlPrefixDefinitionService } from '@src/languages/sparql/services/sparql-prefix-definition-service';
import { ShaclProfileSettingsService } from '@src/services/validation/shacl-profile-settings-service';
import { ShaclValidationProfilesMigration, ShaclValidationScopeMigration } from '@src/services/validation/migrations';
import { ShaclValidationService } from '@src/services/validation/shacl-validation-service';
import { ShapeGraphService } from '@src/services/validation/shape-graph-service';
import { ShapeReferenceRegistryService } from '@src/services/validation/shape-reference-registry-service';
import { SettingsFileStore } from './core/settings-file-store';
import { ReferenceUpdateService } from '@src/services/core/reference-update-service';
import { SettingsMigrationService } from './core/settings-migration-service';
import { IndexExcludeFilesMigration, LegacyTemplateFormatMigration } from './core/migrations/';

/**
 * Graph URI generator that creates inference URIs for RDF graphs.
 */
class MentorGraphUriGenerator implements GraphUriGenerator {
	getGraphUri(uri: string | Quad_Graph): string {
		const value = typeof uri === 'string' ? uri : uri.value;
		return InferenceUri.toInferenceUri(value);
	}
}

/**
 * Configures the service container with all necessary services and dependencies for the extension.
 * @param context The VS Code extension context, used for registering services that require access to the extension's lifecycle and storage.
 */
export function configureServiceContainer(context: vscode.ExtensionContext): void {
	// Register VS Code services and extension context.
	container.registerInstance(ServiceToken.ExtensionContext, context);

	// Register application services.
	const settingsService = new SettingsService();
	container.registerInstance(ServiceToken.SettingsService, settingsService);

	const reasoner = new OwlReasoner(new MentorGraphUriGenerator());
	const store = new Store(reasoner);

	container.registerInstance(ServiceToken.Store, store);

	const vocabularyRepository = new VocabularyRepository(store);
	container.registerInstance(ServiceToken.VocabularyRepository, vocabularyRepository);

	const credentialStorageService = new CredentialStorageService(context);
	container.registerInstance(ServiceToken.CredentialStorageService, credentialStorageService);

	const documentFactory = new DocumentFactory(store, vocabularyRepository, settingsService);
	container.registerInstance(ServiceToken.DocumentFactory, documentFactory);

	// The token source supplies documents with tokens and coordinates concurrent
	// loads. All documents are parsed synchronously in the extension host: the
	// Turtle family and SPARQL are tokenized, RDF/XML is analyzed structurally.
	// The context is looked up lazily through the container because the document
	// context service is constructed after the token source.
	const getContext = (uri: string) => container.resolve<DocumentContextService>(ServiceToken.DocumentContextService).contexts[uri];

	const documentTokenSource = new DocumentTokenSource(getContext);

	context.subscriptions.push(documentTokenSource);

	const documentContextService = new DocumentContextService(context, store, vocabularyRepository, documentFactory, documentTokenSource);
	container.registerInstance(ServiceToken.DocumentContextService, documentContextService);

	// Diagnostics are computed in the extension host — there are no language
	// server processes. Constructed after DocumentContextService is registered:
	// its constructor eagerly validates already-visible editors, which resolves
	// the context service through the `getContext` closure. Registered so the
	// Diagnose Workspace command can trigger an explicit workspace-wide pass.
	const documentDiagnosticsService = new DocumentDiagnosticsService(documentTokenSource, getContext);
	container.registerInstance(ServiceToken.DocumentDiagnosticsService, documentDiagnosticsService);
	context.subscriptions.push(documentDiagnosticsService);

	const workspaceService = new WorkspaceService();
	container.registerInstance(ServiceToken.WorkspaceService, workspaceService);

	const workspaceFileService = new WorkspaceFileService(documentFactory);
	container.registerInstance(ServiceToken.WorkspaceFileService, workspaceFileService);

	const workspaceIndexerService = new WorkspaceIndexerService(
		documentFactory,
		documentContextService,
		workspaceFileService,
		documentTokenSource,
		documentDiagnosticsService
	);
	container.registerInstance(ServiceToken.WorkspaceIndexerService, workspaceIndexerService);

	// The linting service self-registers with the extension context for disposal.
	new DocumentLintingService(context, vocabularyRepository, documentFactory, workspaceIndexerService, documentContextService);

	const sparqlStoreConfigService = new TripleStoreConfigService();
	container.registerInstance(ServiceToken.StoreConfigService, sparqlStoreConfigService);

	const connectionRegistry = new SparqlConnectionRegistry(context, credentialStorageService, sparqlStoreConfigService);
	container.registerInstance(ServiceToken.SparqlConnectionRegistry, connectionRegistry);

	const sparqlEndpointTester = new SparqlEndpointTester(credentialStorageService);
	container.registerInstance(ServiceToken.SparqlEndpointTester, sparqlEndpointTester);

	const documentConnectionService = new DocumentConnectionService(context, connectionRegistry);
	container.registerInstance(ServiceToken.DocumentConnectionService, documentConnectionService);

	const sparqlQuerySourceFactory = new SparqlQuerySourceFactory(store, sparqlStoreConfigService, connectionRegistry, documentConnectionService);

	const prefixDownloaderService = new PrefixDownloaderService();
	container.registerInstance(ServiceToken.PrefixDownloaderService, prefixDownloaderService);

	const prefixLookupService = new PrefixLookupService(context, documentContextService);
	container.registerInstance(ServiceToken.PrefixLookupService, prefixLookupService);

	const sparqlQueryResultSerializer = new SparqlResultSerializer(prefixLookupService);
	container.registerInstance(ServiceToken.SparqlQueryResultSerializer, sparqlQueryResultSerializer);

	const sparqlQueryService = new SparqlQueryService(context, credentialStorageService, connectionRegistry, sparqlQueryResultSerializer, sparqlStoreConfigService, sparqlQuerySourceFactory, documentConnectionService);
	container.registerInstance(ServiceToken.SparqlQueryService, sparqlQueryService);

	const turtlePrefixDefinitionService = new TurtlePrefixDefinitionService(documentContextService, prefixLookupService);
	container.registerInstance(ServiceToken.TurtlePrefixDefinitionService, turtlePrefixDefinitionService);

	const sparqlPrefixDefinitionService = new SparqlPrefixDefinitionService(documentContextService, prefixLookupService);
	container.registerInstance(ServiceToken.SparqlPrefixDefinitionService, sparqlPrefixDefinitionService);

	// Register the SHACL profile settings service and the shape graph service the
	// validation service resolves its shape graphs through.
	const shaclProfileSettingsService = new ShaclProfileSettingsService();
	container.registerInstance(ServiceToken.ShaclProfileSettingsService, shaclProfileSettingsService);

	// User-scoped virtual files live in the user-level mentor.files settings value
	// and are served as user:///<path> documents by the UserFileSystemProvider
	// (constructed in registerProviders, which resolves this store).
	const userFileStore = new SettingsFileStore('files');
	container.registerInstance(ServiceToken.UserFileStore, userFileStore);

	const shapeGraphService = new ShapeGraphService(store, userFileStore, shaclProfileSettingsService);
	container.registerInstance(ServiceToken.ShapeGraphService, shapeGraphService);

	const shaclValidationService = new ShaclValidationService(context, store, documentContextService, documentFactory, shaclProfileSettingsService, shapeGraphService);
	container.registerInstance(ServiceToken.ShaclValidationService, shaclValidationService);

	context.subscriptions.push(userFileStore, shapeGraphService);

	// Record which workspaces reference each user shape file so shapes used by
	// other workspaces are protected from the orphan-cleanup prompt. Reconciles
	// on activation and whenever the validation profiles change.
	const shapeReferenceRegistryService = new ShapeReferenceRegistryService(userFileStore, shaclProfileSettingsService);
	context.subscriptions.push(shapeReferenceRegistryService);
	void shapeReferenceRegistryService.reconcile();

	// When shape graphs change (editor save, Settings Sync update, cleanup), refresh
	// the open documents' validation state and the profile health check. Debounced
	// and serialized: shape loading is lazy and re-fires this event, so a startup or
	// sync burst is coalesced into a single revalidation pass.
	context.subscriptions.push(shapeGraphService.onDidChangeShapeGraphs(() => {
		shaclValidationService.scheduleShapeGraphReaction();
	}));

	// Register the notebook controller for the Mentor Notebook kernel.
	const notebookController = new NotebookController(context, documentContextService, shaclValidationService, sparqlQueryService);
	container.registerInstance(ServiceToken.NotebookController, notebookController);

	// Register the graph service before the status bar so the status bar can subscribe to load events.
	const graphService = new GraphManagementService(context, connectionRegistry, sparqlQueryService, sparqlStoreConfigService, store);
	container.registerInstance(ServiceToken.GraphManagementService, graphService);

	context.subscriptions.push(graphService);

	// Register the SPARQL status bar service and push it to subscriptions so it is
	// disposed when the extension deactivates.
	const sparqlStatusBarService = new SparqlStatusBarService(sparqlQueryService, sparqlEndpointTester, graphService, connectionRegistry);

	context.subscriptions.push(sparqlStatusBarService);

	// Register the reference update service for cross-workspace URI rename support.
	const referenceUpdateService = new ReferenceUpdateService(documentContextService);
	container.registerInstance(ServiceToken.ReferenceUpdateService, referenceUpdateService);

	// Register the settings migration service. New migrations are added to this list only.
	const settingsMigrationService = new SettingsMigrationService([
		new IndexExcludeFilesMigration(),
		new LegacyTemplateFormatMigration(),
		new ShaclValidationProfilesMigration(),
		new ShaclValidationScopeMigration(),
	]);
	container.registerInstance(ServiceToken.SettingsMigrationService, settingsMigrationService);
}