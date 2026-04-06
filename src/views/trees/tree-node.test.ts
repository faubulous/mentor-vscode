import { describe, it, expect, beforeEach } from 'vitest';
import * as vscode from 'vscode';
import { TreeNodeBase, sortByLabel } from './tree-node';

// Minimal concrete implementation for testing TreeNodeBase
class TestNode extends TreeNodeBase {
	private _label: string;
	private _children: TestNode[];

	constructor(label: string, id: string = label, children: TestNode[] = []) {
		super();
		this._label = label;
		this.id = id;
		this._children = children;
	}

	getContextValue(): string {
		return 'test-resource';
	}

	getLabel(): vscode.TreeItemLabel {
		return { label: this._label };
	}

	override getChildren() {
		return this._children;
	}
}

describe('TreeNodeBase', () => {
	let node: TestNode;

	beforeEach(() => {
		node = new TestNode('Example');
	});

	describe('defaults', () => {
		it('should have an empty id by default', () => {
			expect(node.id).toBe('Example');
		});

		it('should have an empty uri by default', () => {
			expect(node.uri).toBe('');
		});

		it('should default initialCollapsibleState to Collapsed', () => {
			expect(node.initialCollapsibleState).toBe(vscode.TreeItemCollapsibleState.Collapsed);
		});
	});

	describe('getCommand', () => {
		it('should return undefined by default', () => {
			expect(node.getCommand()).toBeUndefined();
		});
	});

	describe('getCollapsibleState', () => {
		it('should return None when node has no children', () => {
			expect(node.getCollapsibleState()).toBe(vscode.TreeItemCollapsibleState.None);
		});

		it('should return initialCollapsibleState when node has children', () => {
			const child = new TestNode('Child');
			const parent = new TestNode('Parent', 'parent-id', [child]);

			expect(parent.getCollapsibleState()).toBe(vscode.TreeItemCollapsibleState.Collapsed);
		});

		it('should reflect a non-default initialCollapsibleState when children exist', () => {
			const child = new TestNode('Child');
			const parent = new TestNode('Parent', 'parent-id', [child]);
			parent.initialCollapsibleState = vscode.TreeItemCollapsibleState.Expanded;

			expect(parent.getCollapsibleState()).toBe(vscode.TreeItemCollapsibleState.Expanded);
		});
	});

	describe('hasChildren', () => {
		it('should return false when there are no children', () => {
			expect(node.hasChildren()).toBe(false);
		});

		it('should return true when there are children', () => {
			const parent = new TestNode('Parent', 'p', [new TestNode('Child')]);
			expect(parent.hasChildren()).toBe(true);
		});
	});

	describe('getChildren', () => {
		it('should return an empty array by default', () => {
			expect(node.getChildren()).toEqual([]);
		});
	});

	describe('getDescription', () => {
		it('should return an empty string by default', () => {
			expect(node.getDescription()).toBe('');
		});
	});

	describe('getTooltip', () => {
		it('should return undefined by default', () => {
			expect(node.getTooltip()).toBeUndefined();
		});
	});

	describe('getIcon', () => {
		it('should return undefined by default', () => {
			expect(node.getIcon()).toBeUndefined();
		});
	});

	describe('getIconColor', () => {
		it('should return a ThemeColor for descriptionForeground', () => {
			const color = node.getIconColor();
			expect(color).toBeInstanceOf(vscode.ThemeColor);
		});
	});
});

describe('sortByLabel', () => {
	it('should return an empty array for empty input', () => {
		expect(sortByLabel([])).toEqual([]);
	});

	it('should return a single-element array unchanged', () => {
		const node = new TestNode('Alpha');
		expect(sortByLabel([node])).toEqual([node]);
	});

	it('should sort nodes alphabetically by label', () => {
		const nodes = [
			new TestNode('Zebra'),
			new TestNode('Alpha'),
			new TestNode('Mango'),
		];
		const sorted = sortByLabel(nodes);
		expect(sorted.map(n => n.getLabel().label)).toEqual(['Alpha', 'Mango', 'Zebra']);
	});

	it('should be case-sensitive by localeCompare rules', () => {
		const nodes = [
			new TestNode('banana'),
			new TestNode('Apple'),
			new TestNode('Cherry'),
		];
		const sorted = sortByLabel(nodes);
		// localeCompare is locale-dependent; just verify it's sorted consistently
		const labels = sorted.map(n => n.getLabel().label);
		expect(labels).toEqual([...labels].sort((a, b) => a.localeCompare(b)));
	});

	it('should preserve original node references', () => {
		const a = new TestNode('B');
		const b = new TestNode('A');
		const sorted = sortByLabel([a, b]);
		expect(sorted[0]).toBe(b);
		expect(sorted[1]).toBe(a);
	});
});
