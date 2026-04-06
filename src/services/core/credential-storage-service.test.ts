import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('vscode', () => import('@src/utilities/mocks/vscode'));
vi.mock('@faubulous/mentor-rdf-serializers', () => ({}));

let mockSecretsStore: ReturnType<typeof vi.fn>;
let mockSecretsGet: ReturnType<typeof vi.fn>;
let mockSecretsDelete: ReturnType<typeof vi.fn>;

vi.mock('tsyringe', () => ({
	container: {
		resolve: vi.fn(() => ({
			secrets: {
				store: (...args: any[]) => mockSecretsStore(...args),
				get: (...args: any[]) => mockSecretsGet(...args),
				delete: (...args: any[]) => mockSecretsDelete(...args),
			},
		})),
	},
	injectable: () => (t: any) => t,
	inject: () => () => {},
	singleton: () => (t: any) => t,
}));

import { CredentialStorageService } from './credential-storage-service';
import type { AuthCredential } from './credential';

let service: CredentialStorageService;

beforeEach(() => {
	mockSecretsStore = vi.fn(async () => {});
	mockSecretsGet = vi.fn(async () => undefined);
	mockSecretsDelete = vi.fn(async () => {});
	service = new CredentialStorageService();
});

describe('CredentialStorageService', () => {
	describe('saveCredential', () => {
		it('should store serialized credential with prefixed key', async () => {
			const cred: AuthCredential = { type: 'basic', username: 'user', password: 'pass' } as any;
			await service.saveCredential('http://example.org/sparql', cred);
			expect(mockSecretsStore).toHaveBeenCalledWith(
				'mentor.credentials:http://example.org/sparql',
				JSON.stringify(cred)
			);
		});
	});

	describe('getCredential', () => {
		it('should return undefined when no credential is stored', async () => {
			mockSecretsGet.mockResolvedValue(undefined);
			const result = await service.getCredential('http://example.org/sparql');
			expect(result).toBeUndefined();
		});

		it('should return parsed credential when stored', async () => {
			const cred = { type: 'basic', username: 'test', password: '123' };
			mockSecretsGet.mockResolvedValue(JSON.stringify(cred));
			const result = await service.getCredential('http://example.org/sparql');
			expect(result).toEqual(cred);
		});

		it('should use prefixed key when getting credential', async () => {
			mockSecretsGet.mockResolvedValue(undefined);
			await service.getCredential('http://example.org');
			expect(mockSecretsGet).toHaveBeenCalledWith('mentor.credentials:http://example.org');
		});
	});

	describe('deleteCredential', () => {
		it('should delete credential with prefixed key', async () => {
			await service.deleteCredential('http://example.org/sparql');
			expect(mockSecretsDelete).toHaveBeenCalledWith('mentor.credentials:http://example.org/sparql');
		});
	});

	describe('updateCredential', () => {
		it('should store updated credential (delegates to saveCredential)', async () => {
			const cred: AuthCredential = { type: 'basic', username: 'newuser', password: 'newpass' } as any;
			await service.updateCredential('http://example.org/sparql', cred);
			expect(mockSecretsStore).toHaveBeenCalledWith(
				'mentor.credentials:http://example.org/sparql',
				JSON.stringify(cred)
			);
		});
	});
});
