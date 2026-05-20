import { describe, it, expect } from 'vitest';
import { validateSectionDescriptors } from './settings-section-descriptor';
import { SETTINGS_GROUPS } from './sections/index';
import * as packageJson from '../../../../package.json';

describe('section descriptors', () => {
	it('claim every mentor.* key in package.json exactly once', () => {
		const properties = (packageJson as unknown as {
			contributes: { configuration: Array<{ properties: Record<string, unknown> }> };
		}).contributes.configuration[0].properties;

		const sections = SETTINGS_GROUPS.flatMap(g => [...g.sections]);
		const errors = validateSectionDescriptors(sections, properties);

		expect(errors).toEqual([]);
	});
});
