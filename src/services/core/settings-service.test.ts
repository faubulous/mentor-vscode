import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SettingsService, TreeLabelStyle, DefinitionTreeLayout } from './settings-service';

vi.mock('@src/utilities/vscode/config', () => ({
	getConfig: vi.fn(() => ({ get: vi.fn((_key: string, defaultValue?: any) => defaultValue) })),
}));

describe('SettingsService', () => {
	describe('get', () => {
		it('returns undefined when key has not been set and no default is given', () => {
			const service = new SettingsService();

			expect(service.get('some.key')).toBeUndefined();
		});

		it('returns the defaultValue when key has not been set', () => {
			const service = new SettingsService();

			expect(service.get('some.key', 42)).toBe(42);
		});

		it('returns the previously set value', () => {
			const service = new SettingsService();
			service.set('my.key', 'hello');

			expect(service.get('my.key')).toBe('hello');
		});
	});

	describe('set', () => {
		it('stores the value so it can be retrieved by get', () => {
			const service = new SettingsService();
			service.set('count', 7);

			expect(service.get('count')).toBe(7);
		});

		it('overwrites a previously set value', () => {
			const service = new SettingsService();
			service.set('flag', true);
			service.set('flag', false);

			expect(service.get('flag')).toBe(false);
		});
	});

	describe('has', () => {
		it('returns false when the key has not been set', () => {
			const service = new SettingsService();

			expect(service.has('missing')).toBe(false);
		});

		it('returns true after a value has been set', () => {
			const service = new SettingsService();
			service.set('present', 'value');

			expect(service.has('present')).toBe(true);
		});
	});

	describe('onDidChange', () => {
		it('fires the callback with old and new values when the value changes', () => {
			const service = new SettingsService();
			const callback = vi.fn();

			service.onDidChange('my.key', callback);

			service.set('my.key', 'first');

			expect(callback).toHaveBeenCalledWith({ key: 'my.key', oldValue: undefined, newValue: 'first' });
		});

		it('fires the callback with the correct old value on subsequent changes', () => {
			const service = new SettingsService();
			const callback = vi.fn();

			service.onDidChange('my.key', callback);

			service.set('my.key', 'first');
			service.set('my.key', 'second');

			expect(callback).toHaveBeenLastCalledWith({ key: 'my.key', oldValue: 'first', newValue: 'second' });
		});

		it('does not fire the callback when the value is set to the same value', () => {
			const service = new SettingsService();
			const callback = vi.fn();

			service.onDidChange('my.key', callback);

			service.set('my.key', 'value');
			service.set('my.key', 'value');

			expect(callback).toHaveBeenCalledTimes(1);
		});

		it('does not fire the callback for a different key', () => {
			const service = new SettingsService();
			const callback = vi.fn();

			service.onDidChange('key.a', callback);
			service.set('key.b', 'value');

			expect(callback).not.toHaveBeenCalled();
		});
	});

	describe('constructor defaults', () => {
		beforeEach(async () => {
			const { getConfig } = await import('@src/utilities/vscode/config');
			(getConfig as any).mockImplementation(() => ({ get: vi.fn((_key: string, defaultValue?: any) => defaultValue) }));
		});

		it('defaults view.definitionTree.labelStyle to UriLabels when config returns no style', () => {
			const service = new SettingsService();

			expect(service.get('view.definitionTree.labelStyle')).toBe(TreeLabelStyle.UriLabels);
		});

		it('sets label style to AnnotatedLabels when config says AnnotatedLabels', async () => {
			const { getConfig } = await import('@src/utilities/vscode/config');
			(getConfig as any).mockImplementation(() => ({ get: vi.fn().mockReturnValue('AnnotatedLabels') }));

			const service = new SettingsService();

			expect(service.get('view.definitionTree.labelStyle')).toBe(TreeLabelStyle.AnnotatedLabels);
		});

		it('sets label style to UriLabelsWithPrefix when config says UriLabelsWithPrefix', async () => {
			const { getConfig } = await import('@src/utilities/vscode/config');
			(getConfig as any).mockImplementation(() => ({ get: vi.fn().mockReturnValue('UriLabelsWithPrefix') }));

			const service = new SettingsService();

			expect(service.get('view.definitionTree.labelStyle')).toBe(TreeLabelStyle.UriLabelsWithPrefix);
		});
	});

	describe('exports', () => {
		it('exports TreeLabelStyle enum values', () => {
			expect(TreeLabelStyle.AnnotatedLabels).toBeDefined();
			expect(TreeLabelStyle.UriLabels).toBeDefined();
			expect(TreeLabelStyle.UriLabelsWithPrefix).toBeDefined();
		});

		it('exports DefinitionTreeLayout enum values', () => {
			expect(DefinitionTreeLayout.ByType).toBeDefined();
			expect(DefinitionTreeLayout.BySource).toBeDefined();
		});
	});
});
