import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock tsyringe container
vi.mock('tsyringe', () => ({
    container: {
        registerInstance: vi.fn(),
    },
}));

import { WebviewControllerRegistry } from '@src/views/webviews/webview-controller-registry';
import { container } from 'tsyringe';

describe('WebviewControllerRegistry', () => {
    let registry: WebviewControllerRegistry;

    beforeEach(() => {
        vi.clearAllMocks();
        registry = new WebviewControllerRegistry('TestRegistryToken');
    });

    it('should register itself in the DI container on init', () => {
        expect(container.registerInstance).toHaveBeenCalledWith('TestRegistryToken', registry);
    });

    it('should register and retrieve controllers', () => {
        const mockController = { viewType: 'test-view' } as any;
        registry.register('TestController', mockController);

        expect(registry.getAll()).toContain(mockController);
        expect(container.registerInstance).toHaveBeenCalledWith('TestController', mockController);
    });

    it('should find controller by viewType or panelId', () => {
        const viewCtrl = { viewType: 'test-view' } as any;
        const panelCtrl = { panelId: 'test-panel' } as any;
        
        registry.register('Ctrl1', viewCtrl);
        registry.register('Ctrl2', panelCtrl);

        expect(registry.findById('test-view')).toBe(viewCtrl);
        expect(registry.findById('test-panel')).toBe(panelCtrl);
        expect(registry.findById('unknown')).toBeUndefined();
    });

    it('should collect available targets correctly', () => {
        registry.register('c1', { panelId: 'test-panel', panelTitle: 'Test Panel' } as any);
        registry.register('c2', { viewType: 'test-view' } as any);
        registry.register('c3', { panelId: 'both-panel', panelTitle: 'Both', viewType: 'both-view' } as any);

        const targets = registry.collectTargets();

        expect(targets).toEqual([
            { kind: 'panel', id: 'test-panel', label: 'panel: test-panel' },
            { kind: 'view', id: 'test-view', label: 'view: test-view' },
            { kind: 'panel', id: 'both-panel', label: 'panel: both-panel' },
            { kind: 'view', id: 'both-view', label: 'view: both-view' },
        ]);
    });
});
