import { container } from 'tsyringe';
import { WebviewController } from './webview-controller';

/**
 * Registry for webview controllers. Provides a single point for maintaining
 * and extending the list of available controllers.
 */
export class WebviewControllerRegistry {
	private readonly _controllers: WebviewController[] = [];

	/**
	 * Creates a new registry and registers itself in the dependency injection container.
	 * @param token The dependency injection token to register the registry instance under.
	 */
	constructor(token: string) {
		container.registerInstance(token, this);
	}

	/**
	 * Register a controller with the registry.
	 */
	register<T extends WebviewController>(token: string, controller: T): T {
		this._controllers.push(controller);

		container.registerInstance(token, controller);

		return controller;
	}

	/**
	 * Get all registered controllers.
	 */
	getAll(): WebviewController[] {
		return this._controllers;
	}

	/**
	 * Find a controller by its view type or panel id.
	 */
	findById(id: string): WebviewController | undefined {
		return this._controllers.find(c => c.viewType === id || c.panelId === id);
	}

	/**
	 * Collect all available targets (panels and views) from registered controllers.
	 */
	collectTargets(): { kind: 'panel' | 'view'; id: string; label: string }[] {
		const items: { kind: 'panel' | 'view'; id: string; label: string }[] = [];

		for (const c of this._controllers) {
			if (c.panelId && c.panelTitle) {
				items.push({ kind: 'panel', id: c.panelId, label: `panel: ${c.panelId}` });
			}

			if (c.viewType) {
				items.push({ kind: 'view', id: c.viewType, label: `view: ${c.viewType}` });
			}
		}

		return items;
	}
}
