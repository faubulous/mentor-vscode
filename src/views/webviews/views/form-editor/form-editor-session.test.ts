import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));

import 'reflect-metadata';

import * as vscode from 'vscode';
import { container } from 'tsyringe';
import { RDF, RDFS, _OWL, _RDFS } from '@faubulous/mentor-rdf';
import { RdfSyntax } from '@faubulous/mentor-rdf-parsers';
import { ServiceToken } from '@src/services/tokens';
import { IDocumentContext } from '@src/services/document/document-context.interface';
import { IDocumentContextService } from '@src/services/document/document-context-service.interface';
import { TokenDelivery } from '@src/services/document/document-token-source.interface';
import { createMockWebviewPanel } from '@src/utilities/mocks/vscode';
import { EditableTextDocument, applyWorkspaceEditTo, createEditableTextDocument, createMockDocumentContext, createMockDocumentContextService, createTurtleDocument } from '@src/utilities/mocks/factories';
import { FormEditorHostMessage, FormEditorWebviewMessage } from './form-editor-messages';
import { FormEditorSession } from './form-editor-session';
import { ResourceDetail } from './form-editor-model';
import { BlankNode, NamedNode } from '@rdfjs/types';
import { RdfDataFactory } from '@src/utilities/rdf-data-factory';

const EX = 'http://example.org/';
const PREAMBLE = `@prefix ex: <${EX}> .\n\n`;
const URI = 'file:///workspace/test.ttl';

/**
 * A webview panel whose posted messages can be read and into which messages can be sent.
 */
interface TestPanel {
	panel: vscode.WebviewPanel;
	posted: FormEditorHostMessage[];
	receive(message: FormEditorWebviewMessage): Promise<void>;
}

/**
 * Create a panel stub recording what the session posts.
 */
function createPanel(): TestPanel {
	const panel = createMockWebviewPanel();
	const posted: FormEditorHostMessage[] = [];

	panel.webview.postMessage = async (message: FormEditorHostMessage) => {
		posted.push(message);

		return true;
	};

	return {
		panel: panel as unknown as vscode.WebviewPanel,
		posted,
		receive: async message => {
			panel.webview.__receive(message);
			await new Promise(resolve => setTimeout(resolve, 0));
		}
	};
}

/**
 * Create a session over a Turtle body, with its parsed context registered for the document.
 * @param body The statements, written after the prefix declarations.
 * @param context The context of the document, in place of the parsed one.
 * @param services The members of the document context service a test controls.
 */
async function createSession(body: string, context?: IDocumentContext, services: Partial<IDocumentContextService> = {}): Promise<{ session: FormEditorSession; document: EditableTextDocument; context: IDocumentContext } & TestPanel> {
	const document = createEditableTextDocument(PREAMBLE + body, { uri: URI });
	const turtle = createTurtleDocument(URI, RdfSyntax.Turtle);

	turtle.parse(document.getText());
	container.registerInstance(ServiceToken.DocumentContextService, createMockDocumentContextService({ contexts: { [URI]: context ?? turtle }, ...services }));

	const testPanel = createPanel();
	const extensionContext = { subscriptions: [], extensionUri: vscode.Uri.parse('file:///extension') } as unknown as vscode.ExtensionContext;
	const session = new FormEditorSession(extensionContext, document, testPanel.panel);

	await session.initialize();

	return { session, document, context: context ?? turtle, ...testPanel };
}

/**
 * Give a resource a new label through the form, and tell the local parts the label rule renamed it
 * to with Mentor's rename provider.
 * @param body The statements, written after the prefix declarations.
 * @param localName The local name of the resource.
 * @param label The new label, which replaces the labels the resource has.
 * @returns The local parts asked for.
 */
