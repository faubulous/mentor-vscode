/**
 * Messages exchanged between the Query > Stores settings section and its host controller.
 */
export type StoresSectionMessages =
	| { id: 'DeleteStoreProfile'; profileId: string; label: string }
	| { id: 'StoreProfileDeleted'; profileId: string }
	| { id: 'StoreScopeChanged'; storeId: string; label: string; newScope: 'user' | 'workspace' }
	| { id: 'StoreQueryTemplateSaved'; token: string; content: string }
	| { id: 'OpenInBrowser'; url: string };
