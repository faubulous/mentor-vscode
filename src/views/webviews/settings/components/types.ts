import { LanguageId, SettingState } from '../settings-panel-messages';

export type EditorSettings = Record<LanguageId, Record<string, SettingState>>;
export type TestResult = { success: boolean; error?: string } | null;
