import { describe, it, expect, vi, afterEach } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));

import * as vscode from 'vscode';
import { isDocumentOpen } from '@src/utilities/vscode/editors';

describe('isDocumentOpen', () => {
	const uri = vscode.Uri.parse('file:///w/data.ttl');

	afterEach(() => {
		(vscode.workspace as any).textDocuments = [];
		(vscode.workspace as any).notebookDocuments = [];
	});

	it('returns true for an open text document', () => {
		(vscode.workspace as any).textDocuments = [{ uri: vscode.Uri.parse('file:///w/data.ttl') }];

		expect(isDocumentOpen(uri)).toBe(true);
	});

	it('returns true for an open notebook', () => {
		(vscode.workspace as any).notebookDocuments = [{ uri: vscode.Uri.parse('file:///w/data.ttl') }];

		expect(isDocumentOpen(uri)).toBe(true);
	});

	it('returns false for a document that is not open', () => {
		(vscode.workspace as any).textDocuments = [{ uri: vscode.Uri.parse('file:///w/other.ttl') }];

		expect(isDocumentOpen(uri)).toBe(false);
	});
});
