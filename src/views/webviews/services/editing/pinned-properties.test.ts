import { describe, expect, it } from 'vitest';
import { OWL, RDFS, SKOS } from '@faubulous/mentor-rdf';
import { PinnedProperties } from './pinned-properties';

const SH = 'http://www.w3.org/ns/shacl#';

describe('PinnedProperties', () => {
	it('pins the defaults for everyone while the workspace names nothing for a type', () => {
		const pins = PinnedProperties.fromLayers(undefined, undefined);

		expect(pins.pinsOf([OWL.Class])).toEqual([{ predicate: RDFS.subClassOf, scope: 'workspace' }]);
		expect(pins.pinsOf([OWL.ObjectProperty]).map(pin => pin.predicate)).toEqual([RDFS.domain, RDFS.range]);
		expect(pins.pinsOf([`${SH}NodeShape`])).toEqual([]);
	});

	it('lets the workspace list of a type replace its defaults, and follows it with the pins for oneself', () => {
		const pins = PinnedProperties.fromLayers({ [OWL.Class]: [RDFS.comment] }, { [OWL.Class]: [RDFS.seeAlso, RDFS.comment] });

		expect(pins.pinsOf([OWL.Class])).toEqual([
			{ predicate: RDFS.comment, scope: 'workspace' },
			{ predicate: RDFS.seeAlso, scope: 'user' }
		]);
	});

	it('gathers the pins of every type of a resource, each once, in the order of the types', () => {
		const pins = PinnedProperties.fromLayers({ [`${SH}PropertyShape`]: [`${SH}path`] }, { [`${SH}Shape`]: [`${SH}path`, `${SH}message`] });

		expect(pins.pinsOf([`${SH}PropertyShape`, `${SH}Shape`])).toEqual([
			{ predicate: `${SH}path`, scope: 'workspace' },
			{ predicate: `${SH}message`, scope: 'user' }
		]);
	});

	it('leaves out what is no list of predicate IRIs', () => {
		const pins = PinnedProperties.fromLayers({ [OWL.Class]: 'nope', [SKOS.Concept]: [1] }, 'nothing');

		expect(pins.pinsOf([OWL.Class])).toEqual([{ predicate: RDFS.subClassOf, scope: 'workspace' }]);
		expect(pins.pinsOf([SKOS.Concept]).map(pin => pin.predicate)).toEqual([SKOS.broader, SKOS.related]);
	});

	it('pins a property for oneself under the pin type, leaving the workspace alone', () => {
		const change = PinnedProperties.fromLayers({}, {}).withPin([`${SH}PropertyShape`], `${SH}PropertyShape`, `${SH}path`, 'user');

		expect(change).toEqual({ user: { [`${SH}PropertyShape`]: [`${SH}path`] } });
	});

	it('pins a property for everyone after the defaults of the type', () => {
		const change = PinnedProperties.fromLayers({}, {}).withPin([OWL.Class], OWL.Class, RDFS.comment, 'workspace');

		expect(change).toEqual({ workspace: { [OWL.Class]: [RDFS.subClassOf, RDFS.comment] } });
	});

	it('moves a property pinned for oneself to everyone', () => {
		const change = PinnedProperties.fromLayers({}, { [OWL.Class]: [RDFS.comment] }).withPin([OWL.Class], OWL.Class, RDFS.comment, 'workspace');

		expect(change).toEqual({
			workspace: { [OWL.Class]: [RDFS.subClassOf, RDFS.comment] },
			user: { [OWL.Class]: [] }
		});
	});

	it('unpins a default from every type of the resource it is pinned for, writing the defaults without it', () => {
		const change = PinnedProperties.fromLayers({}, {}).withPin([OWL.Class, RDFS.Class], OWL.Class, RDFS.subClassOf, undefined);

		expect(change).toEqual({ workspace: { [OWL.Class]: [], [RDFS.Class]: [] } });
	});

	it('writes nothing to unpin a property that is not pinned', () => {
		expect(PinnedProperties.fromLayers({}, {}).withPin([OWL.Class], OWL.Class, RDFS.comment, undefined)).toEqual({});
	});
});
