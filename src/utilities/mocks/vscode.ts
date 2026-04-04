import { URI as _URI, Utils } from 'vscode-uri';

const workspaceRoot = _URI.parse('file:///w');

export const workspace = {
  workspaceFolders: [
    { name: 'root', index: 0, uri: workspaceRoot },
  ],
  findFiles: async () => [] as any[],
  createFileSystemWatcher: () => ({
    onDidCreate: () => ({ dispose: () => {} }),
    onDidChange: () => ({ dispose: () => {} }),
    onDidDelete: () => ({ dispose: () => {} }),
    dispose: () => {}
  }),
  getConfiguration: (section?: string) => ({
    get: (key: string, defaultValue?: any) => defaultValue,
    has: (key: string) => false,
    inspect: (key: string) => undefined,
    update: async (key: string, value: any) => {},
  }),
  onDidChangeTextDocument: (_handler: any) => ({ dispose: () => {} }),
  onDidCloseTextDocument: (_handler: any) => ({ dispose: () => {} }),
  textDocuments: [] as any[],
};

// Provide a minimal Uri namespace compatible with vscode.Uri
export const Uri = {
  parse: (value: string) => _URI.parse(value),
  joinPath: (base: any, ...pathSegments: string[]) => Utils.joinPath(base, ...pathSegments),
};

export const window = {
  activeColorTheme: { kind: 1 },
  activeTextEditor: undefined as any,
  onDidChangeActiveTextEditor: (_handler: any) => ({ dispose: () => {} }),
  onDidChangeActiveNotebookEditor: (_handler: any) => ({ dispose: () => {} }),
};

export const commands = {
  executeCommand: async () => undefined,
};

export const env = {
  openExternal: async () => true,
};

export const FileChangeType = {
  Created: 1,
  Changed: 2,
  Deleted: 3,
};

export const RelativePattern = class {
  constructor(public base: any, public pattern: string) {}
};

/**
 * Mock EventEmitter for tests.
 */
export class EventEmitter<T> {
  private listeners: Array<(e: T) => void> = [];

  get event() {
    return (listener: (e: T) => void) => {
      this.listeners.push(listener);
      return { dispose: () => this.listeners = this.listeners.filter(l => l !== listener) };
    };
  }

  fire(data: T) {
    this.listeners.forEach(l => l(data));
  }

  dispose() {
    this.listeners = [];
  }
}
