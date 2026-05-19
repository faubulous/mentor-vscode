import { describe, it, expect } from 'vitest';
import { validateSectionDescriptors } from './settings-section-descriptor';
import { SETTINGS_SECTIONS } from './sections/index';
import * as packageJson from '../../../../package.json';

describe('section descriptors', () => {
	it('claim every mentor.* key in package.json exactly once', () => {
		const properties = (packageJson as unknown as {
			contributes: { configuration: Array<{ properties: Record<string, unknown> }> };
		}).contributes.configuration[0].properties;

		const errors = validateSectionDescriptors(SETTINGS_SECTIONS, properties);

		expect(errors).toEqual([]);
	});
});
