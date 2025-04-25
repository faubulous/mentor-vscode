import * as vscode from 'vscode';
import { CodeLensProvider } from '@/providers';
import { XmlHoverProvider, XmlReferenceProvider, XmlRenameProvider } from '@/languages/xml/providers';

const codelensProvider = new CodeLensProvider();
const hoverProvider = new XmlHoverProvider();
const renameProvider = new XmlRenameProvider();
const referenceProvider = new XmlReferenceProvider();

export class XmlTokenProvider {
	register(): vscode.Disposable[] {
		return this.registerForLanguage('xml');
	}

	registerForLanguage(language: string): vscode.Disposable[] {
		const result = [];

		result.push(vscode.languages.registerCodeLensProvider({ language }, codelensProvider));
		result.push(vscode.languages.registerHoverProvider({ language }, hoverProvider));
		result.push(vscode.languages.registerRenameProvider({ language }, renameProvider));
		result.push(vscode.languages.registerReferenceProvider({ language }, referenceProvider));

		return result;
	}
}