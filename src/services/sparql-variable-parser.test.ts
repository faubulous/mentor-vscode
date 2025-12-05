import { describe, it, expect } from "vitest";
import { SparqlVariableParser } from "./sparql-variable-parser";

describe("SparqlVariableParser", () => {

	const parser = new SparqlVariableParser();

	it("parses ?-variables in SELECT", () => {
		const q = `SELECT ?a ?b ?c WHERE { ?s ?p ?o }`;
		
		expect(parser.parseSelectVariables(q)).toEqual(["a", "b", "c"]);
	});

	it("parses $-variables in SELECT", () => {
		const q = `SELECT $x $y WHERE { ?s ?p ?o }`;

		expect(parser.parseSelectVariables(q)).toEqual(["x", "y"]);
	});

	it("parses * as empty list", () => {
		const q = `SELECT * WHERE { ?s ?p ?o }`;

		expect(parser.parseSelectVariables(q)).toEqual([]);
	});

	it("parses expressions and aliases using AS", () => {
		const q = `SELECT (COUNT(?s) AS ?count) (?label AS ?l) ?v WHERE { ?s ?p ?o }`;

		// The parser should return only the explicitly named variables (without leading ?/$) in order
		expect(parser.parseSelectVariables(q)).toEqual(["s", "count", "label", "l", "v"]);
	});

	it("parses aggregate functions with implicit parentheses and aliases", () => {
		const q = `SELECT (SUM(?a) AS ?totalA) (MAX(?a) AS ?maxA) WHERE { ?s ?p ?o . }`;

		expect(parser.parseSelectVariables(q)).toEqual(["a", "totalA", "maxA"]);
	});

	it("handles SELECT without WHERE (valid SPARQL 1.1) and stops at first '{' if present", () => {
		const q1 = `SELECT ?a ?b`;

		// We expect all variables to be returned as there is no '{' to stop at.
		expect(parser.parseSelectVariables(q1)).toEqual(["a", "b"]);

		const q2 = `SELECT ?a ?b { ?s ?p ?o }`;

		// We expect variables before the first '{' to be returned.
		expect(parser.parseSelectVariables(q2)).toEqual(["a", "b"]);
	});

	it("ignores variables defined inside expressions without AS (treated as part of expression) and only captures top-level explicit vars and aliases", () => {
		const q = `SELECT (CONCAT(?g, "-", ?h) AS ?gh) ?i WHERE { ?s ?p ?o }`;

		// We expect all top-level variables and aliases to be returned in order.
		expect(parser.parseSelectVariables(q)).toEqual(["g", "h", "gh", "i"]);
	});

	it("gracefully handles malformed but tokenizable queries by returning any recognized variables in order", () => {
		// missing closing paren, but tokens still yield variables.
		const q = `SELECT ?a (COUNT(?b AS ?c) ?d`;

		// We expect all variables to be returned before the parser stops.
		expect(parser.parseSelectVariables(q)).toEqual(["a", "b", "c", "d"]);
	});

});
