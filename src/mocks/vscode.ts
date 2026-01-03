import { URI as _URI, Utils } from 'vscode-uri';

const workspaceRoot = _URI.parse('file:///w');

export const workspace = {
  workspaceFolders: [
    { name: 'root', index: 0, uri: workspaceRoot },
  ],
};

// Provide a minimal Uri namespace compatible with vscode.Uri
export const Uri = {
  parse: (value: string) => _URI.parse(value),
  joinPath: (base: any, ...pathSegments: string[]) => Utils.joinPath(base, ...pathSegments),
};

export const window = {
  activeColorTheme: { kind: 1 },
};

export const commands = {
  executeCommand: async () => undefined,
};

export const env = {
  openExternal: async () => true,
};
