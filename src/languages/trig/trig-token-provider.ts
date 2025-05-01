import * as vscode from 'vscode';
import { TurtleTokenProvider } from "@/languages/turtle/turtle-token-provider";

export class TrigTokenProvider extends TurtleTokenProvider {
	register(): vscode.Disposable[] {
		return this.registerForLanguage('trig');
	}
}