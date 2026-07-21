import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { Store } from '@faubulous/mentor-rdf';
import { getShapeGraphCandidates } from '@src/utilities/shacl';
import {
	ONTOLOGY_SHAPES_URI,
	TAXONOMY_SHAPES_URI,
	VALIDATION_PRESETS,
	getVersionedShapeUri,
} from '../preset-definitions';
import { getPresetShapeSource, loadPresetShapeGraphs } from './index';

describe('loadPresetShapeGraphs', () => {
	it('registers both shape graphs in the store', () => {
		const store = new Store();

		loadPresetShapeGraphs(store);

		expect(store.hasGraph(ONTOLOGY_SHAPES_URI)).toBe(true);
		expect(store.hasGraph(TAXONOMY_SHAPES_URI)).toBe(true);
		expect(getShapeGraphCandidates(store)).toEqual(
			expect.arrayContaining([ONTOLOGY_SHAPES_URI, TAXONOMY_SHAPES_URI])
		);
	});

	it('does not ship any profiles in the manifest default (presets live in code)', () => {
		const manifest = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../../../package.json'), 'utf8'));
		const settings = manifest.contributes.configuration
			.flatMap((section: any) => Object.entries(section.properties ?? {}))
			.find(([key]: [string, any]) => key === 'mentor.shacl.validation');

		expect(settings).toBeDefined();
		expect(settings![1].default).toEqual({});
	});

	it('exposes presets whose shape URIs match the loaded graphs', () => {
		const ids = VALIDATION_PRESETS.map(t => t.id);

		expect(ids).toEqual(['ontology', 'taxonomy']);

		const byId = Object.fromEntries(VALIDATION_PRESETS.map(t => [t.id, t]));

		expect(byId['ontology'].shapes).toEqual([ONTOLOGY_SHAPES_URI]);
		expect(byId['taxonomy'].shapes).toEqual([TAXONOMY_SHAPES_URI]);
	});

	it('carries a version whose owl:versionInfo matches the bundled shape file', () => {
		for (const preset of VALIDATION_PRESETS) {
			expect(preset.version).toBeTruthy();

			const source = getPresetShapeSource(preset.id);

			expect(source).toBeDefined();
			// The preset version, the owl:versionInfo and the owl:versionIRI segment agree.
			expect(source).toContain(`owl:versionInfo "${preset.version}"`);
			expect(source).toContain(getVersionedShapeUri(preset.shapes[0], preset.version));
		}
	});

});