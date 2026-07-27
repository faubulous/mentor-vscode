import * as vscode from 'vscode';
import { NamedNode, VocabularyRepository, SH } from '@faubulous/mentor-rdf';
import { container } from 'tsyringe';
import { ServiceToken } from '@src/services/tokens';
import { ISettingsService } from '@src/services/core';
import { IDocumentContextService } from '@src/services/document';
import { getConfig } from '@src/utilities/vscode/config';
import { ShaclValidationService } from '@src/services/validation/shacl-validation-service';
import { DefinitionNodeProvider } from './definition-node-provider';
import { DefinitionTreeNode } from './definition-tree-node';

/**
 * SHACL severity precedence used when a node aggregates several results:
 * `sh:Violation` > `sh:Warning` > `sh:Info`.
 */
const SEVERITY_RANK: Record<string, number> = {
	[SH.Violation]: 3,
	[SH.Warning]: 2,
	[SH.Info]: 1,
};

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
export class DefinitionNodeDecorationProvider implements vscode.FileDecorationProvider, vscode.Disposable {

	/**
	 * URI schemes this provider decorates: `mentor:` container nodes and the
	 * schemes of resource IRIs rendered in the definition tree. The provider is
	 * registered window-wide, so every other scheme — editor tabs, notebook
	 * cells, `user:`/`workspace:`/`git:` documents — must be left untouched:
	 * returning a decoration for them re-colors their tab and Open Editors
	 * labels on every invalidation.
	 */
	private static readonly _decoratedSchemes = new Set(['mentor', 'http', 'https', 'urn']);

	private readonly _subscriptions: vscode.Disposable[] = [];

	private readonly _warningColor = new vscode.ThemeColor("list.warningForeground");

	private readonly _errorColor = new vscode.ThemeColor("list.errorForeground");

	private readonly _disabledColor = new vscode.ThemeColor("descriptionForeground");

	private _labelPredicates = new Set<string>();

	/**
	 * Maps focus node IRIs to their worst SHACL severity (`sh:Violation`, `sh:Warning`, `sh:Info`)
	 * for the currently active document's validation result.
	 */
	private _shaclViolations = new Map<string, string>();

	/**
	 * Maps ancestor node resource URIs to the worst SHACL severity among their descendant focus
	 * nodes. Built by walking the `.parent` chain of each violated tree node. Only `mentor:`
	 * URIs are recorded — real-IRI nodes that appear in multiple branches use synthetic
	 * `mentor:properties:<iri>` / `mentor:individuals:<iri>` URIs via `getResourceUri()`.
	 *
	 * Built lazily (see {@link _ensureAncestorSeverity}) the first time a container decoration is
	 * requested after a change, so the tree walk runs only when the tree is actually rendered and
	 * only once per validation — never eagerly on every `onDidValidate`.
	 */
	private _ancestorSeverity = new Map<string, string>();

	/**
	 * Whether {@link _ancestorSeverity} needs rebuilding from the current {@link _shaclViolations}.
	 * Set when validations change; cleared once the (lazy) rebuild runs.
	 */
	private _ancestorSeverityDirty = true;

	private readonly _onDidChangeFileDecorations = new vscode.EventEmitter<vscode.Uri | vscode.Uri[] | undefined>();

	readonly onDidChangeFileDecorations? = this._onDidChangeFileDecorations.event;

	private _decorationScope: MissingLanguageTagDecorationScope;

	private get _vocabulary() {
		return container.resolve<VocabularyRepository>(ServiceToken.VocabularyRepository);
	}

	private get _settings() {
		return container.resolve<ISettingsService>(ServiceToken.SettingsService);
	}

	private get _contextService() {
		return container.resolve<IDocumentContextService>(ServiceToken.DocumentContextService);
	}

	private get _validationService() {
		return container.resolve<ShaclValidationService>(ServiceToken.ShaclValidationService);
	}

