import * as vscode from 'vscode';
import { CodeLensProvider, ReferenceProvider, HoverProvider } from '@/providers';
import { XmlRenameProvider } from '@/languages/xml/providers';

const codelensProvider = new CodeLensProvider();
const referenceProvider = new ReferenceProvider();
const hoverProvider = new HoverProvider();
const renameProvider = new XmlRenameProvider();

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