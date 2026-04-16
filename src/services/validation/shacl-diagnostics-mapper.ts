import * as vscode from 'vscode';
import { SH } from '@faubulous/mentor-rdf';
import { IDocumentContext } from '@src/services/document/document-context.interface';
import { ShaclValidationResult, ShaclValidationResultEntry } from './shacl-validation-service';

/**
 * Maps SHACL validation results to VS Code diagnostics.
 */
export class ShaclDiagnosticsMapper {
	/**
	 * Map a SHACL validation result to VS Code diagnostics.
	 * @param result The validation result.
	 * @param context The document context for resolving focus node positions.
	 * @returns An array of VS Code diagnostics.
	 */
	mapToDiagnostics(result: ShaclValidationResult, context: IDocumentContext): vscode.Diagnostic[] {
		const diagnostics: vscode.Diagnostic[] = [];

		for (const entry of result.results) {
			const range = this._resolveRange(entry, context);
			const severity = this._mapSeverity(entry.severity);
			const message = this._buildMessage(entry);

			const diagnostic = new vscode.Diagnostic(range, message, severity);
			diagnostic.source = 'SHACL';
			diagnostic.code = this._extractLocalName(entry.constraintComponent);

			diagnostics.push(diagnostic);
		}

		return diagnostics;
	}

	/**
	 * Resolve the document range for a validation result entry.
	 * Prefers highlighting the offending predicate or value over the focus node.
	 */
	private _resolveRange(entry: ShaclValidationResultEntry, context: IDocumentContext): vscode.Range {
		// Determine the focus node's start line so we can anchor relative lookups.
		const focusNodeStartLine = this._getFocusNodeStartLine(entry.focusNode, context);

		// Determine where the next subject starts so we can scope lookups
		// to only the focus node's block (avoids picking up predicates that
		// belong to a different subject further down in the document).
		const nextSubjectStartLine = this._getNextSubjectStartLine(focusNodeStartLine, context);

		// 1. Try the value IRI (most specific).
		if (entry.value) {
			const r = this._firstRangeAfterLine(context.references[entry.value], focusNodeStartLine, nextSubjectStartLine);
			if (r) return r;
		}

		// 2. Try the predicate path.
		if (entry.path) {
			const r = this._firstRangeAfterLine(context.references[entry.path], focusNodeStartLine, nextSubjectStartLine);
			if (r) return r;
		}

		// 3. Fall back to the focus node subject position.
		if (focusNodeStartLine !== undefined) {
			const allRanges = context.subjects[entry.focusNode] ?? context.references[entry.focusNode];
			if (allRanges?.length) {
				const r = allRanges[0];
				return new vscode.Range(r.start.line, r.start.character, r.end.line, r.end.character);
			}
		}

		// 4. Last resort: top of the file.
		return new vscode.Range(0, 0, 0, 0);
	}

	/**
	 * Returns the start line of the focus node in the document, or undefined if not found.
	 */
	private _getFocusNodeStartLine(focusNode: string, context: IDocumentContext): number | undefined {
		const ranges = context.subjects[focusNode] ?? context.references[focusNode];
		return ranges?.length ? ranges[0].start.line : undefined;
	}

	/**
	 * Returns the smallest subject start line that is strictly greater than
	 * the given focus node start line, or undefined if no such subject exists.
	 */
	private _getNextSubjectStartLine(focusNodeStartLine: number | undefined, context: IDocumentContext): number | undefined {
		if (focusNodeStartLine === undefined) return undefined;

		let nearest: number | undefined;

		for (const ranges of Object.values(context.subjects)) {
			if (!ranges?.length) continue;
			const line = ranges[0].start.line;
			if (line > focusNodeStartLine && (nearest === undefined || line < nearest)) {
				nearest = line;
			}
		}

		return nearest;
	}

	/**
	 * Returns the first range from the given array whose start line is >= anchorLine
	 * and < beforeLine (if given). Returns undefined if no matching range exists.
	 */
	private _firstRangeAfterLine(ranges: import('vscode-languageserver-types').Range[] | undefined, anchorLine: number | undefined, beforeLine?: number): vscode.Range | undefined {
		if (!ranges?.length) return undefined;

		const candidates = anchorLine !== undefined
			? ranges.filter(r => r.start.line >= anchorLine && (beforeLine === undefined || r.start.line < beforeLine))
			: ranges;

		if (!candidates.length) return undefined;

		const r = candidates[0];
		return new vscode.Range(r.start.line, r.start.character, r.end.line, r.end.character);
	}

	/**
	 * Map a SHACL severity IRI to a VS Code diagnostic severity.
	 */
	private _mapSeverity(severity: string): vscode.DiagnosticSeverity {
		if (severity === SH.Violation) {
			return vscode.DiagnosticSeverity.Error;
		}

		if (severity === SH.Warning) {
			return vscode.DiagnosticSeverity.Warning;
		}

		if (severity === SH.Info) {
			return vscode.DiagnosticSeverity.Information;
		}

		return vscode.DiagnosticSeverity.Error;
	}

	/**
	 * Build a human-readable message from a validation result entry.
	 */
	private _buildMessage(entry: ShaclValidationResultEntry): string {
		if (entry.messages.length > 0) {
			return entry.messages.join('; ');
		}

		const parts: string[] = [];
		const component = this._extractLocalName(entry.constraintComponent);
		parts.push(`Constraint violation: ${component}`);

		if (entry.path) {
			parts.push(`Path: ${this._extractLocalName(entry.path)}`);
		}

		if (entry.value) {
			parts.push(`Value: ${entry.value}`);
		}

		return parts.join(' | ');
	}

	/**
	 * Extract the local name from an IRI.
	 */
	private _extractLocalName(iri: string): string {
		const hashIndex = iri.lastIndexOf('#');

		if (hashIndex >= 0) {
			return iri.substring(hashIndex + 1);
		}

		const slashIndex = iri.lastIndexOf('/');

		if (slashIndex >= 0) {
			return iri.substring(slashIndex + 1);
		}

		return iri;
	}
}
