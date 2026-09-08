import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { RosterAgentAvatarRules } from './roster-agent-avatar-types';
import { useTranslation, type Locale } from '@forgeax/interface/i18n';
import { resolveNaming } from '../../../lib/agent-naming';
import {
  loadAgentDetail,
  saveAgentDetail,
  snapshotDraft,
} from './agent-detail-data';
import type {
  AgentDetailDraft,
  AgentDetailLoadMeta,
  AgentMemoryItem,
  AgentSkillItem,
  AgentToolItem,
} from './agent-detail-types';
import { AgentAvatar } from './AgentAvatar';

interface CatalogAgent {
  id: string;
  name?: string;
  role?: string;
  color?: string;
  avatar?: string;
  avatarRules?: RosterAgentAvatarRules;
  naming?: { title: string; sub: string };
}

type DetailTab = 'persona' | 'memory' | 'skills' | 'tools';

function cloneDraft(draft: AgentDetailDraft): AgentDetailDraft {
  return JSON.parse(JSON.stringify(draft)) as AgentDetailDraft;
}

function ItemRemoveButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button type="button" className="ad-item-remove" title={label} onClick={onClick}>
      ✕
    </button>
  );
}

function MemoryItemEditor({
  item,
  index,
  onChange,
  onRemove,
  t,
}: {
  item: AgentMemoryItem;
  index: number;
  onChange: (index: number, next: AgentMemoryItem) => void;
  onRemove: (index: number) => void;
  t: (key: string) => string;
}) {
  return (
    <article className="ad-item">
      <div className="ad-item-head">
        <input
          className="settings-input"
          data-field="file"
          value={item.file}
          placeholder={t('settings.agents.detail.file')}
          spellCheck={false}
          onChange={(e) => onChange(index, { ...item, file: e.target.value })}
        />
        <ItemRemoveButton label={t('settings.agents.detail.remove')} onClick={() => onRemove(index)} />
      </div>
      <textarea
        className="ad-textarea"
        data-field="body"
        value={item.body}
        placeholder={t('settings.agents.detail.body')}
        spellCheck={false}
        onChange={(e) => onChange(index, { ...item, body: e.target.value })}
      />
    </article>
  );
}

function SkillItemEditor({
  item,
  index,
  onChange,
  onRemove,
  t,
}: {
  item: AgentSkillItem;
  index: number;
  onChange: (index: number, next: AgentSkillItem) => void;
  onRemove: (index: number) => void;
  t: (key: string) => string;
}) {
  return (
    <article className="ad-item">
      <div className="ad-item-head">
        <span className="ad-item-kind">{item.kind || 'prompt'}</span>
        <input
          className="settings-input"
          data-field="id"
          value={item.id}
          placeholder={t('settings.agents.detail.skillId')}
          spellCheck={false}
          onChange={(e) => onChange(index, { ...item, id: e.target.value })}
        />
        <ItemRemoveButton label={t('settings.agents.detail.remove')} onClick={() => onRemove(index)} />
      </div>
      <input
        className="settings-input"
        data-field="desc"
        value={item.desc}
        placeholder={t('settings.agents.detail.desc')}
        spellCheck={false}
        onChange={(e) => onChange(index, { ...item, desc: e.target.value })}
      />
      <textarea
        className="ad-textarea"
        data-field="body"
        value={item.body}
        placeholder={t('settings.agents.detail.body')}
        spellCheck={false}
        onChange={(e) => onChange(index, { ...item, body: e.target.value })}
      />
    </article>
  );
}

function ToolItemEditor({
  item,
  index,
  onChange,
  onRemove,
  t,
}: {
  item: AgentToolItem;
  index: number;
  onChange: (index: number, next: AgentToolItem) => void;
  onRemove: (index: number) => void;
  t: (key: string) => string;
}) {
  return (
    <article className="ad-item">
      <div className="ad-item-head">
        <span className="ad-item-kind is-tool">tool</span>
        <input
          className="settings-input"
          data-field="id"
          value={item.id}
          placeholder={t('settings.agents.detail.toolId')}
          spellCheck={false}
          onChange={(e) => onChange(index, { ...item, id: e.target.value })}
        />
        <ItemRemoveButton label={t('settings.agents.detail.remove')} onClick={() => onRemove(index)} />
      </div>
      <input
        className="settings-input"
        data-field="desc"
        value={item.desc}
        placeholder={t('settings.agents.detail.desc')}
        spellCheck={false}
        onChange={(e) => onChange(index, { ...item, desc: e.target.value })}
      />
    </article>
  );
}

