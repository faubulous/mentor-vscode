import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));

import 'reflect-metadata';

import * as vscode from 'vscode';
import { container } from 'tsyringe';
import { RDF } from '@faubulous/mentor-rdf';
import { RdfSyntax } from '@faubulous/mentor-rdf-parsers';
import { ServiceToken } from '@src/services/tokens';
import { IDocumentContext } from '@src/services/document/document-context.interface';
import { createMockWebviewPanel } from '@src/utilities/mocks/vscode';
import { EditableTextDocument, applyWorkspaceEditTo, createEditableTextDocument, createMockDocumentContext, createMockDocumentContextService, createTurtleDocument } from '@src/utilities/mocks/factories';
import { FormEditorHostMessage, FormEditorWebviewMessage } from './form-editor-messages';
import { FormEditorSession } from './form-editor-session';

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
 */
async function createSession(body: string, context?: IDocumentContext): Promise<{ session: FormEditorSession; document: EditableTextDocument } & TestPanel> {
	const document = createEditableTextDocument(PREAMBLE + body, { uri: URI });
	const turtle = createTurtleDocument(URI, RdfSyntax.Turtle);

	turtle.parse(document.getText());
	container.registerInstance(ServiceToken.DocumentContextService, createMockDocumentContextService({ contexts: { [URI]: context ?? turtle } }));

	const testPanel = createPanel();
	const extensionContext = { subscriptions: [], extensionUri: vscode.Uri.parse('file:///extension') } as unknown as vscode.ExtensionContext;
	const session = new FormEditorSession(extensionContext, document, testPanel.panel);

	await session.initialize();

	return { session, document, ...testPanel };
}

/**
 * The messages of one kind the session posted.
 */
function postedOf<K extends FormEditorHostMessage['id']>(posted: FormEditorHostMessage[], id: K): Extract<FormEditorHostMessage, { id: K }>[] {
	return posted.filter((message): message is Extract<FormEditorHostMessage, { id: K }> => message.id === id);
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
		await receive({ id: 'RequestResources', ids: [`i:${EX}A`, `i:${EX}missing`] });

		const [message] = postedOf(posted, 'ResourcesLoaded');

		expect(message.resources).toHaveLength(1);
		expect(message.resources[0].properties.map(property => property.predicate.term)).toEqual([{ kind: 'iri', iri: RDF.type }, { kind: 'iri', iri: `${EX}p` }]);
		expect(message.missing).toEqual([`i:${EX}missing`]);
	});

	it('tells the webview when the document cannot be shown', async () => {
		const { posted } = await createSession('ex:A a ex:Class .\n', createMockDocumentContext());

		const [message] = postedOf(posted, 'DocumentSnapshot');

		expect(message.snapshot.readOnly?.reason).toBe('unsupportedSyntax');
		expect(message.snapshot.resources).toEqual([]);
	});

	it('applies an edit and publishes the new snapshot before the confirmation', async () => {
		const { session, document, posted, receive } = await createSession('ex:s ex:p "old" .\n');

		vi.spyOn(vscode.workspace, 'applyEdit').mockImplementation(async edit => applyWorkspaceEditTo(edit, document));

		await receive({ id: 'Ready' });

		const outcome = await session.applyEdit('e1', 1, [{ op: 'setValues', subject: { kind: 'iri', iri: `${EX}s` }, predicate: `${EX}p`, values: [{ kind: 'term', term: { kind: 'literal', value: 'new' } }] }]);

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

	it('rejects an edit against a stale version and sends the current snapshot along', async () => {
		const { posted, receive } = await createSession('ex:s ex:p "old" .\n');

		await receive({ id: 'Ready' });
		await receive({ id: 'ApplyEdit', editId: 'e1', baseVersion: 7, operations: [] });

		const [rejected] = postedOf(posted, 'EditRejected');

		expect(rejected).toMatchObject({ editId: 'e1', reason: 'staleVersion', version: 1 });
	});

	it('forwards reveal and filter requests to the webview', async () => {
		const { session, posted } = await createSession('ex:A a ex:Class .\n');

		session.revealResource(`i:${EX}A`);
		session.filterResources('Classes', [`i:${EX}A`]);

		expect(postedOf(posted, 'ScrollToResource')).toEqual([{ id: 'ScrollToResource', resourceId: `i:${EX}A` }]);
		expect(postedOf(posted, 'FilterResources')).toEqual([{ id: 'FilterResources', label: 'Classes', resourceIds: [`i:${EX}A`] }]);
	});

	it('posts nothing once disposed', async () => {
		const { session, posted } = await createSession('ex:A a ex:Class .\n');

		session.dispose();
		session.revealResource(`i:${EX}A`);

		expect(postedOf(posted, 'ScrollToResource')).toHaveLength(0);
	});
});
