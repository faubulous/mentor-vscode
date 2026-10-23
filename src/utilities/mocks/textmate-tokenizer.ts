import * as fs from 'fs';
import * as path from 'path';
import { INITIAL, IGrammar, Registry, parseRawGrammar } from 'vscode-textmate';
import { OnigScanner, OnigString, loadWASM } from 'vscode-oniguruma';

/**
 * A token of a tokenized line with the TextMate scopes that apply to it.
 */
export interface TextMateToken {
	/**
	 * The text of the token.
	 */
	text: string;

	/**
	 * The scopes of the token, from the outermost to the innermost.
	 */
	scopes: string[];
}

/**
 * The grammar files of the extension, relative to `src/languages`, by scope name.
 */
const GRAMMAR_FILES: Record<string, string> = {
	'source.datalog': 'datalog/datalog.tmLanguage.json',
	'source.sparql': 'sparql/sparql.tmLanguage.json',
	'source.trig': 'trig/trig.tmLanguage.json',
	'source.turtle': 'turtle/turtle.tmLanguage.json',
};

/**
 * Tokenizes text with the TextMate grammars of the extension, using the same engine as VS Code.
 * Intended for unit tests of the grammars; paths are resolved against the project root.
 */
export class TextMateTokenizer {
	/**
	 * The grammar registry, created on first use because loading the regular expression engine is asynchronous.
	 */
	private static _registry?: Registry;

	/**
	 * Tokenizes a single line of text.
	 * @param scopeName The scope name of the grammar, e.g. `source.turtle`.
	 * @param line The line to tokenize.
	 * @returns The tokens of the line.
	 */
	static async tokenizeLine(scopeName: string, line: string): Promise<TextMateToken[]> {
		const grammar = await TextMateTokenizer._loadGrammar(scopeName);
		const result = grammar.tokenizeLine(line, INITIAL);

		return result.tokens.map(token => ({
			text: line.substring(token.startIndex, token.endIndex),
			scopes: token.scopes,
		}));
	}

	/**
	 * Loads the grammar with the given scope name.
	 * @param scopeName The scope name of the grammar.
	 * @returns The loaded grammar.
	 */
	private static async _loadGrammar(scopeName: string): Promise<IGrammar> {
		const grammar = await TextMateTokenizer._getRegistry().loadGrammar(scopeName);

		if (!grammar) {
			throw new Error(`No grammar found for scope ${scopeName}.`);
		}

		return grammar;
	}

	/**
	 * Gets the grammar registry, loading the Oniguruma regular expression engine on first use.
	 * @returns The grammar registry.
	 */
	private static _getRegistry(): Registry {
		if (!TextMateTokenizer._registry) {
			const wasm = fs.readFileSync(path.resolve('node_modules/vscode-oniguruma/release/onig.wasm'));

			const onigLib = loadWASM(wasm.buffer.slice(wasm.byteOffset, wasm.byteOffset + wasm.byteLength)).then(() => ({
				createOnigScanner: (patterns: string[]) => new OnigScanner(patterns),
				createOnigString: (text: string) => new OnigString(text),
			}));

			TextMateTokenizer._registry = new Registry({
				onigLib,
				loadGrammar: async (scopeName: string) => {
					const file = GRAMMAR_FILES[scopeName];

					if (!file) {
						return null;
					}

					const grammarPath = path.resolve('src/languages', file);

					return parseRawGrammar(fs.readFileSync(grammarPath, 'utf8'), grammarPath);
				},
			});
		}

		return TextMateTokenizer._registry;
	}
}
