import { describe, it, expect } from 'vitest';
import { ConfigurationScope, getConfigurationScopeLabel, getConfigurationScopeDescription } from './config-scope';

describe('ConfigurationScope', () => {
	it('has numeric value 1 for User', () => {
		expect(ConfigurationScope.User).toBe(1);
	});

	it('has numeric value 2 for Workspace', () => {
		expect(ConfigurationScope.Workspace).toBe(2);
	});
});

describe('getConfigurationScopeLabel', () => {
	it('returns "User" for User scope', () => {
		expect(getConfigurationScopeLabel(ConfigurationScope.User)).toBe('User');
	});

	it('returns "Workspace" for Workspace scope', () => {
		expect(getConfigurationScopeLabel(ConfigurationScope.Workspace)).toBe('Workspace');
	});

	it('returns "Unknown" for an unrecognized scope value', () => {
		expect(getConfigurationScopeLabel(99 as ConfigurationScope)).toBe('Unknown');
	});
});

describe('getConfigurationScopeDescription', () => {
	it('returns a non-empty description for User scope', () => {
		const desc = getConfigurationScopeDescription(ConfigurationScope.User);
		expect(desc).toBeTruthy();
		expect(desc).toContain('Visual Studio Code');
	});

	it('returns a non-empty description for Workspace scope', () => {
		const desc = getConfigurationScopeDescription(ConfigurationScope.Workspace);
		expect(desc).toBeTruthy();
		expect(desc).toContain('.vscode');
	});

	it('returns an empty string for an unrecognized scope value', () => {
		expect(getConfigurationScopeDescription(99 as ConfigurationScope)).toBe('');
	});
});
