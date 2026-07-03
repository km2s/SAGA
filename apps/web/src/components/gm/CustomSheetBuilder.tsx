'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2, ChevronDown, ChevronUp, Check, Loader2, FileText, Hash } from 'lucide-react'

interface AttrInput { name: string; dice: string }
interface GroupInput { name: string; attributes: AttrInput[] }
interface TextSection { name: string }

const DICE_OPTIONS = ['d4', 'd6', 'd8', 'd10', 'd12', 'd20', 'd100', '%']
const inputCls = 'bg-parchment/60 border border-ink/20 rounded px-2.5 py-1.5 text-sm text-ink placeholder:text-ink-soft focus:outline-none focus:border-gold/50 transition-colors'

export function CustomSheetBuilder({ campaignId }: { campaignId: string }) {
  const [groups, setGroups] = useState<GroupInput[]>([])
  const [textSections, setTextSections] = useState<TextSection[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [expandedGroup, setExpandedGroup] = useState<number | null>(null)

  useEffect(() => {
    fetch(`/api/campaigns/${campaignId}/system-template`)
      .then(r => r.json())
      .then((data: { groups?: GroupInput[]; textSections?: TextSection[] }) => {
        if (data.groups) setGroups(data.groups)
        if (data.textSections) setTextSections(data.textSections)
        if (data.groups && data.groups.length > 0) setExpandedGroup(0)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [campaignId])

  async function save() {
    setSaving(true)
    setSaved(false)
    await fetch(`/api/campaigns/${campaignId}/system-template`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ groups, textSections }),
    }).catch(() => null)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  function addGroup() {
    const idx = groups.length
    setGroups(g => [...g, { name: 'Novo Grupo', attributes: [] }])
    setExpandedGroup(idx)
  }

  function removeGroup(i: number) {
    setGroups(g => g.filter((_, idx) => idx !== i))
    setExpandedGroup(prev => (prev === i ? null : prev !== null && prev > i ? prev - 1 : prev))
  }

  function setGroupName(i: number, name: string) {
    setGroups(g => g.map((gr, idx) => idx === i ? { ...gr, name } : gr))
  }

  function addAttr(gi: number) {
    setGroups(g => g.map((gr, i) => i === gi
      ? { ...gr, attributes: [...gr.attributes, { name: '', dice: 'd20' }] }
      : gr))
  }

  function removeAttr(gi: number, ai: number) {
    setGroups(g => g.map((gr, i) => i === gi
      ? { ...gr, attributes: gr.attributes.filter((_, j) => j !== ai) }
      : gr))
  }

  function setAttrField(gi: number, ai: number, field: keyof AttrInput, val: string) {
    setGroups(g => g.map((gr, i) => i === gi
      ? { ...gr, attributes: gr.attributes.map((a, j) => j === ai ? { ...a, [field]: val } : a) }
      : gr))
  }

  if (loading) {
    return (
      <div className="bg-[#f5ecd6] border border-ink/20 rounded-lg p-4 flex items-center gap-2 text-ink-soft text-sm">
        <Loader2 size={14} className="animate-spin" />
        Carregando template...
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Attribute groups */}
      <div className="bg-[#f5ecd6] border border-ink/20 rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3"
          style={{ borderBottom: groups.length > 0 ? '1px solid rgba(51,41,29,0.06)' : undefined }}>
          <div className="flex items-center gap-2">
            <Hash size={14} className="text-gold" />
            <span className="text-sm font-medium text-ink">Grupos de Atributos</span>
          </div>
          <button onClick={addGroup}
            className="flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded transition-all"
            style={{ background: 'rgba(201,162,42,0.10)', color: '#c9a22a', border: '1px solid rgba(201,162,42,0.25)' }}>
            <Plus size={11} /> Grupo
          </button>
        </div>

        {groups.length === 0 && (
          <p className="text-[12px] text-ink-soft px-4 py-5 text-center">
            Nenhum grupo. Clique em &quot;+ Grupo&quot; para criar a primeira seção de atributos.
          </p>
        )}

        <div className="divide-y" style={{ borderColor: 'rgba(51,41,29,0.05)' }}>
          {groups.map((group, gi) => {
            const isExp = expandedGroup === gi
            return (
              <div key={gi}>
                {/* Group header */}
                <div className="flex items-center gap-2 px-4 py-2.5">
                  <button onClick={() => setExpandedGroup(isExp ? null : gi)}
                    className="shrink-0 text-ink-soft hover:text-ink transition-colors">
                    {isExp ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                  <input value={group.name} onChange={e => setGroupName(gi, e.target.value)}
                    className={`flex-1 text-sm font-medium ${inputCls}`}
                    placeholder="Nome do grupo" />
                  <span className="text-[10px] text-ink-soft shrink-0">{group.attributes.length} attr</span>
                  <button onClick={() => removeGroup(gi)}
                    className="shrink-0 text-ink-soft hover:text-red-700 transition-colors p-1">
                    <Trash2 size={13} />
                  </button>
                </div>

                {/* Group attrs */}
                {isExp && (
                  <div className="px-4 pb-3 space-y-2" style={{ background: 'rgba(0,0,0,0.1)' }}>
                    {group.attributes.map((attr, ai) => (
                      <div key={ai} className="flex items-center gap-2">
                        <input value={attr.name} onChange={e => setAttrField(gi, ai, 'name', e.target.value)}
                          placeholder="Nome do atributo"
                          className={`flex-1 ${inputCls}`} />
                        <select value={attr.dice} onChange={e => setAttrField(gi, ai, 'dice', e.target.value)}
                          className={`w-20 ${inputCls}`}>
                          {DICE_OPTIONS.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                        <button onClick={() => removeAttr(gi, ai)}
                          className="text-ink-soft hover:text-red-700 transition-colors p-1 shrink-0">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                    <button onClick={() => addAttr(gi)}
                      className="flex items-center gap-1 text-[11px] text-ink-soft hover:text-ink-soft transition-colors mt-1">
                      <Plus size={11} /> Adicionar atributo
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Text sections */}
      <div className="bg-[#f5ecd6] border border-ink/20 rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3"
          style={{ borderBottom: textSections.length > 0 ? '1px solid rgba(51,41,29,0.06)' : undefined }}>
          <div className="flex items-center gap-2">
            <FileText size={14} className="text-gold" />
            <span className="text-sm font-medium text-ink">Seções de Texto</span>
            <span className="text-[10px] text-ink-soft">(Background, Personalidade, etc.)</span>
          </div>
          <button onClick={() => setTextSections(s => [...s, { name: '' }])}
            className="flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded transition-all"
            style={{ background: 'rgba(201,162,42,0.10)', color: '#c9a22a', border: '1px solid rgba(201,162,42,0.25)' }}>
            <Plus size={11} /> Seção
          </button>
        </div>

        {textSections.length === 0 && (
          <p className="text-[12px] text-ink-soft px-4 py-5 text-center">
            Nenhuma seção. Adicione campos como &quot;Background&quot;, &quot;Personalidade&quot; ou &quot;Anotações&quot;.
          </p>
        )}

        {textSections.length > 0 && (
          <div className="p-4 space-y-2">
            {textSections.map((sec, i) => (
              <div key={i} className="flex items-center gap-2">
                <input value={sec.name} onChange={e => setTextSections(s => s.map((x, j) => j === i ? { name: e.target.value } : x))}
                  placeholder="Nome da seção (ex: Background)"
                  className={`flex-1 ${inputCls}`} />
                <button onClick={() => setTextSections(s => s.filter((_, j) => j !== i))}
                  className="text-ink-soft hover:text-red-700 transition-colors p-1">
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Save */}
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-ink-soft">
          Novos personagens criados na campanha receberão este template automaticamente.
        </p>
        <button onClick={save} disabled={saving}
          className={`flex items-center gap-2 px-4 py-2 rounded font-medium text-sm disabled:opacity-50 transition-all ${
            saved ? 'bg-saga-success/15 text-green-700' : 'bg-gradient-gold text-crypt-deep'
          }`}>
          {saving ? <Loader2 size={14} className="animate-spin" /> : saved ? <Check size={14} /> : null}
          {saving ? 'Salvando...' : saved ? 'Salvo!' : 'Salvar Template'}
        </button>
      </div>
    </div>
  )
}