function ListPane<T>({
  items,
  emptyLabel,
  addLabel,
  onAdd,
  renderItem,
}: {
  items: T[];
  emptyLabel: string;
  addLabel: string;
  onAdd: () => void;
  renderItem: (item: T, index: number) => ReactNode;
}) {
  return (
    <>
      {items.length === 0 ? (
        <p className="ad-empty">{emptyLabel}</p>
      ) : (
        items.map((item, index) => renderItem(item, index))
      )}
      <button type="button" className="ad-add" onClick={onAdd}>
        {addLabel}
      </button>
    </>
  );
}

export function AgentDetail({
  agent,
  locale,
  onBack,
}: {
  agent: CatalogAgent;
  locale: Locale;
  onBack: () => void;
}) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<DetailTab>('persona');
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [draft, setDraft] = useState<AgentDetailDraft | null>(null);
  const [saved, setSaved] = useState<AgentDetailDraft | null>(null);
  const [meta, setMeta] = useState<AgentDetailLoadMeta>({});
  const [status, setStatus] = useState('');
  const [saving, setSaving] = useState(false);

  const naming = resolveNaming(agent);
  const role = naming.sub || agent.role || '';

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadErr(null);
    setDraft(null);
    setSaved(null);
    setMeta({});
    setStatus('');
    loadAgentDetail(agent.id, locale)
      .then((loaded) => {
        if (cancelled) return;
        setDraft(loaded.draft);
        setSaved(cloneDraft(loaded.draft));
        setMeta(loaded.meta);
      })
      .catch((e: Error) => {
        if (cancelled) return;
        setLoadErr(e.message);
        const empty: AgentDetailDraft = { persona: '', memory: [], skills: [], tools: [] };
        setDraft(empty);
        setSaved(cloneDraft(empty));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [agent.id, locale]);

  const dirty = useMemo(() => {
    if (!draft || !saved) return false;
    return snapshotDraft(draft) !== snapshotDraft(saved);
  }, [draft, saved]);

  const handleDiscard = useCallback(() => {
    if (!saved) return;
    setDraft(cloneDraft(saved));
    setStatus('');
  }, [saved]);

  const handleSave = useCallback(async () => {
    if (!draft || !saved || saving) return;
    setSaving(true);
    setStatus('');
    try {
      await saveAgentDetail(agent.id, locale, draft, saved, meta);
      setSaved(cloneDraft(draft));
      setStatus(t('settings.agents.detail.saved'));
    } catch (e) {
      setStatus(t('settings.readFailed', { error: (e as Error).message }));
    } finally {
      setSaving(false);
    }
  }, [agent.id, draft, locale, meta, saved, saving, t]);

  const tabs: Array<{ id: DetailTab; label: string }> = [
    { id: 'persona', label: t('settings.agents.detail.tabPersona') },
    { id: 'memory', label: t('settings.agents.detail.tabMemory') },
    { id: 'skills', label: t('settings.agents.detail.tabSkills') },
    { id: 'tools', label: t('settings.agents.detail.tabTools') },
  ];

  const updateDraft = useCallback((patch: Partial<AgentDetailDraft>) => {
    setDraft((prev) => (prev ? { ...prev, ...patch } : prev));
    setStatus('');
  }, []);

  if (loading || !draft) {
    return (
      <div className="agent-detail">
        <button type="button" className="ad-back" onClick={onBack}>
          <svg className="lucide" viewBox="0 0 24 24" aria-hidden>
            <path d="m15 18-6-6 6-6" />
          </svg>
          <span>{t('settings.agents.detail.back')}</span>
        </button>
        <p className="dim">{t('common.loading')}</p>
      </div>
    );
  }

  return (
    <div className="agent-detail">
      <button type="button" className="ad-back" onClick={onBack}>
        <svg className="lucide" viewBox="0 0 24 24" aria-hidden>
          <path d="m15 18-6-6 6-6" />
        </svg>
        <span>{t('settings.agents.detail.back')}</span>
      </button>
      <div className="ad-hero">
        <div className="ad-hero-av">
          <AgentAvatar agent={agent} size={48} className="agent-av--lg" />
        </div>
        <div className="ad-hero-copy">
          <div className="ad-hero-name">{naming.title}</div>
          <div className="ad-hero-meta">
            <span>{role}</span>
            <code>{agent.id}</code>
          </div>
        </div>
      </div>
      <div className="ad-tabs" role="tablist">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            className={['ad-tab', tab === item.id ? 'is-active' : ''].filter(Boolean).join(' ')}
            aria-selected={tab === item.id}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="ad-toolbar">
        <button
          type="button"
          className="settings-save-btn"
          disabled={!dirty || saving}
          onClick={() => void handleSave()}
        >
          {t('settings.agents.detail.save')}
        </button>
        <button
          type="button"
          className="settings-cancel-btn"
          disabled={!dirty || saving}
          onClick={handleDiscard}
        >
          {t('settings.agents.detail.discard')}
        </button>
        {status && <span className="ad-status">{status}</span>}
      </div>
      {loadErr && (
        <div className="settings-info settings-error">
          {t('settings.readFailed', { error: loadErr })}
        </div>
      )}
      <div className={['ad-pane', tab === 'persona' ? 'is-active' : ''].filter(Boolean).join(' ')} data-pane="persona">
        <textarea
          className="ad-textarea"
          id="ad-persona"
          spellCheck={false}
          value={draft.persona}
          aria-label={t('settings.agents.detail.tabPersona')}
          onChange={(e) => updateDraft({ persona: e.target.value })}
        />
      </div>
      <div className={['ad-pane', tab === 'memory' ? 'is-active' : ''].filter(Boolean).join(' ')} data-pane="memory">
        <ListPane
          items={draft.memory}
          emptyLabel={t('settings.agents.detail.emptyMemory')}
          addLabel={t('settings.agents.detail.addMemory')}
          onAdd={() => updateDraft({
            memory: [...draft.memory, { file: 'lessons.md', body: '' }],
          })}
          renderItem={(item, index) => (
            <MemoryItemEditor
              key={`${item.path ?? item.file}-${index}`}
              item={item}
              index={index}
              t={t}
              onChange={(i, next) => {
                const memory = [...draft.memory];
                memory[i] = next;
                updateDraft({ memory });
              }}
              onRemove={(i) => updateDraft({ memory: draft.memory.filter((_, j) => j !== i) })}
            />
          )}
        />
      </div>
      <div className={['ad-pane', tab === 'skills' ? 'is-active' : ''].filter(Boolean).join(' ')} data-pane="skills">
        <ListPane
          items={draft.skills}
          emptyLabel={t('settings.agents.detail.emptySkills')}
          addLabel={t('settings.agents.detail.addSkill')}
          onAdd={() => updateDraft({
            skills: [...draft.skills, { id: '', kind: 'prompt', desc: '', body: '' }],
          })}
          renderItem={(item, index) => (
            <SkillItemEditor
              key={`${item.id}-${index}`}
              item={item}
              index={index}
              t={t}
              onChange={(i, next) => {
                const skills = [...draft.skills];
                skills[i] = next;
                updateDraft({ skills });
              }}
              onRemove={(i) => updateDraft({ skills: draft.skills.filter((_, j) => j !== i) })}
            />
          )}
        />
      </div>
      <div className={['ad-pane', tab === 'tools' ? 'is-active' : ''].filter(Boolean).join(' ')} data-pane="tools">
        <ListPane
          items={draft.tools}
          emptyLabel={t('settings.agents.detail.emptyTools')}
          addLabel={t('settings.agents.detail.addTool')}
          onAdd={() => updateDraft({
            tools: [...draft.tools, { id: '', desc: '' }],
          })}
          renderItem={(item, index) => (
            <ToolItemEditor
              key={`${item.id}-${index}`}
              item={item}
              index={index}
              t={t}
              onChange={(i, next) => {
                const tools = [...draft.tools];
                tools[i] = next;
                updateDraft({ tools });
              }}
              onRemove={(i) => updateDraft({ tools: draft.tools.filter((_, j) => j !== i) })}
            />
          )}
        />
      </div>
    </div>
  );
}
