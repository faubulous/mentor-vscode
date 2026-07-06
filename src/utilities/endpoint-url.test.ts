import { describe, it, expect } from 'vitest';
import { isHttpEndpoint, isPrivateOrLoopbackHost, isSafeAutoLoadEndpoint } from '@src/utilities/endpoint-url';

describe('isHttpEndpoint', () => {
	it('accepts http and https URLs', () => {
		expect(isHttpEndpoint('http://example.org/sparql')).toBe(true);
		expect(isHttpEndpoint('https://dbpedia.org/sparql')).toBe(true);
	});

	it('rejects non-http schemes', () => {
		expect(isHttpEndpoint('file:///etc/passwd')).toBe(false);
		expect(isHttpEndpoint('ftp://example.org/')).toBe(false);
		expect(isHttpEndpoint('workspace:')).toBe(false);
	});

	it('rejects malformed and relative URLs', () => {
		expect(isHttpEndpoint('https://')).toBe(false);
		expect(isHttpEndpoint('not a url')).toBe(false);
		expect(isHttpEndpoint('')).toBe(false);
	});
});

describe('isPrivateOrLoopbackHost', () => {
	it('flags loopback and local names', () => {
		expect(isPrivateOrLoopbackHost('localhost')).toBe(true);
		expect(isPrivateOrLoopbackHost('db.localhost')).toBe(true);
		expect(isPrivateOrLoopbackHost('printer.local')).toBe(true);
		expect(isPrivateOrLoopbackHost('')).toBe(true);
	});

	it('flags IPv4 loopback, private and link-local ranges', () => {
		expect(isPrivateOrLoopbackHost('127.0.0.1')).toBe(true);
		expect(isPrivateOrLoopbackHost('0.0.0.0')).toBe(true);
		expect(isPrivateOrLoopbackHost('10.1.2.3')).toBe(true);
		expect(isPrivateOrLoopbackHost('172.16.0.1')).toBe(true);
		expect(isPrivateOrLoopbackHost('172.31.255.255')).toBe(true);
		expect(isPrivateOrLoopbackHost('192.168.1.1')).toBe(true);
		expect(isPrivateOrLoopbackHost('169.254.169.254')).toBe(true); // cloud metadata
		expect(isPrivateOrLoopbackHost('100.64.0.1')).toBe(true);       // CGNAT
	});

	it('does not flag public IPv4 addresses', () => {
		expect(isPrivateOrLoopbackHost('8.8.8.8')).toBe(false);
		expect(isPrivateOrLoopbackHost('172.15.0.1')).toBe(false); // just below 172.16/12
		expect(isPrivateOrLoopbackHost('172.32.0.1')).toBe(false); // just above 172.16/12
	});

	it('flags IPv6 loopback, unique-local and link-local', () => {
		expect(isPrivateOrLoopbackHost('::1')).toBe(true);
		expect(isPrivateOrLoopbackHost('::')).toBe(true);
		expect(isPrivateOrLoopbackHost('[::1]')).toBe(true);
		expect(isPrivateOrLoopbackHost('fc00::1')).toBe(true);
		expect(isPrivateOrLoopbackHost('fd12:3456::1')).toBe(true);
		expect(isPrivateOrLoopbackHost('fe80::1')).toBe(true);
		expect(isPrivateOrLoopbackHost('::ffff:127.0.0.1')).toBe(true); // IPv4-mapped loopback
	});

	it('does not flag public IPv6 addresses', () => {
		expect(isPrivateOrLoopbackHost('2606:4700:4700::1111')).toBe(false);
	});

	it('does not flag public hostnames', () => {
		expect(isPrivateOrLoopbackHost('dbpedia.org')).toBe(false);
		expect(isPrivateOrLoopbackHost('query.wikidata.org')).toBe(false);
	});
});

describe('isSafeAutoLoadEndpoint', () => {
	it('accepts public http(s) endpoints', () => {
		expect(isSafeAutoLoadEndpoint('https://dbpedia.org/sparql')).toBe(true);
		expect(isSafeAutoLoadEndpoint('http://query.wikidata.org/sparql')).toBe(true);
	});

	it('rejects internal endpoints regardless of scheme validity', () => {
		expect(isSafeAutoLoadEndpoint('http://169.254.169.254/latest/meta-data/')).toBe(false);
		expect(isSafeAutoLoadEndpoint('http://localhost:3030/ds/sparql')).toBe(false);
		expect(isSafeAutoLoadEndpoint('http://127.0.0.1:8081/')).toBe(false);
		expect(isSafeAutoLoadEndpoint('https://192.168.1.10/sparql')).toBe(false);
	});

	it('rejects non-http schemes and malformed URLs', () => {
		expect(isSafeAutoLoadEndpoint('file:///etc/passwd')).toBe(false);
		expect(isSafeAutoLoadEndpoint('https://')).toBe(false);
	});
});
