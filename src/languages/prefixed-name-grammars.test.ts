import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { TextMateToken, TextMateTokenizer } from '@src/utilities/mocks/textmate-tokenizer';

/**
 * Tests for the highlighting of prefixed names in the TextMate grammars (faubulous/mentor-vscode#97).
 */

const LANGUAGES = ['turtle', 'trig', 'sparql', 'datalog'];

/**
 * Finds the token with the given text in a tokenized line.
 * @param tokens The tokens of the line.
 * @param text The text of the token.
 * @returns The first token with the text.
 */
function getToken(tokens: TextMateToken[], text: string): TextMateToken {
	const token = tokens.find(t => t.text.trim() === text);

	expect(token, `expected a token '${text}' in ${JSON.stringify(tokens.map(t => t.text))}`).toBeDefined();

	return token!;
}

/**
 * Indicates whether a token has a scope that starts with the given name.
 * @param token The token to check.
 * @param scope The scope name, e.g. `storage.modifier.prefix`.
 */
function hasScope(token: TextMateToken, scope: string): boolean {
	return token.scopes.some(s => s.split(' ').some(part => part.startsWith(scope)));
}

/**
 * Asserts that a prefixed name is highlighted as one prefix followed by a local name.
 * @param tokens The tokens of the line.
 * @param prefix The prefix including the colon, e.g. `my-ns:`.
 * @param localName The local name, e.g. `CQ-001`.
 */
function expectPrefixedName(tokens: TextMateToken[], prefix: string, localName: string): void {
	expect(hasScope(getToken(tokens, prefix), 'storage.modifier.prefix')).toBe(true);

	const local = getToken(tokens, localName);

	// The local name has no scope of its own, so it is only distinguishable from text that is not
	// matched as a prefixed name by being a token of its own, without the surrounding whitespace.
	expect(local.text, `'${localName}' must be matched as the local name`).toBe(localName);

	for (const scope of ['storage.modifier.prefix', 'variable', 'keyword', 'constant.numeric']) {
		expect(hasScope(local, scope), `'${localName}' must not have the scope ${scope}`).toBe(false);
	}
}

/**
 * Creates a statement for every grammar in which the given prefixed name is the subject.
 * @param prefixedName The prefixed name.
 * @returns Pairs of grammar scope names and lines.
 */
function getStatements(prefixedName: string): [string, string][] {
	return [
		['source.turtle', `${prefixedName} a ex:Thing .`],
		['source.trig', `${prefixedName} a ex:Thing .`],
		['source.sparql', `SELECT * WHERE { ${prefixedName} a ex:Thing . }`],
		['source.datalog', `${prefixedName}(X) :- ex:Thing(X) .`],
	];
}

/**
 * Creates a prefix declaration for every grammar.
 * @param prefix The declared prefix including the colon.
 * @returns Pairs of grammar scope names and lines.
 */
function getPrefixDeclarations(prefix: string): [string, string][] {
	return [
		['source.turtle', `@prefix ${prefix} <http://example.org/> .`],
		['source.turtle', `PREFIX ${prefix} <http://example.org/>`],
		['source.trig', `@prefix ${prefix} <http://example.org/> .`],
		['source.sparql', `PREFIX ${prefix} <http://example.org/>`],
		['source.datalog', `@prefix ${prefix} <http://example.org/> .`],
	];
}

