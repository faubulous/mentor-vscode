import { getConfig } from '@src/utilities/vscode/config';
import { BindingsFormat, IriForm, ResultsExportTarget } from './bindings-formatter';

/**
 * Returns the format of the text a notebook cell offers to the built-in copy command.
 * @returns The configured copy format, defaulting to CSV.
 */
export function getResultsCopyFormat(): BindingsFormat {
	return getConfig('sparql').get<BindingsFormat>('resultsCopyFormat', 'csv');
}

/**
 * Returns the target the results toolbar sends the results to when a format is chosen.
 * @returns The configured export target, defaulting to a new document.
 */
export function getResultsExportTarget(): ResultsExportTarget {
	return getConfig('sparql').get<ResultsExportTarget>('resultsExportTarget', 'document');
}

/**
 * Returns the rendering of IRIs in copied and exported query results.
 * @returns The configured IRI form, defaulting to the full IRI.
 */
export function getResultsIriFormat(): IriForm {
	return getConfig('sparql').get<IriForm>('resultsIriFormat', 'full');
}
