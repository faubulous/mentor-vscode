import * as vscode from 'vscode';
import { container } from 'tsyringe';
import { rdf, sh, Store } from '@faubulous/mentor-rdf';
import { ServiceToken } from '@src/services/tokens';
import { ShaclValidationService } from '@src/services/validation/shacl-validation-service';
import { WorkspaceUri } from '@src/providers/workspace-uri';
import { InferenceUri } from '@src/providers';
import {
	buildGraphShapeConfigurationFromSelection,
	getGraphSelectionState,
	isImplicitGraphShapeConfiguration,
	ShaclValidationConfiguration,
} from '@src/services/validation/shacl-validation-configuration';

interface ShapePickItem extends vscode.QuickPickItem {
	graphUri: string;
}

function getGraphUriFromItem(item: vscode.QuickPickItem): string | undefined {
	const quickPickItem = item as Partial<ShapePickItem>;

	if (typeof quickPickItem.graphUri === 'string' && quickPickItem.graphUri.length > 0) {
		return quickPickItem.graphUri;
	}

	if (typeof item.detail === 'string' && item.detail.length > 0) {
		return item.detail;
	}

	return undefined;
}

const DEFAULT_SHAPE_ON_ICON = new vscode.ThemeIcon('star-full');
const DEFAULT_SHAPE_OFF_ICON = new vscode.ThemeIcon('star-empty');

function getIncludeDefaultsButton(includeDefaults: boolean): vscode.QuickInputButton {
	return {
		iconPath: new vscode.ThemeIcon(includeDefaults ? 'check-all' : 'exclude'),
		tooltip: includeDefaults
			? 'Include as default SHACL shape file'
			: 'Exclude as default SHACL shape file'
	};
}

function getPlaceholder(itemCount: number, includeDefaults: boolean): string {
	if (itemCount === 0) {
		return 'No SHACL shape files in this workspace.';
	}

	return includeDefaults
		? 'Select SHACL shape files (defaults are included):'
		: 'Select SHACL shape files (defaults are excluded for this graph):';
}

