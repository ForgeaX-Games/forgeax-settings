import { useEffect, useRef, useState } from 'react';
import { buildDshCredentialPatch, syncDshBaseUrl } from './DshCredentialSettings.state';

const DEFAULT_BASE_URL = 'https://api.deepseek.com';
const MISSING_CREDENTIAL = 'MISSING_CREDENTIAL';

type CredentialState = 'missing' | 'configured' | 'error';

export function DshCredentialSettings({
  apiKey,
  baseUrl,
  busy = false,
  onSave,
}: {
  apiKey: string | null;
  baseUrl: string | null;
  busy?: boolean;
  onSave: (patch: Record<string, string>) => Promise<boolean>;
}) {
  const [key, setKey] = useState('');
  const [url, setUrl] = useState(baseUrl || DEFAULT_BASE_URL);
  const lastSyncedUrl = useRef(baseUrl || DEFAULT_BASE_URL);
  const [error, setError] = useState<string | null>(null);
  const configured = Boolean(apiKey);
  const state: CredentialState = error ? 'error' : configured ? 'configured' : 'missing';

  useEffect(() => {
    const nextUrl = baseUrl || DEFAULT_BASE_URL;
    // A provider reload may change the persisted URL. Only apply it while the
    // field is still pristine; an in-progress edit must remain user-owned.
    const synced = syncDshBaseUrl(url, lastSyncedUrl.current, nextUrl);
    if (synced.url !== url) setUrl(synced.url);
    lastSyncedUrl.current = synced.lastSyncedUrl;
  }, [baseUrl, url]);

  const save = async () => {
    if (!/^https?:\/\/[^\s]+$/i.test(url)) {
      setError('Invalid Base URL. Enter an http or https address.');
      return;
    }
    setError(null);
    const patch = buildDshCredentialPatch(url, key);
    if (await onSave(patch)) {
      lastSyncedUrl.current = url;
      setKey('');
    }
    else setError('Unable to save DSH credentials. Retry or check the values.');
  };

  return (
    <div className="dsh-credential-settings" data-testid="dsh-credential-settings">
      <div className="dsh-credential-status" data-state={state}>
        {state === 'missing' && `Missing DSH credentials (${MISSING_CREDENTIAL})`}
        {state === 'configured' && 'DSH credentials configured'}
        {state === 'error' && 'DSH credential error'}
      </div>
      <p className="settings-help">Studio manages the credential and Base URL; DSH owns model selection.</p>
      <label className="settings-label" htmlFor="dsh-api-key">DEEPSEEK_API_KEY</label>
      <input
        id="dsh-api-key"
        className="settings-input"
        type="password"
        value={key}
        placeholder={apiKey ? 'Configured (enter a new key to replace)' : 'Enter DSH API key'}
        onChange={(event) => setKey(event.target.value)}
        disabled={busy}
        autoComplete="new-password"
      />
      <label className="settings-label" htmlFor="dsh-base-url">DEEPSEEK_BASE_URL</label>
      <input
        id="dsh-base-url"
        className="settings-input"
        type="url"
        value={url}
        onChange={(event) => setUrl(event.target.value)}
        disabled={busy}
      />
      {error && <div className="settings-help dsh-credential-error" role="alert">{error}</div>}
      <div className="dsh-credential-actions">
        <button type="button" className="settings-edit-btn" onClick={() => setUrl(DEFAULT_BASE_URL)} disabled={busy}>Restore default URL</button>
        <button type="button" className="settings-edit-btn" onClick={() => void save()} disabled={busy}>Save DSH credentials</button>
        {configured && <button type="button" className="settings-edit-btn" onClick={() => void onSave({ DEEPSEEK_API_KEY: '' })} disabled={busy}>Clear key</button>}
      </div>
    </div>
  );
}
