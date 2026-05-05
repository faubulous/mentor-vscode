import * as vscode from 'vscode';
import { describe, it, expect, vi } from 'vitest';
import { ShaclDiagnosticsMapper } from '@src/services/validation/shacl-diagnostics-mapper';
import type { ShaclValidationResult, ShaclValidationResultEntry } from '@src/services/validation/shacl-validation-service';
import type { QuadContext } from '@faubulous/mentor-rdf-parsers';

vi.mock('vscode', async () => await import('@src/utilities/mocks/vscode'));

vi.mock('@faubulous/mentor-rdf', () => ({
	SH: {
		Violation: 'http://www.w3.org/ns/shacl#Violation',
		Warning: 'http://www.w3.org/ns/shacl#Warning',
		Info: 'http://www.w3.org/ns/shacl#Info',
	},
}));

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

	function makeToken(startLine: number, startColumn: number, endLine: number, endColumn: number, image: string) {
		return { startLine, startColumn, endLine, endColumn, image, tokenType: { name: 'PNAME_LN' }, tokenTypeIdx: 0 } as any;
	}

	function makeQuadContext(subjectIri: string, predicateIri: string, objectIri: string, objectToken: any): QuadContext {
		return {
			subject: { termType: 'NamedNode', value: subjectIri, equals: () => false },
			predicate: { termType: 'NamedNode', value: predicateIri, equals: () => false },
			object: { termType: 'NamedNode', value: objectIri, equals: () => false },
			graph: { termType: 'DefaultGraph', value: '', equals: () => false },
			subjectToken: makeToken(1, 1, 1, 10, 'ex:Subject'),
			predicateToken: makeToken(1, 12, 1, 20, 'ex:predicate'),
			objectToken,
			equals: () => false,
		} as any;
	}

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

		it('adds the focus node IRI to diagnostic metadata for navigation', () => {
			const focusNode = 'http://example.org/FocusNode';
			const context = makeContext({ subjects: { [focusNode]: [range(0, 0, 0, 10)] } });
			const entry = makeEntry({ focusNode });
			const diagnostics = mapper.mapToDiagnostics(makeResult([entry]), context);

			expect((diagnostics[0] as any).data?.focusNode).toBe(focusNode);
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

	describe('_resolveRange — QuadContext step 0', () => {
		it('uses objectToken from QuadContext when focusNode+path+value match', () => {
			// objectToken at 1-based line 8, col 18-35 → 0-based line 7, col 17-35
			const objectToken = makeToken(8, 18, 8, 35, 'dbr:Dorothy_Comingore');
			const quadContexts = [makeQuadContext(
				'http://dbpedia.org/resource/Citizen_Kane',
				'http://dbpedia.org/ontology/starring',
				'http://dbpedia.org/resource/Dorothy_Comingore',
				objectToken,
			)];
			const context = makeContext({
				subjects: { 'http://dbpedia.org/resource/Citizen_Kane': [range(4, 0, 4, 30)] },
				references: {
					'http://dbpedia.org/ontology/starring': [range(4, 17, 4, 29)],
				},
			});
			const entry = makeEntry({
				focusNode: 'http://dbpedia.org/resource/Citizen_Kane',
				path: 'http://dbpedia.org/ontology/starring',
				value: 'http://dbpedia.org/resource/Dorothy_Comingore',
			});

			const diagnostics = mapper.mapToDiagnostics(makeResult([entry]), context, quadContexts);

			expect(diagnostics[0].range.start.line).toBe(7);
			expect(diagnostics[0].range.start.character).toBe(17);
		});

		it('falls back to references lookup when quadContexts present but no match', () => {
			const objectToken = makeToken(8, 18, 8, 35, 'dbr:Dorothy_Comingore');
			const quadContexts = [makeQuadContext(
				'http://example.org/OtherSubject',
				'http://dbpedia.org/ontology/starring',
				'http://dbpedia.org/resource/Dorothy_Comingore',
				objectToken,
			)];
			const context = makeContext({
				subjects: { 'http://dbpedia.org/resource/Citizen_Kane': [range(4, 0, 4, 30)] },
				references: {
					'http://dbpedia.org/resource/Dorothy_Comingore': [range(4, 32, 4, 54)],
				},
			});
			const entry = makeEntry({
				focusNode: 'http://dbpedia.org/resource/Citizen_Kane',
				path: 'http://dbpedia.org/ontology/starring',
				value: 'http://dbpedia.org/resource/Dorothy_Comingore',
			});

			const diagnostics = mapper.mapToDiagnostics(makeResult([entry]), context, quadContexts);

			// Falls back to the references lookup (line 4), not the unmatched objectToken (line 7)
			expect(diagnostics[0].range.start.line).toBe(4);
		});

		it('reproduces lab_1_sh_class.ttl: same subject on two lines, value outside heuristic window', () => {
			// Citizen_Kane dbo:starring dbr:Orson_Welles .        <- line 4 (0-based)
			// Orson_Welles rdf:type dbo:Actor .                   <- line 5
			// Citizen_Kane dbo:starring dbr:Dorothy_Comingore .   <- line 7
			// Dorothy_Comingore rdf:type dbo:Director .           <- line 8
			//
			// Without QuadContext: window is [4,5), Dorothy_Comingore is outside → wrong predicate highlighted
			// With QuadContext: objectToken at line 7 → correct
			const objectToken = makeToken(8, 18, 8, 39, 'dbr:Dorothy_Comingore');
			const quadContexts = [
				makeQuadContext(
					'http://dbpedia.org/resource/Citizen_Kane',
					'http://dbpedia.org/ontology/starring',
					'http://dbpedia.org/resource/Orson_Welles',
					makeToken(5, 18, 5, 30, 'dbr:Orson_Welles'),
				),
				makeQuadContext(
					'http://dbpedia.org/resource/Citizen_Kane',
					'http://dbpedia.org/ontology/starring',
					'http://dbpedia.org/resource/Dorothy_Comingore',
					objectToken,
				),
			];
			const context = makeContext({
				subjects: {
					'http://dbpedia.org/resource/Citizen_Kane': [range(4, 0, 4, 14)],
					'http://dbpedia.org/resource/Orson_Welles': [range(5, 0, 5, 14)],
					'http://dbpedia.org/resource/Dorothy_Comingore': [range(8, 0, 8, 14)],
				},
				references: {
					'http://dbpedia.org/ontology/starring': [range(4, 16, 4, 29), range(7, 16, 7, 29)],
					'http://dbpedia.org/resource/Dorothy_Comingore': [range(7, 31, 7, 52), range(8, 0, 8, 21)],
				},
			});
			const entry = makeEntry({
				focusNode: 'http://dbpedia.org/resource/Citizen_Kane',
				path: 'http://dbpedia.org/ontology/starring',
				value: 'http://dbpedia.org/resource/Dorothy_Comingore',
			});

			const diagnostics = mapper.mapToDiagnostics(makeResult([entry]), context, quadContexts);

			// With QuadContext: highlights the objectToken at line 7 (0-based)
			expect(diagnostics[0].range.start.line).toBe(7);

			// Without QuadContext: heuristic window [4,5) misses Dorothy_Comingore and falls back
			// to the first dbo:starring at line 4 — wrong predicate on wrong line
			const diagnosticsNoQC = mapper.mapToDiagnostics(makeResult([entry]), context);
			expect(diagnosticsNoQC[0].range.start.line).toBe(4);
		});
	});

	describe('constraint component scenarios', () => {
		// -----------------------------------------------------------------------
		// Group A: both sh:resultPath (path) and sh:value are present.
		// Step 0 (QuadContext) highlights the exact object token.
		// -----------------------------------------------------------------------

		it('DatatypeConstraintComponent: literal value with QuadContext → highlights the literal object token', () => {
			// Literal values are NOT indexed in context.references, so Step 1 always misses.
			// With a QuadContext, Step 0 matches on qc.object.value (the lexical form)
			// and returns the exact token range from the source file.
			const objectToken = makeToken(6, 14, 6, 25, '"twenty two"');
			const qc = makeQuadContext(
				'http://example.org/Bob',
				'http://example.org/age',
				'twenty two',
				objectToken,
			);
			(qc as any).object = { termType: 'Literal', value: 'twenty two', equals: () => false };
			const quadContexts = [qc];

			const context = makeContext({
				subjects: { 'http://example.org/Bob': [range(5, 0, 5, 9)] },
				references: { 'http://example.org/age': [range(6, 4, 6, 13)] },
			});
			const entry = makeEntry({
				focusNode: 'http://example.org/Bob',
				path: 'http://example.org/age',
				value: 'twenty two',
				constraintComponent: 'http://www.w3.org/ns/shacl#DatatypeConstraintComponent',
			});

			const diagnostics = mapper.mapToDiagnostics(makeResult([entry]), context, quadContexts);

			// 1-based line 6, col 14 → 0-based line 5, col 13
			expect(diagnostics[0].range.start.line).toBe(5);
			expect(diagnostics[0].range.start.character).toBe(13);
		});

		it('DatatypeConstraintComponent: literal value without QuadContext → falls back to predicate', () => {
			// Literals are not in context.references, so Step 1 always misses for literal values.
			// Without a QuadContext, Step 2 (predicate) is the next-best position.
			const context = makeContext({
				subjects: { 'http://example.org/Bob': [range(5, 0, 5, 9)] },
				references: { 'http://example.org/age': [range(6, 4, 6, 13)] },
			});
			const entry = makeEntry({
				focusNode: 'http://example.org/Bob',
				path: 'http://example.org/age',
				value: 'twenty two',
				constraintComponent: 'http://www.w3.org/ns/shacl#DatatypeConstraintComponent',
			});

			const diagnostics = mapper.mapToDiagnostics(makeResult([entry]), context);

			// Step 1 misses (literal not in references), Step 2 finds the predicate at line 6.
			expect(diagnostics[0].range.start.line).toBe(6);
		});

		it('ClosedConstraintComponent: disallowed predicate + object IRI, QuadContext match → highlights disallowed object', () => {
			// sh:ClosedConstraintComponent always populates sh:resultPath = disallowed predicate
			// and sh:value = the disallowed object (guaranteed by the SHACL spec).
			// With a QuadContext, Step 0 highlights the object token instead of the predicate.
			const objectToken = makeToken(4, 22, 4, 36, 'ex:birthDate_value');
			const quadContexts = [makeQuadContext(
				'http://example.org/Bob',
				'http://example.org/birthDate',
				'http://example.org/birthDate_value',
				objectToken,
			)];
			const context = makeContext({
				subjects: { 'http://example.org/Bob': [range(3, 0, 3, 9)] },
				references: {
					'http://example.org/birthDate': [range(4, 4, 4, 20)],
				},
			});
			const entry = makeEntry({
				focusNode: 'http://example.org/Bob',
				path: 'http://example.org/birthDate',
				value: 'http://example.org/birthDate_value',
				constraintComponent: 'http://www.w3.org/ns/shacl#ClosedConstraintComponent',
			});

			const diagnostics = mapper.mapToDiagnostics(makeResult([entry]), context, quadContexts);

			// 1-based line 4, col 22 → 0-based line 3, col 21
			expect(diagnostics[0].range.start.line).toBe(3);
			expect(diagnostics[0].range.start.character).toBe(21);
		});

		// -----------------------------------------------------------------------
		// Group B: sh:resultPath is present but sh:value is absent.
		// The engine cannot supply a value because the violation concerns a missing
		// or absent triple (e.g. sh:minCount, sh:hasValue).
		// -----------------------------------------------------------------------

		it('HasValueConstraintComponent: no value, predicate present in block → highlights predicate', () => {
			// sh:HasValueConstraintComponent: the required value is absent so no sh:value is produced.
			// Step 0 is bypassed (no value), Step 1 is bypassed (no value).
			// Step 2 finds the predicate token in the focus node's block.
			const context = makeContext({
				subjects: { 'http://example.org/Alice': [range(8, 0, 8, 30)] },
				references: { 'http://example.org/alumniOf': [range(9, 4, 9, 20)] },
			});
			const entry = makeEntry({
				focusNode: 'http://example.org/Alice',
				path: 'http://example.org/alumniOf',
				value: undefined,
				constraintComponent: 'http://www.w3.org/ns/shacl#HasValueConstraintComponent',
			});

			const diagnostics = mapper.mapToDiagnostics(makeResult([entry]), context);

			expect(diagnostics[0].range.start.line).toBe(9);
		});

		it('MinCountConstraintComponent: no value, predicate completely absent → highlights focus node', () => {
			// When the required property was never stated (sh:minCount violation with 0 values),
			// sh:value is absent and there is no reference to the predicate in the document.
			// Step 3 falls back to the focus node position.
			const context = makeContext({
				subjects: { 'http://example.org/Bob': [range(15, 0, 15, 30)] },
				// No references entry for the required property.
			});
			const entry = makeEntry({
				focusNode: 'http://example.org/Bob',
				path: 'http://example.org/requiredProp',
				value: undefined,
				constraintComponent: 'http://www.w3.org/ns/shacl#MinCountConstraintComponent',
			});

			const diagnostics = mapper.mapToDiagnostics(makeResult([entry]), context);

			expect(diagnostics[0].range.start.line).toBe(15);
		});

		// -----------------------------------------------------------------------
		// Node-level constraint components (no sh:resultPath, no sh:value).
		// Applied to node shapes, these produce results without a property path.
		// -----------------------------------------------------------------------

		it('node-level logical constraint with no path and no value → highlights focus node', () => {
			// sh:AndConstraintComponent / sh:OrConstraintComponent applied to a node shape
			// produce a result with no sh:resultPath (not a property shape constraint).
			// Steps 0–2 are all bypassed; Step 3 highlights the focus node.
			const context = makeContext({
				subjects: { 'http://example.org/FocusNode': [range(20, 0, 20, 40)] },
			});
			const entry = makeEntry({
				focusNode: 'http://example.org/FocusNode',
				path: undefined,
				value: undefined,
				constraintComponent: 'http://www.w3.org/ns/shacl#AndConstraintComponent',
			});

			const diagnostics = mapper.mapToDiagnostics(makeResult([entry]), context);

			expect(diagnostics[0].range.start.line).toBe(20);
		});

		it('complex property path: path is undefined but value IRI is in focus node block → highlights value', () => {
			// When sh:path is a non-predicate path (e.g. a sequence path), _mapResults cannot
			// extract a single predicate IRI, leaving entry.path undefined.
			// Step 0 is bypassed (needs both path and value), but Step 1 still looks up
			// the value IRI in context.references using the focus-node-anchored window.
			const context = makeContext({
				subjects: {
					'http://example.org/FocusNode': [range(10, 0, 10, 40)],
					'http://example.org/OtherNode': [range(20, 0, 20, 40)],
				},
				references: {
					// Value appears within the focus node's block (between lines 10 and 20).
					'http://example.org/BadValue': [range(12, 4, 12, 30)],
				},
			});
			const entry = makeEntry({
				focusNode: 'http://example.org/FocusNode',
				path: undefined,
				value: 'http://example.org/BadValue',
				constraintComponent: 'http://www.w3.org/ns/shacl#NodeConstraintComponent',
			});

			const diagnostics = mapper.mapToDiagnostics(makeResult([entry]), context);

			// Step 0 skipped (no path), Step 1 finds the value reference at line 12.
			expect(diagnostics[0].range.start.line).toBe(12);
		});

		// -----------------------------------------------------------------------
		// Iteration behaviour.
		// -----------------------------------------------------------------------

		it('produces one diagnostic per result entry', () => {
			const context = makeContext({
				subjects: {
					'http://example.org/Alice': [range(5, 0, 5, 20)],
					'http://example.org/Bob': [range(10, 0, 10, 20)],
				},
			});
			const entries = [
				makeEntry({ focusNode: 'http://example.org/Alice' }),
				makeEntry({ focusNode: 'http://example.org/Bob' }),
			];

			const diagnostics = mapper.mapToDiagnostics(makeResult(entries), context);

			expect(diagnostics).toHaveLength(2);
			expect(diagnostics[0].range.start.line).toBe(5);
			expect(diagnostics[1].range.start.line).toBe(10);
		});

		it('returns no diagnostics when the validation result set is empty', () => {
			const diagnostics = mapper.mapToDiagnostics(makeResult([]), makeContext());

			expect(diagnostics).toHaveLength(0);
		});
	});
});
