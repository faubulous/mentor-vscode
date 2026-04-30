import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));

let mockSettingsGet: (key: string, defaultValue?: any) => any;

vi.mock('tsyringe', () => ({
	container: {
		resolve: vi.fn((token: string) => {
			if (token === 'SettingsService') {
				return { get: (k: string, d?: any) => mockSettingsGet(k, d) };
			}
			return {};
		}),
	},
	injectable: () => (t: any) => t,
	inject: () => () => {},
	singleton: () => (t: any) => t,
}));

import * as vscode from 'vscode';
import { DefinitionTreeNode, getIriFromArgument } from '@src/views/trees/definition-tree/definition-tree-node';

// Minimal IDocumentContext stub
function makeContext(overrides: Partial<{
	graphs: string[];
	getResourceLabel: (iri: string) => any;
	getResourceTooltip: (iri: string) => any;
	activeLanguageTag: string | undefined;
	activeLanguage: string | undefined;
}> = {}): any {
	return {
		graphs: ['urn:graph1'],
		getResourceLabel: (_iri: string) => ({ value: 'Test Label', language: undefined }),
		getResourceTooltip: (_iri: string) => new vscode.MarkdownString('Tooltip'),
		activeLanguageTag: undefined,
		activeLanguage: undefined,
		...overrides,
	};
}

beforeEach(() => {
	mockSettingsGet = (key: string, defaultValue?: any) => {
		if (key === 'view.showReferences') return true;
		return defaultValue;
	};
});