	constructor(private readonly _nodeProvider?: DefinitionNodeProvider) {
		this._decorationScope = this._getDecorationScopeFromConfiguration();

		this._subscriptions.push(
			// If the configuration for decorating missing language tags changes, update the decoration provider.
			vscode.workspace.onDidChangeConfiguration((e) => {
				if (e.affectsConfiguration('mentor.definitionTree.decorateMissingLanguageTags')) {
					this._decorationScope = this._getDecorationScopeFromConfiguration();

					this._onDidChangeFileDecorations.fire(undefined);
				}

				// The cached label predicates otherwise only update on document context
				// changes; apply a settings change immediately.
				if (e.affectsConfiguration('mentor.predicates.label')) {
					this._labelPredicates = new Set(this._contextService.activeContext?.predicates.label ?? []);

					this._onDidChangeFileDecorations.fire(undefined);
				}
			}),

			this._contextService.onDidChangeDocumentContext((context) => {
				if (context) {
					// When the context changes, the label predicates need to be updated.
					this._labelPredicates = new Set(context?.predicates.label ?? []);
				} else {
					this._labelPredicates = new Set();
				}

				// Reload the (cheap) leaf violations for the new active document and invalidate
				// the lazily-built ancestor aggregation; VS Code re-requests visible items.
				// Always fire: the grey and language decorations depend on the new context
				// even when the SHACL severities are unchanged.
				this._reloadViolations(true);
			}),

			this._validationService.onDidValidate(() => {
				// Rebuild only the cheap leaf map and mark the ancestor aggregation dirty. The
				// expensive tree walk is deferred to _ensureAncestorSeverity, which runs lazily
				// when a container decoration is actually requested (i.e. the tree is visible).
				// Validations fire for every open document (and on every edit that drops a
				// result); skip the repaint when the severities did not change.
				this._reloadViolations(false);
			}),

			this._settings.onDidChange("view.activeLanguage", () => {
				// When the active language changes, the decorations need to be updated.
				this._onDidChangeFileDecorations.fire(undefined);
			})
		);
	}

	dispose(): void {
		for (const subscription of this._subscriptions) {
			subscription.dispose();
		}

		this._subscriptions.length = 0;
		this._onDidChangeFileDecorations.dispose();
	}

	/**
	 * Rebuild the cheap per-focus-node leaf severity map for the active document and invalidate
	 * the lazily-built ancestor aggregation, then ask VS Code to re-request decorations for all
	 * visible items. Cheap enough to run on every validation / context change.
	 * @param forceFire Fire the change event even when the severities are unchanged — needed
	 * when the active context changed, because the other decorations depend on it.
	 */
	private _reloadViolations(forceFire: boolean): void {
		const next = new Map<string, string>();

		const activeContext = this._contextService.activeContext;
		const documentUri = activeContext?.uri;
		const last = documentUri ? this._validationService.getLastResult(documentUri) : undefined;

		if (last) {
			// Only include violations whose focus node is a subject in the active document.
			// This prevents false-positive decorations for nodes that are merely referenced
			// (e.g. as sh:path objects) but have violations originating from imported shapes.
			const subjects = activeContext?.subjects;

			for (const entry of last.results) {
				const iri = entry.focusNode;

				if (subjects && !subjects[iri]) {
					continue;
				}

				const newRank = SEVERITY_RANK[entry.severity] ?? 0;
				const existing = next.get(iri);
				const existingRank = existing ? (SEVERITY_RANK[existing] ?? 0) : 0;

				if (newRank > existingRank) {
					next.set(iri, entry.severity);
				}
			}
		}

		// Unchanged severities mean unchanged decorations: keep the lazily-built
		// ancestor aggregation and skip the workbench-wide repaint.
		if (!forceFire && DefinitionNodeDecorationProvider._severitiesEqual(this._shaclViolations, next)) {
			return;
		}

		this._shaclViolations = next;
		this._ancestorSeverity.clear();
		this._ancestorSeverityDirty = true;

		this._onDidChangeFileDecorations.fire(undefined);
	}

	private static _severitiesEqual(a: Map<string, string>, b: Map<string, string>): boolean {
		if (a.size !== b.size) {
			return false;
		}

		for (const [iri, severity] of a) {
			if (b.get(iri) !== severity) {
				return false;
			}
		}

		return true;
	}

