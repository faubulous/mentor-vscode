import { LanguageId } from "@src/services/document/document-factory";
import React from "react";

/**
 * Provides the currently active settings scope tab ('user' | 'workspace')
 * to all descendant SettingRow and SectionHeader components without prop drilling.
 */
export const SettingsScopeContext = React.createContext<'user' | 'workspace'>('user');

/**
 * Provides a callback for moving a setting from one scope to another (copy + clear source).
 */
export const SettingsMoveContext = React.createContext<
	((
		key: string,
		fromScope: 'user' | 'workspace',
		toScope: 'user' | 'workspace',
		value: unknown) => void
	) | null
>(null);

/**
 * Provides a callback for moving a built-in VSCode editor.* setting from one scope to
 * another (copy + clear source).
 */
export const VSCodeSettingsMoveContext = React.createContext<
	((
		languageId: LanguageId,
		key: string,
		fromScope: 'user' | 'workspace',
		toScope: 'user' | 'workspace',
		value: unknown) => void
	) | null
>(null);