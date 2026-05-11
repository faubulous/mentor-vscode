import * as React from 'react';

import '@vscode-elements/elements/dist/vscode-textfield';

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

export interface PanelHeaderProps {
	version: string;
	searchTerm: string;
	onSearchChange: (term: string) => void;
}

export function PanelHeader({ version, searchTerm, onSearchChange }: PanelHeaderProps) {
	return (
		<div className="panel-header">
			<MentorIcon />
			<div className="panel-header-brand">
				<span className="panel-header-title">Mentor</span>
				{version && <span className="panel-header-version">v{version}</span>}
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
		</div>
	);
}
