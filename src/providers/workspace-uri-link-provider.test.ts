import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as vscode from 'vscode';

vi.mock('vscode', async () => await import('@src/utilities/mocks/vscode'));

vi.mock('@src/providers/workspace-uri', () => ({
  WorkspaceUri: {
    uriRegex: 'workspace://[^\\s>]+',
    uriScheme: 'workspace',
  },
}));

vi.mock('@faubulous/mentor-rdf-serializers', () => ({}));

const mockSubscriptions: any[] = [];
vi.mock('tsyringe', () => ({
  container: {
    resolve: vi.fn((token: string) => {
      if (token === 'ExtensionContext') return { subscriptions: mockSubscriptions };
      return {};
    }),
  },
  injectable: () => (t: any) => t,
  inject: () => () => {},
  singleton: () => (t: any) => t,
}));

vi.mock('@src/services/tokens', () => ({
  ServiceToken: { ExtensionContext: 'ExtensionContext' },
}));

describe('WorkspaceUriLinkProvider', () => {
  let WorkspaceUriLinkProvider: any;

  beforeEach(async () => {
    mockSubscriptions.length = 0;
    vi.resetModules();
    const mod = await import('@src/providers/workspace-uri-link-provider');
    WorkspaceUriLinkProvider = mod.WorkspaceUriLinkProvider;
  });

  it('registers document link provider on construction', () => {
    const provider = new WorkspaceUriLinkProvider();
    expect(mockSubscriptions.length).toBe(1);
    expect(provider).toBeDefined();
  });

  it('returns empty array for text with no workspace URIs', () => {
    const provider = new WorkspaceUriLinkProvider();
    const doc = {
      getText: () => 'No workspace links here, just plain text.',
      positionAt: (offset: number) => new vscode.Position(0, offset),
    } as any;
    const links = provider.provideDocumentLinks(doc);
    expect(links).toEqual([]);
  });

  it('returns a link for text containing a workspace URI', () => {
    const provider = new WorkspaceUriLinkProvider();
    const text = 'See workspace://folder/file.ttl for details';
    const doc = {
      getText: () => text,
      positionAt: (offset: number) => new vscode.Position(0, offset),
    } as any;
    const links = provider.provideDocumentLinks(doc);
    expect(links.length).toBe(1);
    expect(links[0]).toBeInstanceOf(vscode.DocumentLink);
  });

  it('returns multiple links for text with multiple workspace URIs', () => {
    const provider = new WorkspaceUriLinkProvider();
    const text = 'First workspace://a/b.ttl and second workspace://c/d.ttl here.';
    const doc = {
      getText: () => text,
      positionAt: (offset: number) => new vscode.Position(0, offset),
    } as any;
    const links = provider.provideDocumentLinks(doc);
    expect(links.length).toBe(2);
  });

  it('link range covers the full matched URI text', () => {
    const provider = new WorkspaceUriLinkProvider();
    const text = 'Link: workspace://my/path.ttl done.';
    const matchStart = text.indexOf('workspace://');
    const matchEnd = matchStart + 'workspace://my/path.ttl'.length;
    const doc = {
      getText: () => text,
      positionAt: (offset: number) => new vscode.Position(0, offset),
    } as any;
    const links = provider.provideDocumentLinks(doc);
    expect(links.length).toBe(1);
    expect(links[0].range.start.character).toBe(matchStart);
    expect(links[0].range.end.character).toBe(matchEnd);
  });

  it('returns a link for a triple-slash workspace URI', () => {
    const provider = new WorkspaceUriLinkProvider();
    const text = 'See workspace:///documents/example.ttl for details';
    const doc = {
      getText: () => text,
      positionAt: (offset: number) => new vscode.Position(0, offset),
    } as any;
    const links = provider.provideDocumentLinks(doc);
    expect(links.length).toBe(1);
    expect(links[0]).toBeInstanceOf(vscode.DocumentLink);
  });

  it('link range covers the full triple-slash URI text', () => {
    const provider = new WorkspaceUriLinkProvider();
    const text = 'Link: workspace:///shared/core.ttl done.';
    const matchStart = text.indexOf('workspace:///');
    const matchEnd = matchStart + 'workspace:///shared/core.ttl'.length;
    const doc = {
      getText: () => text,
      positionAt: (offset: number) => new vscode.Position(0, offset),
    } as any;
    const links = provider.provideDocumentLinks(doc);
    expect(links.length).toBe(1);
    expect(links[0].range.start.character).toBe(matchStart);
    expect(links[0].range.end.character).toBe(matchEnd);
  });

  it('returns links for mixed double-slash and triple-slash URIs', () => {
    const provider = new WorkspaceUriLinkProvider();
    const text = 'Old workspace://a/b.ttl and new workspace:///c/d.ttl here.';
    const doc = {
      getText: () => text,
      positionAt: (offset: number) => new vscode.Position(0, offset),
    } as any;
    const links = provider.provideDocumentLinks(doc);
    expect(links.length).toBe(2);
  });

  it('matches triple-slash URI with query parameter', () => {
    const provider = new WorkspaceUriLinkProvider();
    const text = 'Graph workspace:///documents/example.ttl?inference is inferred.';
    const doc = {
      getText: () => text,
      positionAt: (offset: number) => new vscode.Position(0, offset),
    } as any;
    const links = provider.provideDocumentLinks(doc);
    expect(links.length).toBe(1);
    const matchStart = text.indexOf('workspace:///');
    const matchEnd = matchStart + 'workspace:///documents/example.ttl?inference'.length;
    expect(links[0].range.start.character).toBe(matchStart);
    expect(links[0].range.end.character).toBe(matchEnd);
  });
});
