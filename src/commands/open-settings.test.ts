import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockVscode = await import('@src/utilities/mocks/vscode');
vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));

vi.mock('tsyringe', () => ({
	container: { resolve: vi.fn(() => ({})) },
	injectable: () => (t: any) => t,
	inject: () => () => {},
	singleton: () => (t: any) => t,
}));

import { openSettings } from '@src/commands/open-settings';

describe('openSettings command', () => {
	it('should have the correct id', () => {
		expect(openSettings.id).toBe('mentor.command.openSettings');
	});

	it('should call vscode.commands.executeCommand with workbench.action.openSettings', async () => {
		const executeSpy = vi.spyOn((mockVscode as any).commands, 'executeCommand');
		await openSettings.handler();
		expect(executeSpy).toHaveBeenCalledWith('workbench.action.openSettings', '@ext:faubulous.mentor');
	});
});
