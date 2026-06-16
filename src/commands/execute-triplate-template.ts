import * as vscode from 'vscode';
import { compile } from 'triplate';
import type { ParamDecl } from 'triplate';

/**
 * Prompts the user for the declared parameter values of a triplate template,
 * renders it, and opens (and, for SPARQL, executes) the result.
 */
export const executeTriplateTemplate = {
	id: 'mentor.command.executeTriplateTemplate',
	handler: async (documentUri?: vscode.Uri | string): Promise<void> => {
		const document = resolveDocument(documentUri);

		if (!document) {
			vscode.window.showWarningMessage('No template document found to execute.');
			return;
		}

		const text = document.getText();
		let compiled: ReturnType<typeof compile>;

		try {
			compiled = compile(text);
		} catch (error) {
			vscode.window.showErrorMessage(`Failed to compile template: ${(error as Error).message}`);
			return;
		}

		const inputs = await promptForParameters(compiled.schema.params);

		if (!inputs) {
			// The user cancelled a prompt.
			return;
		}

		let rendered: string;

		try {
			// `triplate` coerces and validates the raw inputs against the schema,
			// throwing TriplateTypeError on bad input instead of rendering NaN.
			const context = compiled.contextFromStrings(Object.fromEntries(inputs));
			rendered = compiled.render(context);
		} catch (error) {
			vscode.window.showErrorMessage(`Failed to render template: ${(error as Error).message}`);
			return;
		}

		await vscode.commands.executeCommand('mentor.command.openRenderedTriplate', document.uri.toString(), rendered);
	}
};

function resolveDocument(documentUri?: vscode.Uri | string): vscode.TextDocument | undefined {
	if (documentUri) {
		const uri = documentUri.toString();
		return vscode.workspace.textDocuments.find(doc => doc.uri.toString() === uri);
	} else {
		return vscode.window.activeTextEditor?.document;
	}
}

/**
 * Prompts sequentially for each parameter value. Returns a map of raw inputs, or
 * `undefined` if the user cancelled any prompt.
 */
async function promptForParameters(params: ParamDecl[]): Promise<Map<string, string | undefined> | undefined> {
	const inputs = new Map<string, string | undefined>();

	for (const param of params) {
		const { base, array, optional } = param.type;
		const typeLabel = `${base.kind}${array ? '[]' : ''}`;

		if (base.kind === 'record') {
			vscode.window.showInformationMessage(
				`Parameter "${param.name}" is a record and cannot be entered interactively. Use an example block instead.`
			);
			continue;
		}

		if (base.kind === 'bool' && !array) {
			const items = optional ? ['true', 'false', '(skip)'] : ['true', 'false'];
			const pick = await vscode.window.showQuickPick(items, {
				title: 'Execute Template',
				placeHolder: `${param.name}: ${typeLabel}${optional ? ' (optional)' : ''}`,
			});

			if (pick === undefined) {
				return undefined;
			}

			inputs.set(param.name, pick === '(skip)' ? undefined : pick);
			continue;
		}

		const value = await vscode.window.showInputBox({
			title: 'Execute Template',
			prompt: `${param.name}: ${typeLabel}${optional ? ' (optional)' : ''}`,
			placeHolder: array ? 'comma-separated values' : undefined,
			validateInput: (input: string) => validateInput(param, input),
		});

		if (value === undefined) {
			return undefined;
		}

		inputs.set(param.name, value);
	}

	return inputs;
}

function validateInput(param: ParamDecl, input: string): string | null {
	const { base, array, optional } = param.type;
	const value = input.trim();

	if (value === '') {
		return optional ? null : `${param.name} is required`;
	}

	const numeric = base.kind === 'int' || base.kind === 'decimal' || base.kind === 'double';

	if (numeric && !array && isNaN(Number(value))) {
		return `${param.name} must be a number`;
	} else {
		return null;
	}
}
