import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));

const { mockActivateDocument } = vi.hoisted(() => ({
	mockActivateDocument: vi.fn(),
}));

vi.mock('tsyringe', () => ({
	container: {
		resolve: vi.fn((token: string) => {
			if (token === 'DocumentContextService') return {
				activateDocument: mockActivateDocument,
				activeContext: { graphs: ['urn:g1'] },
			};
			return {};
		}),
	},
	injectable: () => (t: any) => t,
	inject: () => () => {},
	singleton: () => (t: any) => t,
}));

vi.mock('@faubulous/mentor-rdf', () => ({
	VocabularyRepository: class {},
}));

import * as vscode from 'vscode';
import { openMentorHomepage } from '@src/commands/open-mentor-homepage';

beforeEach(() => {
	vi.clearAllMocks();
	(vscode.window as any).activeTextEditor = undefined;
	mockActivateDocument.mockResolvedValue(undefined);
});

afterEach(() => {
	(vscode.window as any).activeTextEditor = undefined;
});

describe('openMentorHomepage', () => {
	it('should have the correct command id', () => {
		expect(openMentorHomepage.id).toBe('mentor.command.openMentorHomepage');
	});

	it('should not execute any commands when extension is not found', async () => {
		(vscode.extensions as any).getExtension = vi.fn(() => undefined);
		const execSpy = vi.spyOn(vscode.commands, 'executeCommand');

		await openMentorHomepage.handler();

		expect(execSpy).not.toHaveBeenCalled();
	});

	it('should open the homepage URL when extension is found', async () => {
		const homepageUrl = 'https://faubulous.github.io/mentor';
		(vscode.extensions as any).getExtension = vi.fn(() => ({
			packageJSON: { homepage: homepageUrl }
		}));
		const execSpy = vi.spyOn(vscode.commands, 'executeCommand').mockResolvedValue(undefined as any);

		await openMentorHomepage.handler();

		expect(execSpy).toHaveBeenCalledWith('vscode.open', expect.anything());
	});
});
