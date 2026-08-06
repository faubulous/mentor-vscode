import * as vscode from 'vscode';
import { compile } from 'triplate';

/**
 * The compiled result of a triplate template, as produced by `compile`.
 */
type CompiledTemplate = ReturnType<typeof compile>;

/**
 * A cache for compiled triplate templates, keyed by document URI and version, 
 * to avoid redundant compilation in providers that repeatedly compile the same document
 * (hover, code lens) while the document is unchanged.
 *
 * A template that fails to compile (syntax error) is not cached — {@link get}
 * returns `null` and clears any stale entry, so the next edit re-compiles.
 */
interface CacheEntry {
	/**
	 * The document version for which `compiled` was produced. Used to determine cache
	 * validity without needing to re-compile.
	 */
	version: number;

	/**
	 * The compiled template for the document version given by `version`. Should only be
	 * used if the cache entry is valid (i.e. `version` matches the document's current
	 * version), otherwise may be stale.
	 */
	compiled: CompiledTemplate;
}

/**
 * Caches the `compile()` result of a triplate template per document, keyed by
 * `document.version`, so providers that compile the same document repeatedly
 * (hover, code lens) avoid redundant work while the document is unchanged.
 *
 * A template that fails to compile (syntax error) is not cached — {@link get}
 * returns `null` and clears any stale entry, so the next edit re-compiles.
 */
export class TriplateCompileCache {
	private readonly _cache = new Map<string, CacheEntry>();

	/**
	 * Returns the compiled template for `document`, or `null` if it currently fails
	 * to compile. Reuses the cached result when the document version is unchanged.
	 */
	get(document: vscode.TextDocument): CompiledTemplate | null {
		const key = document.uri.toString();
		const version = document.version;
		const cached = this._cache.get(key);

		if (cached && cached.version === version) {
			return cached.compiled;
		}

		try {
			const compiled = compile(document.getText());

			this._cache.set(key, { version, compiled });

			return compiled;
		} catch {
			this._cache.delete(key);

			return null;
		}
	}
}
