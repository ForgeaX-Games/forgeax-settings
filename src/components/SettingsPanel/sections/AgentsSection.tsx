import { useCallback, useEffect, useMemo, useState } from 'react';
import { resolveNaming } from '../../../lib/agent-naming';
import { useTranslation, type Locale } from '@forgeax/interface/i18n';
import {
  AGENTS_ROSTER_DETAIL_ENABLED,
  AGENTS_ROSTER_LAYOUT,
  type RosterCardSpec,
  type RosterRowSpec,
} from './agents-roster-layout';
import { AgentAvatar } from './AgentAvatar';
import { AgentDetail } from './AgentDetail';
import { agentCatalogUrl } from '../../../lib/agent-catalog-url';
import type { RosterAgentAvatarRules } from './roster-agent-avatar-types';

interface CatalogAgent {
  id: string;
  name?: string;
  role?: string;
  description?: string;
  color?: string;
  avatar?: string;
  avatarRules?: RosterAgentAvatarRules;
  naming?: { title: string; sub: string };
}

function pickLocale<T extends { zh: string; en: string }>(copy: T, locale: Locale): string {
  return locale === 'zh' ? copy.zh : copy.en;
}

function RosterRow({
  agent,
  isLead,
  onSelect,
  detailEnabled,
}: {
  agent: CatalogAgent;
  isLead?: boolean;
  onSelect: (agent: CatalogAgent) => void;
  detailEnabled: boolean;
}) {
  const naming = resolveNaming(agent);
  const desc = agent.description?.trim() || naming.sub || agent.role || '';
  const open = useCallback(() => {
    if (!detailEnabled) return;
    onSelect(agent);
  }, [agent, detailEnabled, onSelect]);
  return (
    <div
      className={[
        'roster-row',
        isLead ? 'is-lead' : '',
        detailEnabled ? '' : 'is-static',
      ].filter(Boolean).join(' ')}
      data-agent-id={agent.id}
      role={detailEnabled ? 'button' : undefined}
      tabIndex={detailEnabled ? 0 : undefined}
      onClick={detailEnabled ? open : undefined}
      onKeyDown={detailEnabled ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          open();
        }
      } : undefined}
    >
      <AgentAvatar agent={agent} />
      <div className="roster-row-text">
        <div className="roster-name">{naming.title}</div>
        <div className="roster-role">{desc}</div>
      </div>
    </div>
  );
}

function filterRows(rows: RosterRowSpec[], byId: Map<string, CatalogAgent>): Array<{
  agent: CatalogAgent;
  isLead?: boolean;
}> {
  const out: Array<{ agent: CatalogAgent; isLead?: boolean }> = [];
  for (const row of rows) {
    const agent = byId.get(row.id);
    if (agent) out.push({ agent, isLead: row.isLead });
  }
  return out;
}

function RosterCard({
  card,
  locale,
  byId,
  onSelect,
  detailEnabled,
}: {
  card: RosterCardSpec;
  locale: Locale;
  byId: Map<string, CatalogAgent>;
  onSelect: (agent: CatalogAgent) => void;
  detailEnabled: boolean;
}) {
  if (card.subs) {
    const subs = card.subs
      .map((sub) => ({
        label: pickLocale(sub.label, locale),
        rows: filterRows(sub.rows, byId),
      }))
      .filter((sub) => sub.rows.length > 0);
    if (subs.length === 0) return null;
    return (
      <article className="roster-card">
        <div className="roster-card-label">{pickLocale(card.label, locale)}</div>
        {subs.map((sub) => (
          <div key={sub.label} className="roster-sub">
            <div className="roster-sub-label">{sub.label}</div>
            <div className="roster-list">
              {sub.rows.map(({ agent, isLead }) => (
                <RosterRow key={agent.id} agent={agent} isLead={isLead} onSelect={onSelect} detailEnabled={detailEnabled} />
              ))}
            </div>
          </div>
        ))}
      </article>
    );
  }

  const rows = filterRows(card.rows ?? [], byId);
  if (rows.length === 0) return null;
  return (
    <article className="roster-card">
      <div className="roster-card-label">{pickLocale(card.label, locale)}</div>
      <div className="roster-list">
        {rows.map(({ agent, isLead }) => (
          <RosterRow key={agent.id} agent={agent} isLead={isLead} onSelect={onSelect} detailEnabled={detailEnabled} />
        ))}
      </div>
    </article>
  );
}

export function AgentsSection() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language as Locale;
  const [agents, setAgents] = useState<CatalogAgent[] | null>(null);
  const [fetchErr, setFetchErr] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<CatalogAgent | null>(null);

  useEffect(() => {
    let cancelled = false;
    setAgents(null);
    setFetchErr(null);
    setSelectedAgent(null);
    fetch(agentCatalogUrl())
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((body: { agents?: CatalogAgent[]; error?: string }) => {
        if (cancelled) return;
        const list = Array.isArray(body.agents) ? body.agents : [];
        if (list.length === 0) {
          throw new Error(body.error ?? 'empty catalog');
        }
        setAgents(list);
        setFetchErr(body.error ?? null);
      })
      .catch((e: Error) => {
        if (cancelled) return;
        setAgents([]);
        setFetchErr(e.message);
      });
    return () => { cancelled = true; };
  }, [locale]);

  useEffect(() => {
    const section = document.getElementById('agents-v2');
    if (!section) return;
    section.classList.toggle('is-detail-disabled', !AGENTS_ROSTER_DETAIL_ENABLED);
    if (selectedAgent) section.classList.add('is-detail');
    else section.classList.remove('is-detail');
    if (selectedAgent) section.scrollTop = 0;
    return () => {
      section.classList.remove('is-detail');
      section.classList.remove('is-detail-disabled');
    };
  }, [selectedAgent]);

  const byId = useMemo(() => {
    const map = new Map<string, CatalogAgent>();
    for (const a of agents ?? []) map.set(a.id, a);
    return map;
  }, [agents]);

  const handleSelect = useCallback((agent: CatalogAgent) => {
    if (!AGENTS_ROSTER_DETAIL_ENABLED) return;
    setSelectedAgent(agent);
  }, []);

  const handleBack = useCallback(() => {
    setSelectedAgent(null);
  }, []);

  const loading = agents === null;

  if (loading) {
    return <p className="dim">{t('common.loading')}</p>;
  }

  if (fetchErr && (agents?.length ?? 0) === 0) {
    return (
      <div className="settings-info settings-error">
        {t('settings.readFailed', { error: fetchErr })}
      </div>
    );
  }

  const topAgent = byId.get(AGENTS_ROSTER_LAYOUT.topRow.id);

  return (
    <div className="agents-roster-wrap">
      <div className="roster">
        <div className="roster-grid">
          {topAgent && (
            <RosterRow
              agent={topAgent}
              isLead={AGENTS_ROSTER_LAYOUT.topRow.isLead}
              onSelect={handleSelect}
              detailEnabled={AGENTS_ROSTER_DETAIL_ENABLED}
            />
          )}
          {AGENTS_ROSTER_LAYOUT.cards.map((card) => (
            <RosterCard
              key={pickLocale(card.label, locale)}
              card={card}
              locale={locale}
              byId={byId}
              onSelect={handleSelect}
              detailEnabled={AGENTS_ROSTER_DETAIL_ENABLED}
            />
          ))}
        </div>
      </div>
      {AGENTS_ROSTER_DETAIL_ENABLED && selectedAgent && (
        <AgentDetail agent={selectedAgent} locale={locale} onBack={handleBack} />
      )}
    </div>
  );
}
