import { describe, it, expect, vi } from 'vitest';
import * as vscode from 'vscode';

vi.mock('vscode', async () => await import('../../utilities/mocks/vscode'));

vi.mock('@faubulous/mentor-rdf', () => ({
	SH: {
		Violation: 'http://www.w3.org/ns/shacl#Violation',
		Warning: 'http://www.w3.org/ns/shacl#Warning',
		Info: 'http://www.w3.org/ns/shacl#Info',
	},
}));

import { ShaclDiagnosticsMapper } from './shacl-diagnostics-mapper';
import type { ShaclValidationResult, ShaclValidationResultEntry } from './shacl-validation-service';

function range(startLine: number, startChar: number, endLine: number, endChar: number) {
	return { start: { line: startLine, character: startChar }, end: { line: endLine, character: endChar } };
}

function makeContext(overrides: Partial<{
	subjects: Record<string, any[]>;
	references: Record<string, any[]>;
}> = {}): any {
	return {
		subjects: {},
		references: {},
		predicates: { label: [] },
		...overrides,
	};
}

function makeEntry(overrides: Partial<ShaclValidationResultEntry> = {}): ShaclValidationResultEntry {
	return {
		focusNode: 'http://example.org/FocusNode',
		severity: 'http://www.w3.org/ns/shacl#Violation',
		constraintComponent: 'http://www.w3.org/ns/shacl#MinCountConstraintComponent',
		messages: [],
		sourceShape: 'http://example.org/Shape',
		...overrides,
	};
}

function makeResult(entries: ShaclValidationResultEntry[]): ShaclValidationResult {
	return {
		conforms: entries.length === 0,
		reportDataset: { match: () => ({ [Symbol.iterator]: () => ({ next: () => ({ done: true }) }) }), size: 0 } as any,
		results: entries,
	};
}

