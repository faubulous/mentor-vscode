import * as vscode from 'vscode';
import { TurtleTokenProvider } from "../turtle";

export class TrigTokenProvider extends TurtleTokenProvider {
	register(): vscode.Disposable[] {
		return this.registerForLanguage('trig');
	}
}