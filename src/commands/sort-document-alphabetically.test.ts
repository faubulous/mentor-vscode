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
	AlphabeticalSortingStrategy: class AlphabeticalSortingStrategy {},
}));

beforeEach(() => { mockSortDocument.mockReset(); });

import { sortDocumentAlphabetically, sortDocumentAlphabeticallySubmenu } from './sort-document-alphabetically';
import { AlphabeticalSortingStrategy } from '@faubulous/mentor-rdf-serializers';

describe('sortDocumentAlphabetically command', () => {
	it('should have the correct id', () => {
		expect(sortDocumentAlphabetically.id).toBe('mentor.command.sortDocumentAlphabetically');
	});

	it('should call sortDocument with an AlphabeticalSortingStrategy', async () => {
		await sortDocumentAlphabetically.handler(undefined);
		expect(mockSortDocument).toHaveBeenCalledOnce();
		expect(mockSortDocument.mock.calls[0][1]).toBeInstanceOf(AlphabeticalSortingStrategy);
	});
});

describe('sortDocumentAlphabeticallySubmenu command', () => {
	it('should have the correct id', () => {
		expect(sortDocumentAlphabeticallySubmenu.id).toBe('mentor.command.sortDocumentAlphabeticallySubmenu');
	});

	it('should delegate to sortDocumentAlphabetically handler', async () => {
		await sortDocumentAlphabeticallySubmenu.handler(undefined);
		expect(mockSortDocument).toHaveBeenCalledOnce();
	});
});
