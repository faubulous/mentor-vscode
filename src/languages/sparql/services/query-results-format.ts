import { getConfig } from '@src/utilities/vscode/config';
import { BindingsFormat, IriForm } from './bindings-formatter';

/**
 * Returns the format the query results table is copied to the clipboard in.
 * @returns The configured copy format, defaulting to CSV.
 */
export function getResultsCopyFormat(): BindingsFormat {
	return getConfig('sparql').get<BindingsFormat>('resultsCopyFormat', 'csv');
}

/**
 * Returns the rendering of IRIs in copied and exported query results.
 * @returns The configured IRI form, defaulting to the full IRI.
 */
export function getResultsIriFormat(): IriForm {
	return getConfig('sparql').get<IriForm>('resultsIriFormat', 'full');
}
