const DEFAULT_BASE_URL = 'https://api.deepseek.com';
const MASKED_KEY = /^(?:\*+|•+|…+|\.{3,})/;

export function syncDshBaseUrl(currentUrl: string, lastSyncedUrl: string, nextBaseUrl: string | null) {
  const nextUrl = nextBaseUrl || DEFAULT_BASE_URL;
  return { url: currentUrl === lastSyncedUrl ? nextUrl : currentUrl, lastSyncedUrl: nextUrl };
}

export function buildDshCredentialPatch(url: string, key: string) {
  const patch: Record<string, string> = { DEEPSEEK_BASE_URL: url };
  if (key && !MASKED_KEY.test(key)) patch.DEEPSEEK_API_KEY = key;
  return patch;
}
