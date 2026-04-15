import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as vscode from 'vscode';

vi.mock('vscode', async () => await import('@src/utilities/mocks/vscode'));
vi.mock('@src/utilities/vscode/config', () => ({
    getConfig: () => ({ get: vi.fn(), update: vi.fn() }),
}));

vi.mock('tsyringe', () => ({
    container: { resolve: vi.fn() },
}));

import { WebviewController } from './webview-controller';
import { container } from 'tsyringe';

// Create a concrete implementation to test the abstract controller
class TestWebviewController extends WebviewController {
    constructor(init: any) {
        super(init);
    }
    
    // Expose protected methods for testing
    public async testOnDidReceiveMessage(message: any) {
        return this.onDidReceiveMessage(message);
    }
}

describe('WebviewController', () => {
    let mockContext: any;

    beforeEach(() => {
        vi.clearAllMocks();
        mockContext = { subscriptions: [] };
        (container.resolve as any).mockReturnValue(mockContext);
    });

    it('initializes properties correctly without a panel or view', () => {
        const ctrl = new TestWebviewController({ componentPath: 'test.js' });
        expect(ctrl['componentPath']).toBe('test.js');
        expect(ctrl.viewType).toBeUndefined();
        expect(ctrl.panelId).toBeUndefined();
    });

    it('registers a webview view provider when viewType is supplied logs subscription', () => {
        (vscode.window as any).registerWebviewViewProvider = vi.fn().mockReturnValue({ dispose: vi.fn() });
        const registerSpy = vi.spyOn(vscode.window, 'registerWebviewViewProvider');
        
        const ctrl = new TestWebviewController({ 
            componentPath: 'test.js', 
            viewType: 'test.view' 
        });

        expect(registerSpy).toHaveBeenCalledWith('test.view', ctrl);
        expect(mockContext.subscriptions.length).toBe(1);
    });

    it('throws an error when calling show() if no panel criteria is provided', async () => {
        const ctrl = new TestWebviewController({ componentPath: 'test.js' });
        await expect(ctrl.show()).rejects.toThrowError(/does not support panels/);
    });

    it('executes a VS Code command when receiving ExecuteCommand messages safely', async () => {
        const executeSpy = vi.spyOn(vscode.commands, 'executeCommand').mockResolvedValue(undefined);
        const ctrl = new TestWebviewController({ componentPath: 'test.js' });
        
        const handled = await ctrl.testOnDidReceiveMessage({
            id: 'ExecuteCommand',
            command: 'test.foo',
            args: ['arg1']
        });

        expect(executeSpy).toHaveBeenCalledWith('test.foo', 'arg1');
        expect(handled).toBe(true);
    });
});
