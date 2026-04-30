import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { WebviewHost } from '@src/views/webviews/webview-host';

describe('WebviewHost', () => {
    let mockVsCodeApi: any;

    beforeEach(() => {
        mockVsCodeApi = {
            postMessage: vi.fn(),
            getState: vi.fn(() => ({ test: 'state' })),
            setState: vi.fn(),
        };
        
        // Reset the singleton instance before each test
        delete (WebviewHost as any)._instance;
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('isAvailable', () => {
        it('returns true when acquireVsCodeApi is available', () => {
            (globalThis as any).window = { acquireVsCodeApi: vi.fn() };
            expect(WebviewHost.isAvailable()).toBe(true);
        });

        it('returns false when acquireVsCodeApi is not available', () => {
            (globalThis as any).window = {};
            expect(WebviewHost.isAvailable()).toBe(false);
        });
    });

    describe('getInstance', () => {
        it('returns the VS Code API instance when available', () => {
            (globalThis as any).window = { acquireVsCodeApi: vi.fn(() => mockVsCodeApi) };
            const instance = WebviewHost.getInstance();
            expect(instance).toBe(mockVsCodeApi);
        });

        it('throws an error when acquireVsCodeApi is not available', () => {
            (globalThis as any).window = {};
            expect(() => WebviewHost.getInstance()).toThrowError(/acquireVsCodeApi is not available/);
        });
    });

    describe('getMessaging', () => {
        beforeEach(() => {
            (globalThis as any).window = { 
                acquireVsCodeApi: vi.fn(() => mockVsCodeApi),
                addEventListener: vi.fn(),
                removeEventListener: vi.fn()
            };
        });

        it('postMessage sends messages to the VS Code API', () => {
            const messaging = WebviewHost.getMessaging();
            messaging.postMessage({ id: 'Test' } as any);
            expect(mockVsCodeApi.postMessage).toHaveBeenCalledWith({ id: 'Test' });
        });

        it('onMessage registers a message event listener and returns an unsubscribe function', () => {
            const messaging = WebviewHost.getMessaging();
            const handler = vi.fn();
            
            const unsubscribe = messaging.onMessage(handler);
            expect(globalThis.window.addEventListener).toHaveBeenCalledWith('message', expect.any(Function));
            
            unsubscribe();
            expect(globalThis.window.removeEventListener).toHaveBeenCalledWith('message', expect.any(Function));
        });
    });

    describe('State Management', () => {
        beforeEach(() => {
            (globalThis as any).window = { acquireVsCodeApi: vi.fn(() => mockVsCodeApi) };
        });

        it('retrieves the current state from the VS Code API', () => {
            WebviewHost.getState();
            expect(mockVsCodeApi.getState).toHaveBeenCalled();
        });

        it('sets the state in the VS Code API', () => {
            WebviewHost.setState({ val: 123 });
            expect(mockVsCodeApi.setState).toHaveBeenCalledWith({ val: 123 });
        });
    });
});
