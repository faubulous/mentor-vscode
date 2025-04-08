import * as vscode from 'vscode';
import { XmlHoverProvider, XmlReferenceProvider } from '@/languages/xml/providers';

const hoverProvider = new XmlHoverProvider();
const referenceProvider = new XmlReferenceProvider();

export class XmlTokenProvider {
	register(): vscode.Disposable[] {
		return this.registerForLanguage('xml');
	}

	registerForLanguage(language: string): vscode.Disposable[] {
		const result = [];

		result.push(vscode.languages.registerHoverProvider({ language }, hoverProvider));
		result.push(vscode.languages.registerReferenceProvider({ language }, referenceProvider));

		return result;
	}
}