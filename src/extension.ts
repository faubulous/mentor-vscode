'use strict';
import 'reflect-metadata';
import * as vscode from 'vscode';
import { container } from 'tsyringe';
import { Store } from '@faubulous/mentor-rdf';
import { configureServiceContainer } from './services/container';
import { ServiceToken } from './services/tokens';
import { ISettingsMigrationService, IWorkspaceFileService, IWorkspaceService, SettingsFileStore } from './services/core';
import { IDocumentContextService, IPrefixLookupService } from './services/document';
import { IViewRouter } from './views/webviews';
import { WorkspaceIndexerService } from './services/core/workspace-indexer-service';
import { WorkspaceUri } from './providers/workspace-uri';
import { WORKSPACE_CONNECTION } from './languages/sparql/services/sparql-connection-registry';
import { ITripleStoreConfigService, IDocumentConnectionService } from './languages/sparql/services';
import { IGraphManagementService } from './languages/sparql/services';
import { ShaclValidationService } from './services/validation/shacl-validation-service';
import { ShapeGraphService } from './services/validation/shape-graph-service';
import { getConfig } from './utilities/vscode/config';
import { getLog } from './utilities/vscode/log';
import { ReferenceUpdateService } from './services/core/reference-update-service';
import { NotebookSerializer } from './services/notebook/notebook-serializer';
import * as languages from './languages';
import * as commands from './commands';
import * as trees from './views/trees';
import * as webviews from './views/webviews';
import * as providers from './providers';

/**
 * Shared activation logic for both browser and Node.js extension hosts.
 * @param context The extension context.
 */
export async function activateExtension(context: vscode.ExtensionContext) {
	vscode.commands.executeCommand('setContext', 'mentor.isInitializing', true);

	context.subscriptions.push(getLog());

	configureServiceContainer(context);

	// Run pending settings migrations before any service reads the configuration.
	const migrationService = container.resolve<ISettingsMigrationService>(ServiceToken.SettingsMigrationService);
	await migrationService.runMigrations();

	await loadFrameworkOntologies();
	await loadShapeGraphs();

	// The framework ontologies and shape graphs were loaded directly into the
	// store; publish the change so graph-count consumers (e.g. the SPARQL status
	// bar, which rendered before any data existed) correct themselves right away
	// instead of only after workspace indexing finishes.
	container.resolve<IGraphManagementService>(ServiceToken.GraphManagementService).notifyWorkspaceGraphsChanged();

	registerLanguages();
	registerViews(); // Views must be registered before providers, since some providers depend on the view registry.
	registerProviders(context);
	registerCommands(context);
	registerNotebookSerializers(context);
	registerRenameHandlers(context);
	registerNotebookInferenceContext(context);

	vscode.commands.executeCommand('setContext', 'mentor.isInitializing', false);

	// Do not await this, to allow the extension to finish activating while the
	// workspace initialization (shape loading, indexing, startup validation) is
	// still in progress. This may cause some language features to not be available
	// until indexing is complete, but provides a better user experience overall.
	const workspaceInitialized = initializeWorkspace();

	// Load named graphs for connections with auto-loading enabled — deferred until
	// the workspace initialization has settled. Even the graph-list queries pay
	// Comunica's query parsing/planning (synchronous CPU on the shared extension
	// host), so running them during the activation window competes with indexing
	// and with other extensions' activation. The lists only feed the connection
	// pickers; nothing at startup depends on them.
	//
	// Gated on Workspace Trust: auto-loading issues outbound requests to endpoints that
	// may be defined by workspace settings, so it must never run for untrusted content.
	// If trust is granted later in the session, load then.
	if (vscode.workspace.isTrusted) {
		workspaceInitialized.finally(() => loadConnectionGraphs().catch(e => getLog().error('Auto-loading connection graphs failed:', e)));
	}

	context.subscriptions.push(
		vscode.workspace.onDidGrantWorkspaceTrust(() => loadConnectionGraphs().catch(e => getLog().error('Auto-loading connection graphs failed:', e)))
	);
}

export async function deactivate() {
	// All disposables are automatically cleaned up via context.subscriptions
}

/**
 * Registers the token providers for supported languages. All documents are
 * parsed and diagnosed in the extension host; there are no language servers.
 */
function registerLanguages() {
	new languages.DatalogTokenProvider();
	new languages.SparqlTokenProvider();
	// TriG is covered by the TurtleTokenProvider: a separate provider instance
	// would duplicate every event subscription and code-lens refresh.
	new languages.TurtleTokenProvider();
	new languages.XmlTokenProvider();
	new languages.TriplateTokenProvider();
}

/**
 * Registers the notebook serializer for the Mentor Notebook.
 */
function registerNotebookSerializers(context: vscode.ExtensionContext) {
	new NotebookSerializer(context);
}

/**
 * Registers various providers for language features, file system access and URI handling.
 * This is a composition point: services are resolved from the container once and passed
 * into the provider constructors.
 */
