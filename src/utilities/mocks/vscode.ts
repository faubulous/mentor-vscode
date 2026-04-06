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
    readFile: async (_uri: any): Promise<Uint8Array> => { throw new Error('file not found'); },
    stat: async (_uri: any): Promise<any> => { throw new Error('file not found'); },
    writeFile: async (_uri: any, _content: Uint8Array): Promise<void> => {},
  },
  getConfiguration: (section?: string) => ({
    get: (key: string, defaultValue?: any) => defaultValue,
    has: (key: string) => false,
    inspect: (key: string) => undefined,
    update: async (key: string, value: any) => {},
  }),
  onDidOpenTextDocument: (_handler: any) => ({ dispose: () => {} }),
  onDidChangeTextDocument: (_handler: any) => ({ dispose: () => {} }),
  onDidCloseTextDocument: (_handler: any) => ({ dispose: () => {} }),
  onDidChangeConfiguration: (_handler: any) => ({ dispose: () => {} }),
  onDidOpenNotebookDocument: (_handler: any) => ({ dispose: () => {} }),
  onDidChangeNotebookDocument: (_handler: any) => ({ dispose: () => {} }),
  onDidCloseNotebookDocument: (_handler: any) => ({ dispose: () => {} }),
  applyEdit: async (_edit: any) => true,
  textDocuments: [] as any[],
  workspaceFile: undefined as any,
  openTextDocument: async (_uri: any) => undefined as any,
  openNotebookDocument: async (_type: string, _content?: any) => undefined as any,
  notebookDocuments: [] as any[],
  registerFileSystemProvider: (_scheme: string, _provider: any, _options?: any) => ({ dispose: () => {} }),
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
  activeNotebookEditor: undefined as any,
  onDidChangeActiveTextEditor: (_handler: any) => ({ dispose: () => {} }),
  onDidChangeActiveNotebookEditor: (_handler: any) => ({ dispose: () => {} }),
  setStatusBarMessage: (_text: string, _timeout?: number) => ({ dispose: () => {} }),
  createTreeView: (_id: string, _options: any) => ({ title: '', onDidChangeVisibility: () => ({ dispose: () => {} }), onDidExpandElement: () => ({ dispose: () => {} }), onDidCollapseElement: () => ({ dispose: () => {} }), reveal: async () => {}, dispose: () => {} }),
  showNotebookDocument: async (_notebook: any, _options?: any) => undefined as any,
  showTextDocument: async (_document: any, _options?: any) => undefined as any,
  createQuickPick: () => ({
    title: '',
    placeholder: '',
    items: [] as any[],
    onDidChangeSelection: (_handler: any) => ({ dispose: () => {} }),
    onDidTriggerItemButton: (_handler: any) => ({ dispose: () => {} }),
    onDidHide: (_handler: any) => ({ dispose: () => {} }),
    show: () => {},
    hide: () => {},
    dispose: () => {},
  }),
  showErrorMessage: (_message: string, ..._items: any[]) => Promise.resolve(undefined as any),
  showWarningMessage: (_message: string, ..._items: any[]) => Promise.resolve(undefined as any),
  showInformationMessage: (_message: string, ..._items: any[]) => Promise.resolve(undefined as any),
  showInputBox: (_options?: any) => Promise.resolve(undefined as any),
  showQuickPick: (_items: any, _options?: any) => Promise.resolve(undefined as any),
  withProgress: async (_options: any, task: (progress: any, token: any) => any) => task({ report: () => {} }, { isCancellationRequested: false }),
  createOutputChannel: (_name: string) => ({
    appendLine: () => {},
    append: () => {},
    clear: () => {},
    dispose: () => {},
    show: () => {},
    hide: () => {},
  }),
  registerFileDecorationProvider: (_provider: any) => ({ dispose: () => {} }),
  registerUriHandler: (_handler: any) => ({ dispose: () => {} }),
};

export const commands = {
  executeCommand: async () => undefined,
};

export const authentication = {
  getSession: async (_providerId: string, _scopes: string[], _options?: any) => undefined as any,
};

