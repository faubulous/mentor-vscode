import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as vscode from 'vscode';

vi.mock('vscode', async () => await import('@src/utilities/mocks/vscode'));

vi.mock('@faubulous/mentor-rdf-serializers', () => ({ serialize: vi.fn() }));

vi.mock('@faubulous/mentor-rdf', () => ({
	VocabularyRepository: vi.fn(),
}));

vi.mock('@src/utilities/vscode/config', () => ({
	getConfig: () => ({ get: (_k: string, d?: any) => d }),
}));

const mockGetDiagnostics = vi.fn(() => [] as any[]);
const mockShowErrorMessage = vi.fn(async () => undefined as any);
const mockShowWarningMessage = vi.fn(async () => undefined as any);
const mockShowQuickPick = vi.fn(async () => undefined as any);
const mockShowTextDocument = vi.fn(async () => undefined as any);
const mockOpenTextDocument = vi.fn(async () => ({ uri: vscode.Uri.parse('file:///result.ttl') } as any));
const mockShowInputBox = vi.fn(async () => undefined as any);

const mockDocumentFactory = {
	getSupportedLanguagesInfo: vi.fn(async () => [
		{ id: 'turtle', name: 'Turtle', typeName: 'Turtle File', extensions: ['.ttl'], icon: 'mentor-turtle', mimetypes: ['text/turtle'] },
		{ id: 'ntriples', name: 'N-Triples', typeName: 'N-Triples File', extensions: ['.nt'], icon: 'mentor-ntriples', mimetypes: ['application/n-triples'] },
	]),
	getConvertibleTargetLanguageIds: vi.fn((_langId: string) => ['ntriples', 'nquads', 'turtle', 'xml']),
	getLanguageInfo: vi.fn(async (langId: string) => ({
		id: langId,
		name: langId,
		typeName: `${langId} File`,
		extensions: [`.${langId}`],
		icon: `mentor-${langId}`,
		mimetypes: [langId === 'ntriples' ? 'application/n-triples' : 'text/turtle'],
	})),
};

const mockContextService = {
	contexts: {} as Record<string, any>,
};

const mockVocabularyRepository = {
	store: {
		serializeGraph: vi.fn(async () => '<> <> <> .'),
	},
};

vi.mock('tsyringe', () => ({
	container: {
		resolve: vi.fn((token: string) => {
			if (token === 'DocumentFactory') return mockDocumentFactory;
			if (token === 'DocumentContextService') return mockContextService;
			if (token === 'VocabularyRepository') return mockVocabularyRepository;
			return {};
		}),
	},
	injectable: () => (t: any) => t,
	inject: () => () => {},
	singleton: () => (t: any) => t,
}));

import {
	convertFileFormat,
	convertFileFormatToNTriplesSubmenu,
	convertFileFormatToNQuadsSubmenu,
	convertFileFormatToTurtleSubmenu,
	convertFileFormatToXmlSubmenu,
} from './convert-file-format';

