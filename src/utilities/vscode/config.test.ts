import { afterEach, describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';
import { resolveFormattingConfig, resolveFormattingIndent } from '@src/utilities/vscode/config';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));

/**
 * Drives getConfiguration so the turtle-override section returns the given
 * inspect() result and the common section returns the given get() value.
 */
function driveConfig(options: {
	turtleInspect?: Record<string, any>;
	commonValues?: Record<string, any>;
}) {
	(vscode.workspace as any).getConfiguration = vi.fn((section?: string) => ({
		get: (key: string, defaultValue?: any) =>
			section === 'mentor.formatting.common' && options.commonValues && key in options.commonValues
				? options.commonValues[key]
				: defaultValue,
		has: () => false,
		inspect: (key: string) =>
			section === 'mentor.formatting.turtle' ? options.turtleInspect?.[key] : undefined,
		update: async () => {},
	}));
}

afterEach(() => {
	(vscode.workspace as any).getConfiguration = vi.fn(() => ({
		get: (_k: string, def?: any) => def,
		has: () => false,
		inspect: () => undefined,
		update: async () => {},
	}));
});

describe('resolveFormattingConfig', () => {
	it('ignores the language override synthesized type default and uses the common value', () => {
		// VS Code returns a type default (false/0) for a registered override key
		// with no explicit default; inspect() exposes it only as defaultValue.
		driveConfig({
			turtleInspect: {
				blankLinesBetweenSubjects: { key: 'blankLinesBetweenSubjects', defaultValue: false },
				maxLineWidth: { key: 'maxLineWidth', defaultValue: 0 },
			},
			commonValues: { blankLinesBetweenSubjects: true, maxLineWidth: 120 },
		});

		expect(resolveFormattingConfig('turtle', 'blankLinesBetweenSubjects', true)).toBe(true);
		expect(resolveFormattingConfig('turtle', 'maxLineWidth', 120)).toBe(120);
	});

	it('honors an explicitly set language override at workspace scope', () => {
		driveConfig({
			turtleInspect: {
				blankLinesBetweenSubjects: { key: 'blankLinesBetweenSubjects', defaultValue: false, workspaceValue: false },
			},
			commonValues: { blankLinesBetweenSubjects: true },
		});

		expect(resolveFormattingConfig('turtle', 'blankLinesBetweenSubjects', true)).toBe(false);
	});

	it('prefers a folder-scoped override over workspace and global', () => {
		driveConfig({
			turtleInspect: {
				maxLineWidth: { key: 'maxLineWidth', defaultValue: 0, globalValue: 100, workspaceValue: 90, workspaceFolderValue: 80 },
			},
		});

		expect(resolveFormattingConfig('turtle', 'maxLineWidth', 120)).toBe(80);
	});

	it('falls back to the provided fallback when nothing is configured', () => {
		driveConfig({ turtleInspect: {}, commonValues: {} });

		expect(resolveFormattingConfig('turtle', 'spaceBeforePunctuation', true)).toBe(true);
	});
});

describe('resolveFormattingIndent', () => {
	const document = { languageId: 'turtle', uri: vscode.Uri.parse('file:///w/data.ttl') } as any;

	/**
	 * Drives getConfiguration('editor', ...) so inspect() returns the given
	 * fields for tabSize / insertSpaces.
	 */
	function driveEditorConfig(inspects: Record<string, any>) {
		(vscode.workspace as any).getConfiguration = vi.fn(() => ({
			get: (_k: string, def?: any) => def,
			has: () => false,
			inspect: (key: string) => inspects[key],
			update: async () => {},
		}));
	}

	it('uses the FormattingOptions when nothing is explicitly configured', () => {
		// Only defaults present (VS Code always reports a default for editor.tabSize).
		driveEditorConfig({
			tabSize: { key: 'tabSize', defaultValue: 4 },
			insertSpaces: { key: 'insertSpaces', defaultValue: true },
		});

		// FormattingOptions carry the detected indentation.
		expect(resolveFormattingIndent(document, { tabSize: 2, insertSpaces: true })).toBe('  ');
	});

	it('honors an explicit per-language editor.tabSize over the detected FormattingOptions', () => {
		driveEditorConfig({
			tabSize: { key: 'tabSize', defaultValue: 4, workspaceLanguageValue: 8 },
			insertSpaces: { key: 'insertSpaces', defaultValue: true },
		});

		// Detection said 4, but the [turtle] override says 8.
		expect(resolveFormattingIndent(document, { tabSize: 4, insertSpaces: true })).toBe(' '.repeat(8));
	});

	it('honors an explicit insertSpaces=false (tabs) over the detected FormattingOptions', () => {
		driveEditorConfig({
			tabSize: { key: 'tabSize', defaultValue: 4 },
			insertSpaces: { key: 'insertSpaces', defaultValue: true, globalValue: false },
		});

		expect(resolveFormattingIndent(document, { tabSize: 4, insertSpaces: true })).toBe('\t');
	});
});
