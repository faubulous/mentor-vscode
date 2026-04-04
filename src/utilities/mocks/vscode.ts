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
  fs: {
    readFile: async (_uri: any): Promise<Uint8Array> => { throw new Error('file not found'); }
  },
  getConfiguration: (section?: string) => ({
    get: (key: string, defaultValue?: any) => defaultValue,
    has: (key: string) => false,
    inspect: (key: string) => undefined,
    update: async (key: string, value: any) => {},
  }),
  onDidChangeTextDocument: (_handler: any) => ({ dispose: () => {} }),
  onDidCloseTextDocument: (_handler: any) => ({ dispose: () => {} }),
  onDidChangeConfiguration: (_handler: any) => ({ dispose: () => {} }),
  onDidChangeNotebookDocument: (_handler: any) => ({ dispose: () => {} }),
  applyEdit: async (_edit: any) => true,
  textDocuments: [] as any[],
};

// Provide a minimal Uri namespace compatible with vscode.Uri
export const Uri = {
  parse: (value: string) => _URI.parse(value),
  file: (path: string) => _URI.file(path),
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

export const languages = {
  createDiagnosticCollection: (_name?: string) => ({
    set: () => {},
    delete: () => {},
    clear: () => {},
    dispose: () => {},
  }),
  getDiagnostics: (_uri?: any) => [] as any[],
  registerCodeActionsProvider: (_selector: any, _provider: any) => ({ dispose: () => {} }),
  registerCodeLensProvider: (_selector: any, _provider: any) => ({ dispose: () => {} }),
  registerCompletionItemProvider: (_selector: any, _provider: any, ..._triggers: string[]) => ({ dispose: () => {} }),
  registerDefinitionProvider: (_selector: any, _provider: any) => ({ dispose: () => {} }),
  registerDocumentFormattingEditProvider: (_selector: any, _provider: any) => ({ dispose: () => {} }),
  registerHoverProvider: (_selector: any, _provider: any) => ({ dispose: () => {} }),
  registerInlineCompletionItemProvider: (_selector: any, _provider: any) => ({ dispose: () => {} }),
  registerReferenceProvider: (_selector: any, _provider: any) => ({ dispose: () => {} }),
  registerRenameProvider: (_selector: any, _provider: any) => ({ dispose: () => {} }),
};

export const CodeActionKind = {
  Empty: { value: '' },
  QuickFix: { value: 'quickfix' },
  Refactor: { value: 'refactor' },
  RefactorExtract: { value: 'refactor.extract' },
  RefactorInline: { value: 'refactor.inline' },
  RefactorMove: { value: 'refactor.move' },
  RefactorRewrite: { value: 'refactor.rewrite' },
  Source: { value: 'source' },
  SourceOrganizeImports: { value: 'source.organizeImports' },
  SourceFixAll: { value: 'source.fixAll' },
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

export class Position {
  constructor(public readonly line: number, public readonly character: number) {}

  translate(lineDelta: number, characterDelta: number = 0): Position {
    return new Position(this.line + lineDelta, this.character + characterDelta);
  }

  isEqual(other: Position): boolean {
    return this.line === other.line && this.character === other.character;
  }
}

export class Range {
  constructor(public readonly start: Position, public readonly end: Position) {}
}

export class WorkspaceEdit {
  private readonly _edits: Array<{ uri: any; type: string; range?: Range; newText?: string; position?: Position; text?: string }> = [];

  replace(uri: any, range: Range, newText: string): void {
    this._edits.push({ uri, type: 'replace', range, newText });
  }

  insert(uri: any, position: Position, text: string): void {
    this._edits.push({ uri, type: 'insert', position, text });
  }

  delete(uri: any, range: Range): void {
    this._edits.push({ uri, type: 'delete', range });
  }

  get size(): number {
    return this._edits.length;
  }

  get entries(): Array<{ uri: any; type: string; range?: Range; newText?: string; position?: Position; text?: string }> {
    return this._edits;
  }
}

export class TextEdit {
  constructor(
    public readonly range: Range,
    public readonly newText: string,
  ) {}

  static replace(range: Range, newText: string): TextEdit {
    return new TextEdit(range, newText);
  }

  static insert(position: Position, newText: string): TextEdit {
    return new TextEdit(new Range(position, position), newText);
  }

  static delete(range: Range): TextEdit {
    return new TextEdit(range, '');
  }
}

export class DiagnosticCollection {
  set() {}
  delete() {}
  clear() {}
  dispose() {}
}

export class SnippetString {
  constructor(public value: string = '') {}
}

export const CompletionItemKind = {
  Text: 0, Method: 1, Function: 2, Constructor: 3, Field: 4,
  Variable: 5, Class: 6, Interface: 7, Module: 8, Property: 9,
  Unit: 10, Value: 11, Enum: 12, Keyword: 13, Snippet: 14,
  Color: 15, Reference: 16, File: 17, Folder: 18, EnumMember: 19,
  Constant: 20, Struct: 21, Event: 22, Operator: 23, TypeParameter: 24,
};

export class CompletionItem {
  detail?: string;
  documentation?: string;
  sortText?: string;
  filterText?: string;
  insertText?: string | SnippetString;
  range?: Range;
  command?: any;

  constructor(public label: string | any, public kind?: any) {}
}

export class CompletionList {
  constructor(public items: CompletionItem[] = [], public isIncomplete = false) {}
}

export class InlineCompletionItem {
  constructor(public insertText: string | SnippetString, public range?: Range, public command?: any) {}
}

export class InlineCompletionList {
  constructor(public items: InlineCompletionItem[]) {}
}

export class CodeLens {
  constructor(public range: Range, public command?: any) {}
}

export const extensions = {
  all: [] as any[],
};
