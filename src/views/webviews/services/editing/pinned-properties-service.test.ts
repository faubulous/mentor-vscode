import { describe, expect, it } from 'vitest';
import { OWL, RDF, RDFS, SKOS } from '@faubulous/mentor-rdf';
import { RdfDataFactory } from '@src/utilities/rdf-data-factory';
import * as packageJson from '../../../../../package.json';
import { PinnedPropertiesService } from './pinned-properties-service';

const SH = 'http://www.w3.org/ns/shacl#';

/**
 * The default value of the setting, as the extension contributes it.
 */
const DEFAULT_PINS = (packageJson as unknown as {
	contributes: { configuration: Array<{ properties: Record<string, { default: unknown }> }> };
}).contributes.configuration[0].properties['mentor.formEditor.pinnedProperties'].default;

/**
 * Read the pins from the workspace and user values of the setting, over its contributed default.
 * @param workspace The value in the workspace settings.
 * @param user The value in the user settings.
 * @returns The pins.
 */
function pinsFrom(workspace: unknown, user: unknown): PinnedPropertiesService {
	return PinnedPropertiesService.fromSetting({ defaultValue: DEFAULT_PINS, workspaceValue: workspace, globalValue: user });
}

describe('PinnedPropertiesService', () => {
	it('pins the default value of the setting for everyone while the workspace names nothing for a type', () => {
		const pins = pinsFrom(undefined, undefined);

		expect(pins.pinsOf([OWL.Class])).toEqual([{ predicate: RDFS.subClassOf, scope: 'workspace' }]);
		expect(pins.pinsOf([OWL.ObjectProperty]).map(pin => pin.predicate)).toEqual([RDFS.domain, RDFS.range]);
		expect(pins.pinsOf([`${SH}NodeShape`])).toEqual([]);
	});

	it('lets the workspace list of a type replace its defaults, and follows it with the pins for oneself', () => {
		const pins = pinsFrom({ [OWL.Class]: [RDFS.comment] }, { [OWL.Class]: [RDFS.seeAlso, RDFS.comment] });

		expect(pins.pinsOf([OWL.Class])).toEqual([
			{ predicate: RDFS.comment, scope: 'workspace' },
			{ predicate: RDFS.seeAlso, scope: 'user' }
		]);
	});

	it('gathers the pins of every type of a resource, each once, in the order of the types', () => {
		const pins = pinsFrom({ [`${SH}PropertyShape`]: [`${SH}path`] }, { [`${SH}Shape`]: [`${SH}path`, `${SH}message`] });

		expect(pins.pinsOf([`${SH}PropertyShape`, `${SH}Shape`])).toEqual([
			{ predicate: `${SH}path`, scope: 'workspace' },
			{ predicate: `${SH}message`, scope: 'user' }
		]);
	});

	it('leaves out what is no list of predicate IRIs', () => {
		const pins = pinsFrom({ [OWL.Class]: 'nope', [SKOS.Concept]: [1] }, 'nothing');

		expect(pins.pinsOf([OWL.Class])).toEqual([{ predicate: RDFS.subClassOf, scope: 'workspace' }]);
		expect(pins.pinsOf([SKOS.Concept]).map(pin => pin.predicate)).toEqual([SKOS.broader, SKOS.related]);
	});

	it('stores the pins of a resource under its primary asserted type, else its first inferred one, passing over owl:NamedIndividual', () => {
		expect(PinnedPropertiesService.pinTypeOf([OWL.NamedIndividual, SKOS.Concept], [SKOS.Collection])).toBe(SKOS.Concept);
		expect(PinnedPropertiesService.pinTypeOf([], [OWL.NamedIndividual, `${SH}PropertyShape`])).toBe(`${SH}PropertyShape`);
		expect(PinnedPropertiesService.pinTypeOf([OWL.NamedIndividual], [])).toBe(OWL.NamedIndividual);
		expect(PinnedPropertiesService.pinTypeOf([], [])).toBeUndefined();
	});

	it('pins a property for oneself under the pin type, leaving the workspace alone', () => {
		const change = pinsFrom({}, {}).withPin([`${SH}PropertyShape`], `${SH}PropertyShape`, `${SH}path`, 'user');

		expect(change).toEqual({ user: { [`${SH}PropertyShape`]: [`${SH}path`] } });
	});

	it('pins a property for everyone after the defaults of the type', () => {
		const change = pinsFrom({}, {}).withPin([OWL.Class], OWL.Class, RDFS.comment, 'workspace');

		expect(change).toEqual({ workspace: { [OWL.Class]: [RDFS.subClassOf, RDFS.comment] } });
	});

	it('moves a property pinned for oneself to everyone', () => {
		const change = pinsFrom({}, { [OWL.Class]: [RDFS.comment] }).withPin([OWL.Class], OWL.Class, RDFS.comment, 'workspace');

		expect(change).toEqual({
			workspace: { [OWL.Class]: [RDFS.subClassOf, RDFS.comment] },
			user: { [OWL.Class]: [] }
		});
	});

	it('unpins a default from every type of the resource it is pinned for, writing the defaults without it', () => {
		const change = pinsFrom({}, {}).withPin([OWL.Class, RDFS.Class], OWL.Class, RDFS.subClassOf, undefined);

		expect(change).toEqual({ workspace: { [OWL.Class]: [], [RDFS.Class]: [] } });
	});

	it('resolves the pins of a resource by its asserted and inferred types, never pins the type, and gives none to a resource of no known type', () => {
		const pins = pinsFrom({ [`${SH}PropertyShape`]: [`${SH}path`, `${SH}name`, RDF.type] }, {});

		expect(pins.resolve([], [`${SH}PropertyShape`])).toEqual([
			{ predicate: RdfDataFactory.namedNode(`${SH}path`), scope: 'workspace' },
			{ predicate: RdfDataFactory.namedNode(`${SH}name`), scope: 'workspace' }
		]);
		expect(pins.resolve([], [])).toBeUndefined();
	});

	it('unpins several properties at once in the scopes given, writing the defaults of a type without them', () => {
		const pins = pinsFrom({}, { [OWL.Class]: [RDFS.comment, RDFS.seeAlso] });

		expect(pins.withoutPins([OWL.Class], [RDFS.subClassOf, RDFS.comment, RDFS.seeAlso], ['user', 'workspace'])).toEqual({
			workspace: { [OWL.Class]: [] },
			user: { [OWL.Class]: [] }
		});
	});

	it('leaves the workspace settings alone when only the user settings can be written', () => {
		const pins = pinsFrom({}, { [OWL.Class]: [RDFS.comment] });

		expect(pins.withoutPins([OWL.Class], [RDFS.subClassOf, RDFS.comment], ['user'])).toEqual({ user: { [OWL.Class]: [] } });
	});

	it('writes nothing to unpin a property that is not pinned', () => {
		expect(pinsFrom({}, {}).withPin([OWL.Class], OWL.Class, RDFS.comment, undefined)).toEqual({});
	});
});
