import { useState, useEffect, useCallback } from 'react';
import { SectionHeader } from '@src/views/webviews/components/section-header';
import { useScopedWebviewMessaging } from '@src/views/webviews/hooks';
import { SettingRow } from '../../components/setting-row';
import { SettingsSectionProps } from '../../settings-section-props';
import { MENTOR_SETTINGS_SOURCE } from '../../settings-types';
import { useBulkScopeMenuItems } from '../../hooks/use-bulk-scope-menu-items';
import { useSettingRowProps } from '../../hooks/use-setting-row-props';
import type { SettingsSectionDescriptor } from '../../settings-section-descriptor';
import { ValidationDashboard } from './components/validation-dashboard';
import { ValidationGeneralMessages, ValidationStatsView } from './general-messages';

export const validationGeneralSection = {
	id: 'validation.general',
	label: 'General',
	component: ValidationGeneralSection,
	defaultScope: 'workspace',
	keys: [
		'shacl.enabled',
		'shacl.maxGraphSize',
		'shacl.shapesFolder',
	],
	// Claimed but not rendered: linting is experimental and stays configurable
	// via settings.json only.
	hiddenKeys: [
		'linting.enabled',
		'linting.unresolvedReferenceSeverity',
		'linting.unresolvedWorkspaceGraphSeverity',
	],
} as const satisfies SettingsSectionDescriptor;

function ValidationGeneralSection({ settings, onUpdate, setScope, onBulkScope }: SettingsSectionProps) {
	const rowProps = useSettingRowProps(MENTOR_SETTINGS_SOURCE, settings, setScope);
	const menuItems = useBulkScopeMenuItems(MENTOR_SETTINGS_SOURCE, ['shacl.enabled', 'shacl.maxGraphSize', 'shacl.shapesFolder'], settings, onBulkScope);

	// The max-graph-size guard and the validate button only take effect while
	// SHACL validation is enabled, so they are disabled until the master switch is on.
	const shaclEnabled = settings['shacl.enabled']?.value === true;

	const [stats, setStats] = useState<ValidationStatsView>();
	const [validating, setValidating] = useState(false);

	const handleMessage = useCallback((message: ValidationGeneralMessages) => {
		if (message.id === 'ValidationStatsResult' || message.id === 'ValidationStatsChanged') {
			setStats(message.stats);

			if (!message.stats.isValidating) {
				setValidating(false);
			}
		}
	}, []);

	const messaging = useScopedWebviewMessaging<ValidationGeneralMessages>('validation.general', handleMessage);

	useEffect(() => {
		messaging?.postMessage({ id: 'GetValidationStats' });
	}, [messaging]);

	const isBusy = validating || stats?.isValidating === true;

	// Without a workspace there is nothing to validate — the validate button is
	// disabled instead of showing a spinner that would never stop.
	const hasWorkspace = stats?.hasWorkspace !== false;

	const handleShowLog = () => messaging?.postMessage({ id: 'ShowValidationLog' });

	const handleValidate = () => {
		setValidating(true);
		messaging?.postMessage({ id: 'ValidateWorkspace' });
	};

	return (
		<div>
			<SectionHeader title={validationGeneralSection.label} menuItems={menuItems} variant="title" />
			<ValidationDashboard stats={stats} />
			<div className="stats-dashboard-actions">
				<vscode-toolbar-button
					className="primary"
					disabled={isBusy || !hasWorkspace || !shaclEnabled}
					title={!hasWorkspace
						? 'Open a folder or workspace to enable validation'
						: (!shaclEnabled ?
							'Enable SHACL validation to validate the workspace' :
							'Run syntax check and SHACL validation over the whole workspace')}
					onClick={handleValidate}
				>
					<span className={`codicon ${isBusy ? 'codicon-sync codicon-modifier-spin' : 'codicon-run-all-coverage'}`}></span>
					<span className="label">Validate Workspace</span>
				</vscode-toolbar-button>
				<vscode-toolbar-button className="primary" onClick={handleShowLog}>
					<span className="codicon codicon-output"></span>
					<span className="label">Show Validation Log</span>
				</vscode-toolbar-button>
			</div>
			<SettingRow {...rowProps('shacl.enabled')}>
				<vscode-checkbox
					checked={shaclEnabled}
					onChange={(e: any) => onUpdate(MENTOR_SETTINGS_SOURCE, 'shacl.enabled', (e.target as HTMLInputElement).checked)}
				>
					Enabled
				</vscode-checkbox>
			</SettingRow>
			<SettingRow {...rowProps('shacl.maxGraphSize')}>
				<vscode-textfield
					className="setting-input-md"
					value={String(settings['shacl.maxGraphSize']?.value ?? 50000)}
					type="number"
					disabled={!shaclEnabled}
					onInput={(e: any) => onUpdate(MENTOR_SETTINGS_SOURCE, 'shacl.maxGraphSize', Number((e.target as HTMLInputElement).value))}
				>
					<span slot="content-after" className="setting-input-suffix">triples</span>
				</vscode-textfield>
			</SettingRow>
			<SettingRow {...rowProps('shacl.shapesFolder')}>
				<vscode-textfield
					className="setting-input-md"
					value={String(settings['shacl.shapesFolder']?.value ?? '.mentor/shapes')}
					placeholder=".mentor/shapes"
					onInput={(e: any) => onUpdate(MENTOR_SETTINGS_SOURCE, 'shacl.shapesFolder', (e.target as HTMLInputElement).value)}
				/>
			</SettingRow>
		</div>
	);
}