	/**
	 * Lazily build {@link _ancestorSeverity} from the current leaf violations, once per change.
	 *
	 * Called from {@link _getShaclSeverity} only when a container (`mentor:`) decoration is
	 * actually requested — i.e. the tree is being rendered — so the tree walk never runs for a
	 * hidden panel and never runs per file during a batch. For every violated leaf (uncapped) we
	 * resolve its tree node against a single, reused root list and walk its `.parent` chain,
	 * recording the worst severity on each `mentor:` ancestor URI. Fetching the roots once avoids
	 * the per-node cold rebuild that `getNodeForUri` would otherwise incur.
	 */
	private _ensureAncestorSeverity(): void {
		if (!this._ancestorSeverityDirty) {
			return;
		}

		this._ancestorSeverityDirty = false;
		this._ancestorSeverity.clear();

		if (!this._nodeProvider || this._shaclViolations.size === 0) {
			return;
		}

		// Resolve the root nodes once and reuse them for every violation lookup.
		const roots = this._nodeProvider.getChildren(undefined) ?? [];

		for (const [iri, severity] of this._shaclViolations) {
			let treeNode: DefinitionTreeNode | undefined;

			for (const root of roots) {
				treeNode = root.resolveNodeForUri(iri);

				if (treeNode) {
					break;
				}
			}

			if (!treeNode) {
				continue;
			}

			const rank = SEVERITY_RANK[severity] ?? 0;

			// Only record severity for `mentor:` container nodes — intermediate nodes with real
			// IRIs are skipped because FileDecorationProvider decorates by URI, and the same IRI
			// may appear in multiple tree branches (e.g. a property that is both an ancestor under
			// shapes and a leaf under properties). Grouping nodes override getResourceUri() to
			// return a synthetic mentor: URI so they can be decorated without cross-branch bleed.
			let ancestor = treeNode.parent;

			while (ancestor) {
				const resourceUri = ancestor.getResourceUri()?.toString();

				if (resourceUri?.startsWith('mentor:')) {
					const existingAncestor = this._ancestorSeverity.get(resourceUri);
					const existingAncestorRank = existingAncestor ? (SEVERITY_RANK[existingAncestor] ?? 0) : 0;

					if (rank > existingAncestorRank) {
						this._ancestorSeverity.set(resourceUri, severity);
					}
				}

				ancestor = ancestor.parent;
			}
		}
	}

	private _getDecorationScopeFromConfiguration(): MissingLanguageTagDecorationScope {
		const result = getConfig().get('definitionTree.decorateMissingLanguageTags');

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
		const context = this._contextService.activeContext;

		if (!context || !uri || !DefinitionNodeDecorationProvider._decoratedSchemes.has(uri.scheme)) {
			return undefined;
		}

		if (uri.scheme === 'mentor') {
			return this._buildShaclDecoration(this._getShaclSeverity(uri), false);
		}

		const shaclDecoration = this._buildShaclDecoration(this._getShaclSeverity(uri), false);

		if (shaclDecoration) {
			return shaclDecoration;
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
			// Note: The document may not have a language set if 
			// there are no language tags used in the document.
			return undefined;
		}

		if (!context.references[node.value]) {
			return undefined;
		}

		const graphUris = this._decorationScope === MissingLanguageTagDecorationScope.Document ? context.graphs : undefined;
		const activeLanguage = context.activeLanguage;

		let hasLabels = false;

		for (let triple of this._vocabulary.store.matchAll(graphUris, node, null, null, false)) {
			if (triple.object.termType !== "Literal" || !this._labelPredicates.has(triple.predicate.value)) {
				continue;
			}

			if (!triple.object.language || triple.object.language.startsWith(activeLanguage)) {
				// Either there is no language tag (valid for all languages) 
				// or the language tag is in the active language.
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

	/**
	 * Returns the SHACL issue color for the given resource URI.
	 * Only warning and violation severities are treated as issues for tree icon coloring.
	 */
	getIssueColor(uri: vscode.Uri | undefined): vscode.ThemeColor | undefined {
		const severity = this._getShaclSeverity(uri);

		if (severity === SH.Violation) {
			return this._errorColor;
		}

		if (severity === SH.Warning) {
			return this._warningColor;
		}

		return undefined;
	}

	private _getShaclSeverity(uri: vscode.Uri | undefined): string | undefined {
		if (!uri) {
			return undefined;
		}

		// Container nodes (mentor: scheme) and intermediate ancestor nodes are decorated via the
		// ancestor severity map, built lazily on first request (only when the tree is rendered).
		if (uri.scheme === 'mentor') {
			this._ensureAncestorSeverity();

			return this._ancestorSeverity.get(uri.toString());
		}

		return this._shaclViolations.get(uri.toString());
	}

	/**
	 * Build a SHACL decoration for the given severity, or undefined if no severity is set.
	 */
	private _buildShaclDecoration(severity: string | undefined, propagate: boolean): vscode.FileDecoration | undefined {
		if (severity === SH.Violation) {
			const result = new vscode.FileDecoration('●', 'SHACL violation', this._errorColor);
			result.propagate = propagate;
			result.tooltip = 'This node has a SHACL violation.';
			return result;
		}

		if (severity === SH.Warning) {
			const result = new vscode.FileDecoration('●', 'SHACL warning', this._warningColor);
			result.propagate = propagate;
			result.tooltip = 'This node has a SHACL warning.';
			return result;
		}

		if (severity === SH.Info) {
			const result = new vscode.FileDecoration('●', 'SHACL info', this._warningColor);
			result.propagate = false;
			result.tooltip = 'This node has a SHACL info message.';
			return result;
		}

		return undefined;
	}
}