// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { renderHook } from '@testing-library/react';
import { FormEditorContext, FormEditorContextValue, useFormEditorContext } from './form-editor-context';

describe('useFormEditorContext', () => {
	it('is read only with no namespaces outside a provider', () => {
		const { result } = renderHook(() => useFormEditorContext());

		expect(result.current).toEqual({ readOnly: true, namespaces: [] });
	});

	it('reads the value of the nearest provider', () => {
		const value: FormEditorContextValue = { readOnly: false, namespaces: [{ prefix: 'ex', iri: 'http://example.org/', usageCount: 1 }], activeLanguage: 'en' };
		const { result } = renderHook(() => useFormEditorContext(), {
			wrapper: ({ children }) => <FormEditorContext.Provider value={value}>{children}</FormEditorContext.Provider>
		});

		expect(result.current).toBe(value);
	});
});
