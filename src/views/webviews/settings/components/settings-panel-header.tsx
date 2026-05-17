import * as React from 'react';
import { ScopeTabs } from '../../components/scope-tabs';

export function MentorIcon() {
	const url = document.getElementById('root')?.dataset.mentorIconUrl;

	return (
		<img
			src={url}
			width={32}
			height={32}
			aria-hidden="true"
			style={{ flexShrink: 0 }}
		/>
	);
}

export interface SettingsPanelHeaderProps {
	version: string;
	activeScope: 'user' | 'workspace';
	searchTerm: string;
	onScopeTabChange: (scope: 'user' | 'workspace') => void;
	onSearchChange: (term: string) => void;
	onOpenHomepage: () => void;
}

export function SettingsPanelHeader({ version, activeScope, onScopeTabChange, searchTerm, onSearchChange, onOpenHomepage }: SettingsPanelHeaderProps) {
	return (
		<div className="panel-header">
			<div className="panel-header-inner">
				<div className="panel-header-brand">
					<MentorIcon />
					<div className="panel-header-title-wrapper">
						<span className="panel-header-title">Mentor</span>
						{version && <span className="panel-header-version">v{version}</span>}
					</div>
				</div>
				<div className="panel-header-scope">
					<ScopeTabs activeScope={activeScope} onScopeChange={onScopeTabChange} />
				</div>
				<div className="panel-header-search">
					<div className="search-field-wrapper">
						<vscode-textfield
							placeholder="Search settings…"
							value={searchTerm}
							onInput={(e: React.FormEvent<HTMLElement>) => onSearchChange((e.target as HTMLInputElement).value)}
						>
							<vscode-icon slot="content-before" name="search" title="search"></vscode-icon>
						</vscode-textfield>
					</div>
				</div>
				<div className="panel-header-help">
					<vscode-toolbar-button
						title="Open Mentor homepage"
						onClick={onOpenHomepage}
					>
						<vscode-icon name="question" />
					</vscode-toolbar-button>
				</div>
			</div>
		</div>
	);
}
