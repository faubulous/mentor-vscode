import * as vscode from 'vscode';
import {
	HoverProvider
} from '@/languages/rdfxml/providers';

const hoverProvider = new HoverProvider();

export class RdfXmlTokenProvider {
	register(): vscode.Disposable[] {
		return this.registerForLanguage('xml');
	}

	registerForLanguage(language: string): vscode.Disposable[] {
		const result = [];

		result.push(vscode.languages.registerHoverProvider({ language }, hoverProvider));

		return result;
	}
}