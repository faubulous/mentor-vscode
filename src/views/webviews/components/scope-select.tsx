import { useEffect, useRef, useState } from 'react';
import { ConfigurationScope, ScopeKey, getConfigurationScopeDescription, keyToScope } from '@src/utilities/config-scope';
import { useStylesheet } from '@src/views/webviews/hooks';
import stylesheet from './scope-select.css';

export interface ScopeSelectProps {
	/**
	 * The currently selected scope.
	 */
	value: ScopeKey;

	/**
	 * Invoked with the newly selected scope when the user changes the selection.
	 */
	onChange: (scope: ScopeKey) => void;

	/**
	 * Disables the whole control (e.g. for read-only / built-in items).
	 */
	disabled?: boolean;

	/**
	 * Whether a workspace folder is open. When false the Workspace option is disabled
	 * because workspace-scoped values cannot be written without a workspace.
	 */
	hasWorkspace?: boolean;
}

const SCOPES: { scope: ScopeKey; label: string; configScope: ConfigurationScope }[] = [
	{ scope: 'user', label: 'User', configScope: ConfigurationScope.User },
	{ scope: 'workspace', label: 'Workspace', configScope: ConfigurationScope.Workspace },
];

/**
 * Compact User/Workspace picker used to set the configuration scope of a single item (a setting
 * row, a connection, or a store). Rendered as a minimal label + chevron button that opens a small
 * popup menu, so it stays far slimmer than a native dropdown and blends into headers.
 */
export function ScopeSelect({ value, onChange, disabled, hasWorkspace = true }: ScopeSelectProps) {
	useStylesheet('scope-select-styles', stylesheet);

	const [open, setOpen] = useState(false);
	const containerRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!open) {
			return;
		}

		const handler = (e: MouseEvent) => {
			if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
				setOpen(false);
			}
		};

		document.addEventListener('mousedown', handler);

		return () => document.removeEventListener('mousedown', handler);
	}, [open]);

	const select = (scope: ScopeKey) => {
		setOpen(false);

		if (scope !== value) {
			onChange(scope);
		}
	};

	const activeLabel = value === 'workspace' ? 'Workspace' : 'User';

	return (
		<div className="scope-select" ref={containerRef}>
			<button
				type="button"
				className="scope-select-button"
				disabled={disabled}
				aria-haspopup="listbox"
				aria-expanded={open}
				title={getConfigurationScopeDescription(keyToScope(value))}
				onClick={() => setOpen(o => !o)}
			>
				<span className="scope-select-label">{activeLabel}</span>
				<vscode-icon name="chevron-down" size={13} className="scope-select-chevron" />
			</button>
			{open && (
				<div className="scope-select-menu" role="listbox">
					{SCOPES.map(({ scope, label, configScope }) => (
						<button
							key={scope}
							type="button"
							role="option"
							aria-selected={scope === value}
							className="scope-select-item"
							disabled={scope === 'workspace' && !hasWorkspace}
							title={getConfigurationScopeDescription(configScope)}
							onClick={() => select(scope)}
						>
							<vscode-icon
								name="check"
								size={14}
								className="scope-select-check"
								style={{ visibility: scope === value ? 'visible' : 'hidden' }}
							/>
							{label}
						</button>
					))}
				</div>
			)}
		</div>
	);
}