describe('ShaclDiagnosticsMapper', () => {
	const mapper = new ShaclDiagnosticsMapper();

	describe('_resolveRange — basic fallback cascade', () => {
		it('highlights the value IRI when available and found', () => {
			const context = makeContext({
				subjects: { 'http://example.org/FocusNode': [range(10, 0, 10, 40)] },
				references: { 'http://example.org/BadValue': [range(12, 4, 12, 50)] },
			});
			const entry = makeEntry({ value: 'http://example.org/BadValue' });
			const result = makeResult([entry]);

			const diagnostics = mapper.mapToDiagnostics(result, context);

			expect(diagnostics).toHaveLength(1);
			expect(diagnostics[0].range.start.line).toBe(12);
		});

		it('highlights the path IRI when value is not found', () => {
			const context = makeContext({
				subjects: { 'http://example.org/FocusNode': [range(10, 0, 10, 40)] },
				references: { 'http://example.org/somePath': [range(11, 4, 11, 30)] },
			});
			const entry = makeEntry({ path: 'http://example.org/somePath' });
			const result = makeResult([entry]);

			const diagnostics = mapper.mapToDiagnostics(result, context);

			expect(diagnostics).toHaveLength(1);
			expect(diagnostics[0].range.start.line).toBe(11);
		});

		it('highlights the focus node when path is not found', () => {
			const context = makeContext({
				subjects: { 'http://example.org/FocusNode': [range(10, 0, 10, 40)] },
			});
			const entry = makeEntry({ path: 'http://example.org/unknownPath' });
			const result = makeResult([entry]);

			const diagnostics = mapper.mapToDiagnostics(result, context);

			expect(diagnostics).toHaveLength(1);
			expect(diagnostics[0].range.start.line).toBe(10);
		});

		it('falls back to line 0 when focus node is not in the document', () => {
			const context = makeContext();
			const entry = makeEntry();
			const result = makeResult([entry]);

			const diagnostics = mapper.mapToDiagnostics(result, context);

			expect(diagnostics).toHaveLength(1);
			expect(diagnostics[0].range.start.line).toBe(0);
			expect(diagnostics[0].range.start.character).toBe(0);
		});
	});

	describe('_resolveRange — anchor line filtering', () => {
		it('picks the path reference at or after the focus node start line', () => {
			// Path IRI appears at lines 5, 15, 25; focus node at line 10.
			// Should pick line 15 (first at or after 10).
			const context = makeContext({
				subjects: { 'http://example.org/FocusNode': [range(10, 0, 10, 40)] },
				references: {
					'http://example.org/somePath': [
						range(5, 0, 5, 20),
						range(15, 4, 15, 30),
						range(25, 4, 25, 30),
					],
				},
			});
			const entry = makeEntry({ path: 'http://example.org/somePath' });
			const result = makeResult([entry]);

			const diagnostics = mapper.mapToDiagnostics(result, context);

			expect(diagnostics).toHaveLength(1);
			expect(diagnostics[0].range.start.line).toBe(15);
		});

		it('does NOT fall back to an unrelated earlier reference when all path references are before the focus node', () => {
			// Scenario: ClassA is a subject at line 95.
			// The violation path (rdfs:comment) appears at lines 5 and 20
			// in other definitions earlier in the file — none belonging to ClassA.
			// The mapper must NOT pick lines 5 or 20; it should fall through to
			// the focus node position at line 95 instead.
			const FOCUS_NODE = 'http://example.org/ClassA';
			const PATH = 'http://www.w3.org/2000/01/rdf-schema#comment';
			const UNRELATED_PROPERTY = 'http://example.org/unrelatedProperty';

			const context = makeContext({
				subjects: { [FOCUS_NODE]: [range(95, 0, 95, 60)] },
				references: {
					// rdfs:comment appears only before the focus node (in other definitions)
					[PATH]: [range(5, 4, 5, 20), range(20, 4, 20, 20)],
					// unrelatedProperty appears earlier in the file
					[UNRELATED_PROPERTY]: [range(60, 4, 60, 70)],
				},
			});

			const entry = makeEntry({
				focusNode: FOCUS_NODE,
				path: PATH,
			});
			const result = makeResult([entry]);

			const diagnostics = mapper.mapToDiagnostics(result, context);

			expect(diagnostics).toHaveLength(1);
			// Should resolve to the focus node's subject position (line 95),
			// NOT to an earlier unrelated reference of rdfs:comment.
			expect(diagnostics[0].range.start.line).toBe(95);
		});

		it('falls back to focus node when the path predicate is missing but exists at a later subject', () => {
			// Reproduces the "missing predicate" scenario:
			// - ClassB is a subject at line 20
			// - ClassC is a subject at line 30
			// - rdfs:comment appears at line 32 (inside ClassC's block)
			// - ClassB has NO rdfs:comment at all
			// - The mapper must NOT pick the rdfs:comment at line 32 because
			//   it belongs to ClassC. It should highlight the focus node at line 20.
			const FOCUS_NODE = 'http://example.org/ClassB';
			const PATH = 'http://www.w3.org/2000/01/rdf-schema#comment';

			const context = makeContext({
				subjects: {
					'http://example.org/ClassA': [range(10, 0, 10, 30)],
					[FOCUS_NODE]: [range(20, 0, 20, 30)],
					'http://example.org/ClassC': [range(30, 0, 30, 30)],
				},
				references: {
					// rdfs:comment only exists in ClassC's block (line 32), not in ClassB's
					[PATH]: [range(32, 4, 32, 20)],
				},
			});

			const entry = makeEntry({ focusNode: FOCUS_NODE, path: PATH });
			const result = makeResult([entry]);
			const diagnostics = mapper.mapToDiagnostics(result, context);

			expect(diagnostics).toHaveLength(1);
			// Should highlight the focus node at line 20, NOT the rdfs:comment at line 32
			expect(diagnostics[0].range.start.line).toBe(20);
		});

		it('does NOT fall back to an earlier value reference when all value references are before the focus node', () => {
			const context = makeContext({
				subjects: { 'http://example.org/FocusNode': [range(50, 0, 50, 40)] },
				references: {
					'http://example.org/SomeValue': [range(10, 0, 10, 30), range(20, 0, 20, 30)],
				},
			});
			const entry = makeEntry({ value: 'http://example.org/SomeValue' });
			const result = makeResult([entry]);

			const diagnostics = mapper.mapToDiagnostics(result, context);

			expect(diagnostics).toHaveLength(1);
			// Should fall through to focus node at line 50, not the value ref at line 10.
			expect(diagnostics[0].range.start.line).toBe(50);
		});
	});

	describe('severity mapping', () => {
		it('maps sh:Violation to Error', () => {
			const context = makeContext({ subjects: { 'http://example.org/FocusNode': [range(0, 0, 0, 10)] } });
			const entry = makeEntry({ severity: 'http://www.w3.org/ns/shacl#Violation' });
			const diagnostics = mapper.mapToDiagnostics(makeResult([entry]), context);
			expect(diagnostics[0].severity).toBe(vscode.DiagnosticSeverity.Error);
		});

		it('maps sh:Warning to Warning', () => {
			const context = makeContext({ subjects: { 'http://example.org/FocusNode': [range(0, 0, 0, 10)] } });
			const entry = makeEntry({ severity: 'http://www.w3.org/ns/shacl#Warning' });
			const diagnostics = mapper.mapToDiagnostics(makeResult([entry]), context);
			expect(diagnostics[0].severity).toBe(vscode.DiagnosticSeverity.Warning);
		});

		it('maps sh:Info to Information', () => {
			const context = makeContext({ subjects: { 'http://example.org/FocusNode': [range(0, 0, 0, 10)] } });
			const entry = makeEntry({ severity: 'http://www.w3.org/ns/shacl#Info' });
			const diagnostics = mapper.mapToDiagnostics(makeResult([entry]), context);
			expect(diagnostics[0].severity).toBe(vscode.DiagnosticSeverity.Information);
		});
	});

	describe('message building', () => {
		it('uses entry messages when present', () => {
			const context = makeContext({ subjects: { 'http://example.org/FocusNode': [range(0, 0, 0, 10)] } });
			const entry = makeEntry({ messages: ['Value must be of type xsd:string', 'Also needs language tag'] });
			const diagnostics = mapper.mapToDiagnostics(makeResult([entry]), context);
			expect(diagnostics[0].message).toBe('Value must be of type xsd:string; Also needs language tag');
		});

		it('builds fallback message from constraint component', () => {
			const context = makeContext({ subjects: { 'http://example.org/FocusNode': [range(0, 0, 0, 10)] } });
			const entry = makeEntry({
				messages: [],
				constraintComponent: 'http://www.w3.org/ns/shacl#MinCountConstraintComponent',
				path: 'http://www.w3.org/2000/01/rdf-schema#comment',
				value: 'http://example.org/BadValue',
			});
			const diagnostics = mapper.mapToDiagnostics(makeResult([entry]), context);
			expect(diagnostics[0].message).toContain('MinCountConstraintComponent');
			expect(diagnostics[0].message).toContain('comment');
			expect(diagnostics[0].message).toContain('http://example.org/BadValue');
		});
	});
});
