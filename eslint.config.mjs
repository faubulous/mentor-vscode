import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import reactHooks from 'eslint-plugin-react-hooks';

export default [
	{
		files: ['src/**/*.{ts,tsx}'],
		languageOptions: {
			parser: tsParser,
			parserOptions: {
				ecmaVersion: 2022,
				sourceType: 'module',
			},
		},
		plugins: {
			'@typescript-eslint': tsPlugin,
			'react-hooks': reactHooks,
		},
		rules: {
			...tsPlugin.configs.recommended.rules,
			// Only the classic hook rules; the React-Compiler checks added to the
			// v6 recommended preset flag pre-existing patterns and need their own
			// migration effort.
			'react-hooks/rules-of-hooks': 'error',
			'react-hooks/exhaustive-deps': 'warn',
			// The codebase uses `any` deliberately in webview messaging and RDF
			// term handling; revisit as a separate effort.
			'@typescript-eslint/no-explicit-any': 'off',
			'no-unused-vars': 'off',
			// Unused parameters are common in VS Code provider signatures
			// (e.g. `token`); only flag unused imports and locals.
			'@typescript-eslint/no-unused-vars': ['error', {
				args: 'none',
				caughtErrors: 'none',
				ignoreRestSiblings: true,
				varsIgnorePattern: '^_',
				destructuredArrayIgnorePattern: '^_',
			}],
		},
	},
	{
		// Tests destructure setup helpers without using every binding; keep the
		// signal visible but non-blocking.
		files: ['src/**/*.test.{ts,tsx}'],
		rules: {
			'no-restricted-syntax': ['warn', {
				selector: 'TSAsExpression[expression.type="Identifier"][expression.name="undefined"][typeAnnotation.type="TSAnyKeyword"]',
				message: 'Prefer typed factories from @src/utilities/mocks/factories over `undefined as any`.',
			}],
			'@typescript-eslint/no-unused-vars': ['warn', {
				args: 'none',
				caughtErrors: 'none',
				ignoreRestSiblings: true,
				varsIgnorePattern: '^_',
				destructuredArrayIgnorePattern: '^_',
			}],
			'@typescript-eslint/no-unsafe-function-type': 'warn',
			'@typescript-eslint/no-require-imports': 'warn',
		},
	},
];
