import { useState } from 'react';
import { VscodeSingleSelect } from '@vscode-elements/elements';
import { SectionHeader } from '@src/views/webviews/components/section-header';
import { TemplatePreview } from '@src/views/webviews/components/template-preview';
import { SettingRow } from '../../components/setting-row';
import { SettingsSectionProps } from '../../settings-section-props';
import { MENTOR_SETTINGS_SOURCE } from '../../settings-types';
import { MENTOR_LANGUAGE_IDS, LanguageId } from '@src/services/document/document-languages';
import { useBulkScopeMenuItems } from '../../components/use-bulk-scope-menu-items';
import { useSettingRowProps } from '../../components/use-setting-row-props';
import { useVscodeElementRef } from '@src/views/webviews/webview-hooks';
import type { SettingsSectionDescriptor } from '../../settings-section-descriptor';

/**
 * The SPARQL document-query template is pinned at the top, separate from the per-language defaults.
 */
const QUERY_TEMPLATE_KEY = 'language.sparql.documentQueryTemplate';

export const editorTemplatesSection = {
	id: 'editor.templates',
	label: 'Templates',
	component: TemplatesSection,
	keys: [
		'language.sparql.defaultDocumentTemplate',
		'language.sparql.documentQueryTemplate',
		'language.turtle.defaultDocumentTemplate',
		'language.trig.defaultDocumentTemplate',
		'language.n3.defaultDocumentTemplate',
		'language.ntriples.defaultDocumentTemplate',
		'language.nquads.defaultDocumentTemplate',
	],
} as const satisfies SettingsSectionDescriptor;

interface TemplatesSectionProps extends SettingsSectionProps {
	/**
	 * Human-readable language display names, keyed by language id. Sourced from
	 * package.json's `contributes.languages` aliases via the host.
	 */
	languageLabels: Record<string, string>;
}

function TemplatesSection({ keys, settings, setScope, onBulkScope, languageLabels }: TemplatesSectionProps) {
	const rowProps = useSettingRowProps(MENTOR_SETTINGS_SOURCE, settings, setScope);
	const menuItems = useBulkScopeMenuItems(MENTOR_SETTINGS_SOURCE, [...keys], settings, onBulkScope);

	// Which language's default-document template is shown below; the values are all already loaded
	// (mentor source), so this is purely a local view selection — no refetch needed.
	const [language, setLanguage] = useState<LanguageId>('turtle');
	const languageRef = useVscodeElementRef<VscodeSingleSelect>('change', (element) => setLanguage(element.value as LanguageId));

	/**
	 * Builds the per-language default-document template key for a Mentor language.
	 */
	const defaultTemplateKey = (language: LanguageId) => `language.${language}.defaultDocumentTemplate`;
	const defaultKey = defaultTemplateKey(language);

	const renderTemplate = (key: string, editorLanguage: string) => {
		const target = { kind: 'global', key } as const;

		return (
			<div className="template-control">
				<TemplatePreview language={editorLanguage} target={target} value={String(settings[key]?.value ?? '')} />
			</div>
		);
	};

	// The language dropdown lives in the row header (replacing a static "<Language> Default Document
	// Template" label), so the selector is both the heading and the control — visible and not redundant.
	const defaultTemplateLabel = (
		<span className="template-language-label">
			<vscode-single-select ref={languageRef} value={language}>
				{MENTOR_LANGUAGE_IDS.map((id) => (
					<vscode-option key={id} value={id}>{languageLabels[id] ?? id}</vscode-option>
				))}
			</vscode-single-select>
		</span>
	);

	return (
		<div>
			<SectionHeader title={editorTemplatesSection.label} menuItems={menuItems} variant="title" />

			<SettingRow {...rowProps(QUERY_TEMPLATE_KEY)}>
				{renderTemplate(QUERY_TEMPLATE_KEY, 'sparql')}
			</SettingRow>

			<h3>Default Document Templates</h3>

			<SettingRow {...rowProps(defaultKey)} label={defaultTemplateLabel}>
				{renderTemplate(defaultKey, language)}
			</SettingRow>
		</div>
	);
}
