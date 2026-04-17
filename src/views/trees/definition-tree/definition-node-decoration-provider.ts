import * as vscode from 'vscode';
import { NamedNode, VocabularyRepository, SH } from '@faubulous/mentor-rdf';
import { container } from 'tsyringe';
import { ServiceToken } from '@src/services/tokens';
import { ISettingsService } from '@src/services/core';
import { IDocumentContextService } from '@src/services/document';
import { getConfig } from '@src/utilities/vscode/config';
import { ShaclValidationService } from '@src/services/validation/shacl-validation-service';
import { DefinitionNodeProvider } from './definition-node-provider';

/**
 * Maximum number of violated focus nodes for which ancestor walks are performed.
 * Limits the cost of tree traversal when there are many violations.
 * Direct leaf decorations are unaffected by this cap.
 */
const MAX_DECORATED_VIOLATIONS = 100;

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
	 */
	private _ancestorSeverity = new Map<string, string>();

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

		// If the configuration for decorating missing language tags changes, update the decoration provider.
		vscode.workspace.onDidChangeConfiguration((e) => {
			if (e.affectsConfiguration('mentor.definitionTree.decorateMissingLanguageTags')) {
				this._decorationScope = this._getDecorationScopeFromConfiguration();

				this._onDidChangeFileDecorations.fire(undefined);
			}
		});

		this._contextService.onDidChangeDocumentContext((context) => {
			if (context) {
				// When the context changes, the label predicates need to be updated.
				this._labelPredicates = new Set(context?.predicates.label ?? []);
			} else {
				this._labelPredicates = new Set();
			}

			// Reload SHACL violations for the new active document and refresh decorations.
			this._updateShaclViolations();
			this._onDidChangeFileDecorations.fire(undefined);
		});

		this._validationService.onDidValidate(() => {
			// Reload violations for the currently active document and refresh decorations.
			this._updateShaclViolations();

			// Fire for violated URIs and ancestor URIs so VS Code proactively caches
			// their decorations, then fire undefined to refresh all visible items.
			const violatedUris = [...this._shaclViolations.keys()].map(iri => vscode.Uri.parse(iri));
			const ancestorUris = [...this._ancestorSeverity.keys()].map(uri => vscode.Uri.parse(uri));
			const allUris = [...violatedUris, ...ancestorUris];

			if (allUris.length > 0) {
				this._onDidChangeFileDecorations.fire(allUris);
			}

			this._onDidChangeFileDecorations.fire(undefined);
		});

		this._settings.onDidChange("view.activeLanguage", () => {
			// When the active language changes, the decorations need to be updated.
			this._onDidChangeFileDecorations.fire(undefined);
		});
	}

	/**
	 * Rebuild the violations map from the last validation result for the currently active document.
	 */
	private _updateShaclViolations(): void {
		this._shaclViolations.clear();
		this._ancestorSeverity.clear();

		const activeContext = this._contextService.activeContext;
		const documentUri = activeContext?.uri;

		if (!documentUri) {
			return;
		}

		const last = this._validationService.getLastResult(documentUri);

		if (!last) {
			return;
		}

		// Severity precedence: Violation > Warning > Info
		const severityRank: Record<string, number> = {
			[SH.Violation]: 3,
			[SH.Warning]: 2,
			[SH.Info]: 1,
		};

		// Step 1: Build per-focus-node severity map.
		// Only include violations whose focus node is a subject in the active document.
		// This prevents false-positive decorations for nodes that are merely referenced
		// (e.g. as sh:path objects) but have violations originating from imported shapes.
		const subjects = activeContext?.subjects;

		for (const entry of last.results) {
			const iri = entry.focusNode;

			if (subjects && !subjects[iri]) {
				continue;
			}

			const newRank = severityRank[entry.severity] ?? 0;
			const existing = this._shaclViolations.get(iri);
			const existingRank = existing ? (severityRank[existing] ?? 0) : 0;

			if (newRank > existingRank) {
				this._shaclViolations.set(iri, entry.severity);
			}
		}

		// Step 2: Walk ancestors for each violated node (capped for performance).
		// Only record severity for `mentor:` container nodes — intermediate nodes
		// with real IRIs are skipped because FileDecorationProvider decorates by URI,
		// and the same IRI may appear in multiple tree branches (e.g. a property that
		// is both an ancestor under shapes and a leaf under properties).
		if (this._nodeProvider) {
			// Sort by severity so the most important violations are processed first
			// when we hit the cap.
			const entries = [...this._shaclViolations.entries()]
				.sort((a, b) => (severityRank[b[1]] ?? 0) - (severityRank[a[1]] ?? 0));

			const limit = Math.min(entries.length, MAX_DECORATED_VIOLATIONS);

			for (let i = 0; i < limit; i++) {
				const [iri, severity] = entries[i];
				const treeNode = this._nodeProvider.getNodeForUri(iri);

				if (!treeNode) {
					continue;
				}

				const rank = severityRank[severity] ?? 0;
				let ancestor = treeNode.parent;

				while (ancestor) {
					// Use the node's resourceUri as the decoration key. Intermediate grouping
					// nodes (e.g. PropertyClassNode, IndividualClassNode) override getResourceUri()
					// to return a synthetic mentor: URI so they can be safely decorated without
					// causing false positives on other tree branches that share the same real IRI.
					const resourceUri = ancestor.getResourceUri()?.toString();

					if (resourceUri?.startsWith('mentor:')) {
						const existingAncestor = this._ancestorSeverity.get(resourceUri);
						const existingAncestorRank = existingAncestor ? (severityRank[existingAncestor] ?? 0) : 0;

						if (rank > existingAncestorRank) {
							this._ancestorSeverity.set(resourceUri, severity);
						}
					}

					ancestor = ancestor.parent;
				}
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

		if (!context || !uri || uri.scheme === 'file' || uri.scheme === 'untitled') {
			return undefined;
		}

		// Container nodes (mentor: scheme) and intermediate ancestor nodes are decorated
		// via the ancestor severity map, built by walking .parent from each violated node.
		if (uri.scheme === 'mentor') {
			return this._buildShaclDecoration(this._ancestorSeverity.get(uri.toString()), false);
		}

		const node = new NamedNode(uri.toString());

		// Check SHACL validation results for this node first — violations must override
		// every other decoration, including the "not in active document" indicator.
		const shaclDecoration = this._buildShaclDecoration(this._shaclViolations.get(node.value), false);

		if (shaclDecoration) {
			return shaclDecoration;
		}

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