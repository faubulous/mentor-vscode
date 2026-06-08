import React from "react";
import { SettingState, SettingsSource } from "../settings-types";

/**
 * Provides whether a workspace folder is currently open. Scope pickers use this to
 * disable the Workspace option, since workspace-scoped values cannot be written
 * without an open workspace.
 */
export const SettingsWorkspaceContext = React.createContext<boolean>(true);

/**
 * Per-key scope selection API. Replaces the former global User/Workspace tab: each
 * setting row now picks its own target scope.
 */
export interface SettingsScopeTargetApi {
	/**
	 * Returns the current target scope for a key — the scope the setting lives in if set,
	 * otherwise the scope a future edit would be written to (defaults to `'user'`).
	 */
	get(source: SettingsSource, key: string, state: SettingState | undefined): 'user' | 'workspace';

	/**
	 * Selects a new target scope for a key. When the setting already holds a non-default
	 * value in a different scope, this moves it (writes the new scope, clears the old);
	 * otherwise it only retargets where the next edit lands.
	 */
	select(source: SettingsSource, key: string, newScope: 'user' | 'workspace', state: SettingState | undefined): void;
}

/**
 * Provides the per-key scope selection API to setting rows without prop drilling.
 * `null` when rendered outside the settings panel.
 */
export const SettingsScopeTargetContext = React.createContext<SettingsScopeTargetApi | null>(null);
