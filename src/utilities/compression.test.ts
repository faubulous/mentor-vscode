import { describe, expect, test } from 'vitest';
import { compressToBase64, decompressFromBase64 } from './compression';

describe('compression', () => {
	test('round-trips text through gzip and base64', async () => {
		const text = '@prefix sh: <http://www.w3.org/ns/shacl#> .\n\n<#shape> a sh:NodeShape .\n';

		const encoded = await compressToBase64(text);

		expect(encoded).not.toBe(text);
		expect(await decompressFromBase64(encoded)).toBe(text);
	});

	test('round-trips unicode content', async () => {
		const text = '# Prüfung 🦉 – ontologie façade\n<αβγ> a <δεζ> .';

		expect(await decompressFromBase64(await compressToBase64(text))).toBe(text);
	});

	test('round-trips the empty string', async () => {
		expect(await decompressFromBase64(await compressToBase64(''))).toBe('');
	});

	test('compresses repetitive RDF content to a fraction of its size', async () => {
		const text = Array.from({ length: 200 }, (_, i) => `<http://example.org/shape/${i}> a sh:NodeShape .`).join('\n');

		const encoded = await compressToBase64(text);

		expect(encoded.length).toBeLessThan(text.length / 2);
	});

	test('rejects content that is not valid gzip data', async () => {
		await expect(decompressFromBase64(btoa('not gzip'))).rejects.toThrow();
	});
});
