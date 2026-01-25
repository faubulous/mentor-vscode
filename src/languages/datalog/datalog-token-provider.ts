import * as vscode from 'vscode';
import { DatalogRenameProvider } from '@src/languages/datalog/providers';

const renameProvider = new DatalogRenameProvider();

/**
 * Token provider for Datalog language features.
 */
export class DatalogTokenProvider {
	register(): vscode.Disposable[] {
		return [
			vscode.languages.registerRenameProvider({ language: 'datalog' }, renameProvider),
		];
	}
}