function registerProviders(context: vscode.ExtensionContext) {
	const store = container.resolve<Store>(ServiceToken.Store);
	const contextService = container.resolve<IDocumentContextService>(ServiceToken.DocumentContextService);
	const prefixLookup = container.resolve<IPrefixLookupService>(ServiceToken.PrefixLookupService);
	const router = container.resolve<IViewRouter>(ServiceToken.WebviewRouter);
	const fileStore = container.resolve<SettingsFileStore>(ServiceToken.UserFileStore);

	new providers.WorkspaceUriLinkProvider(context);
	new providers.WorkspaceUriCodeActionProvider(context);
	new providers.WorkspaceFileSystemProvider(context);
	new providers.TemplateFileSystemProvider(context);
	new providers.UserFileSystemProvider(context, fileStore);
	new providers.XsdAnyUriCodeActionProvider(context);
	new providers.InferenceUriLinkProvider(context);
	new providers.MentorUriHandler(context, store, prefixLookup, router);
	new providers.ResourceTooltipProvider(context, contextService, store);
}

/**
 * Registers tree views and webviews for the extension.
 */
function registerViews() {
	new trees.WorkspaceTree();
	new trees.DefinitionTree();

	// Create registry and register all webview controllers..
	const registry = new webviews.WebviewControllerRegistry(ServiceToken.WebviewControllerRegistry);
	registry.register(ServiceToken.SparqlResultsController, new webviews.SparqlResultsController());
	registry.register(ServiceToken.SettingsPanelController, new webviews.SettingsPanelController());

	container.registerInstance(ServiceToken.WebviewRouter, new webviews.ViewRouter());
}

/**
 * Registers all commands for the extension.
 */
function registerCommands(context: vscode.ExtensionContext) {
	// Register all commands exported in the commands module.
	for (const command of Object.values(commands)) {
		context.subscriptions.push(vscode.commands.registerCommand(command.id, command.handler));
	}
}

/**
 * Registers rename and delete handlers that migrate per-document settings when files or
 * folders are renamed in the workspace, and detect deletions that affect SHACL validation
 * profiles.
 */
function registerRenameHandlers(context: vscode.ExtensionContext) {
	context.subscriptions.push(
		vscode.workspace.onDidRenameFiles(async (e) => {
			// Migrate SPARQL workspaceState keys (document connection + inference settings).
			const documentConnectionService = container.resolve<IDocumentConnectionService>(ServiceToken.DocumentConnectionService);
			await documentConnectionService.handleFileRenames(e.files);

			// Migrate SHACL workspace settings (profile shapes and document assignments).
			const shaclService = container.resolve<ShaclValidationService>(ServiceToken.ShaclValidationService);
			await shaclService.settingsSync.migrateShaclSettings(e.files);

			// Update all workspace: URI references across indexed documents.
			const referenceUpdateService = container.resolve<ReferenceUpdateService>(ServiceToken.ReferenceUpdateService);
			const changes = referenceUpdateService.buildChangesForRenames(e.files);
			await referenceUpdateService.batchUpdate(changes);
		}),
		vscode.workspace.onDidDeleteFiles(async (e) => {
			// Prune SHACL assignments for deleted documents and warn about profiles
			// that still reference deleted shape files.
			const shaclService = container.resolve<ShaclValidationService>(ServiceToken.ShaclValidationService);
			await shaclService.settingsSync.handleFileDeletes(e.files);
		})
	);
}



/**
 * Keeps the `mentor.activeNotebookSupportsInference` context key in sync with the active notebook's
 * connection(s), so the notebook toolbar "Inference" button is disabled when the active notebook's
 * store does not support inference.
 */
function registerNotebookInferenceContext(context: vscode.ExtensionContext) {
	const update = () => {
		const editor = vscode.window.activeNotebookEditor;
		let supported = false;

		if (editor && editor.notebook.notebookType === 'mentor-notebook') {
			const documentConnectionService = container.resolve<IDocumentConnectionService>(ServiceToken.DocumentConnectionService);
			const storeConfigService = container.resolve<ITripleStoreConfigService>(ServiceToken.StoreConfigService);
			const cells = editor.notebook.getCells();

			// Empty notebooks default to the workspace store, which supports inference.
			supported = cells.length === 0
				? storeConfigService.supportsInference(WORKSPACE_CONNECTION)
				: cells.some(cell => storeConfigService.supportsInference(documentConnectionService.getConnectionForDocument(cell.document.uri)));
		}

		vscode.commands.executeCommand('setContext', 'mentor.activeNotebookSupportsInference', supported);
	};

	const documentConnectionService = container.resolve<IDocumentConnectionService>(ServiceToken.DocumentConnectionService);

	context.subscriptions.push(
		vscode.window.onDidChangeActiveNotebookEditor(() => update()),
		documentConnectionService.onDidChangeConnectionForDocument(() => update()),
	);

	update();
}

