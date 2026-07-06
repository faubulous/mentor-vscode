/**
 * URL-safety helpers for SPARQL endpoint connections. Kept free of any `vscode`
 * dependency so they can be unit-tested and reused from webview/LSP processes.
 *
 * The primary purpose is to prevent untrusted workspace configuration from driving
 * outbound requests to internal infrastructure (SSRF), and to reject endpoint URLs
 * whose scheme is not HTTP(S).
 */

/**
 * Parses a URL string using the WHATWG URL parser, returning `undefined` on failure.
 * @param url The URL string to parse.
 * @returns The parsed URL, or `undefined` if it is not a valid absolute URL.
 */
function tryParseUrl(url: string): URL | undefined {
	try {
		return new URL(url);
	} catch {
		return undefined;
	}
}

/**
 * Determines whether a URL uses the `http:` or `https:` scheme.
 * @param url The URL string to check.
 * @returns `true` if the URL is a valid absolute `http`/`https` URL.
 */
export function isHttpEndpoint(url: string): boolean {
	const parsed = tryParseUrl(url);

	return parsed?.protocol === 'http:' || parsed?.protocol === 'https:';
}

/**
 * Normalizes a URL hostname for comparison by lower-casing it and stripping the
 * square brackets that the URL parser adds around IPv6 literals.
 */
function normalizeHostname(hostname: string): string {
	const lower = hostname.toLowerCase();

	return lower.startsWith('[') && lower.endsWith(']') ? lower.slice(1, -1) : lower;
}

/**
 * Determines whether a hostname refers to the local machine, a private network, a
 * link-local address (including the cloud metadata endpoint `169.254.169.254`), or
 * another non-globally-routable target.
 *
 * This is intentionally conservative: it blocks anything that is clearly not a
 * public host so that untrusted configuration cannot probe internal services.
 * @param hostname A URL hostname (without brackets for IPv6, or as returned by `URL.hostname`).
 * @returns `true` if the hostname is loopback, private, link-local or otherwise internal.
 */
export function isPrivateOrLoopbackHost(hostname: string): boolean {
	const host = normalizeHostname(hostname);

	if (!host) {
		return true;
	}

	// Local and mDNS/single-label names.
	if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local')) {
		return true;
	}

	// IPv6 literals.
	if (host.includes(':')) {
		if (host === '::' || host === '::1') {
			return true;
		}

		// Unique-local (fc00::/7) and link-local (fe80::/10).
		if (host.startsWith('fc') || host.startsWith('fd') || host.startsWith('fe8') || host.startsWith('fe9') || host.startsWith('fea') || host.startsWith('feb')) {
			return true;
		}

		// IPv4-mapped IPv6 (::ffff:a.b.c.d) — evaluate the embedded IPv4.
		const mapped = host.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/);

		if (mapped) {
			return isPrivateOrLoopbackHost(mapped[1]);
		}

		return false;
	}

	// IPv4 literals.
	const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);

	if (ipv4) {
		const octets = ipv4.slice(1).map(Number);

		if (octets.some(o => o > 255)) {
			return true;
		}

		const [a, b] = octets;

		return (
			a === 0 ||                          // 0.0.0.0/8 "this host"
			a === 127 ||                        // 127.0.0.0/8 loopback
			a === 10 ||                         // 10.0.0.0/8 private
			(a === 172 && b >= 16 && b <= 31) ||// 172.16.0.0/12 private
			(a === 192 && b === 168) ||         // 192.168.0.0/16 private
			(a === 169 && b === 254) ||         // 169.254.0.0/16 link-local (incl. cloud metadata)
			(a === 100 && b >= 64 && b <= 127)  // 100.64.0.0/10 CGNAT
		);
	}

	// A non-IP, multi-label public hostname (e.g. dbpedia.org).
	return false;
}

/**
 * Determines whether a URL is safe to contact automatically from untrusted
 * (workspace-scoped) configuration: it must be HTTP(S) and must not target a
 * loopback, private, link-local or metadata host.
 * @param url The endpoint URL string.
 * @returns `true` if the endpoint may be auto-loaded from untrusted configuration.
 */
export function isSafeAutoLoadEndpoint(url: string): boolean {
	const parsed = tryParseUrl(url);

	if (!parsed || (parsed.protocol !== 'http:' && parsed.protocol !== 'https:')) {
		return false;
	}

	return !isPrivateOrLoopbackHost(parsed.hostname);
}
