import * as vscode from "vscode";
import { FeatureProvider } from "./feature-provider";

export class CompletionItemProvider extends FeatureProvider implements vscode.CompletionItemProvider<vscode.CompletionItem> {
	provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext): vscode.ProviderResult<vscode.CompletionItem[]> {
		return [];
	}

	resolveCompletionItem?(item: vscode.CompletionItem, token: vscode.CancellationToken): vscode.ProviderResult<vscode.CompletionItem> {
		return item;
	}
}