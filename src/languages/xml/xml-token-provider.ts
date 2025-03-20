import * as vscode from 'vscode';
import { XmlHoverProvider } from '@/languages/xml/providers';

const hoverProvider = new XmlHoverProvider();

export class XmlTokenProvider {
	register(): vscode.Disposable[] {
		return this.registerForLanguage('xml');
	}

	registerForLanguage(language: string): vscode.Disposable[] {
		const result = [];

		result.push(vscode.languages.registerHoverProvider({ language }, hoverProvider));

		return result;
	}
}