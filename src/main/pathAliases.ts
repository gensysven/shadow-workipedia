type LocationLike = {
  pathname: string;
  hash: string;
};

export function getAgentsHashFromPath(pathname: string, hash: string): string | null {
  const normalizedPath = pathname.replace(/\/+$/, '') || '/';
  const hasSupportedHash = Boolean(hash) && hash !== '#/' && hash !== '#/graph';
  if (hasSupportedHash) return null;

  const isAgentsPath = normalizedPath === '/agents' || normalizedPath.startsWith('/agents/');
  const isWasmPath = normalizedPath === '/wasm' || normalizedPath.startsWith('/wasm/');
  if (!isAgentsPath && !isWasmPath) return null;

  const prefix = isAgentsPath ? '/agents/' : '/wasm/';
  const seedFromPath = normalizedPath.startsWith(prefix)
    ? normalizedPath.slice(prefix.length)
    : '';

  return seedFromPath ? `#/agents/${seedFromPath}` : '#/agents';
}

export function normalizePathAliasesToHashRoutes(location: LocationLike): void {
  const nextHash = getAgentsHashFromPath(location.pathname, location.hash);
  if (!nextHash) return;
  location.hash = nextHash;
}