describe('DefinitionTreeNode', () => {
	describe('constructor', () => {
		it('should set id, uri, and document', () => {
			const ctx = makeContext();
			const node = new DefinitionTreeNode(ctx, 'node-id', 'urn:some-resource');
			expect(node.id).toBe('node-id');
			expect(node.uri).toBe('urn:some-resource');
			expect(node.document).toBe(ctx);
		});

		it('should initialise with no parent', () => {
			const node = new DefinitionTreeNode(makeContext(), 'id', 'urn:x');
			expect(node.parent).toBeUndefined();
		});
	});

	describe('getContextValue', () => {
		it('should return "resource"', () => {
			const node = new DefinitionTreeNode(makeContext(), 'id', 'urn:x');
			expect(node.getContextValue()).toBe('resource');
		});
	});

	describe('getCommand', () => {
		it('should return the revealDefinition command', () => {
			const node = new DefinitionTreeNode(makeContext(), 'my-id', 'urn:x');
			const cmd = node.getCommand();
			expect(cmd?.command).toBe('mentor.command.revealDefinition');
			expect(cmd?.arguments).toEqual(['my-id', true]);
		});
	});

	describe('getDocumentGraphs', () => {
		it('should return document.graphs', () => {
			const ctx = makeContext({ graphs: ['urn:g1', 'urn:g2'] });
			const node = new DefinitionTreeNode(ctx, 'id', 'urn:x');
			expect(node.getDocumentGraphs()).toEqual(['urn:g1', 'urn:g2']);
		});
	});

	describe('getLabel', () => {
		it('should return the resource label from the document', () => {
			const ctx = makeContext({
				getResourceLabel: () => ({ value: 'My Class', language: undefined }),
			});
			const node = new DefinitionTreeNode(ctx, 'id', 'urn:x');
			expect(node.getLabel()).toEqual({ label: 'My Class' });
		});
	});

	describe('getDescription', () => {
		it('should return empty string when label has no language', () => {
			const ctx = makeContext({
				getResourceLabel: () => ({ value: 'Label', language: undefined }),
				activeLanguageTag: 'en',
			});
			const node = new DefinitionTreeNode(ctx, 'id', 'urn:x');
			expect(node.getDescription()).toBe('');
		});

		it('should return empty string when activeLanguageTag is undefined', () => {
			const ctx = makeContext({
				getResourceLabel: () => ({ value: 'Label', language: 'en' }),
				activeLanguageTag: undefined,
			});
			const node = new DefinitionTreeNode(ctx, 'id', 'urn:x');
			expect(node.getDescription()).toBe('');
		});

		it('should return language tag when label language differs from active language', () => {
			const ctx = makeContext({
				getResourceLabel: () => ({ value: 'Bezeichnung', language: 'de' }),
				activeLanguageTag: 'en',
				activeLanguage: 'en',
			});
			const node = new DefinitionTreeNode(ctx, 'id', 'urn:x');
			expect(node.getDescription()).toBe('@de');
		});

		it('should return empty string when label language matches active language', () => {
			const ctx = makeContext({
				getResourceLabel: () => ({ value: 'Label', language: 'en' }),
				activeLanguageTag: 'en',
				activeLanguage: 'en',
			});
			const node = new DefinitionTreeNode(ctx, 'id', 'urn:x');
			expect(node.getDescription()).toBe('');
		});

		it('should return language tag when label language is more specific than active language tag', () => {
			// e.g. active = 'en', label = 'en-US' → return '@en-US'
			const ctx = makeContext({
				getResourceLabel: () => ({ value: 'Label', language: 'en-US' }),
				activeLanguageTag: 'en',
				activeLanguage: 'en',
			});
			const node = new DefinitionTreeNode(ctx, 'id', 'urn:x');
			expect(node.getDescription()).toBe('@en-US');
		});
	});

	describe('getTooltip', () => {
		it('should return the tooltip from the document when uri is set', () => {
			const ctx = makeContext({
				getResourceTooltip: () => new vscode.MarkdownString('### Test'),
			});
			const node = new DefinitionTreeNode(ctx, 'id', 'urn:x');
			const tooltip = node.getTooltip();
			expect(tooltip).toBeInstanceOf(vscode.MarkdownString);
		});

		it('should return undefined when uri is empty', () => {
			const ctx = makeContext();
			const node = new DefinitionTreeNode(ctx, 'id', '');
			expect(node.getTooltip()).toBeUndefined();
		});
	});

	describe('getResourceUri', () => {
		it('should parse the uri and return a vscode.Uri', () => {
			const node = new DefinitionTreeNode(makeContext(), 'id', 'urn:x');
			const uri = node.getResourceUri();
			expect(uri?.toString()).toContain('urn:x');
		});
	});

	describe('resolveNodeForUri', () => {
		it('should return undefined by default', () => {
			const node = new DefinitionTreeNode(makeContext(), 'id', 'urn:x');
			expect(node.resolveNodeForUri('urn:y')).toBeUndefined();
		});
	});

	describe('getQueryOptions', () => {
		it('should include includeReferenced from settings', () => {
			const node = new DefinitionTreeNode(makeContext(), 'id', 'urn:x');
			const opts = node.getQueryOptions();
			expect(opts.includeReferenced).toBe(true);
		});

		it('should merge additional options over base options', () => {
			const node = new DefinitionTreeNode(makeContext(), 'id', 'urn:x', { definedBy: 'urn:ontology' });
			const opts = node.getQueryOptions({ includeSubTypes: false });
			expect(opts.definedBy).toBe('urn:ontology');
			expect((opts as any).includeSubTypes).toBe(false);
		});

		it('should let additionalOptions override base options', () => {
			const node = new DefinitionTreeNode(makeContext(), 'id', 'urn:x', { includeReferenced: false });
			// settings returns true for showReferences, but base options has includeReferenced: false
			// The getQueryOptions merges: { ...this._queryOptions, includeReferenced: settings, ...additionalOptions }
			// So settings value wins over _queryOptions for includeReferenced
			const opts = node.getQueryOptions();
			expect(opts.includeReferenced).toBe(true); // settings value
		});
	});

	describe('createChildNode', () => {
		it('should create a child node with the correct id and uri', () => {
			const parent = new DefinitionTreeNode(makeContext(), 'root-id', 'urn:root');
			const child = parent.createChildNode(DefinitionTreeNode, 'urn:child');
			expect(child.uri).toBe('urn:child');
			expect(child.id).toBe('root-id/<urn:child>');
		});

		it('should set the parent of the child node', () => {
			const parent = new DefinitionTreeNode(makeContext(), 'root-id', 'urn:root');
			const child = parent.createChildNode(DefinitionTreeNode, 'urn:child');
			expect(child.parent).toBe(parent);
		});
	});

	describe('walkHierarchyPath', () => {
		it('should return undefined for an empty path', () => {
			const node = new DefinitionTreeNode(makeContext(), 'id', 'urn:x');
			// walkHierarchyPath with empty path never finds anything (loop never runs)
			expect(node.walkHierarchyPath([])).toBeUndefined();
		});

		it('should return undefined when a path step is not found in children', () => {
			const parent = new DefinitionTreeNode(makeContext(), 'root', 'urn:root');
			expect(parent.walkHierarchyPath(['urn:nonexistent'])).toBeUndefined();
		});

		it('should traverse and return a node matching a single-level path', () => {
			const ctx = makeContext();
			const parent = new DefinitionTreeNode(ctx, 'root', 'urn:root');
			const child = new DefinitionTreeNode(ctx, 'root/<urn:child>', 'urn:child');

			// Override getChildren on parent so it returns the child
			vi.spyOn(parent, 'getChildren').mockReturnValue([child]);

			const found = parent.walkHierarchyPath(['urn:child']);
			expect(found).toBe(child);
		});

		it('should traverse multi-level paths', () => {
			const ctx = makeContext();
			const root = new DefinitionTreeNode(ctx, 'root', 'urn:root');
			const mid = new DefinitionTreeNode(ctx, 'root/<urn:mid>', 'urn:mid');
			const leaf = new DefinitionTreeNode(ctx, 'root/<urn:mid>/<urn:leaf>', 'urn:leaf');

			vi.spyOn(root, 'getChildren').mockReturnValue([mid]);
			vi.spyOn(mid, 'getChildren').mockReturnValue([leaf]);

			const found = root.walkHierarchyPath(['urn:mid', 'urn:leaf']);
			expect(found).toBe(leaf);
		});
	});
});

describe('getIriFromArgument', () => {
	it('should extract IRI from a DefinitionTreeNode id', () => {
		const node = new DefinitionTreeNode(makeContext(), 'root/<urn:resource>', 'urn:resource');
		expect(getIriFromArgument(node)).toBe('urn:resource');
	});

	it('should extract IRI from a string id', () => {
		expect(getIriFromArgument('root/<urn:resource>')).toBe('urn:resource');
	});

	it('should throw for invalid argument type', () => {
		expect(() => getIriFromArgument(42 as any)).toThrow();
	});
});
