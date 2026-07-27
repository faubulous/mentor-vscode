import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));

/**
 * Services the controller resolves through tsyringe, replaced per test.
 */
const services: Record<string, any> = {};

vi.mock('tsyringe', () => ({
	container: {
		resolve: vi.fn((token: string) => services[token] ?? {}),
	},
	injectable: () => (t: any) => t,
	inject: () => () => { },
	singleton: () => (t: any) => t,
}));

import * as vscode from 'vscode';
import { WorkspaceUri } from '@src/providers/workspace-uri';
import { IndexingSectionController } from './indexing-controller';

const SUPPORTED_EXTENSIONS = {
	'.ttl': { language: 'turtle', isTripleSource: true },
	'.trig': { language: 'trig', isTripleSource: true },
};

/**
 * Files the fake `findFiles` reports, spanning two subprojects plus a path that
 * the index exclusions would normally remove.
 */
const WORKSPACE_FILES = [
	'file:///w/data/a.ttl',
	'file:///w/data/b.ttl',
	'file:///w/data/nested/c.trig',
	'file:///w/drafts/d.ttl',
	'file:///w/node_modules/pkg/e.ttl',
];

function setup(files: string[] = WORKSPACE_FILES) {
	const posted: any[] = [];

	services['WorkspaceIndexerService'] = {
		onDidFinishIndexing: () => ({ dispose: () => { } }),
		statistics: { indexedFiles: 0, errorCount: 0, skippedFiles: 0, durationMs: 0 },
		indexingFinished: true,
	};

	const fileChangeListeners: Array<() => void> = [];

	services['WorkspaceFileService'] = {
		onDidChangeFiles: (listener: () => void) => {
			fileChangeListeners.push(listener);
			return { dispose: () => { } };
		},
	};

	services['DocumentFactory'] = {
		supportedExtensions: SUPPORTED_EXTENSIONS,
		isSupportedFile: (uri: vscode.Uri) => Object.keys(SUPPORTED_EXTENSIONS).some(ext => uri.path.endsWith(ext)),
	};

	services['Store'] = { size: 0 };

	const findFiles = vi.fn(async () => files.map(f => vscode.Uri.parse(f)));
	(vscode.workspace as any).findFiles = findFiles;

	const controller = new IndexingSectionController();
	controller.initialize(message => posted.push(message));

	const countFor = async (pattern: string) => {
		posted.length = 0;

		await controller.handleMessage({ id: 'GetIndexMatchPreview', pattern } as any);

		return posted[posted.length - 1]?.count as number | undefined;
	};

	return { controller, posted, findFiles, countFor, fireFileChange: () => fileChangeListeners.forEach(l => l()) };
}

describe('IndexingSectionController match previews', () => {
	beforeEach(() => {
		// The controller maps files into the workspace-relative path space the
		// indexer matches against.
		WorkspaceUri.rootUri = vscode.Uri.parse('file:///w');
	});

	afterEach(() => {
		for (const key of Object.keys(services)) {
			delete services[key];
		}

		vi.restoreAllMocks();
	});

	it('counts the files a glob pattern matches', async () => {
		const { countFor } = setup();

		expect(await countFor('data/**')).toBe(3);
		expect(await countFor('data/*.ttl')).toBe(2);
		expect(await countFor('**/*.trig')).toBe(1);
	});

	it('counts files an exclusion pattern would remove, including already-excluded paths', async () => {
		const { countFor } = setup();

		// The candidate set deliberately ignores the configured exclusions, so a
		// pattern the user already excludes still reports what it covers instead
		// of a misleading zero.
		expect(await countFor('**/node_modules/**')).toBe(1);
		expect(await countFor('drafts/**')).toBe(1);
	});

	it('normalizes patterns the way the indexer does', async () => {
		const { countFor } = setup();

		expect(await countFor('  ./data/**  ')).toBe(3);
		expect(await countFor('/data/**')).toBe(3);
		expect(await countFor('data\\**')).toBe(3);
	});

	it('reports no matches for an empty or non-matching pattern', async () => {
		const { countFor } = setup();

		expect(await countFor('   ')).toBe(0);
		expect(await countFor('missing/**')).toBe(0);
	});

	it('ignores files whose extension is not supported', async () => {
		const { countFor } = setup([
			'file:///w/data/a.ttl',
			'file:///w/data/notes.md',
			'file:///w/data/ttl-in-name/readme.txt',
		]);

		expect(await countFor('data/**')).toBe(1);
	});

	it('enumerates the workspace once and serves later previews from the cache', async () => {
		const { countFor, findFiles } = setup();

		await countFor('data/**');
		await countFor('drafts/**');
		await countFor('**/*.ttl');

		expect(findFiles).toHaveBeenCalledTimes(1);
	});

	it('re-enumerates and notifies the webview after the file set changed', async () => {
		const { countFor, findFiles, posted, fireFileChange } = setup();

		await countFor('data/**');

		posted.length = 0;
		fireFileChange();

		expect(posted.some(m => m.id === 'IndexMatchPreviewsInvalidated')).toBe(true);

		await countFor('data/**');

		expect(findFiles).toHaveBeenCalledTimes(2);
	});
});