/**
 * Loads the RDF framework ontologies into the store, which are required
 * for providing completions and hovers for built-in concepts.
 */
async function loadFrameworkOntologies() {
	const store = container.resolve<Store>(ServiceToken.Store);
	await store.loadFrameworkOntologies();
}

/**
 * Loads the bundled preset shape graphs and the user shape files into the
 * store, so validation profiles can reference them without workspace copies.
 */
async function loadShapeGraphs() {
	const shapeGraphService = container.resolve<ShapeGraphService>(ServiceToken.ShapeGraphService);
	await shapeGraphService.loadAll();
}

/**
 * Loads named graphs for all SPARQL connections that have auto-loading enabled.
 * Runs non-blocking in parallel with workspace indexing.
 */
async function loadConnectionGraphs() {
	const graphService = container.resolve<IGraphManagementService>(ServiceToken.GraphManagementService);
	await graphService.autoLoadConnections();
}

/**
 * Runs the workspace startup sequence (see ADR-0003): resolves the monorepo root
 * first — `workspace:///` URI resolution and the graph IRIs the indexer produces
 * depend on it — then loads the profile-referenced shape graphs in parallel with
 * file discovery and indexing. Startup validation runs once both are done: it
 * needs the shape graphs for the profiles and the files' data graphs from the
 * index. The two tracks never wait for each other; only validation joins them.
 */
async function initializeWorkspace() {
	// Without workspace folders there is nothing to resolve, index or validate. The
	// indexer status bar item created eagerly by the service container stays visible
	// with its default icon so the Mentor settings remain quickly accessible.
	if (!vscode.workspace.workspaceFolders?.length) {
		return;
	}

	try {
		// Discover all VS Code workspace files for workspace ID resolution.
		const workspaceService = container.resolve<IWorkspaceService>(ServiceToken.WorkspaceService);
		await workspaceService.discoverWorkspaces();

		// Set the monorepo root for workspace URI resolution.
		WorkspaceUri.rootUri = workspaceService.activeRootUri;
	} catch (e) {
		// This function is intentionally not awaited during activation; log instead
		// of surfacing an unhandled rejection that could disrupt the extension host.
		getLog().error('Workspace discovery failed:', e);
		return;
	}

	// Both tracks handle their own failures and never reject.
	await Promise.all([loadReferencedShapeGraphs(), indexWorkspaceFiles()]);

	await initializeValidation();
}

/**
 * Loads the shape graphs referenced by SHACL validation profiles into the store.
 * Fast (a handful of small files) and independent of workspace indexing, so
 * validation never depends on the indexer having walked over a shape file.
 */
async function loadReferencedShapeGraphs() {
	try {
		const shapeGraphService = container.resolve<ShapeGraphService>(ServiceToken.ShapeGraphService);
		await shapeGraphService.loadReferencedShapeGraphs();
	} catch (e) {
		getLog().error('Loading referenced shape graphs failed:', e);
	}
}

/**
 * Indexes the entire workspace to provide language features such as hovers, completions and definitions. This is done on activation to ensure that these features are available immediately after the extension is activated.
 */
async function indexWorkspaceFiles() {
	try {
		// Discover all supported files in the workspace.
		const workspaceFileService = container.resolve<IWorkspaceFileService>(ServiceToken.WorkspaceFileService);
		await workspaceFileService.discoverFiles();

		// Index the entire workspace for providing hovers, completions and definitions.
		const workspaceIndexerService = container.resolve<WorkspaceIndexerService>(ServiceToken.WorkspaceIndexerService);
		await workspaceIndexerService.indexWorkspace();
	} catch (e) {
		getLog().error('Workspace indexing failed:', e);
	}
}

/**
 * Checks all SHACL validation profiles for references to missing shape graphs and warns the
 * user if any are broken, then runs the `validateOnStartup` batch.
 * @note This runs after shape loading and workspace indexing have both completed, so the
 * profiles' shape graphs and the files' data graphs are in the store (see ADR-0003).
 */
async function initializeValidation() {
	try {
		const shaclService = container.resolve<ShaclValidationService>(ServiceToken.ShaclValidationService);

		shaclService.settingsSync.runStartupProfileCheck();

		// Silently validate the files covered by profiles with validateOnStartup
		// enabled. The diagnostics are published by the service; no notification
		// is shown.
		const shaclConfig = getConfig('shacl');

		if (shaclConfig.get<boolean>('enabled', false)) {
			const fileService = container.resolve<IWorkspaceFileService>(ServiceToken.WorkspaceFileService);

			// The service drives its own validation status bar item (progress + cancel) and
			// yields between files, so the startup batch stays responsive and cancellable
			// without a progress notification. No-op when no profile opts in.
			await shaclService.validateStartupProfiles(fileService.files);
		}
	} catch (e) {
		getLog().error('SHACL profile check failed:', e);
	}
}
