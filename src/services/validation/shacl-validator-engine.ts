import { DatasetCore } from '@rdfjs/types';
import { Validator, ValidationResult } from 'shacl-engine';
import { Store } from '@faubulous/mentor-rdf';
import { rdfDataFactory } from '@src/utilities/rdf';

/**
 * Result of a SHACL validation operation.
 */
export interface ShaclValidationResult {
	/**
	 * Whether the data conforms to all shapes.
	 */
	conforms: boolean;
	/**
	 * The validation report as an RDF dataset.
	 */
	reportDataset: DatasetCore;
	/**
	 * Individual validation results.
	 */
	results: ShaclValidationResultEntry[];
	/**
	 * Shape graph URIs that were requested but not present in the store when the
	 * validation ran (e.g. a deleted workspace shape file). The validation ran
	 * without their shapes, so `conforms` may be a false all-clear — consumers
	 * must present the result as incomplete when this is non-empty.
	 */
	missingShapeGraphs?: string[];
}

/**
 * An individual SHACL validation result entry.
 */
export interface ShaclValidationResultEntry {
	/**
	 * The focus node that was validated.
	 */
	focusNode: string;
	/**
	 * The severity of the violation (sh:Violation, sh:Warning, sh:Info).
	 */
	severity: string;
	/**
	 * The constraint component that triggered the result.
	 */
	constraintComponent: string;
	/**
	 * The result message(s).
	 */
	messages: string[];
	/**
	 * The result path (property), if applicable.
	 */
	path?: string;
	/**
	 * The value that caused the violation, if applicable.
	 */
	value?: string;
	/**
	 * The source shape URI.
	 */
	sourceShape: string;
}

/**
 * Maps shacl-engine's raw validation results to plain result entries.
 */
function mapValidationResults(results: ValidationResult[]): ShaclValidationResultEntry[] {
	return results.map(r => ({
		focusNode: r.focusNode?.term?.value ?? r.focusNode?.value ?? '',
		severity: r.severity?.value ?? '',
		constraintComponent: r.constraintComponent?.value ?? '',
		messages: (r.message ?? []).map(m => m.value ?? String(m)),
		path: r.path?.[0]?.predicates?.[0]?.value,
		value: r.value?.term?.value ?? r.value?.value,
		sourceShape: r.shape?.ptr?.term?.value ?? ''
	}));
}

/**
 * The vscode-free SHACL validation core: compiles and caches shacl-engine
 * validators per shape graph combination and runs them over a data dataset.
 */
export class ShaclValidatorEngine {
	/**
	 * Caches SHACL validators per shape graph combination so that shapes are not
	 * recompiled on every validation run. Entries are keyed by the sorted shape
	 * graph URIs and invalidated by comparing the store's per-graph versions.
	 */
	private readonly _validatorCache = new Map<string, { validator: Validator; versions: number[] }>();

	/**
	 * @param _store The store holding the shape graphs.
	 * @param _log Optional sink for informational messages (e.g. compile timings).
	 */
	constructor(
		private readonly _store: Store,
		private readonly _log?: (message: string) => void
	) { }

	/**
	 * Validates a data dataset against the given shape graphs and returns the
	 * mapped result.
	 */
	async validate(shapeGraphUris: string[], dataDataset: DatasetCore): Promise<ShaclValidationResult> {
		const validator = this._getValidator(shapeGraphUris);
		const report = await validator.validate({ dataset: dataDataset });

		return {
			conforms: report.conforms,
			reportDataset: report.dataset,
			results: mapValidationResults(report.results)
		};
	}

	/**
	 * Get a SHACL validator for the given shape graphs. Validators are cached and
	 * reused until the contents of any of their shape graphs change in the store,
	 * so that shapes are not recompiled on every validation run.
	 */
	private _getValidator(shapeGraphUris: string[]): Validator {
		const sorted = [...shapeGraphUris].sort();
		const key = sorted.join('\n');
		const versions = sorted.map(graphUri => this._store.getGraphVersion(graphUri));
		const cached = this._validatorCache.get(key);

		if (cached && cached.versions.every((version, i) => version === versions[i])) {
			return cached.validator;
		}

		// Compiling the validator walks the whole shapes dataset; on a cache miss (e.g. the
		// first validated file of a run) this can dominate the perceived cost of an otherwise
		// small file, so time it separately from the data-graph validation.
		const shapesDataset = this._store.getDataset(sorted, false);
		const startTime = performance.now();
		const validator = new Validator(shapesDataset, { factory: rdfDataFactory });
		const duration = Math.round(performance.now() - startTime);

		this._log?.(`Compiled validator for ${sorted.length} shape graph${sorted.length === 1 ? '' : 's'} in ${duration} ms`);

		this._validatorCache.set(key, { validator, versions });

		return validator;
	}
}
