import * as vscode from 'vscode';
import { ReferenceProvider, HoverProvider } from '@/providers';
import { TurtleCodeLensProvider } from '@/languages/turtle/providers';
import { XmlRenameProvider } from '@/languages/xml/providers';

const codelensProvider = new TurtleCodeLensProvider();
const hoverProvider = new HoverProvider();
const referenceProvider = new ReferenceProvider();
const renameProvider = new XmlRenameProvider();

export class XmlTokenProvider {
	register(): vscode.Disposable[] {
		return this.registerForLanguage('xml');
	}

	registerForLanguage(language: string): vscode.Disposable[] {
		return [
			vscode.languages.registerCodeLensProvider({ language }, codelensProvider),
			vscode.languages.registerCodeLensProvider({ language }, codelensProvider),
			vscode.languages.registerHoverProvider({ language }, hoverProvider),
			vscode.languages.registerReferenceProvider({ language }, referenceProvider),
			vscode.languages.registerRenameProvider({ language }, renameProvider)
		];
	}
}