import { OWL, RDF, RDFS, SKOS } from '@faubulous/mentor-rdf';
import { PinScope } from '@src/views/webviews/views/form-editor/form-editor-model';

/**
 * The predicates pinned for each type, by type IRI, as one layer of the
 * `mentor.formEditor.pinnedProperties` setting holds them.
 */
export type PinLayer = Readonly<Record<string, readonly string[]>>;

/**
 * A property pinned on the cards of a resource, with the scope it is pinned in.
 */
export interface ResolvedPin {
	/**
	 * The IRI of the predicate.
	 */
	predicate: string;

	/**
	 * Who it is pinned for.
	 */
	scope: PinScope;
}

/**
 * The layers of the setting a change of a pin writes; a layer the change leaves alone is absent.
 */
export interface PinChange {
	/**
	 * The new value of the workspace layer, pinned for everyone.
	 */
	workspace?: PinLayer;

	/**
	 * The new value of the user layer, pinned for oneself.
	 */
	user?: PinLayer;
}

/**
 * The predicates pinned for the properties of the vocabularies.
 */
const PROPERTY_PINS = [RDFS.domain, RDFS.range];

/**
 * The properties pinned for everyone while the workspace names nothing for a type.
 */
const DEFAULT_PINNED_PROPERTIES: PinLayer = {
	[SKOS.Concept]: [SKOS.broader, SKOS.related],
	[OWL.Class]: [RDFS.subClassOf],
	[RDFS.Class]: [RDFS.subClassOf],
	[OWL.ObjectProperty]: PROPERTY_PINS,
	[OWL.DatatypeProperty]: PROPERTY_PINS,
	[OWL.AnnotationProperty]: PROPERTY_PINS,
	[RDF.Property]: PROPERTY_PINS,
	[SKOS.Collection]: [SKOS.member],
	[SKOS.OrderedCollection]: [SKOS.memberList]
};

/**
 * The properties shown on the collapsed cards of every resource of a type, pinned for everyone in
 * the workspace layer of the setting and for oneself in the user layer. The workspace layer names
 * the pins of a type for everyone; while it names nothing for a type, the defaults stand in for it.
 * The pins of the user layer follow those for everyone.
 */
export class PinnedProperties {
	/**
	 * Create the pins of the two layers.
	 * @param _workspace The pins for everyone.
	 * @param _user The pins for oneself.
	 */
	constructor(private readonly _workspace: PinLayer = {}, private readonly _user: PinLayer = {}) { }

	/**
	 * Read the pins from the values of the two layers of the setting, which may hold anything.
	 * @param workspace The value of the workspace layer.
	 * @param user The value of the user layer.
	 * @returns The pins.
	 */
	static fromLayers(workspace: unknown, user: unknown): PinnedProperties {
		return new PinnedProperties(_layerOf(workspace), _layerOf(user));
	}

	/**
	 * The pins of a resource of the given types, in the order of the types and of their pins, each
	 * predicate once; one pinned for everyone and for oneself counts as pinned for everyone.
	 * @param typeIris The types of the resource, asserted ones first.
	 * @returns The pins.
	 */
	pinsOf(typeIris: readonly string[]): ResolvedPin[] {
		const shared = new Set(typeIris.flatMap(type => this._sharedOf(type)));
		const pins = new Map<string, ResolvedPin>();

		for (const type of typeIris) {
			for (const predicate of [...this._sharedOf(type), ...(this._user[type] ?? [])]) {
				if (!pins.has(predicate)) {
					pins.set(predicate, { predicate, scope: shared.has(predicate) ? 'workspace' : 'user' });
				}
			}
		}

		return Array.from(pins.values());
	}

	/**
	 * The change that pins a property for a resource in a scope, or unpins it: the property leaves
	 * every type of the resource it is pinned for, in both layers, and then joins the pins of the
	 * type new pins are stored under, in the scope given. Leaving a default writes the defaults of
	 * the type without it.
	 * @param typeIris The types of the resource.
	 * @param pinType The type new pins of the resource are stored under.
	 * @param predicate The IRI of the predicate.
	 * @param scope Who to pin it for, or `undefined` to unpin it.
	 * @returns The layers to write.
	 */
	withPin(typeIris: readonly string[], pinType: string, predicate: string, scope: PinScope | undefined): PinChange {
		const workspace = this._without(typeIris, predicate, type => this._sharedOf(type), this._workspace);
		const user = this._without(typeIris, predicate, type => this._user[type] ?? [], this._user);

		if (scope === 'workspace') {
			workspace.layer = { ...workspace.layer, [pinType]: [...(workspace.layer[pinType] ?? this._sharedOf(pinType)), predicate] };
			workspace.changed = true;
		} else if (scope === 'user') {
			user.layer = { ...user.layer, [pinType]: [...(user.layer[pinType] ?? []), predicate] };
			user.changed = true;
		}

		return {
			...(workspace.changed ? { workspace: workspace.layer } : {}),
			...(user.changed ? { user: user.layer } : {})
		};
	}

	/**
	 * The pins of a type for everyone: those of the workspace layer, or the defaults while it names
	 * nothing for the type.
	 * @param type The IRI of the type.
	 * @returns The predicates.
	 */
	private _sharedOf(type: string): readonly string[] {
		return this._workspace[type] ?? DEFAULT_PINNED_PROPERTIES[type] ?? [];
	}

	/**
	 * A layer with a predicate taken from the pins of the given types.
	 * @param typeIris The types.
	 * @param predicate The predicate.
	 * @param pinsOf The pins of a type in the layer.
	 * @param layer The layer.
	 * @returns The new layer, and whether it changed.
	 */
	private _without(typeIris: readonly string[], predicate: string, pinsOf: (type: string) => readonly string[], layer: PinLayer): { layer: Record<string, readonly string[]>; changed: boolean } {
		const result: Record<string, readonly string[]> = { ...layer };
		let changed = false;

		for (const type of typeIris) {
			const pins = pinsOf(type);

			if (pins.includes(predicate)) {
				result[type] = pins.filter(candidate => candidate !== predicate);
				changed = true;
			}
		}

		return { layer: result, changed };
	}
}

/**
 * Read one layer of the setting, leaving out what is not a list of predicate IRIs.
 * @param value The value of the layer.
 * @returns The layer.
 */
function _layerOf(value: unknown): PinLayer {
	if (!value || typeof value !== 'object') {
		return {};
	}

	return Object.fromEntries(Object.entries(value as Record<string, unknown>)
		.filter((entry): entry is [string, string[]] => Array.isArray(entry[1]) && entry[1].every(item => typeof item === 'string')));
}