/**
 * Builds a quick pick stub whose `show()` runs the given scenario against the
 * captured event handlers, mirroring the validation section's pattern-editor tests.
 */
function createQuickPickMock(scenario: (quickPick: any, handlers: {
	changeValue?: (value: string) => void;
	accept?: () => void;
	hide?: () => void;
}) => void) {
	const handlers: any = {};

	const quickPick = {
		title: '',
		placeholder: '',
		value: '',
		items: [] as any[],
		activeItems: [] as any[],
		selectedItems: [] as any[],
		onDidChangeValue: vi.fn((handler: any) => { handlers.changeValue = handler; return { dispose: () => { } }; }),
		onDidAccept: vi.fn((handler: any) => { handlers.accept = handler; return { dispose: () => { } }; }),
		onDidHide: vi.fn((handler: any) => { handlers.hide = handler; return { dispose: () => { } }; }),
		hide: vi.fn(() => handlers.hide?.()),
		dispose: vi.fn(),
		show: vi.fn(() => scenario(quickPick, handlers)),
	};

	return quickPick;
}

describe('IndexingSectionController pattern editor', () => {
	beforeEach(() => {
		WorkspaceUri.rootUri = vscode.Uri.parse('file:///w');
	});

	afterEach(() => {
		for (const key of Object.keys(services)) {
			delete services[key];
		}

		vi.restoreAllMocks();
	});

	async function editPattern(pattern: string, scenario: Parameters<typeof createQuickPickMock>[0]) {
		const { controller, posted } = setup();
		const quickPick = createQuickPickMock(scenario);

		(vscode.window as any).createQuickPick = vi.fn(() => quickPick);

		posted.length = 0;

		await controller.handleMessage({ id: 'EditIndexPattern', pattern } as any);

		return { quickPick, posted };
	}

	it('previews the matched files and reports the confirmed pattern', async () => {
		const { quickPick, posted } = await editPattern('data/**', (qp, handlers) => {
			handlers.accept?.();
		});

		// The editor opens on the current pattern with its matches listed.
		expect(quickPick.title).toContain('3 files match');
		expect(quickPick.items.map((item: any) => item.description)).toEqual([
			'data/a.ttl',
			'data/b.ttl',
			'data/nested/c.trig',
		]);

		expect(posted[posted.length - 1]).toMatchObject({ id: 'EditIndexPatternResult', pattern: 'data/**' });
	});

	it('updates the preview live while the pattern is edited', async () => {
		const { quickPick } = await editPattern('data/**', (qp, handlers) => {
			handlers.changeValue?.('**/*.trig');
			qp.value = '**/*.trig';
			handlers.accept?.();
		});

		expect(quickPick.title).toContain('1 file match');
		expect(quickPick.items.map((item: any) => item.description)).toEqual(['data/nested/c.trig']);
	});

	it('reports no pattern when the editor is dismissed', async () => {
		const { posted } = await editPattern('data/**', (qp, handlers) => {
			handlers.hide?.();
		});

		expect(posted[posted.length - 1]).toMatchObject({ id: 'EditIndexPatternResult' });
		expect(posted[posted.length - 1].pattern).toBeUndefined();
	});

	it('opens a picked file instead of changing the pattern', async () => {
		const showTextDocument = vi.fn(async () => undefined);
		(vscode.window as any).showTextDocument = showTextDocument;

		const { posted } = await editPattern('data/**', (qp, handlers) => {
			qp.selectedItems = [qp.items[0]];
			handlers.accept?.();
		});

		expect(showTextDocument).toHaveBeenCalledWith(vscode.Uri.parse('file:///w/data/a.ttl'));
		expect(posted[posted.length - 1].pattern).toBeUndefined();
	});

	it('tells the user when nothing matches', async () => {
		const { quickPick } = await editPattern('missing/**', (qp, handlers) => {
			handlers.hide?.();
		});

		expect(quickPick.title).toContain('0 files match');
		expect(quickPick.items[0].description).toBe('No files match this pattern.');
	});
});