export const manageShaclShapes = {
	id: 'mentor.command.manageShaclShapes',
	handler: async () => {
		const editor = vscode.window.activeTextEditor;

		if (!editor || !editor.document) {
			return;
		}

		const store = container.resolve<Store>(ServiceToken.Store);
		const quickPickItems: ShapePickItem[] = [];

		for (const graphUri of store.getGraphs().sort()) {
			if (InferenceUri.isInferenceUri(graphUri)) {
				continue;
			}

			const hasShapes =
				store.any(graphUri, null, rdf.type, sh.NodeShape) ||
				store.any(graphUri, null, rdf.type, sh.PropertyShape);

			if (hasShapes) {
				quickPickItems.push({
					label: graphUri.replace(/^workspace:\/\/\//, ''),
					graphUri
				});
			}
		}

		const shacl = vscode.workspace.getConfiguration('mentor.shacl');
		const validationConfig = shacl.get<ShaclValidationConfiguration>('validation', {});

		const workspaceUri = WorkspaceUri.toWorkspaceUri(editor.document.uri);
		const key = workspaceUri ? WorkspaceUri.toCanonicalString(workspaceUri) : editor.document.uri.toString();

		const selectionState = getGraphSelectionState(validationConfig, key);
		let includeDefaults = selectionState.includeDefaults;
		let defaultShapeGraphUris = [...selectionState.defaults];
		let selectedShapeGraphUris = new Set(selectionState.effectiveShapes);

		const validationService = container.resolve<ShaclValidationService>(ServiceToken.ShaclValidationService);
		const effectiveShapes = validationService.getEffectiveShapeGraphs(editor.document.uri);
		selectedShapeGraphUris = new Set(effectiveShapes);

		const quickPick = vscode.window.createQuickPick<ShapePickItem>();
		quickPick.title = 'SHACL Validation Settings';
		quickPick.canSelectMany = true;

		const toItem = (shapeGraphUri: string): ShapePickItem => {
			const isDefaultShape = defaultShapeGraphUris.includes(shapeGraphUri);

			return {
				label: shapeGraphUri.replace(/^workspace:\/\/\//, ''),
				description: isDefaultShape ? '- Default' : undefined,
				picked: selectedShapeGraphUris.has(shapeGraphUri),
				graphUri: shapeGraphUri,
				buttons: [{
					iconPath: isDefaultShape ? DEFAULT_SHAPE_ON_ICON : DEFAULT_SHAPE_OFF_ICON,
					tooltip: isDefaultShape
						? 'Remove as default shape file'
						: 'Add as default shape file'
				}]
			};
		};

		let isAutomaticSelectionUpdate = false;

		const refreshQuickPick = () => {
			const items = quickPickItems.map(item => toItem(item.graphUri));
			quickPick.items = items;
			quickPick.buttons = [getIncludeDefaultsButton(includeDefaults)];
			quickPick.placeholder = getPlaceholder(quickPickItems.length, includeDefaults);

			isAutomaticSelectionUpdate = true;
			quickPick.selectedItems = items.filter(item => selectedShapeGraphUris.has(item.graphUri));
			isAutomaticSelectionUpdate = false;
		};

		refreshQuickPick();

		const selection = await new Promise<{ includeDefaults: boolean; defaults: string[]; selectedShapeGraphUris: string[] } | undefined>((resolve) => {
			let accepted = false;

			quickPick.onDidChangeSelection(items => {
				if (isAutomaticSelectionUpdate) {
					return;
				}

				const selectedUris = items
					.map(item => getGraphUriFromItem(item))
					.filter((uri): uri is string => !!uri);

				selectedShapeGraphUris = new Set(selectedUris);
			});

			quickPick.onDidTriggerButton(() => {
				includeDefaults = !includeDefaults;

				if (includeDefaults) {
					for (const defaultShape of defaultShapeGraphUris) {
						selectedShapeGraphUris.add(defaultShape);
					}
				}

				refreshQuickPick();
			});

			quickPick.onDidTriggerItemButton(e => {
				const graphUri = getGraphUriFromItem(e.item);

				if (!graphUri) {
					return;
				}

				if (defaultShapeGraphUris.includes(graphUri)) {
					defaultShapeGraphUris = [];
				} else {
					defaultShapeGraphUris = [graphUri];
					// Setting a default should also select it immediately.
					selectedShapeGraphUris.add(graphUri);
				}

				if (includeDefaults) {
					for (const defaultShape of defaultShapeGraphUris) {
						selectedShapeGraphUris.add(defaultShape);
					}
				}

				refreshQuickPick();
			});

			quickPick.onDidAccept(() => {
				accepted = true;
				resolve({
					includeDefaults,
					defaults: defaultShapeGraphUris,
					selectedShapeGraphUris: [...selectedShapeGraphUris],
				});
				quickPick.hide();
			});

			quickPick.onDidHide(() => {
				if (!accepted) {
					resolve(undefined);
				}
				quickPick.dispose();
			});

			quickPick.show();
		});

		if (!selection) {
			return;
		}

		const nextValidationConfig: ShaclValidationConfiguration = {
			...validationConfig,
			defaults: selection.defaults,
			graphs: {
				...(validationConfig.graphs ?? {})
			}
		};

		const graphConfiguration = buildGraphShapeConfigurationFromSelection(
			selection.selectedShapeGraphUris,
			selection.defaults,
			selection.includeDefaults
		);

		if (isImplicitGraphShapeConfiguration(graphConfiguration)) {
			delete nextValidationConfig.graphs?.[key];
		} else {
			nextValidationConfig.graphs![key] = graphConfiguration;
		}

		if (nextValidationConfig.graphs && Object.keys(nextValidationConfig.graphs).length === 0) {
			delete nextValidationConfig.graphs;
		}

		await shacl.update('validation', nextValidationConfig, vscode.ConfigurationTarget.Workspace);
	}
};
