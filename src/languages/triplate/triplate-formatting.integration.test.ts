import { describe, it, expect } from 'vitest';
import { tokenizeTemplateForFormatting } from '@faubulous/mentor-rdf-parsers';
import { TurtleFormatter, SparqlFormatter } from '@faubulous/mentor-rdf-serializers';

// Template formatting needs the new parsers + serializer. Skip end-to-end when an older
// published build (without template support) is installed (e.g. CI before publishing).
const describeTemplate = typeof tokenizeTemplateForFormatting === 'function' ? describe : describe.skip;

/**
 * End-to-end check that the real (locally built) serializer + parsers + triplate
 * format a Triplate template when invoked the way the formatting providers do.
 */
describeTemplate('Triplate template formatting (real serializer)', () => {
	it('formats a Turtle template: frontmatter canonicalised, body reflowed, ${…} kept', () => {
		const text = '---\nparams {   type:iri  }\n---\n@prefix ex:   <http://ex/> .\n${type}   a   ex:Thing .';
		const out = new TurtleFormatter().formatFromText(text, { indent: '  ' }).output;

		expect(out).toContain('---\nparams {\n  type: iri\n}\n---\n');
		expect(out).toContain('${type} a ex:Thing');
	});

	it('formats a SPARQL template and leaves directive templates unchanged', () => {
		const sparql = '---\nparams { type: iri }\n---\nSELECT   *   WHERE { ?s a ${type} . }';
		expect(new SparqlFormatter().formatFromText(sparql, { indent: '  ' }).output).toContain('${type}');

		const directive = '---\nparams { limit: int }\n---\nSELECT * WHERE { ?s ?p ?o }\n{% if limit %}LIMIT ${limit}{% endif %}\n';
		expect(new SparqlFormatter().formatFromText(directive, { indent: '  ' }).output).toBe(directive);
	});
});
