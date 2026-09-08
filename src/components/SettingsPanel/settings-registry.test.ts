import { describe, expect, it } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  BUILTIN_SETTINGS_GROUP_ORDER,
  BUILTIN_SETTINGS_SECTION_IDS,
  resolveSettingsSectionId,
} from './settings-section-catalog';

describe('settings section catalog', () => {
  it('exposes seven built-in sections in ai/system/about order', () => {
    expect(BUILTIN_SETTINGS_SECTION_IDS).toEqual([
      'providers',
      'usage',
      'agents-v2',
      'extensions',
      'language',
      'shortcuts',
      'about',
    ]);
    expect(BUILTIN_SETTINGS_GROUP_ORDER).toEqual(['ai', 'system', 'about']);
  });

  it('redirects legacy and removed deep links to valid sections', () => {
    expect(resolveSettingsSectionId('model-lab')).toBe('providers');
    expect(resolveSettingsSectionId('agents')).toBe('agents-v2');
    expect(resolveSettingsSectionId('agents-v2')).toBe('agents-v2');
    expect(resolveSettingsSectionId('plugins')).toBe('extensions');
    expect(resolveSettingsSectionId('changelog')).toBe('about');
    expect(resolveSettingsSectionId('usage')).toBe('usage');
    expect(resolveSettingsSectionId('missing')).toBe('providers');
  });

  it('keeps the registry as the single composition layer for split settings sections', () => {
    const source = readFileSync(join(import.meta.dir, 'SectionsRegister.tsx'), 'utf8');
    for (const modulePath of [
      './hooks/useSettingsEnv',
      './hooks/useSettingsProviders',
      './sections/ProvidersSection',
      './sections/AgentsSection',
      './sections/AboutSection',
    ]) {
      expect(source).toContain(`from '${modulePath}'`);
    }
    expect(source).not.toContain('function UseControl');
    expect(source).not.toContain('interface VersionInfo');
  });
});
