import { describe, expect, it } from 'bun:test';
import { buildDshCredentialPatch, syncDshBaseUrl } from './DshCredentialSettings.state';

const FAKE_KEY = 'ds-test-never-real-credential';
const DEFAULT_URL = 'https://api.deepseek.com';

describe('DshCredentialSettings state behavior', () => {
  it('syncs a reloaded URL while pristine', () => {
    expect(syncDshBaseUrl('https://old.example', 'https://old.example', 'https://reloaded.example'))
      .toEqual({ url: 'https://reloaded.example', lastSyncedUrl: 'https://reloaded.example' });
  });

  it('preserves an active URL edit when the parent reloads', () => {
    expect(syncDshBaseUrl('https://user-edit.example', 'https://old.example', 'https://server-later.example'))
      .toEqual({ url: 'https://user-edit.example', lastSyncedUrl: 'https://server-later.example' });
  });

  it('uses the default URL when the persisted value is absent', () => {
    expect(syncDshBaseUrl(DEFAULT_URL, DEFAULT_URL, null).url).toBe(DEFAULT_URL);
  });

  it('does not write a masked key back to the environment', () => {
    expect(buildDshCredentialPatch('https://save.example', '••••••'))
      .toEqual({ DEEPSEEK_BASE_URL: 'https://save.example' });
  });

  it('writes a newly entered fake key and preserves the URL', () => {
    expect(buildDshCredentialPatch('https://save.example', FAKE_KEY))
      .toEqual({ DEEPSEEK_BASE_URL: 'https://save.example', DEEPSEEK_API_KEY: FAKE_KEY });
  });

  it('does not own model selection', () => {
    expect(buildDshCredentialPatch(DEFAULT_URL, '')).not.toHaveProperty('model');
  });
});
