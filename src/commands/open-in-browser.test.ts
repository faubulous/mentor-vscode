import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));
vi.mock('@faubulous/mentor-rdf-serializers', () => ({}));

vi.mock('tsyringe', () => ({
	container: { resolve: vi.fn(() => ({})) },
	injectable: () => (t: any) => t,
	inject: () => () => {},
	singleton: () => (t: any) => t,
}));

import * as vscode from 'vscode';
import { openInBrowser } from './open-in-browser';

beforeEach(() => {
	(vscode.commands as any).executeCommand = vi.fn(async () => undefined);
});

describe('openInBrowser command', () => {
	it('should have correct id', () => {
		expect(openInBrowser.id).toBe('mentor.command.openInBrowser');
	});

	it('should execute vscode.open for regular URIs', async () => {
		const executeSpy = vi.spyOn(vscode.commands, 'executeCommand');
		await openInBrowser.handler('http://example.org/Term');
		expect(executeSpy).toHaveBeenCalledWith('vscode.open', expect.anything());
	});

	it('should open graph for inference URIs', async () => {
		const executeSpy = vi.spyOn(vscode.commands, 'executeCommand');
		await openInBrowser.handler('mentor:inference:http://example.org/graph');
		expect(executeSpy).toHaveBeenCalled();
	});
});
