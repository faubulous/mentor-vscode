import { LanguageId } from '@src/services/document/document-factory';
import { SettingState } from '../settings-types';

export type VSCodeSettings = Record<LanguageId, Record<string, SettingState>>;
export type TestResult = { success: boolean; error?: string } | null;
