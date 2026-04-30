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
	PrioritySortingStrategy: class PrioritySortingStrategy { constructor(public options: any) {} },
}));

beforeEach(() => { mockSortDocument.mockReset(); });

import { sortDocumentByType, sortDocumentByTypeSubmenu } from '@src/commands/sort-document-by-type';
import { PrioritySortingStrategy } from '@faubulous/mentor-rdf-serializers';

describe('sortDocumentByType command', () => {
	it('should have the correct id', () => {
		expect(sortDocumentByType.id).toBe('mentor.command.sortDocumentByType');
	});

	it('should call sortDocument with a PrioritySortingStrategy', async () => {
		await sortDocumentByType.handler(undefined);
		expect(mockSortDocument).toHaveBeenCalledOnce();
		expect(mockSortDocument.mock.calls[0][1]).toBeInstanceOf(PrioritySortingStrategy);
	});
});

describe('sortDocumentByTypeSubmenu command', () => {
	it('should have the correct id', () => {
		expect(sortDocumentByTypeSubmenu.id).toBe('mentor.command.sortDocumentByTypeSubmenu');
	});

	it('should delegate to sortDocumentByType handler', async () => {
		await sortDocumentByTypeSubmenu.handler(undefined);
		expect(mockSortDocument).toHaveBeenCalledOnce();
	});
});
