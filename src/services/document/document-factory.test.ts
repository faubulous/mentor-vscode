import 'reflect-metadata';
import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('@src/languages', () => ({
	TurtleDocument: class {},
	SparqlDocument: class {},
	XmlDocument: class {},
}));

import { DocumentFactory } from './document-factory';

describe('DocumentFactory', () => {
	let factory: DocumentFactory;

	beforeEach(() => {
		factory = new DocumentFactory();
	});

	describe('supportedLanguages', () => {
		it('contains turtle', () => {
			expect(factory.supportedLanguages.has('turtle')).toBe(true);
		});

		it('contains sparql', () => {
			expect(factory.supportedLanguages.has('sparql')).toBe(true);
		});

		it('contains ntriples', () => {
			expect(factory.supportedLanguages.has('ntriples')).toBe(true);
		});

		it('contains nquads', () => {
			expect(factory.supportedLanguages.has('nquads')).toBe(true);
		});

		it('contains n3', () => {
			expect(factory.supportedLanguages.has('n3')).toBe(true);
		});

		it('contains trig', () => {
			expect(factory.supportedLanguages.has('trig')).toBe(true);
		});

		it('contains xml', () => {
			expect(factory.supportedLanguages.has('xml')).toBe(true);
		});
	});

	describe('isTripleSourceLanguage', () => {
		it('returns true for turtle', () => {
			expect(factory.isTripleSourceLanguage('turtle')).toBe(true);
		});

		it('returns true for ntriples', () => {
			expect(factory.isTripleSourceLanguage('ntriples')).toBe(true);
		});

		it('returns true for nquads', () => {
			expect(factory.isTripleSourceLanguage('nquads')).toBe(true);
		});

		it('returns true for n3', () => {
			expect(factory.isTripleSourceLanguage('n3')).toBe(true);
		});

		it('returns true for trig', () => {
			expect(factory.isTripleSourceLanguage('trig')).toBe(true);
		});

		it('returns true for xml', () => {
			expect(factory.isTripleSourceLanguage('xml')).toBe(true);
		});

		it('returns false for sparql', () => {
			expect(factory.isTripleSourceLanguage('sparql')).toBe(false);
		});

		it('returns false for json (notebook)', () => {
			expect(factory.isTripleSourceLanguage('json')).toBe(false);
		});

		it('returns false for unknown language', () => {
			expect(factory.isTripleSourceLanguage('unknown')).toBe(false);
		});
	});

	describe('isConvertibleLanguage', () => {
		it('returns true for ntriples', () => {
			expect(factory.isConvertibleLanguage('ntriples')).toBe(true);
		});

		it('returns true for nquads', () => {
			expect(factory.isConvertibleLanguage('nquads')).toBe(true);
		});

		it('returns true for turtle', () => {
			expect(factory.isConvertibleLanguage('turtle')).toBe(true);
		});

		it('returns true for xml', () => {
			expect(factory.isConvertibleLanguage('xml')).toBe(true);
		});

		it('returns false for sparql', () => {
			expect(factory.isConvertibleLanguage('sparql')).toBe(false);
		});

		it('returns false for n3', () => {
			expect(factory.isConvertibleLanguage('n3')).toBe(false);
		});

		it('returns false for unknown language', () => {
			expect(factory.isConvertibleLanguage('unknown')).toBe(false);
		});
	});

	describe('getConvertibleTargetLanguageIds', () => {
		it('returns all convertible languages except turtle when source is turtle', () => {
			const result = factory.getConvertibleTargetLanguageIds('turtle');
			expect(result).toContain('ntriples');
			expect(result).toContain('nquads');
			expect(result).toContain('xml');
			expect(result).not.toContain('turtle');
		});

		it('returns all convertible languages except ntriples when source is ntriples', () => {
			const result = factory.getConvertibleTargetLanguageIds('ntriples');
			expect(result).toContain('turtle');
			expect(result).toContain('nquads');
			expect(result).toContain('xml');
			expect(result).not.toContain('ntriples');
		});

		it('returns empty array for sparql (non-convertible)', () => {
			expect(factory.getConvertibleTargetLanguageIds('sparql')).toEqual([]);
		});

		it('returns empty array for unknown language', () => {
			expect(factory.getConvertibleTargetLanguageIds('unknown')).toEqual([]);
		});
	});

	describe('isSupportedExtension', () => {
		it('returns true for .ttl', () => {
			expect(factory.isSupportedExtension('.ttl')).toBe(true);
		});

		it('returns true for .sparql', () => {
			expect(factory.isSupportedExtension('.sparql')).toBe(true);
		});

		it('returns true for .rq', () => {
			expect(factory.isSupportedExtension('.rq')).toBe(true);
		});

		it('returns true for .nt', () => {
			expect(factory.isSupportedExtension('.nt')).toBe(true);
		});

		it('returns true for .nq', () => {
			expect(factory.isSupportedExtension('.nq')).toBe(true);
		});

		it('returns true for .rdf', () => {
			expect(factory.isSupportedExtension('.rdf')).toBe(true);
		});

		it('returns true for .mnb', () => {
			expect(factory.isSupportedExtension('.mnb')).toBe(true);
		});

		it('returns false for .txt', () => {
			expect(factory.isSupportedExtension('.txt')).toBe(false);
		});

		it('returns false for .js', () => {
			expect(factory.isSupportedExtension('.js')).toBe(false);
		});

		it('returns false for empty string', () => {
			expect(factory.isSupportedExtension('')).toBe(false);
		});
	});

	describe('getDocumentLanguageId', () => {
		it('returns turtle for .ttl', () => {
			expect(factory.getDocumentLanguageId({ path: '/test/file.ttl' } as any)).toBe('turtle');
		});

		it('returns ntriples for .nt', () => {
			expect(factory.getDocumentLanguageId({ path: '/test/file.nt' } as any)).toBe('ntriples');
		});

		it('returns nquads for .nq', () => {
			expect(factory.getDocumentLanguageId({ path: '/test/file.nq' } as any)).toBe('nquads');
		});

		it('returns n3 for .n3', () => {
			expect(factory.getDocumentLanguageId({ path: '/test/file.n3' } as any)).toBe('n3');
		});

		it('returns trig for .trig', () => {
			expect(factory.getDocumentLanguageId({ path: '/test/file.trig' } as any)).toBe('trig');
		});

		it('returns sparql for .sparql', () => {
			expect(factory.getDocumentLanguageId({ path: '/test/file.sparql' } as any)).toBe('sparql');
		});

		it('returns sparql for .rq', () => {
			expect(factory.getDocumentLanguageId({ path: '/test/query.rq' } as any)).toBe('sparql');
		});

		it('returns xml for .rdf', () => {
			expect(factory.getDocumentLanguageId({ path: '/test/file.rdf' } as any)).toBe('xml');
		});

		it('returns json for .mnb', () => {
			expect(factory.getDocumentLanguageId({ path: '/test/notebook.mnb' } as any)).toBe('json');
		});

		it('returns undefined for .txt', () => {
			expect(factory.getDocumentLanguageId({ path: '/test/file.txt' } as any)).toBeUndefined();
		});

		it('is case-insensitive on the extension', () => {
			expect(factory.getDocumentLanguageId({ path: '/test/file.TTL' } as any)).toBe('turtle');
			expect(factory.getDocumentLanguageId({ path: '/test/file.Sparql' } as any)).toBe('sparql');
		});
	});

	describe('isSupportedFile', () => {
		it('returns true for .ttl file', () => {
			expect(factory.isSupportedFile({ path: '/test/file.ttl' } as any)).toBe(true);
		});

		it('returns true for .sparql file', () => {
			expect(factory.isSupportedFile({ path: '/test/query.sparql' } as any)).toBe(true);
		});

		it('returns false for .txt file', () => {
			expect(factory.isSupportedFile({ path: '/test/file.txt' } as any)).toBe(false);
		});
	});

	describe('isSupportedNotebookFile', () => {
		it('returns true for .mnb file', () => {
			expect(factory.isSupportedNotebookFile({ path: '/test/notebook.mnb' } as any)).toBe(true);
		});

		it('returns false for .ttl file', () => {
			expect(factory.isSupportedNotebookFile({ path: '/test/file.ttl' } as any)).toBe(false);
		});

		it('is case-insensitive for .MNB', () => {
			expect(factory.isSupportedNotebookFile({ path: '/test/notebook.MNB' } as any)).toBe(true);
		});
	});

	describe('getSupportedLanguagesInfo', () => {
		it('returns info for all supported languages', async () => {
			const result = await factory.getSupportedLanguagesInfo();
			const ids = result.map(l => l.id);

			expect(ids).toContain('turtle');
			expect(ids).toContain('sparql');
			expect(ids).toContain('ntriples');
			expect(ids).toContain('nquads');
		});

		it('populates extensions for each language', async () => {
			const result = await factory.getSupportedLanguagesInfo();
			const turtle = result.find(l => l.id === 'turtle');

			expect(turtle?.extensions).toContain('.ttl');
		});

		it('includes typeName for sparql as query file', async () => {
			const result = await factory.getSupportedLanguagesInfo();
			const sparql = result.find(l => l.id === 'sparql');

			expect(sparql?.typeName).toContain('Query');
		});

		it('includes typeName for turtle as regular file', async () => {
			const result = await factory.getSupportedLanguagesInfo();
			const turtle = result.find(l => l.id === 'turtle');

			expect(turtle?.typeName).toContain('File');
		});
	});

	describe('getLanguageInfo', () => {
		it('returns info for turtle', async () => {
			const result = await factory.getLanguageInfo('turtle');

			expect(result).toBeDefined();
			expect(result?.id).toBe('turtle');
		});

		it('returns undefined for unknown language', async () => {
			const result = await factory.getLanguageInfo('unknown');

			expect(result).toBeUndefined();
		});
	});

	describe('getLanguageInfoFromMimeType', () => {
		it('returns undefined when mimetypes are not populated from package.json', async () => {
			// Without package.json (mocked FS throws), mimetypes are empty
			const result = await factory.getLanguageInfoFromMimeType('text/turtle');

			expect(result).toBeUndefined();
		});
	});

	describe('create', () => {
		const uri = { path: '/test/file.ttl' } as any;

		it('creates a TurtleDocument for language turtle', () => {
			const ctx = factory.create(uri, 'turtle');
			expect(ctx).toBeDefined();
		});

		it('creates a TurtleDocument for language ntriples', () => {
			expect(factory.create(uri, 'ntriples')).toBeDefined();
		});

		it('creates a TurtleDocument for language nquads', () => {
			expect(factory.create(uri, 'nquads')).toBeDefined();
		});

		it('creates a TurtleDocument for language n3', () => {
			expect(factory.create(uri, 'n3')).toBeDefined();
		});

		it('creates a TurtleDocument for language trig', () => {
			expect(factory.create(uri, 'trig')).toBeDefined();
		});

		it('creates a SparqlDocument for language sparql', () => {
			expect(factory.create(uri, 'sparql')).toBeDefined();
		});

		it('creates an XmlDocument for language xml', () => {
			expect(factory.create(uri, 'xml')).toBeDefined();
		});

		it('infers language from file extension when languageId is omitted', () => {
			// .ttl → turtle
			expect(factory.create({ path: '/test/file.ttl' } as any)).toBeDefined();
		});

		it('throws for an unsupported language', () => {
			expect(() => factory.create(uri, 'unknown')).toThrow('Unsupported language');
		});

		it('throws when language cannot be determined from the URI', () => {
			expect(() => factory.create({ path: '/test/file.xyz' } as any)).toThrow('Unable to determine the document language');
		});
	});
});