async function relabel(body: string, localName: string, label: ReturnType<typeof RdfDataFactory.literal>): Promise<string[]> {
	const text = `@prefix owl: <${_OWL}> .\n@prefix rdfs: <${_RDFS}> .\n${body}`;
	const context = createTurtleDocument(URI, RdfSyntax.Turtle);

	context.predicates.label.push(RDFS.label);
	context.parse(PREAMBLE + text);

	const { session, document, receive } = await createSession(text, context);
	const executeCommand = vi.spyOn(vscode.commands, 'executeCommand').mockResolvedValue(undefined);

	vi.spyOn(vscode.workspace, 'applyEdit').mockImplementation(async edit => applyWorkspaceEditTo(edit, document));

	await receive({ id: 'Ready' });
	await session.applyEdit('e1', 1, [{ op: 'setValues', subject: RdfDataFactory.namedNode(`${EX}${localName}`), predicate: RDFS.label, values: [{ kind: 'term', term: label }] }]);

	return executeCommand.mock.calls.filter(call => call[0] === 'vscode.executeDocumentRenameProvider').map(call => call[3] as string);
}

/**
 * The messages of one kind the session posted.
 */
/**
 * A store whose version a test sets, the token source whose deliveries it fires, and a load of the
 * document's triples it finishes, all registered for a session created after.
 */
function registerLoadingServices() {
	const store = { version: 1 };
	const deliveries = new vscode.EventEmitter<TokenDelivery>();
	const settingListeners: (() => void)[] = [];
	let loading = false;
	let finishLoad = (): void => undefined;
	let load = Promise.resolve();

	container.registerInstance(ServiceToken.VocabularyRepository, { store } as never);
	container.registerInstance(ServiceToken.DocumentTokenSource, { onDidDeliverTokens: deliveries.event } as never);
	container.registerInstance(ServiceToken.SettingsService, {
		onDidChange: (_key: string, listener: () => void) => {
			settingListeners.push(listener);

			return { dispose: () => undefined };
		},
		set: () => settingListeners.forEach(listener => listener())
	} as never);

	return {
		store,
		services: { isLoading: () => loading, waitUntilLoaded: () => load },
		deliver: () => deliveries.fire({ uri: URI } as TokenDelivery),
		startLoad: () => {
			loading = true;
			load = new Promise(resolve => finishLoad = () => {
				loading = false;
				resolve();
			});
		},
		finishLoad: () => finishLoad(),
		changeLanguage: () => settingListeners.forEach(listener => listener())
	};
}

/**
 * Let the promises of the session settle.
 */
async function settle(): Promise<void> {
	await new Promise(resolve => setTimeout(resolve, 0));
}

function postedOf<K extends FormEditorHostMessage['id']>(posted: FormEditorHostMessage[], id: K): Extract<FormEditorHostMessage, { id: K }>[] {
	return posted.filter((message): message is Extract<FormEditorHostMessage, { id: K }> => message.id === id);
}

/**
 * Ask the session for the details of resources, as the webview does.
 * @returns The details it posted in answer.
 */
async function requestDetails(panel: TestPanel, resources: (NamedNode | BlankNode)[]): Promise<ResourceDetail[]> {
	await panel.receive({ id: 'RequestResources', resources });

	const loaded = postedOf(panel.posted, 'ResourcesLoaded');

	return loaded[loaded.length - 1].resources;
}

