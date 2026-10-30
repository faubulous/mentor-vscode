/**
 * Prepares a page for the browser component tests: the VS Code elements are registered from their
 * bundle, as the webview loads them, the stylesheets of the webviews and the form editor are
 * applied, and the page gets the theme variables of a dark VS Code theme.
 */
import '@vscode-elements/elements/dist/bundled.js';
import '@src/views/webviews/webview-styles.css';
import '@src/views/webviews/views/form-editor/form-editor.css';

const THEME = `
:root {
	--vscode-font-family: sans-serif;
	--vscode-font-size: 13px;
	--vscode-foreground: #cccccc;
	--vscode-descriptionForeground: #9d9d9d;
	--vscode-focusBorder: #0078d4;
	--vscode-settings-textInputBackground: #313131;
	--vscode-settings-textInputBorder: #3c3c3c;
	--vscode-settings-textInputForeground: #cccccc;
	--vscode-list-activeSelectionBackground: #04395e;
	--vscode-list-activeSelectionForeground: #ffffff;
	--vscode-list-hoverBackground: #2a2d2e;
	--vscode-editorWidget-background: #252526;
	--vscode-widget-border: #454545;
	--vscode-errorForeground: #f85149;
}

body {
	background: #1f1f1f;
	color: var(--vscode-foreground);
}
`;

const style = document.createElement('style');

style.textContent = THEME;
document.head.appendChild(style);