describe('prefixed names in the TextMate grammars', () => {
	it.each([
		['source.turtle', 'my-ns:CQ-001 a ex:Thing .'],
		['source.trig', 'my-ns:CQ-001 a ex:Thing .'],
		['source.trig', 'GRAPH my-ns:g { my-ns:CQ-001 a ex:Thing . }'],
		['source.sparql', 'SELECT * WHERE { my-ns:CQ-001 a ex:Thing . }'],
		['source.datalog', 'my-ns:Adult(X) :- my-ns:CQ-001(X) .'],
	])('%s highlights a prefix with a hyphen: %s', async (scopeName, line) => {
		expectPrefixedName(await TextMateTokenizer.tokenizeLine(scopeName, line), 'my-ns:', 'CQ-001');
	});

	it.each([
		['source.turtle', '@prefix my-ns: <http://example.org/> .'],
		['source.turtle', 'PREFIX my-ns: <http://example.org/>'],
		['source.trig', '@prefix my-ns: <http://example.org/> .'],
		['source.trig', 'PREFIX my-ns: <http://example.org/>'],
		['source.sparql', 'PREFIX my-ns: <http://example.org/>'],
		['source.datalog', '@prefix my-ns: <http://example.org/> .'],
	])('%s highlights a declared prefix with a hyphen: %s', async (scopeName, line) => {
		const tokens = await TextMateTokenizer.tokenizeLine(scopeName, line);

		expect(hasScope(getToken(tokens, 'my-ns:'), 'storage.modifier.prefix')).toBe(true);
	});

	it.each([
		['source.turtle', 'ex:s ex:p a.b:c-d .'],
		['source.trig', 'ex:s ex:p a.b:c-d .'],
	])('%s highlights a prefix with a period: %s', async (scopeName, line) => {
		expectPrefixedName(await TextMateTokenizer.tokenizeLine(scopeName, line), 'a.b:', 'c-d');
	});

	it.each([
		['source.turtle', 'ex:s ex:p ex:o.'],
		['source.trig', 'ex:s ex:p ex:o.'],
		['source.sparql', 'SELECT * WHERE { ?s ex:p ex:o. }'],
	])('%s does not include a terminating period in the local name: %s', async (scopeName, line) => {
		const tokens = await TextMateTokenizer.tokenizeLine(scopeName, line);

		expect(getToken(tokens, 'o').text).toBe('o');
		expect(getToken(tokens, '.').text).toBe('.');
	});

	it.each([
		['source.turtle', 'ex:s ex:p "1"^^my-ns:type .'],
		['source.trig', 'ex:s ex:p "1"^^my-ns:type .'],
	])('%s highlights a datatype with a hyphen in its prefix: %s', async (scopeName, line) => {
		const tokens = await TextMateTokenizer.tokenizeLine(scopeName, line);

		expect(hasScope(getToken(tokens, 'my-ns:type'), 'entity.name.function')).toBe(true);
	});

	it('highlights the Datalog implication operator next to prefixed names', async () => {
		const tokens = await TextMateTokenizer.tokenizeLine('source.datalog', 'ex:Adult(X) :- ex:Person(X) .');

		expect(hasScope(getToken(tokens, ':-'), 'keyword.operator.implication')).toBe(true);
	});

	describe('colons in local names (faubulous/mentor-vscode#106)', () => {
		it.each(getStatements('ex:a:b'))('%s highlights a local name with a colon: %s', async (scopeName, line) => {
			expectPrefixedName(await TextMateTokenizer.tokenizeLine(scopeName, line), 'ex:', 'a:b');
		});
	});

	describe('escaped characters in local names (faubulous/mentor-vscode#107)', () => {
		it.each(getStatements('ex:a\\-b'))('%s highlights a local name with an escaped hyphen: %s', async (scopeName, line) => {
			expectPrefixedName(await TextMateTokenizer.tokenizeLine(scopeName, line), 'ex:', 'a\\-b');
		});

		it.each(getStatements('ex:a\\.b\\/c'))('%s highlights a local name with escaped punctuation: %s', async (scopeName, line) => {
			expectPrefixedName(await TextMateTokenizer.tokenizeLine(scopeName, line), 'ex:', 'a\\.b\\/c');
		});

		it.each(getStatements('ex:a%20b'))('%s highlights a local name with a percent encoding: %s', async (scopeName, line) => {
			expectPrefixedName(await TextMateTokenizer.tokenizeLine(scopeName, line), 'ex:', 'a%20b');
		});
	});

	describe('non-ASCII characters in prefixed names (faubulous/mentor-vscode#108)', () => {
		it.each(getStatements('café:Größe'))('%s highlights a prefix and a local name with non-ASCII letters: %s', async (scopeName, line) => {
			expectPrefixedName(await TextMateTokenizer.tokenizeLine(scopeName, line), 'café:', 'Größe');
		});

		it.each(getStatements('ex:a·b'))('%s highlights a local name with a middle dot: %s', async (scopeName, line) => {
			expectPrefixedName(await TextMateTokenizer.tokenizeLine(scopeName, line), 'ex:', 'a·b');
		});

		it.each(getStatements('ex:e\u0301t\u00e9'))('%s highlights a local name with a combining accent: %s', async (scopeName, line) => {
			expectPrefixedName(await TextMateTokenizer.tokenizeLine(scopeName, line), 'ex:', 'e\u0301t\u00e9');
		});

		it.each(getStatements('ex:\u{1D49C}bc'))('%s highlights a local name with a character outside of the BMP: %s', async (scopeName, line) => {
			expectPrefixedName(await TextMateTokenizer.tokenizeLine(scopeName, line), 'ex:', '\u{1D49C}bc');
		});

		it.each(getPrefixDeclarations('café:'))('%s highlights a declared prefix with non-ASCII letters: %s', async (scopeName, line) => {
			const tokens = await TextMateTokenizer.tokenizeLine(scopeName, line);

			expect(hasScope(getToken(tokens, 'café:'), 'storage.modifier.prefix')).toBe(true);
		});
	});

	it('uses the same prefixed name pattern in all grammars', () => {
		const patterns = LANGUAGES.map(language => {
			const file = path.resolve('src/languages', language, `${language}.tmLanguage.json`);

			return JSON.parse(fs.readFileSync(file, 'utf8')).repository.prefixed_name.match;
		});

		// Update all grammars when changing the pattern, so that they do not diverge again.
		expect(new Set(patterns).size).toBe(1);
	});
});