describe('FormEditorSession', () => {
	beforeEach(() => {
		container.reset();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('posts the snapshot once the webview is ready', async () => {
		const { posted, receive } = await createSession('ex:A a ex:Class .\nex:B a ex:Class .\n');

		expect(postedOf(posted, 'DocumentSnapshot')).toHaveLength(0);

		await receive({ id: 'Ready' });

		const [message] = postedOf(posted, 'DocumentSnapshot');

		expect(message.snapshot.resources.map(resource => resource.prefixedName)).toEqual(['ex:A', 'ex:B']);
		expect(message.snapshot.readOnly).toBeUndefined();
	});

	it('does not post the same snapshot twice', async () => {
		const { posted, receive } = await createSession('ex:A a ex:Class .\n');

		await receive({ id: 'Ready' });
		await receive({ id: 'Ready' });

		expect(postedOf(posted, 'DocumentSnapshot')).toHaveLength(2);
		expect(postedOf(posted, 'DocumentSnapshot')[0].snapshot).toBe(postedOf(posted, 'DocumentSnapshot')[1].snapshot);
	});

	it('serves the properties of the requested resources and names the missing ones', async () => {
		const { posted, receive } = await createSession('ex:A a ex:Class ; ex:p "x" .\n');

		await receive({ id: 'Ready' });
		await receive({ id: 'RequestResources', resources: [RdfDataFactory.namedNode(`${EX}A`), RdfDataFactory.namedNode(`${EX}missing`)] });

		const [message] = postedOf(posted, 'ResourcesLoaded');

		expect(message.resources).toHaveLength(1);
		expect(message.resources[0].properties.map(property => property.predicate.term)).toEqual([RdfDataFactory.namedNode(RDF.type), RdfDataFactory.namedNode(`${EX}p`)]);
		expect(message.missing).toEqual([RdfDataFactory.namedNode(`${EX}missing`)]);
	});

	it('tells the webview when the document cannot be shown', async () => {
		const { posted } = await createSession('ex:A a ex:Class .\n', createMockDocumentContext());

		const [message] = postedOf(posted, 'DocumentSnapshot');

		expect(message.snapshot.readOnly).toBe('unsupportedSyntax');
		expect(message.snapshot.resources).toEqual([]);
	});

	it('applies an edit and publishes the new snapshot before the confirmation', async () => {
		const { session, document, posted, receive } = await createSession('ex:s ex:p "old" .\n');

		vi.spyOn(vscode.workspace, 'applyEdit').mockImplementation(async edit => applyWorkspaceEditTo(edit, document));

		await receive({ id: 'Ready' });

		const outcome = await session.applyEdit('e1', 1, [{ op: 'setValues', subject: RdfDataFactory.namedNode(`${EX}s`), predicate: `${EX}p`, values: [{ kind: 'term', term: RdfDataFactory.literal('new') }] }]);

		expect(outcome).toMatchObject({ ok: true, version: 2 });
		expect(document.getText()).toBe(`${PREAMBLE}ex:s ex:p "new" .\n`);

		const snapshots = postedOf(posted, 'DocumentSnapshot');
		const [applied] = postedOf(posted, 'EditApplied');

		expect(snapshots[1].snapshot.version).toBe(2);
		expect(posted.indexOf(snapshots[1])).toBeLessThan(posted.indexOf(applied));
	});

	it('keeps the snapshot of the last parse until the text it was parsed from is the current one', async () => {
		const { posted, receive, document } = await createSession('ex:s ex:p "old" .\n');

		await receive({ id: 'Ready' });
		document.setText(`${PREAMBLE}# a line above\nex:s ex:p "old" .\n`);
		await receive({ id: 'Ready' });

		expect(postedOf(posted, 'DocumentSnapshot').map(message => message.snapshot.version)).toEqual([1, 1]);
	});

	it('lets a document that parses be edited, whatever error diagnostics it has', async () => {
		vi.spyOn(vscode.languages, 'getDiagnostics').mockReturnValue([new vscode.Diagnostic(new vscode.Range(0, 0, 0, 1), 'A lint finding', vscode.DiagnosticSeverity.Error)] as unknown as ReturnType<typeof vscode.languages.getDiagnostics>);

		const { posted, receive } = await createSession('ex:A a ex:Class .\n');

		await receive({ id: 'Ready' });

		expect(postedOf(posted, 'DocumentSnapshot')[0].snapshot).toMatchObject({ readOnly: undefined, problems: [] });
	});

	it('shows a document that does not parse read only, pointing at where it does not', async () => {
		const { posted, receive } = await createSession('ex:A a ex:Class\n');

		await receive({ id: 'Ready' });

		const { snapshot } = postedOf(posted, 'DocumentSnapshot')[0];

		expect(snapshot.readOnly).toBe('syntaxErrors');
		expect(snapshot.problems.length).toBeGreaterThan(0);
		expect(snapshot.problems[0].line).toBeGreaterThanOrEqual(2);
	});

	it('lets a document that states nothing but prefixes be edited', async () => {
		const { posted, receive } = await createSession('');

		await receive({ id: 'Ready' });

		expect(postedOf(posted, 'DocumentSnapshot')[0].snapshot.readOnly).toBeUndefined();
	});

	it('rejects an edit against a stale version and sends the current snapshot along', async () => {
		const { posted, receive } = await createSession('ex:s ex:p "old" .\n');

		await receive({ id: 'Ready' });
		await receive({ id: 'ApplyEdit', editId: 'e1', baseVersion: 7, operations: [] });

		const [rejected] = postedOf(posted, 'EditRejected');

		expect(rejected).toMatchObject({ editId: 'e1', problem: { kind: 'staleVersion' }, version: 1 });
	});

	it('revives the terms of an edit it receives, which arrive as plain data', async () => {
		const { session, receive } = await createSession('ex:s ex:p "old" .\n');
		const applyEdit = vi.spyOn(session, 'applyEdit');
		const subject = RdfDataFactory.namedNode(`${EX}s`);
		const operations = JSON.parse(JSON.stringify([{ op: 'setValues', subject, predicate: `${EX}p`, values: [{ kind: 'term', term: RdfDataFactory.literal('new') }] }]));

		await receive({ id: 'Ready' });
		await receive({ id: 'ApplyEdit', editId: 'e1', baseVersion: 1, operations });

		const [operation] = applyEdit.mock.calls[0][2] as { subject: typeof subject }[];

		expect(operation.subject.equals(subject)).toBe(true);
	});

	it('forwards reveal and filter requests to the webview', async () => {
		const { session, posted } = await createSession('ex:A a ex:Class .\n');
		const resource = RdfDataFactory.namedNode(`${EX}A`);

		session.revealResource(resource);
		session.filterResources('Classes', [resource]);

		expect(postedOf(posted, 'ScrollToResource')).toEqual([{ id: 'ScrollToResource', resource }]);
		expect(postedOf(posted, 'FilterResources')).toEqual([{ id: 'FilterResources', label: 'Classes', resources: [resource] }]);
	});

	it('names a resource of the document by its IRI or by the identifier of its blank node, and nothing it does not describe', async () => {
		const testSession = await createSession('ex:A ex:p [ ex:q "x" ] .\n_:b ex:p ex:B .\n');
		const { session, posted } = testSession;

		await testSession.receive({ id: 'Ready' });

		const [snapshot] = postedOf(posted, 'DocumentSnapshot');
		const labelled = snapshot.snapshot.resources.find(resource => resource.term.termType === 'BlankNode')!.term;

		expect(session.resourceNamed(`${EX}A`)).toEqual(RdfDataFactory.namedNode(`${EX}A`));
		expect(session.resourceNamed(labelled.value)).toEqual(labelled);
		expect(session.resourceNamed(`${EX}Unknown`)).toBeUndefined();
		expect(session.resourceNamed('nowhere')).toBeUndefined();
	});

	it('reveals a blank node written inside another resource by the card it is written in', async () => {
		const testSession = await createSession('ex:A ex:p [ ex:q [ ex:r "x" ] ] .\n_:b ex:p ex:B .\n');
		const { session, posted } = testSession;

		await testSession.receive({ id: 'Ready' });

		const [snapshot] = postedOf(posted, 'DocumentSnapshot');
		const owner = RdfDataFactory.namedNode(`${EX}A`);
		const labelled = snapshot.snapshot.resources.find(resource => resource.term.termType === 'BlankNode')!.term;
		const [detail] = await requestDetails(testSession, [owner]);
		const outer = detail.properties[0].values[0].term as BlankNode;
		const [outerDetail] = await requestDetails(testSession, [outer]);
		const inner = outerDetail.properties[0].values[0].term as BlankNode;

		session.revealResource(inner);
		session.revealResource(labelled);
		session.filterResources('Nodes', [outer, inner, labelled]);

		expect(postedOf(posted, 'ScrollToResource').map(message => message.resource)).toEqual([owner, labelled]);
		expect(postedOf(posted, 'FilterResources')[0].resources).toEqual([owner, labelled]);
	});

	it('rebuilds the snapshot of a delivered parse once the triples of the document are loaded', async () => {
		const loading = registerLoadingServices();
		const { posted, receive } = await createSession('ex:A ex:p "x" .\n', undefined, loading.services);

		await receive({ id: 'Ready' });

		loading.startLoad();
		loading.deliver();
		await settle();

		expect(postedOf(posted, 'DocumentSnapshot')).toHaveLength(1);

		loading.store.version = 2;
		loading.finishLoad();
		await settle();

		expect(postedOf(posted, 'DocumentSnapshot')).toHaveLength(2);
	});

	it('answers the deliveries made while it waits for the load with one snapshot', async () => {
		const loading = registerLoadingServices();
		const { posted, receive } = await createSession('ex:A ex:p "x" .\n', undefined, loading.services);

		await receive({ id: 'Ready' });

		loading.startLoad();
		loading.deliver();
		loading.deliver();
		loading.store.version = 2;
		loading.finishLoad();
		await settle();

		expect(postedOf(posted, 'DocumentSnapshot')).toHaveLength(2);
	});

	it('keeps the snapshot when neither the document nor the store changed', async () => {
		const loading = registerLoadingServices();
		const { posted, receive } = await createSession('ex:A ex:p "x" .\n', undefined, loading.services);

		await receive({ id: 'Ready' });

		loading.deliver();
		await settle();

		expect(postedOf(posted, 'DocumentSnapshot')).toHaveLength(1);
	});

	it('rebuilds the snapshot of the same document when its language changes, and only then', async () => {
		const loading = registerLoadingServices();
		const { posted, receive, context } = await createSession('ex:A ex:p "x" .\n', undefined, loading.services);

		await receive({ id: 'Ready' });

		loading.changeLanguage();
		await settle();

		expect(postedOf(posted, 'DocumentSnapshot')).toHaveLength(1);

		context.activeLanguageTag = 'de';
		loading.changeLanguage();
		await settle();

		const snapshots = postedOf(posted, 'DocumentSnapshot');

		expect(snapshots).toHaveLength(2);
		expect(snapshots[1].snapshot.activeLanguage).toBe('de');
	});

	it('numbers every snapshot it builds and delivers the details for the current one', async () => {
		const loading = registerLoadingServices();
		const { posted, receive, context } = await createSession('ex:A ex:p "x" .\n', undefined, loading.services);

		await receive({ id: 'Ready' });

		context.activeLanguageTag = 'de';
		loading.changeLanguage();
		await settle();
		await receive({ id: 'RequestResources', resources: [RdfDataFactory.namedNode(`${EX}A`)] });

		const [first, second] = postedOf(posted, 'DocumentSnapshot').map(message => message.snapshot);

		expect(second.version).toBe(first.version);
		expect(second.revision).toBeGreaterThan(first.revision);
		expect(postedOf(posted, 'ResourcesLoaded')[0].revision).toBe(second.revision);
	});

	it('reads the document in the language picked, built once', async () => {
		const loading = registerLoadingServices();
		const { posted, receive, context } = await createSession('ex:A ex:p "x"@en, "y"@de .\n', undefined, loading.services);

		const executeCommand = vi.spyOn(vscode.commands, 'executeCommand').mockImplementationOnce(async () => {
			context.activeLanguageTag = 'de';

			return { kind: 'language', language: 'de' };
		});

		await receive({ id: 'Ready' });
		await receive({ id: 'PickLanguage', allLanguages: true });

		const snapshots = postedOf(posted, 'DocumentSnapshot').map(message => message.snapshot);

		expect(executeCommand).toHaveBeenCalledWith('mentor.command.selectActiveLanguage', { offerAllLanguages: true, allLanguagesShown: true });
		expect(postedOf(posted, 'LanguagePicked')).toEqual([{ id: 'LanguagePicked', allLanguages: false }]);
		expect(snapshots.map(snapshot => snapshot.activeLanguage)).toEqual([undefined, 'de']);
	});

	it('tells the webview to show every language when that is picked', async () => {
		const loading = registerLoadingServices();
		const { posted, receive } = await createSession('ex:A ex:p "x"@en, "y"@de .\n', undefined, loading.services);

		vi.spyOn(vscode.commands, 'executeCommand').mockResolvedValueOnce({ kind: 'allLanguages' });

		await receive({ id: 'Ready' });
		await receive({ id: 'PickLanguage', allLanguages: false });

		expect(postedOf(posted, 'LanguagePicked')).toEqual([{ id: 'LanguagePicked', allLanguages: true }]);
		expect(postedOf(posted, 'DocumentSnapshot')).toHaveLength(1);
	});

	it('changes nothing when the language quick pick is dismissed', async () => {
		const { posted, receive } = await createSession('ex:A ex:p "x"@en .\n');

		vi.spyOn(vscode.commands, 'executeCommand').mockResolvedValueOnce(undefined);

		await receive({ id: 'Ready' });
		await receive({ id: 'PickLanguage', allLanguages: false });

		expect(postedOf(posted, 'LanguagePicked')).toHaveLength(0);
		expect(postedOf(posted, 'DocumentSnapshot')).toHaveLength(1);
	});

	it('puts the text of a blank node on the clipboard, for the version it was read from only', async () => {
		const { receive, document } = await createSession('ex:A ex:p [ ex:q "x" ; ex:r [ ex:s 1 ] ] .\n');
		const writeText = vi.spyOn(vscode.env.clipboard, 'writeText');
		const anchor = document.getText().indexOf('[');

		await receive({ id: 'CopyAsTurtle', anchor, version: document.version + 1 });

		expect(writeText).not.toHaveBeenCalled();

		await receive({ id: 'CopyAsTurtle', anchor, version: document.version });

		expect(writeText).toHaveBeenCalledWith('[ ex:q "x" ; ex:r [ ex:s 1 ] ]');
	});

	it('renames a resource as F2 does, at a prefixed name of it, and tells the webview and the status bar', async () => {
		const { posted, receive, document } = await createSession('ex:A a ex:Class .\nex:B ex:p ex:A .\n');
		const edit = new vscode.WorkspaceEdit();

		edit.replace(document.uri, new vscode.Range(new vscode.Position(2, 3), new vscode.Position(2, 4)), 'Oak');
		edit.replace(vscode.Uri.parse('file:///workspace/other.ttl'), new vscode.Range(new vscode.Position(0, 3), new vscode.Position(0, 4)), 'Oak');

		const executeCommand = vi.spyOn(vscode.commands, 'executeCommand').mockResolvedValueOnce(edit);
		const applyEdit = vi.spyOn(vscode.workspace, 'applyEdit').mockResolvedValueOnce(true);
		const setStatusBarMessage = vi.spyOn(vscode.window, 'setStatusBarMessage');

		await receive({ id: 'Ready' });
		await receive({ id: 'RenameResource', resource: RdfDataFactory.namedNode(`${EX}A`), iri: `${EX}Oak` });

		expect(executeCommand).toHaveBeenCalledWith('vscode.executeDocumentRenameProvider', document.uri, new vscode.Position(2, 3), 'Oak');
		expect(applyEdit).toHaveBeenCalledWith(edit);
		expect(setStatusBarMessage).toHaveBeenCalledWith('Renamed: 2 references updated in 2 files.', expect.any(Number));
		expect(postedOf(posted, 'ResourceRenamed')).toEqual([{ id: 'ResourceRenamed', resource: RdfDataFactory.namedNode(`${EX}A`), renamed: RdfDataFactory.namedNode(`${EX}Oak`) }]);
	});

	it('renames a resource written as an IRI reference in its local part, before the closing bracket', async () => {
		const { receive, document } = await createSession('<http://other.org/ns#Thing> a ex:Class .\n');
		const edit = new vscode.WorkspaceEdit();

		edit.replace(document.uri, new vscode.Range(new vscode.Position(2, 21), new vscode.Position(2, 26)), 'Oak');

		const executeCommand = vi.spyOn(vscode.commands, 'executeCommand').mockResolvedValueOnce(edit);

		vi.spyOn(vscode.workspace, 'applyEdit').mockResolvedValueOnce(true);

		await receive({ id: 'Ready' });
		await receive({ id: 'RenameResource', resource: RdfDataFactory.namedNode('http://other.org/ns#Thing'), iri: 'http://other.org/ns#Oak' });

		expect(executeCommand).toHaveBeenCalledWith('vscode.executeDocumentRenameProvider', document.uri, new vscode.Position(2, '<http://other.org/ns#Thing>'.length - 2), 'Oak');
	});

	it('renames nothing to an IRI of another namespace, to a local part that cannot be written as it is, or to the same IRI', async () => {
		const { posted, receive } = await createSession('ex:A a ex:Class .\n');
		const executeCommand = vi.spyOn(vscode.commands, 'executeCommand');
		const showErrorMessage = vi.spyOn(vscode.window, 'showErrorMessage');

		await receive({ id: 'Ready' });
		await receive({ id: 'RenameResource', resource: RdfDataFactory.namedNode(`${EX}A`), iri: 'http://other.org/ns#A' });
		await receive({ id: 'RenameResource', resource: RdfDataFactory.namedNode(`${EX}A`), iri: `${EX}an oak` });
		await receive({ id: 'RenameResource', resource: RdfDataFactory.namedNode(`${EX}A`), iri: `${EX}A` });

		expect(showErrorMessage).toHaveBeenCalledTimes(2);
		expect(executeCommand).not.toHaveBeenCalledWith('vscode.executeDocumentRenameProvider', expect.anything(), expect.anything(), expect.anything());
		expect(postedOf(posted, 'ResourceRenamed')).toEqual([]);
	});

	it('renames a class whose IRI was made from its label when the label changes, as the label rule does', async () => {
		expect(await relabel('ex:AppleTree a owl:Class ; rdfs:label "Apple tree"@en .\n', 'AppleTree', RdfDataFactory.literal('Oak tree', 'en'))).toEqual(['OakTree']);
	});

	it('renames a property in camelCase', async () => {
		expect(await relabel('ex:hasPart a owl:ObjectProperty ; rdfs:label "has part"@en .\n', 'hasPart', RdfDataFactory.literal('has piece', 'en'))).toEqual(['hasPiece']);
	});

	it('leaves an IRI that was not made from the label, and a resource that is neither a class nor a property', async () => {
		expect(await relabel('ex:A-HR a owl:Class ; rdfs:label "Ampere hour"@en .\n', 'A-HR', RdfDataFactory.literal('Ampere second', 'en'))).toEqual([]);
		expect(await relabel('ex:Oak a ex:Tree ; rdfs:label "Oak"@en .\n', 'Oak', RdfDataFactory.literal('Birch', 'en'))).toEqual([]);
	});

	it('leaves the IRI when a label of another language than the one shown changes', async () => {
		expect(await relabel('ex:AppleTree a owl:Class ; rdfs:label "Apple tree"@en .\n', 'AppleTree', RdfDataFactory.literal('Apfelbaum', 'de'))).toEqual([]);
	});

	it('posts nothing once disposed', async () => {
		const { session, posted } = await createSession('ex:A a ex:Class .\n');

		session.dispose();
		session.revealResource(RdfDataFactory.namedNode(`${EX}A`));

		expect(postedOf(posted, 'ScrollToResource')).toHaveLength(0);
	});
});
