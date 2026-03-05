import * as vscode from 'vscode';
import { NamedNode } from '@faubulous/mentor-rdf';
import { container, VocabularyRepository, DocumentContextService, ConfigurationService } from '@src/service-container';
import { ServiceToken } from '@src/service-token';
import { SettingsService } from '@src/services/shared/settings-service';

/**
 * Indicates the where missing language tags should be decorated.
 */
enum MissingLanguageTagDecorationScope {
	/**
	 * Disable the decoration of missing language tags.
	 */
	Disabled,
	/**
	 * Decorate missing language tags in all sources.
	 */
	All,
	/**
	 * Decorate missing language tags only in the active document.
	 */
	Document
}

/**
 * A decoration provider that adds a badge to definition tree nodes.
 */
export class DefinitionNodeDecorationProvider implements vscode.FileDecorationProvider {

	private readonly _warningColor = new vscode.ThemeColor("list.warningForeground");

	private readonly _disabledColor = new vscode.ThemeColor("descriptionForeground");

	private _labelPredicates = new Set<string>();

	private readonly _onDidChangeFileDecorations = new vscode.EventEmitter<vscode.Uri | vscode.Uri[] | undefined>();

	readonly onDidChangeFileDecorations? = this._onDidChangeFileDecorations.event;

	private _decorationScope: MissingLanguageTagDecorationScope;

	private get vocabulary() {
		return container.resolve<VocabularyRepository>(ServiceToken.VocabularyRepository);
	}

	private get settings() {
		return container.resolve<SettingsService>(ServiceToken.SettingsService);
	}

	private get contextService() {
		return container.resolve<DocumentContextService>(ServiceToken.DocumentContextService);
	}

	private get configurationService() {
		return container.resolve<ConfigurationService>(ServiceToken.ConfigurationService);
	}

	constructor() {
		this._decorationScope = this._getDecorationScopeFromConfiguration();

		// If the configuration for decorating missing language tags changes, update the decoration provider.
		vscode.workspace.onDidChangeConfiguration((e) => {
			if (e.affectsConfiguration('mentor.definitionTree.decorateMissingLanguageTags')) {
				this._decorationScope = this._getDecorationScopeFromConfiguration();

				this._onDidChangeFileDecorations.fire(undefined);
			}
		});

		this.contextService.onDidChangeDocumentContext((context) => {
			if (context) {
				// When the context changes, the label predicates need to be updated.
				this._labelPredicates = new Set(context?.predicates.label ?? []);
			} else {
				this._labelPredicates = new Set();
			}
		});

		this.settings.onDidChange("view.activeLanguage", () => {
			// When the active language changes, the decorations need to be updated.
			this._onDidChangeFileDecorations.fire(undefined);
		});
	}

	private _getDecorationScopeFromConfiguration(): MissingLanguageTagDecorationScope {
		const result = this.configurationService.get('definitionTree.decorateMissingLanguageTags');

		switch (result) {
			case 'Document': {
				return MissingLanguageTagDecorationScope.Document;
			}
			case 'All': {
				return MissingLanguageTagDecorationScope.All;
			}
			default: {
				return MissingLanguageTagDecorationScope.Disabled;
			}
		}
	}

	provideFileDecoration(uri: vscode.Uri, token: vscode.CancellationToken) {
		const context = this.contextService.activeContext;

		if (!context || !uri || uri.scheme === 'mentor' || uri.scheme === 'file') {
			return undefined;
		}

		const node = new NamedNode(uri.toString());

		if (!context.subjects[node.value]) {
			const result = new vscode.FileDecoration(undefined, undefined, this._disabledColor);
			result.propagate = false;
			result.tooltip = `This subject is not defined in the active document.`;

			return result;
		}

		if (this._decorationScope === MissingLanguageTagDecorationScope.Disabled) {
			return undefined;
		}

		if (!context.primaryLanguage || !context.activeLanguage) {
			// Note: The document may not have a language set if there are no language tags used in the document.
			return undefined;
		}

		if (!context.references[node.value]) {
			return undefined;
		}

		const graphUris = this._decorationScope === MissingLanguageTagDecorationScope.Document ? context.graphs : undefined;
		const activeLanguage = context.activeLanguage;

		let hasLabels = false;

		for (let triple of this.vocabulary.store.matchAll(graphUris, node, null, null, false)) {
			if (triple.object.termType !== "Literal" || !this._labelPredicates.has(triple.predicate.value)) {
				continue;
			}

			if (!triple.object.language || triple.object.language.startsWith(activeLanguage)) {
				// Either there is no language tag (valid for all languages) or the language tag is in the active language.
				return undefined;
			}

			// Only enable the decoration if the subject is a subject in the configured graphs (document or entire background).
			hasLabels = true;
		}

		if (hasLabels) {
			const result = new vscode.FileDecoration(undefined, undefined, this._warningColor);
			result.propagate = true;
			result.tooltip = `This definition is not available in the active language @${activeLanguage}.`;

			return result;
		}
	}
}