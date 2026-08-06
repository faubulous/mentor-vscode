import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as vscode from 'vscode';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));
vi.mock('@faubulous/mentor-rdf-serializers', () => ({}));

let mockService: { isValidating: boolean; cancelActiveValidation: ReturnType<typeof vi.fn> };

vi.mock('tsyringe', () => ({
	container: {
		resolve: vi.fn((token: string) => {
			if (token === 'ShaclValidationService') return mockService;
			return {};
		}),
	},
	injectable: () => (t: any) => t,
	inject: () => () => {},
	singleton: () => (t: any) => t,
}));

import { cancelValidation } from '@src/commands/validation/cancel-validation';

beforeEach(() => {
	mockService = { isValidating: true, cancelActiveValidation: vi.fn() };
	(vscode.window as any).showWarningMessage = vi.fn(async () => undefined);
});

describe('cancelValidation command', () => {
	it('should have correct id', () => {
		expect(cancelValidation.id).toBe('mentor.command.cancelValidation');
	});

	it('does nothing when no validation is running', async () => {
		mockService.isValidating = false;

		await cancelValidation.handler();

		expect(vscode.window.showWarningMessage).not.toHaveBeenCalled();
		expect(mockService.cancelActiveValidation).not.toHaveBeenCalled();
	});

	it('prompts for confirmation and cancels only when the user confirms', async () => {
		(vscode.window as any).showWarningMessage = vi.fn(async () => 'Cancel Validation');

		await cancelValidation.handler();

		expect(vscode.window.showWarningMessage).toHaveBeenCalled();
		expect(mockService.cancelActiveValidation).toHaveBeenCalledTimes(1);
	});

	it('does not cancel when the user dismisses the confirmation', async () => {
		(vscode.window as any).showWarningMessage = vi.fn(async () => undefined);

		await cancelValidation.handler();

		expect(mockService.cancelActiveValidation).not.toHaveBeenCalled();
	});
});
