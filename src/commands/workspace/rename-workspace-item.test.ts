import { describe, expect, test } from 'vitest';
import { getRenamedUri } from './rename-workspace-item';

describe('getRenamedUri', () => {
	test('renames a file within the same folder', () => {
		const result = getRenamedUri('file:///workspace/data/ontology.ttl', 'vocabulary.ttl');
		expect(result.toString()).toBe('file:///workspace/data/vocabulary.ttl');
	});

	test('renames a folder within the same parent', () => {
		const result = getRenamedUri('file:///workspace/data', 'sources');
		expect(result.toString()).toBe('file:///workspace/sources');
	});

	test('preserves the parent path when renaming a nested file', () => {
		const result = getRenamedUri('file:///a/b/c/old.rdf', 'new.rdf');
		expect(result.toString()).toBe('file:///a/b/c/new.rdf');
	});
});
