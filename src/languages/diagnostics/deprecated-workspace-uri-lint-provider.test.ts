import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { DiagnosticSeverity } from 'vscode-languageserver/browser';
import { DeprecatedWorkspaceUriLintProvider, DEPRECATED_WORKSPACE_URI_CODE } from './deprecated-workspace-uri-lint-provider';

vi.mock('@faubulous/mentor-rdf-serializers', () => ({}));

function makeDoc(content = '') {
	return TextDocument.create('file:///test.ttl', 'turtle', 1, content);
}

function makeToken(name: string, image: string, offset = 0) {
	return {
		tokenType: { name },
		image,
		startOffset: offset,
		endOffset: offset + image.length - 1,
		startLine: 1,
		startColumn: 1,
		endLine: 1,
		endColumn: image.length,
	};
}

describe('DeprecatedWorkspaceUriLintProvider', () => {
	let rule: DeprecatedWorkspaceUriLintProvider;

	beforeEach(() => {
		rule = new DeprecatedWorkspaceUriLintProvider();
	});

	it('returns no diagnostics when there are no IRIREF tokens', () => {
		const tokens = [makeToken('PNAME_LN', 'ex:Thing')];
		const diags = rule.getDiagnostics({ document: makeDoc(), content: '', tokens, prefixes: {} });
		expect(diags).toHaveLength(0);
	});

	it('returns no diagnostics for new triple-slash workspace URIs', () => {
		const tokens = [makeToken('IRIREF', '<workspace:///dir/file.ttl>')];
		const diags = rule.getDiagnostics({ document: makeDoc(), content: '', tokens, prefixes: {} });
		expect(diags).toHaveLength(0);
	});

	it('returns no diagnostics for non-workspace IRIs', () => {
		const tokens = [makeToken('IRIREF', '<http://example.com/>')];
		const diags = rule.getDiagnostics({ document: makeDoc(), content: '', tokens, prefixes: {} });
		expect(diags).toHaveLength(0);
	});

	it('returns a diagnostic for deprecated single-slash workspace URI', () => {
		const image = '<workspace:/dir/file.ttl>';
		const tokens = [makeToken('IRIREF', image)];
		const doc = makeDoc(image);
		const diags = rule.getDiagnostics({ document: doc, content: doc.getText(), tokens, prefixes: {} });

		expect(diags).toHaveLength(1);
		expect(diags[0].code).toBe(DEPRECATED_WORKSPACE_URI_CODE);
		expect(diags[0].severity).toBe(DiagnosticSeverity.Warning);
		expect(diags[0].message).toContain('workspace:///dir/file.ttl');
	});

	it('returns diagnostics for multiple deprecated URIs', () => {
		const tokens = [
			makeToken('IRIREF', '<workspace:/a.ttl>', 0),
			makeToken('IRIREF', '<workspace:/b.ttl>', 20),
		];
		const diags = rule.getDiagnostics({ document: makeDoc(), content: '', tokens, prefixes: {} });
		expect(diags).toHaveLength(2);
	});

	it('does not flag triple-slash URIs mixed with old URIs', () => {
		const tokens = [
			makeToken('IRIREF', '<workspace:///new.ttl>', 0),
			makeToken('IRIREF', '<workspace:/old.ttl>', 25),
		];
		const diags = rule.getDiagnostics({ document: makeDoc(), content: '', tokens, prefixes: {} });

		expect(diags).toHaveLength(1);
		expect(diags[0].message).toContain('workspace:///old.ttl');
	});
});
