import { RefObject, useCallback, useRef } from 'react';
import { SettingScope, SettingState, SettingsSource } from '../settings-types';

export interface UseScopedSettingValueOptions<T> {
	/** 
	 * Which configuration bucket the key belongs to.
	 */
	source: SettingsSource;

	/**
	 * The setting key split across the user and workspace scopes. */
	key: string;

	/**
	 * Current section settings state, indexed by key.
	 */
	settings: Record<string, SettingState>;

	/**
	 * The generic scope-targeted write handler from the section props.
	 */
	setScope: (source: SettingsSource, key: string, scope: SettingScope, value: unknown) => void;

	/**
	 * Coerces a raw persisted scope value into the working value (e.g. `undefined` → `{}` or `[]`).
	 */
	read: (raw: unknown) => T;

	/**
	 * When it returns true for a scope's next value, the scope is cleared (written as
	 * `undefined`) instead of persisted. Omit to always write the value as-is.
	 */
	isEmpty?: (value: T) => boolean;
}

export interface ScopedSettingValue<T> {
	/** 
	 * The value currently persisted at the User scope, coerced via `read`. 
	 */
	userValue: T;

	/** 
	 * The value currently persisted at the Workspace scope, coerced via `read`. 
	 */
	workspaceValue: T;

	/**	
	 * Live ref to `userValue`, for message callbacks bound once.
	 */
	userRef: RefObject<T>;

	/**
	 * Live ref to `workspaceValue`, for message callbacks bound once.
	 */
	workspaceRef: RefObject<T>;

	/**
	 * Writes the next per-scope values, diffing each against the currently persisted
	 * value and writing only the scope(s) that actually changed. A scope whose next
	 * value satisfies `isEmpty` is cleared.
	 */
	commit: (nextUser: T, nextWorkspace: T) => void;
}

/**
 * Shared persistence mechanics for settings whose value is split across the User
 * and Workspace scopes (stores, validation profiles). Reads both scope values
 * from the section state, keeps live refs for once-bound callbacks, and exposes a
 * `commit` that writes only the scope(s) that changed. The section-specific
 * content transform (array push/filter vs. keyed record + reference rewrite)
 * stays in the caller, which computes the next per-scope values and calls `commit`.
 */
export function useScopedSettingValue<T>({
	source,
	key,
	settings,
	setScope,
	read,
	isEmpty,
}: UseScopedSettingValueOptions<T>): ScopedSettingValue<T> {
	const userValue = read(settings[key]?.userValue);
	const workspaceValue = read(settings[key]?.workspaceValue);

	const userRef = useRef(userValue);
	userRef.current = userValue;

	const workspaceRef = useRef(workspaceValue);
	workspaceRef.current = workspaceValue;

	// Keep the write inputs in refs so `commit` stays stable for once-bound callbacks.
	const setScopeRef = useRef(setScope);
	setScopeRef.current = setScope;

	const isEmptyRef = useRef(isEmpty);
	isEmptyRef.current = isEmpty;

	const commit = useCallback((nextUser: T, nextWorkspace: T) => {
		if (JSON.stringify(nextUser) !== JSON.stringify(userRef.current)) {
			setScopeRef.current(source, key, 'user', isEmptyRef.current?.(nextUser) ? undefined : nextUser);
		}
		if (JSON.stringify(nextWorkspace) !== JSON.stringify(workspaceRef.current)) {
			setScopeRef.current(source, key, 'workspace', isEmptyRef.current?.(nextWorkspace) ? undefined : nextWorkspace);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [source, key]);

	return { userValue, workspaceValue, userRef, workspaceRef, commit };
}