describe('convertFileFormat', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		(vscode.languages as any).getDiagnostics = mockGetDiagnostics;
		(vscode.window as any).showErrorMessage = mockShowErrorMessage;
		(vscode.window as any).showWarningMessage = mockShowWarningMessage;
		(vscode.window as any).showQuickPick = mockShowQuickPick;
		(vscode.window as any).showTextDocument = mockShowTextDocument;
		(vscode.window as any).showInputBox = mockShowInputBox;
		(vscode.workspace as any).openTextDocument = mockOpenTextDocument;
	});

	it('has the correct id', () => {
		expect(convertFileFormat.id).toBe('mentor.command.convertFileFormat');
	});

	it('has correct id for ntriples submenu', () => {
		expect(convertFileFormatToNTriplesSubmenu.id).toBe('mentor.command.convertFileFormatToNTriplesSubmenu');
	});

	it('has correct id for nquads submenu', () => {
		expect(convertFileFormatToNQuadsSubmenu.id).toBe('mentor.command.convertFileFormatToNQuadsSubmenu');
	});

	it('has correct id for turtle submenu', () => {
		expect(convertFileFormatToTurtleSubmenu.id).toBe('mentor.command.convertFileFormatToTurtleSubmenu');
	});

	it('has correct id for xml submenu', () => {
		expect(convertFileFormatToXmlSubmenu.id).toBe('mentor.command.convertFileFormatToXmlSubmenu');
	});

	it('shows error when no active editor', async () => {
		(vscode.window as any).activeTextEditor = undefined;
		await convertFileFormat.handler();
		expect(mockShowErrorMessage).toHaveBeenCalledWith('No document selected.');
	});

	it('shows error when document has syntax errors', async () => {
		const mockDoc = { uri: vscode.Uri.parse('file:///test.ttl'), languageId: 'turtle' };
		(vscode.window as any).activeTextEditor = { document: mockDoc };
		(vscode.languages as any).getDiagnostics = vi.fn(() => [
			{ severity: 0 } // DiagnosticSeverity.Error = 0
		]);
		await convertFileFormat.handler();
		expect(mockShowErrorMessage).toHaveBeenCalledWith('This document has syntax errors and cannot be converted.');
	});

	it('shows error when document context not found', async () => {
		const mockDoc = { uri: vscode.Uri.parse('file:///test.ttl'), languageId: 'turtle' };
		(vscode.window as any).activeTextEditor = { document: mockDoc };
		mockGetDiagnostics.mockReturnValue([]);
		mockContextService.contexts = {};
		await convertFileFormat.handler();
		expect(mockShowErrorMessage).toHaveBeenCalledWith('The document graph could not be retrieved.');
	});

	it('returns when user cancels language selection', async () => {
		const mockDoc = { uri: vscode.Uri.parse('file:///test.ttl'), languageId: 'turtle' };
		(vscode.window as any).activeTextEditor = { document: mockDoc };
		mockGetDiagnostics.mockReturnValue([]);
		mockContextService.contexts = {
			'file:///test.ttl': { graphIri: vscode.Uri.parse('file:///test.ttl'), namespaces: {} }
		};
		mockShowQuickPick.mockResolvedValue(undefined); // user cancels
		await convertFileFormat.handler();
		expect(mockOpenTextDocument).not.toHaveBeenCalled();
	});

	it('converts document when language is selected', async () => {
		const mockDoc = { uri: vscode.Uri.parse('file:///test.ttl'), languageId: 'turtle' };
		(vscode.window as any).activeTextEditor = { document: mockDoc };
		mockGetDiagnostics.mockReturnValue([]);
		mockContextService.contexts = {
			'file:///test.ttl': { graphIri: vscode.Uri.parse('file:///test.ttl'), namespaces: {}, graphUri: 'file:///test.ttl' }
		};
		const ntriples = { id: 'ntriples', name: 'N-Triples', mimetypes: ['application/n-triples'], language: { id: 'ntriples', name: 'N-Triples', mimetypes: ['application/n-triples'] } };
		mockShowQuickPick.mockResolvedValue(ntriples);
		await convertFileFormat.handler();
		expect(mockVocabularyRepository.store.serializeGraph).toHaveBeenCalled();
	});

	it('ntriples submenu invokes handler with ntriples language', async () => {
		const mockDoc = { uri: vscode.Uri.parse('file:///test.ttl'), languageId: 'turtle' };
		(vscode.window as any).activeTextEditor = { document: mockDoc };
		mockGetDiagnostics.mockReturnValue([]);
		mockContextService.contexts = {
			'file:///test.ttl': { graphIri: vscode.Uri.parse('file:///test.ttl'), namespaces: {} }
		};
		mockDocumentFactory.getConvertibleTargetLanguageIds.mockReturnValue(['ntriples', 'turtle']);
		mockDocumentFactory.getLanguageInfo.mockResolvedValue({
			id: 'ntriples',
			name: 'N-Triples',
			mimetypes: ['application/n-triples'],
		} as any);
		await convertFileFormatToNTriplesSubmenu.handler();
		expect(mockDocumentFactory.getLanguageInfo).toHaveBeenCalledWith('ntriples');
	});

	it('shows error message when conversion throws', async () => {
		const mockDoc = { uri: vscode.Uri.parse('file:///test.ttl'), languageId: 'turtle' };
		(vscode.window as any).activeTextEditor = { document: mockDoc };
		mockGetDiagnostics.mockReturnValue([]);
		mockContextService.contexts = {
			'file:///test.ttl': { graphIri: vscode.Uri.parse('file:///test.ttl'), namespaces: {} }
		};
		const ntriples = { id: 'ntriples', name: 'N-Triples', mimetypes: ['application/n-triples'], language: { id: 'ntriples', mimetypes: ['application/n-triples'] } };
		mockShowQuickPick.mockResolvedValue(ntriples);
		mockVocabularyRepository.store.serializeGraph.mockRejectedValue(new Error('serialize failed'));
		await convertFileFormat.handler();
		expect(mockShowErrorMessage).toHaveBeenCalledWith(expect.stringContaining('Error converting file format'));
	});

	it('shows error when submenu lang not convertible from source', async () => {
		const mockDoc = { uri: vscode.Uri.parse('file:///test.nt'), languageId: 'ntriples' };
		(vscode.window as any).activeTextEditor = { document: mockDoc };
		mockGetDiagnostics.mockReturnValue([]);
		mockContextService.contexts = {
			'file:///test.nt': { graphIri: vscode.Uri.parse('file:///test.nt'), namespaces: {} }
		};
		mockDocumentFactory.getConvertibleTargetLanguageIds.mockReturnValue([]); // no convertible targets
		await convertFileFormatToTurtleSubmenu.handler();
		expect(mockShowErrorMessage).toHaveBeenCalledWith('The selected target format is not supported for this document.');
	});
});
