import { describe, it, expect, vi } from 'vitest';

vi.mock('vscode', async () => await import('@src/utilities/mocks/vscode'));

import { DataFactory } from 'rdf-data-factory';
import { MentorGraphUriGenerator } from './mentor-graph-uri-generator';

describe('MentorGraphUriGenerator', () => {
	const generator = new MentorGraphUriGenerator();
	const factory = new DataFactory();

	it('names the inference graph of a graph', () => {
		expect(generator.getGraphUri('file:///a.ttl')).toBe('file:///a.ttl?inference');
		expect(generator.getGraphUri('http://example.org/g?x=1')).toBe('http://example.org/g?x=1&inference');
		expect(generator.getGraphUri(factory.namedNode('file:///a.ttl'))).toBe('file:///a.ttl?inference');
	});

	it('recognises inference graph URIs', () => {
		expect(generator.isInferenceGraphUri('file:///a.ttl?inference')).toBe(true);
		expect(generator.isInferenceGraphUri(factory.namedNode('http://example.org/g?x=1&inference'))).toBe(true);
		expect(generator.isInferenceGraphUri('file:///a.ttl')).toBe(false);
		expect(generator.isInferenceGraphUri(factory.defaultGraph())).toBe(false);
	});

	it('recognises the graphs it names', () => {
		for (const uri of ['file:///a.ttl', 'urn:x', 'http://example.org/g?x=1']) {
			expect(generator.isInferenceGraphUri(generator.getGraphUri(uri))).toBe(true);
		}
	});
});
