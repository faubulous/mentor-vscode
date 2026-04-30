import { describe, it, expect } from 'vitest';
import { XmlFeatureProvider } from '@src/languages/xml/xml-feature-provider';

describe('XmlFeatureProvider', () => {
	it('constructs without throwing', () => {
		expect(() => new XmlFeatureProvider()).not.toThrow();
	});

	it('is defined after construction', () => {
		const provider = new XmlFeatureProvider();
		expect(provider).toBeDefined();
	});
});
