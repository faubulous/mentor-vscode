import { describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { Store } from '@faubulous/mentor-rdf';
import { getShapeGraphCandidates } from '@src/utilities/shacl';
import {
	BASIC_ONTOLOGY_SHAPES_URI,
	BASIC_TAXONOMY_SHAPES_URI,
	VALIDATION_TEMPLATES,
	getBundledShapeVersions,
	getPresetShapeSource,
	loadPresetShapeGraphs,
	getVersionedShapeUri,
} from './index';

describe('loadPresetShapeGraphs', () => {
	it('registers both shape graphs in the store', () => {
		const store = new Store();

		loadPresetShapeGraphs(store);

		expect(store.hasGraph(BASIC_ONTOLOGY_SHAPES_URI)).toBe(true);
		expect(store.hasGraph(BASIC_TAXONOMY_SHAPES_URI)).toBe(true);
		expect(getShapeGraphCandidates(store)).toEqual(
			expect.arrayContaining([BASIC_ONTOLOGY_SHAPES_URI, BASIC_TAXONOMY_SHAPES_URI])
		);
	});

	it('does not ship any profiles in the manifest default (templates live in code)', () => {
		const manifest = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../../../../package.json'), 'utf8'));
		const settings = manifest.contributes.configuration
			.flatMap((section: any) => Object.entries(section.properties ?? {}))
			.find(([key]: [string, any]) => key === 'mentor.shacl.validation');

		expect(settings).toBeDefined();
		expect(settings![1].default).toEqual({});
	});

	it('exposes templates whose shape URIs match the loaded graphs', () => {
		const ids = VALIDATION_TEMPLATES.map(t => t.id);

		expect(ids).toEqual(['basic-ontology', 'basic-taxonomy']);

		const byId = Object.fromEntries(VALIDATION_TEMPLATES.map(t => [t.id, t]));

		expect(byId['basic-ontology'].shapes).toEqual([BASIC_ONTOLOGY_SHAPES_URI]);
		expect(byId['basic-taxonomy'].shapes).toEqual([BASIC_TAXONOMY_SHAPES_URI]);
	});

	it('carries a version whose owl:versionInfo matches the bundled shape file', () => {
		for (const template of VALIDATION_TEMPLATES) {
			expect(template.version).toBeTruthy();

			const source = getPresetShapeSource(template.id);

			expect(source).toBeDefined();
			// The template version, the owl:versionInfo and the owl:versionIRI segment agree.
			expect(source).toContain(`owl:versionInfo "${template.version}"`);
			expect(source).toContain(getVersionedShapeUri(template.shapes[0], template.version));
		}
	});

	it('maps every bundled shape URI to its current version', () => {
		expect(getBundledShapeVersions()).toEqual({
			[BASIC_ONTOLOGY_SHAPES_URI]: '1.0',
			[BASIC_TAXONOMY_SHAPES_URI]: '1.0',
		});
	});
});