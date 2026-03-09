import { describe, expect, test } from 'vitest';
import { URI } from 'vscode-uri';
import { InferenceUri } from './inference-uri';

describe('InferenceUri (with vscode-uri)', () => {
	test('toInferenceUri appends ?inference=mentor when no query is present', () => {
		const base = 'https://example.org/ontology';
		const result = InferenceUri.toInferenceUri(URI.parse(base) as any);

		expect(result).toBe(`${base}?${InferenceUri.queryAppendix}`);
	});

	test('toInferenceUri appends &inference=mentor when query is present', () => {
		const baseUri = 'https://example.org/ontology?x=1';
		const result = InferenceUri.toInferenceUri(URI.parse(baseUri) as any);

		expect(result).toBe(`${baseUri}&${InferenceUri.queryAppendix}`);
	});

	test('isInferenceUri detects inference URIs for both string and URI inputs', () => {
		const base = 'https://example.org/ontology?a=1';
		const result = `${base}&${InferenceUri.queryAppendix}`;

		expect(InferenceUri.isInferenceUri(result)).toBe(true);

		const parsed = URI.parse(result);

		expect(InferenceUri.isInferenceUri(parsed as any)).toBe(true);
	});

	test('toUri removes inference appendix and restores original URL (no other params)', () => {
		const base = 'https://example.org/ontology';
		const result = InferenceUri.toInferenceUri(base);

		expect(result).toBe(`${base}?${InferenceUri.queryAppendix}`);

		const restored = InferenceUri.toUri(result);

		expect(restored).toBe(base);
	});

	test('toUri removes inference appendix and keeps other query params', () => {
		const baseUri = 'https://example.org/ontology?x=1';
		const result = InferenceUri.toInferenceUri(baseUri);

		expect(result).toBe(`${baseUri}&${InferenceUri.queryAppendix}`);

		const restored = InferenceUri.toUri(result);

		expect(restored).toBe(baseUri);
	});

	test('toUri returns input unchanged when not an inference URI', () => {
		const nonInf = 'https://example.org/ontology?x=1';
		const result = InferenceUri.toUri(nonInf);

		expect(result).toBe(nonInf);
	});
});

