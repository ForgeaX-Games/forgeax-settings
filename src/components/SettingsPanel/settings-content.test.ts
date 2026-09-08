import { describe, expect, it } from 'bun:test';
import { formatProviderTestResult } from './shared/settings-content';

describe('formatProviderTestResult', () => {
  it('formats ttft success', () => {
    expect(formatProviderTestResult({ status: 'ok', ttftMs: 420, totalMs: 1120 }))
      .toBe('✓ ttft 420ms · total 1120ms');
  });

  it('formats tool-only success', () => {
    expect(formatProviderTestResult({ status: 'ok', totalMs: 900, sawTool: true }))
      .toBe('✓ done · 900ms (tool-only turn)');
  });

  it('formats failure', () => {
    expect(formatProviderTestResult({ status: 'err', err: 'boom' }))
      .toBe('✗ boom');
  });
});
