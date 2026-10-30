import { RdfDataFactory } from '@src/utilities/rdf';
import type { Term } from '@rdfjs/types';
import type { SparqlQueryExecutionState } from '@src/languages/sparql/services/sparql-query-state';

const WORDS = ['alpha', 'beta', 'gamma', 'delta', 'epsilon', 'zeta', 'eta', 'theta', 'iota', 'kappa', 'lambda', 'omicron'];

/**
 * Generates reproducible synthetic inputs for the performance harness: Turtle
 * ontologies of a chosen size, whole workspaces of such files, and SPARQL query
 * history entries that carry large results. Equal seeds produce equal output.
 */
export class CorpusGenerator {
	private _state: number;

	/**
	 * @param seed The seed of the pseudo-random generator.
	 */
	constructor(seed = 1) {
		this._state = (seed >>> 0) || 1;
	}

	/**
	 * Generates a Turtle ontology. Each class contributes four quads: a type
	 * assertion, a subclass axiom, a language-tagged label and a comment.
	 * @param classCount The number of classes to generate.
	 * @param namespace The namespace of the generated classes.
	 * @returns The Turtle text.
	 */
	generateOntologyTurtle(classCount: number, namespace = 'http://example.org/perf/'): string {
		const lines = [
			`@prefix ex: <${namespace}> .`,
			'@prefix owl: <http://www.w3.org/2002/07/owl#> .',
			'@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .',
			''
		];

		for (let index = 0; index < classCount; index++) {
			lines.push(`ex:Class${index} a owl:Class ;`);
			lines.push(`\trdfs:subClassOf ex:Class${Math.floor(index / 2)} ;`);
			lines.push(`\trdfs:label "Class ${index} ${this._nextWord()}"@en ;`);
			lines.push(`\trdfs:comment "${this._nextSentence()}" .`);
			lines.push('');
		}

		return lines.join('\n');
	}

	/**
	 * Generates a workspace of Turtle files, each in its own namespace.
	 * @param fileCount The number of files.
	 * @param classesPerFile The number of classes per file.
	 * @param rootUri The folder URI the file URIs are placed under.
	 * @returns A map of file URI to Turtle text, in generation order.
	 */
	generateWorkspace(fileCount: number, classesPerFile: number, rootUri = 'file:///perf'): Map<string, string> {
		const files = new Map<string, string>();

		for (let index = 0; index < fileCount; index++) {
			const namespace = `http://example.org/perf/${index}/`;

			files.set(`${rootUri}/ontology-${index}.ttl`, this.generateOntologyTurtle(classesPerFile, namespace));
		}

		return files;
	}

	/**
	 * Generates a finished SELECT query execution whose result holds the given
	 * number of rows and whose raw response body has the given length.
	 * @param rowCount The number of result rows.
	 * @param rawBodyLength The length of the raw response body in characters.
	 * @param index A number that makes the entry's id and document unique.
	 * @returns The query execution state.
	 */
	generateQueryHistoryEntry(rowCount: number, rawBodyLength: number, index = 0): SparqlQueryExecutionState {
		const rows: Record<string, Term>[] = [];

		for (let row = 0; row < rowCount; row++) {
			rows.push({
				s: RdfDataFactory.namedNode(`http://example.org/perf/subject/${row}`),
				p: RdfDataFactory.namedNode('http://www.w3.org/2000/01/rdf-schema#label'),
				o: RdfDataFactory.literal(`Row ${row} ${this._nextWord()}`, 'en')
			});
		}

		const startTime = Date.now() - 1000 * (index + 1);

		return {
			id: `perf-query-${index}`,
			documentIri: `file:///perf/query-${index}.sparql`,
			query: 'SELECT ?s ?p ?o WHERE { ?s ?p ?o }',
			queryType: 'bindings',
			startTime,
			endTime: startTime + 250,
			result: {
				type: 'bindings',
				columns: ['s', 'p', 'o'],
				rows,
				namespaceMap: { ex: 'http://example.org/perf/' }
			},
			rawResponse: {
				url: 'http://localhost:7200/repositories/perf',
				status: 200,
				statusText: 'OK',
				contentType: 'application/sparql-results+json',
				body: 'x'.repeat(rawBodyLength)
			}
		};
	}

	/**
	 * Returns the next pseudo-random number in [0, 1) (mulberry32).
	 */
	private _nextRandom(): number {
		this._state = (this._state + 0x6D2B79F5) >>> 0;

		let value = this._state;

		value = Math.imul(value ^ (value >>> 15), value | 1);
		value ^= value + Math.imul(value ^ (value >>> 7), value | 61);

		return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
	}

	private _nextWord(): string {
		return WORDS[Math.floor(this._nextRandom() * WORDS.length)];
	}

	private _nextSentence(): string {
		const words: string[] = [];

		for (let index = 0; index < 8; index++) {
			words.push(this._nextWord());
		}

		return `${words.join(' ')}.`;
	}
}
