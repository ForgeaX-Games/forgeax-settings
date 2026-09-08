import { expect, mock, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';

mock.module('@forgeax/interface/store', () => ({ useShellStore: (select: Function) => select({ providerOverride: null }) }));
mock.module('@forgeax/interface/i18n', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
mock.module('@forgeax/interface/lib/model-route', () => ({
  applyModelRoute: async () => {}, currentCatalogProvider: () => null,
  deriveActiveSource: () => 'api-key', resetOpenSessionsModelToProviderDefault: async () => {},
}));
mock.module('@forgeax/interface/components/SettingsPrimitives', () => ({
  Section: ({ children }: any) => <section>{children}</section>, EnvField: () => null,
}));
mock.module('../KernelMemoryToggle', () => ({ KernelMemoryToggle: () => null }));
mock.module('../KernelPermissionSelect', () => ({ KernelPermissionSelect: () => null }));
mock.module('../CapabilityManagementPanel', () => ({ KernelCapabilitySummary: () => null }));
mock.module('../DshCredentialSettings', () => ({ DshCredentialSettings: () => null }));

const { useSettingsProviders } = await import('../hooks/useSettingsProviders');
const { ProvidersSection } = await import('./ProvidersSection');
const envOf = () => null;

function InitialSettings({ rows }: { rows?: any[] } = {}) {
  const providers = useSettingsProviders(() => {}, async () => {}, envOf, () => {});
  return <ProvidersSection {...providers} providers={rows ?? providers.providers} dataLoaded busy={false} envOf={envOf} patchEnv={async () => true} />;
}

test('first render displays local agents before any detection effect runs', () => {
  const html = renderToStaticMarkup(<InitialSettings />);
  expect(html).toContain('OpenAI Codex');
  expect(html).toContain('the reference agent CLI');
  expect(html).toContain('DeepSeek Harness');
  expect(html).toContain('common.loading');
  expect(html).not.toContain('settings.providers.cli.unavailable');
  expect(html).not.toContain('settings.providers.cli.healthy');
  // Pending rows never start a paid test or claim an available model route.
  const cliRows = html.split('settings-provider-row').slice(2);
  expect(cliRows.length).toBeGreaterThan(0);
  for (const row of cliRows) {
    expect([...row.matchAll(/<button[^>]*disabled=""/g)].length).toBe(2);
    expect(row).not.toContain('is-down');
  }
});

test('renders confirmed availability after detection without a pending label', () => {
  const html = renderToStaticMarkup(<InitialSettings rows={[{
    id: 'codex', displayName: 'OpenAI Codex', health: { ok: true, detail: 'ready' }, capabilities: {},
  }]} />);
  expect(html).toContain('settings.providers.cli.healthy');
  expect(html).not.toContain('common.loading');
  const row = html.split('settings-provider-row')[2];
  expect(row).not.toContain('disabled=""');
});

test('keeps an unavailable provider visible with its detection error', () => {
  const html = renderToStaticMarkup(<InitialSettings rows={[{
    id: 'codex', displayName: 'OpenAI Codex', health: { ok: false, detail: 'Detection timed out' }, capabilities: {},
  }]} />);
  expect(html).toContain('OpenAI Codex');
  expect(html).toContain('Detection timed out');
  expect(html).toContain('settings.providers.cli.unavailable');
  expect(html).not.toContain('common.loading');
  expect(html).toContain('settings.refresh');
});
