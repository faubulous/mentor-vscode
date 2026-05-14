import * as React from 'react';
import { useStylesheet } from '../webview-hooks';
import stylesheet from './scope-tabs.css';

export interface ScopeTabsProps {
	activeScope: 'user' | 'workspace';
	onScopeChange: (scope: 'user' | 'workspace') => void;
	disabled?: boolean;
}

/**
 * Two-button User/Workspace scope selector. Shared between the settings panel
 * header and the SPARQL connection editor so both controls look and behave the
 * same. The component is presentational: callers own the active scope.
 */
export function ScopeTabs({ activeScope, onScopeChange, disabled }: ScopeTabsProps) {
	useStylesheet('mentor-scope-tabs-styles', stylesheet);

	return (
		<div className="scope-tabs">
			<button
				type="button"
				className={`scope-tab${activeScope === 'user' ? ' active' : ''}`}
				disabled={disabled}
				onClick={() => onScopeChange('user')}
			>
				User
			</button>
			<button
				type="button"
				className={`scope-tab${activeScope === 'workspace' ? ' active' : ''}`}
				disabled={disabled}
				onClick={() => onScopeChange('workspace')}
			>
				Workspace
			</button>
		</div>
	);
}
