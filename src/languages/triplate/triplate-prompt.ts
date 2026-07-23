import * as vscode from 'vscode';
import type { ParamDecl, compile } from 'triplate';

type CompiledTemplate = ReturnType<typeof compile>;

/** The user's choice when running a template: a named example, or manually entered values. */
type TemplateInputChoice =
	| { mode: 'example'; id: string }
	| { mode: 'manual'; inputs: Map<string, string | undefined> };

interface ExampleQuickPickItem extends vscode.QuickPickItem {
	exampleId?: string;
}

/**
 * Renders a template interactively: lets the user pick a declared example or enter parameter
 * values manually, then renders the result. Reports render errors itself.
 *
 * Shared by the Execute Template command and the notebook controller's native "Run" handling.
 *
 * @param compiled A compiled triplate template.
 * @returns The rendered output, or `undefined` if the user cancelled or rendering failed.
 */
export async function renderTemplateInteractively(compiled: CompiledTemplate): Promise<string | undefined> {
	const choice = await selectTemplateInputs(compiled);

	if (!choice) {
		// The user cancelled a prompt.
		return undefined;
	}

	try {
		if (choice.mode === 'example') {
			return compiled.previewExample(choice.id);
		}

		// `triplate` coerces and validates the raw inputs against the schema,
		// throwing TriplateTypeError on bad input instead of rendering NaN.
		const context = compiled.contextFromStrings(Object.fromEntries(choice.inputs));

		return compiled.render(context);
	} catch (error) {
		vscode.window.showErrorMessage(`Failed to render template: ${(error as Error).message}`);
		return undefined;
	}
}

/**
 * Asks how the template should be run. When the template declares examples, offers a QuickPick of
 * those examples plus a "enter values manually" option; otherwise prompts for parameters directly.
 *
 * @param compiled A compiled triplate template.
 * @returns The chosen example or the manually entered values, or `undefined` if cancelled.
 */
async function selectTemplateInputs(compiled: CompiledTemplate): Promise<TemplateInputChoice | undefined> {
	if (compiled.examples.length > 0) {
		const manualItem: ExampleQuickPickItem = { label: 'Enter values manually…' };

		const items: ExampleQuickPickItem[] = [
			{ label: 'Example', kind: vscode.QuickPickItemKind.Separator },
			...compiled.examples.map(example => ({
				label: example.id,
				description: example.description,
				exampleId: example.id,
			})),
			{ label: 'Manual', kind: vscode.QuickPickItemKind.Separator },
			manualItem,
		];

		const pick = await vscode.window.showQuickPick(items, {
			title: 'Execute Template',
			placeHolder: 'Select an example or enter values manually',
		});

		if (!pick) {
			return undefined;
		}

		if (pick.exampleId !== undefined) {
			return { mode: 'example', id: pick.exampleId };
		}
	}

	const inputs = await promptForParameters(compiled.schema.params);

	return inputs ? { mode: 'manual', inputs } : undefined;
}

/**
 * Prompts sequentially for each declared triplate parameter value. Returns a map of
 * raw string inputs, or `undefined` if the user cancelled any prompt.
 *
 * Shared by the triplate execute commands and the notebook controller's native "Run"
 * handling so prompting behaves identically wherever a template is executed.
 *
 * @param params The parameter declarations from a compiled template's schema.
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
