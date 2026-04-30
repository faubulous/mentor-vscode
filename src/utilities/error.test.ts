import { describe, it, expect } from 'vitest';
import { NotSupportedError } from '@src/utilities/error';

describe('NotSupportedError', () => {
	it('is an instance of Error', () => {
		expect(new NotSupportedError()).toBeInstanceOf(Error);
	});

	it('has the expected message', () => {
		expect(new NotSupportedError().message).toBe('This feature is not supported.');
	});
});
