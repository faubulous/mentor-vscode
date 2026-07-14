'use strict';
import 'reflect-metadata';
import * as vscode from 'vscode';
import { container } from 'tsyringe';
import { Store } from '@faubulous/mentor-rdf';
import { configureServiceContainer } from './services/container';
import { ServiceToken } from './services/tokens';
import { ISettingsMigrationService, IWorkspaceFileService, IWorkspaceService } from './services/core';
import { IDocumentContextService, IPrefixLookupService } from './services/document';
import { IViewRouter } from './views/webviews';
import { WorkspaceIndexerService } from './services/core/workspace-indexer-service';
import { WorkspaceUri } from './providers/workspace-uri';
import { WORKSPACE_CONNECTION } from './languages/sparql/services/sparql-connection-registry';
import { ITripleStoreConfigService, IDocumentConnectionService } from './languages/sparql/services';
import { IGraphManagementService } from './languages/sparql/services';
import { ShaclValidationService } from './services/validation/shacl-validation-service';
import { loadPresetShapeGraphs } from './services/validation/profiles';
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

	configureServiceContainer(context);

	// Run pending settings migrations before any service reads the configuration.
	const migrationService = container.resolve<ISettingsMigrationService>(ServiceToken.SettingsMigrationService);
	await migrationService.runMigrations();

	await loadFrameworkOntologies();

	registerLanguages();
	registerViews(); // Views must be registered before providers, since some providers depend on the view registry.
	registerProviders(context);
	registerCommands(context);
	registerNotebookSerializers(context);
	registerRenameHandlers(context);
	registerNotebookInferenceContext(context);

	vscode.commands.executeCommand('setContext', 'mentor.isInitializing', false);

	// Do not await this, to allow the extension to finish activating while indexing
	// is still in progress. This may cause some language features to not be available
	// until indexing is complete, but provides a better user experience overall.
	//
	// Once indexing is complete, check the SHACL validation profiles for references
	// to missing files and warn if any are broken.
	indexWorkspace().then(() => checkValidationProfiles());

	// Load named graphs for connections with auto-loading enabled. Runs in parallel
	// with indexing so the status bar can show both activities simultaneously.
	//
	// Gated on Workspace Trust: auto-loading issues outbound requests to endpoints that
	// may be defined by workspace settings, so it must never run for untrusted content.
	// If trust is granted later in the session, load then.
	if (vscode.workspace.isTrusted) {
		loadConnectionGraphs();
	}

	context.subscriptions.push(
		vscode.workspace.onDidGrantWorkspaceTrust(() => loadConnectionGraphs())
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
	new languages.TrigTokenProvider();
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

	new providers.WorkspaceUriLinkProvider(context);
	new providers.WorkspaceUriCodeActionProvider(context);
	new providers.WorkspaceFileSystemProvider(context);
	new providers.TemplateFileSystemProvider(context);
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
			await shaclService.migrateShaclSettings(e.files);

			// Update all workspace: URI references across indexed documents.
			const referenceUpdateService = container.resolve<ReferenceUpdateService>(ServiceToken.ReferenceUpdateService);
			const changes = referenceUpdateService.buildChangesForRenames(e.files);
			await referenceUpdateService.batchUpdate(changes);
		}),
		vscode.workspace.onDidDeleteFiles(async (e) => {
			// Prune SHACL assignments for deleted documents and warn about profiles
			// that still reference deleted shape files.
			const shaclService = container.resolve<ShaclValidationService>(ServiceToken.ShaclValidationService);
			await shaclService.handleFileDeletes(e.files);
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

	// Load the bundled SHACL shape graphs referenced by the built-in validation
	// profiles shipped as the mentor.shacl.validation manifest default.
	loadPresetShapeGraphs(store);
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
 * Indexes the entire workspace to provide language features such as hovers, completions and definitions. This is done on activation to ensure that these features are available immediately after the extension is activated.
 */
async function indexWorkspace() {
	try {
		// Without workspace folders there is nothing to discover or index. The indexer
		// status bar item created eagerly by the service container stays visible with
		// its default icon so the Mentor settings remain quickly accessible.
		if (!vscode.workspace.workspaceFolders?.length) {
			return;
		}

		// Discover all VS Code workspace files for workspace ID resolution.
		const workspaceService = container.resolve<IWorkspaceService>(ServiceToken.WorkspaceService);
		await workspaceService.discoverWorkspaces();

		// Set the monorepo root for workspace URI resolution.
		WorkspaceUri.rootUri = workspaceService.activeRootUri;

		// Discover all supported files in the workspace.
		const workspaceFileService = container.resolve<IWorkspaceFileService>(ServiceToken.WorkspaceFileService);
		await workspaceFileService.discoverFiles();

		// Index the entire workspace for providing hovers, completions and definitions.
		const workspaceIndexerService = container.resolve<WorkspaceIndexerService>(ServiceToken.WorkspaceIndexerService);
		await workspaceIndexerService.indexWorkspace();
	} catch (e) {
		// This function is intentionally not awaited during activation; log instead
		// of surfacing an unhandled rejection that could disrupt the extension host.
		console.error('Mentor: Workspace indexing failed:', e);
	}
}

/**
 * Checks all SHACL validation profiles for references to missing shape files and warns the user if any are broken.
 * @note This is run after workspace indexing is complete, so that all shape files in the workspace are known.
 */
async function checkValidationProfiles() {
	try {
		const shaclService = container.resolve<ShaclValidationService>(ServiceToken.ShaclValidationService);

		shaclService.runStartupProfileCheck();
	} catch (e) {
		console.error('Mentor: SHACL profile check failed:', e);
	}
}
