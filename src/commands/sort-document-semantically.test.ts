import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));

const { mockSortDocument } = vi.hoisted(() => ({ mockSortDocument: vi.fn() }));
vi.mock('./sort-document', () => ({ sortDocument: mockSortDocument }));

vi.mock('tsyringe', () => ({
	container: { resolve: vi.fn(() => ({})) },
	injectable: () => (t: any) => t,
	inject: () => () => {},
	singleton: () => (t: any) => t,
}));

vi.mock('@faubulous/mentor-rdf-serializers', () => ({
	SemanticSortingStrategy: class SemanticSortingStrategy {},
}));

beforeEach(() => { mockSortDocument.mockReset(); });

import { sortDocumentSemantically, sortDocumentSemanticallySubmenu } from '@src/commands/sort-document-semantically';
import { SemanticSortingStrategy } from '@faubulous/mentor-rdf-serializers';

describe('sortDocumentSemantically command', () => {
	it('should have the correct id', () => {
		expect(sortDocumentSemantically.id).toBe('mentor.command.sortDocumentSemantically');
	});

	it('should call sortDocument with a SemanticSortingStrategy', async () => {
		await sortDocumentSemantically.handler(undefined);
		expect(mockSortDocument).toHaveBeenCalledOnce();
		expect(mockSortDocument.mock.calls[0][1]).toBeInstanceOf(SemanticSortingStrategy);
	});
});

describe('sortDocumentSemanticallySubmenu command', () => {
	it('should have the correct id', () => {
		expect(sortDocumentSemanticallySubmenu.id).toBe('mentor.command.sortDocumentSemanticallySubmenu');
	});

	it('should delegate to sortDocumentSemantically handler', async () => {
		await sortDocumentSemanticallySubmenu.handler(undefined);
		expect(mockSortDocument).toHaveBeenCalledOnce();
	});
});