export const env = {
  openExternal: async () => true,
  language: 'en',
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
  registerDocumentLinkProvider: (_selector: any, _provider: any) => ({ dispose: () => {} }),
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

export const ProgressLocation = {
  SourceControl: 1,
  Window: 10,
  Notification: 15,
};

export const ConfigurationTarget = {
  Global: 1,
  Workspace: 2,
  WorkspaceFolder: 3,
};

export const QuickPickItemKind = {
  Default: 0,
  Separator: -1,
};

export const ViewColumn = {
  Active: -1,
  Beside: -2,
  One: 1,
  Two: 2,
  Three: 3,
};

export const NotebookEdit = {
  updateCellMetadata: (_index: number, _metadata: any) => ({ type: 'updateCellMetadata', index: _index, metadata: _metadata }),
  insertCells: (_index: number, _cells: any[]) => ({ type: 'insertCells', index: _index, cells: _cells }),
  deleteCells: (_range: any) => ({ type: 'deleteCells', range: _range }),
  updateNotebookMetadata: (_metadata: any) => ({ type: 'updateNotebookMetadata', metadata: _metadata }),
};

export class FileDecoration {
  public badge: string | undefined;
  public tooltip: string | undefined;
  public color: any | undefined;
  public propagate: boolean | undefined;

  constructor(badge?: string, tooltip?: string, color?: ThemeColor) {
    this.badge = badge;
    this.tooltip = tooltip;
    this.color = color;
  }
}

export class NotebookRange {
  constructor(public readonly start: number, public readonly end: number) {}
}

export const NotebookEditorRevealType = {
  Default: 0,
  InCenter: 1,
  InCenterIfOutsideViewport: 2,
  AtTop: 3,
};

export class NotebookData {
  constructor(public cells: any[]) {}
}

export class NotebookCellData {
  constructor(public kind: number, public value: string, public languageId: string) {}
}

export const NotebookCellKind = {
  Markup: 1,
  Code: 2,
};

export const RelativePattern = class {
  constructor(public base: any, public pattern: string) {}
};

export class Disposable {
  constructor(private readonly _callOnDispose: () => void) {}
  dispose() { this._callOnDispose(); }
}

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
  public readonly start: Position;
  public readonly end: Position;

  constructor(startOrLine: Position | number, endOrChar: Position | number, endLine?: number, endChar?: number) {
    if (typeof startOrLine === 'number') {
      this.start = new Position(startOrLine as number, endOrChar as number);
      this.end = new Position(endLine!, endChar!);
    } else {
      this.start = startOrLine;
      this.end = endOrChar as Position;
    }
  }

  contains(positionOrRange: Position | Range): boolean {
    const start = (positionOrRange as Range).start ?? positionOrRange as Position;
    const end = (positionOrRange as Range).end ?? positionOrRange as Position;
    return (
      (start.line > this.start.line || (start.line === this.start.line && start.character >= this.start.character)) &&
      (end.line < this.end.line || (end.line === this.end.line && end.character <= this.end.character))
    );
  }
}

export class Location {
  constructor(public readonly uri: any, public readonly range: Range) {}
}

export class Hover {
  constructor(public readonly contents: any, public readonly range?: Range) {}
}

export class DocumentLink {
  constructor(public range: Range, public target?: any) {}
}

export class Selection extends Range {
  constructor(
    anchorOrLine: Position | number,
    activeOrChar: Position | number,
    activeLine?: number,
    activeChar?: number
  ) {
    if (typeof anchorOrLine === 'number') {
      super(anchorOrLine, activeOrChar as number, activeLine, activeChar);
    } else {
      super(anchorOrLine as Position, activeOrChar as Position);
    }
    this.anchor = typeof anchorOrLine === 'number' ? new Position(anchorOrLine, activeOrChar as number) : anchorOrLine;
    this.active = typeof anchorOrLine === 'number' ? new Position(activeLine!, activeChar!) : activeOrChar as Position;
  }

  anchor: Position;
  active: Position;
}

export const TextEditorRevealType = {
  Default: 0,
  InCenter: 1,
  InCenterIfOutsideViewport: 2,
  AtTop: 3,
};

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

  set(uri: any, edits: any[]): void {
    for (const edit of edits) {
      if (edit.range && edit.newText !== undefined) {
        this.replace(uri, edit.range, edit.newText);
      }
    }
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

export class MarkdownString {
  value: string;
  isTrusted?: boolean;
  supportThemeIcons?: boolean;
  supportHtml?: boolean;
  baseUri?: any;

  constructor(value = '', isTrusted = false) {
    this.value = value;
    this.isTrusted = isTrusted;
  }

  appendText(value: string): this { this.value += value; return this; }
  appendMarkdown(value: string): this { this.value += value; return this; }
  appendCodeblock(value: string, language?: string): this { this.value += '```' + (language ?? '') + '\n' + value + '\n```'; return this; }
}

export const extensions = {
  all: [] as any[],
  getExtension: (_id: string) => undefined as any,
};

export const DiagnosticSeverity = {
  Error: 0,
  Warning: 1,
  Information: 2,
  Hint: 3,
};

export const TreeItemCollapsibleState = {
  None: 0,
  Collapsed: 1,
  Expanded: 2,
};

export class ThemeColor {
  constructor(public readonly id: string) {}
}

export class ThemeIcon {
  static readonly File = new (class ThemeIconStatic { id = 'file'; })();
  static readonly Folder = new (class ThemeIconStatic { id = 'folder'; })();

  constructor(public readonly id: string, public readonly color?: ThemeColor) {}
}

export class TreeItem {
  label?: string;
  id?: string;
  description?: string;
  tooltip?: string | any;
  iconPath?: string | any;
  contextValue?: string;
  command?: any;
  collapsibleState: number;
  resourceUri?: any;

  constructor(public uri: any, collapsibleState?: number) {
    this.collapsibleState = collapsibleState ?? TreeItemCollapsibleState.None;
  }
}

export class CancellationTokenSource {
  private _isCancellationRequested = false;

  readonly token = {
    get isCancellationRequested() { return false; },
    onCancellationRequested: (_handler: any) => ({ dispose: () => {} }),
  };

  cancel() {
    this._isCancellationRequested = true;
  }

  dispose() {}
}
