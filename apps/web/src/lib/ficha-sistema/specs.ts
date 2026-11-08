import type { Ctx, Peca, SistemaSpec, Trilha } from './spec'
import { DEFAULT_BACKGROUNDS, GEN_TABLE, getDisciplinesForClan } from './v20'

// Blocos comuns das fichas do Mundo das Trevas / Crônicas das Trevas (prefixos do seed).
const ATR3 = [{ l: 'Físicos', sel: { prefixo: ['Físico'] } }, { l: 'Sociais', sel: { prefixo: ['Social'] } }, { l: 'Mentais', sel: { prefixo: ['Mental'] } }]
const HAB3 = (max: number | ((c: Ctx) => number) = 5): Peca => ({ tipo: 'linhas', grupos: [{ l: 'Talentos', sel: { prefixo: ['Talento'] } }, { l: 'Perícias', sel: { prefixo: ['Perícia'] } }, { l: 'Conhecimentos', sel: { prefixo: ['Conhecimento'] } }], bolinhas: max, min: '150px' })
const caixa = (n: string, tf: string, label: string, max: number, d?: string): Trilha => ({ n, forma: 'box', fonte: { tf, label }, max, d })
const bola = (n: string, nomes: string[], max: number, d?: string): Trilha => ({ n, forma: 'dot', fonte: { attr: nomes }, max, d })
const NIVEIS_V20: [string, string][] = [['Escoriado', '0'], ['Machucado', '−1'], ['Ferido', '−1'], ['Ferido gravemente', '−2'], ['Espancado', '−2'], ['Aleijado', '−5'], ['Incapacitado', '—']]
const NIVEIS_COD: [string, string][] = [['Ileso', '0'], ['Ferido', '−1'], ['Ferido', '−1'], ['Ferido', '−2'], ['Ferido', '−2'], ['Aleijado', '−5'], ['Incapacitado', '—']]
const notas = (...campos: [string, string, boolean?][]): Peca => ({ tipo: 'texto', campos: [...campos, ['backstory', 'História', true], ['notes', 'Notas', true]] })
// V20: traço máximo e pool de sangue pela geração (GEN_TABLE, V20 p.269).
const genRow = (c: Ctx) => GEN_TABLE[c.attr(['Geração', 'Generation']) ?? 13]
const traco = (c: Ctx) => genRow(c)?.[1] ?? 5
// d20: atributos clássicos e PV guardado em textos (hp_current / hp_max).
const D6 = ['Força', 'Destreza', 'Constituição', 'Inteligência', 'Sabedoria', 'Carisma']
// Fate: caixas de estresse pela perícia (0 → 2, 1–2 → 3, 3+ → 4), como na ficha antiga.
const estresseFate = (v: number | undefined) => (v ?? 0) >= 3 ? 4 : (v ?? 0) >= 1 ? 3 : 2
const pvTf = (): Trilha => ({ n: 'Pontos de vida', forma: 'bar', fonte: { tf: 'hp_current', label: 'PV Atual' }, max: { tf: 'hp_max' } })

/**
 * Um spec por sistema (nome igual ao RPGSystem.name do seed). Cada chave de
 * texto é a mesma que a ficha antiga gravava (components/character/sheets/*).
 * Sistemas fora deste mapa seguem com a ficha antiga.
 */
export const SPECS: Record<string, SistemaSpec> = {
  // components/character/sheets/VtMV5Sheet.tsx
  'Vampire: The Masquerade V5': {
    familia: 'dots', regra: 'v5', linha: ['clan', 'generation', 'predator'],
    atributos: { tipo: 'bolinhas', grupos: [{ l: 'Físicos', sel: { prefixo: ['Físico'] } }, { l: 'Sociais', sel: { prefixo: ['Social'] } }, { l: 'Mentais', sel: { prefixo: ['Mental'] } }] },
    trilhas: [
      { n: 'Fome', forma: 'dot', fonte: { attr: ['Fome', 'Hunger'] }, max: 5, d: 'Cresce com o Despertar', sangue: true },
      { n: 'Humanidade', forma: 'dot', fonte: { attr: ['Humanidade', 'Humanity'] }, max: 10, d: 'Manchas apagam a última' },
      { n: 'Força de Vontade', forma: 'box', fonte: { tf: 'willpowerUsed', label: 'Força de Vontade Gasta', gasto: true }, max: { soma: [['Compostura'], ['Determinação', 'Resolve']] }, d: 'Gaste para rerrolar até 3 dados' },
      { n: 'Vitalidade', forma: 'estados', tf: 'healthDamage', label: 'Trilha de Saúde', max: { soma: [['Vigor']], mais: 3 }, d: 'Clique: vazia → superficial (╱) → agravado (✕)' },
    ],
    pilulas: [{ l: 'Potência de Sangue', attr: ['Potência de Sangue', 'Blood Potency'] }, { l: 'Geração', tf: 'generation' }],
    secoes: [
      { n: 'Habilidades', pecas: [{ tipo: 'linhas', grupos: [{ l: 'Físicas', sel: { prefixo: ['Habilidade Física'] } }, { l: 'Sociais', sel: { prefixo: ['Habilidade Social'] } }, { l: 'Mentais', sel: { prefixo: ['Habilidade Mental'] } }], bolinhas: 5, min: '150px' }] },
      { n: 'Disciplinas', pecas: [{ tipo: 'linhas', l: 'Disciplinas', grupos: [{ sel: { prefixo: ['Disciplina'] } }], bolinhas: 5, adicionar: { label: 'Nova disciplina', descricao: 'Disciplina — adicionada na ficha', dado: 'd10' } }] },
      { n: 'Convicções', pecas: [{ tipo: 'texto', campos: [['convictions', 'Convicções', true], ['touchstones', 'Tocadores', true], ['tenets', 'Preceitos da Crônica', true]] }] },
      { n: 'Ambição', pecas: [{ tipo: 'texto', campos: [['ambition', 'Ambição', true]] }] },
      { n: 'Desejo', pecas: [{ tipo: 'texto', campos: [['desire', 'Desejo', true]] }] },
      { n: 'Antecedentes', pecas: [{ tipo: 'linhas', l: 'Antecedentes', grupos: [{ sel: { prefixo: ['Antecedente'] } }], bolinhas: 5, adicionar: { label: 'Novo antecedente', descricao: 'Antecedente — adicionado na ficha', dado: 'd10' } }] },
      { n: 'Haven Rating', pecas: [{ tipo: 'texto', campos: [['haven_location', 'Localização'], ['haven_rating', 'Haven Rating']] }] },
      { n: 'Ressonância', pecas: [{ tipo: 'chips', l: 'Tipo de Ressonância', tf: 'resonance_type', label: 'Tipo de Ressonância', opcoes: ['Sanguíneo', 'Colérico', 'Melancólico', 'Fleumático', 'Nervoso', 'Sem Ressonância'] }, { tipo: 'texto', campos: [['hunting_notes', 'Notas de Caça', true]] }] },
      { n: 'Inventário', pecas: [{ tipo: 'armas' }] },
      { n: 'Notas', pecas: [{ tipo: 'texto', campos: [['clan', 'Clã'], ['generation', 'Geração'], ['predator', 'Tipo de Predador'], ['concept', 'Conceito'], ['backstory', 'História', true], ['notes', 'Notas', true]] }] },
    ],
  },
  // components/character/sheets/VtMV20Sheet.tsx (também 'Vampire: The Masquerade')
  'Vampire: The Masquerade V20': {
    familia: 'dots', regra: 'wod', linha: ['clan', 'sect', 'nature'],
    atributos: { tipo: 'bolinhas', grupos: ATR3, max: traco },
    trilhas: [
      { n: 'Pontos de Sangue', forma: 'box', fonte: { attr: ['Sangue', 'Blood Pool', 'Pontos de Sangue'] }, max: c => genRow(c)?.[0] ?? 10, d: 'Sangue por rodada limitado pela geração' },
      caixa('Força de Vontade', 'willpower_current', 'Força de Vontade (atual — máx. 10)', 10, 'Um sucesso automático por ponto'),
      { n: 'Saúde', forma: 'niveis', tf: 'healthTrack', label: 'Saúde', niveis: NIVEIS_V20 },
    ],
    pilulas: [{ l: 'Geração', attr: ['Geração', 'Generation'] }, { l: 'Humanidade / Via', tf: 'humanity' }],
    secoes: [
      { n: 'Habilidades', pecas: [HAB3(traco)] },
      { n: 'Disciplinas', pecas: [{ tipo: 'listaTf', l: 'Disciplinas', chave: n => `disc_${n.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '_')}`, rotulo: n => `Disciplina: ${n}`, base: c => getDisciplinesForClan(c.tf.clan ?? ''), extras: { key: 'extra_disc_list', label: 'Disciplinas Extras' }, novo: 'Disciplina', bolinhas: traco }] },
      { n: 'Antecedentes', pecas: [{ tipo: 'listaTf', l: 'Antecedentes', chave: n => `bg_${n.toLowerCase().replace(/\s+/g, '_')}`, rotulo: n => `Antecedente: ${n}`, base: () => DEFAULT_BACKGROUNDS, extras: { key: 'extra_bg_list', label: 'Antecedentes Extras' }, novo: 'Antecedente', bolinhas: 5 }] },
      { n: 'Virtudes', pecas: [{ tipo: 'linhas', l: 'Virtudes', grupos: [{ sel: { prefixo: ['Virtude'] } }], bolinhas: 5 }, { tipo: 'linhas', l: 'Recursos permanentes', grupos: [{ sel: { nomes: ['Força de Vontade', 'Humanidade'] } }], bolinhas: 10 }] },
      { n: 'Natureza', pecas: [{ tipo: 'texto', campos: [['nature', 'Natureza'], ['demeanor', 'Comportamento']] }] },
      { n: 'Experiência', pecas: [{ tipo: 'texto', campos: [['xp_total', 'XP Total'], ['xp_spent', 'XP Gasto'], ['observations', 'Observações', true]] }] },
      { n: 'Inventário', pecas: [{ tipo: 'armas' }] },
      { n: 'Notas', pecas: [notas(['clan', 'Clã'], ['sect', 'Seita'], ['sire', 'Senhor'], ['embrace_date', 'Data do Abraço'], ['concept', 'Conceito'], ['haven', 'Refúgio'], ['humanity', 'Humanidade / Via'])] },
    ],
  },
  // components/character/sheets/WerewolfSheet.tsx
  'Werewolf: The Apocalypse': {
    familia: 'dots', regra: 'wod', linha: ['breed', 'auspice', 'tribe'],
    atributos: { tipo: 'bolinhas', grupos: ATR3 },
    trilhas: [caixa('Raiva', 'rage_current', 'Raiva (atual)', 10, 'Ações extras e transformação'), caixa('Gnosis', 'gnosis_current', 'Gnosis (atual)', 10, 'Ligação com a Umbra'), caixa('Força de Vontade', 'willpower_current', 'Força de Vontade (atual)', 10)],
    pilulas: [{ l: 'Raiva', attr: ['Raiva', 'Rage'] }, { l: 'Gnosis', attr: ['Gnosis'] }, { l: 'Força de Vontade', attr: ['Força de Vontade'] }],
    secoes: [
      { n: 'Habilidades', pecas: [HAB3()] },
      { n: 'Renome', pecas: [{ tipo: 'linhas', l: 'Renome', grupos: [{ sel: { nomes: ['Glória', 'Honra', 'Sabedoria'] } }], bolinhas: 10 }] },
      { n: 'Dons', pecas: [{ tipo: 'linhas', l: 'Dons', grupos: [{ sel: { prefixo: ['Dom'] } }], bolinhas: 5, adicionar: { label: 'Novo dom', descricao: 'Dom — adicionado na ficha', dado: 'd10' } }, { tipo: 'texto', campos: [['gifts_text', 'Dons (descrição)', true]] }] },
      { n: 'Inventário', pecas: [{ tipo: 'armas' }] },
      { n: 'Notas', pecas: [notas(['breed', 'Raça'], ['auspice', 'Auspício'], ['tribe', 'Tribo'], ['concept', 'Conceito'])] },
    ],
  },
  // components/character/sheets/MageAscSheet.tsx
  'Mage: The Ascension': {
    familia: 'dots', regra: 'wod', linha: ['tradition', 'essence'],
    atributos: { tipo: 'bolinhas', grupos: ATR3 },
    trilhas: [caixa('Quintessência', 'quintessence', 'Quintessência (atual)', 20, 'Roda partilhada com o Paradoxo'), caixa('Paradoxo', 'paradox', 'Paradoxo', 10, 'Cresce com magia vulgar'), caixa('Força de Vontade', 'willpower_current', 'Força de Vontade', 10)],
    pilulas: [{ l: 'Arete', attr: ['Arete', 'Arête'] }],
    secoes: [
      { n: 'Habilidades', pecas: [HAB3()] },
      { n: '9 Esferas da Magia', pecas: [{ tipo: 'linhas', l: 'Esferas', grupos: [{ sel: { prefixo: ['Esfera'] } }], bolinhas: 5 }, { tipo: 'texto', campos: [['spheres_text', 'Notas das esferas', true]] }] },
      { n: 'Paradigma', pecas: [{ tipo: 'texto', campos: [['paradigm', 'Paradigma', true]] }] },
      { n: 'Inventário', pecas: [{ tipo: 'armas' }] },
      { n: 'Notas', pecas: [notas(['tradition', 'Tradição'], ['essence', 'Essência'])] },
    ],
  },
  // components/character/sheets/MageAwkSheet.tsx
  'Mage: The Awakening': {
    familia: 'dots', regra: 'cod', linha: ['order', 'path'],
    atributos: { tipo: 'bolinhas', grupos: ATR3 },
    trilhas: [caixa('Mana', 'mana_current', 'Mana (atual)', 10, 'Abastece feitiços'), caixa('Força de Vontade', 'willpower_current', 'Força de Vontade', 10)],
    pilulas: [{ l: 'Gnose', attr: ['Gnose', 'Gnosis'] }, { l: 'Sabedoria', tf: 'wisdom' }],
    secoes: [
      { n: 'Habilidades', pecas: [HAB3()] },
      { n: '10 Arcanos', pecas: [{ tipo: 'linhas', l: 'Arcanos', grupos: [{ sel: { prefixo: ['Arcano'] } }], bolinhas: 5 }, { tipo: 'texto', campos: [['arcana_text', 'Notas dos arcanos', true]] }] },
      { n: 'Inventário', pecas: [{ tipo: 'armas' }] },
      { n: 'Notas', pecas: [notas(['order', 'Ordem'], ['path', 'Caminho'], ['concept', 'Conceito'], ['wisdom', 'Sabedoria'])] },
    ],
  },
  // components/character/sheets/HunterSheet.tsx
  'Hunter: The Reckoning': {
    familia: 'dots', regra: 'wod', linha: ['credo', 'concept'],
    atributos: { tipo: 'bolinhas', grupos: ATR3 },
    trilhas: [caixa('Convicção', 'conviction_current', 'Convicção (atual)', 10), caixa('Fervor', 'zeal_current', 'Fervor (atual)', 10), caixa('Força de Vontade', 'willpower_current', 'Força de Vontade (atual)', 10)],
    pilulas: [{ l: 'Convicção', attr: ['Convicção'] }, { l: 'Credo', tf: 'credo' }],
    secoes: [
      { n: 'Habilidades', pecas: [HAB3()] },
      { n: 'Vantagens / Edges', pecas: [{ tipo: 'texto', campos: [['edges_text', 'Edges (descrição)', true]] }] },
      { n: 'Inventário', pecas: [{ tipo: 'armas' }] },
      { n: 'Notas', pecas: [notas(['credo', 'Credo'], ['concept', 'Conceito'])] },
    ],
  },
  // components/character/sheets/ChangelingSheet.tsx
  'Changeling: The Lost': {
    familia: 'dots', regra: 'cod', linha: ['seeming', 'kith', 'court'],
    atributos: { tipo: 'bolinhas', grupos: ATR3 },
    trilhas: [caixa('Glamour', 'glamour_current', 'Glamour (atual)', 10), caixa('Força de Vontade', 'willpower_current', 'Willpower (atual)', 10), bola('Wyrd', ['Escuridão', 'Wyrd'], 10)],
    pilulas: [{ l: 'Claridade', tf: 'clarity' }, { l: 'Corte', tf: 'court' }],
    secoes: [
      { n: 'Habilidades', pecas: [HAB3()] },
      { n: 'Contratos', pecas: [{ tipo: 'linhas', l: 'Contratos', grupos: [{ sel: { prefixo: ['Contrato'] } }], bolinhas: 5, adicionar: { label: 'Novo contrato', descricao: 'Contrato — adicionado na ficha', dado: 'd10' } }, { tipo: 'texto', campos: [['contracts_text', 'Contratos (descrição)', true]] }] },
      { n: 'Juramentos (Pledges)', pecas: [{ tipo: 'texto', campos: [['pledges_text', 'Juramentos (Pledges)', true]] }] },
      { n: 'Fraquezas (Frailties)', pecas: [{ tipo: 'texto', campos: [['frailties_text', 'Fraquezas (Frailties)', true]] }] },
      { n: 'Inventário', pecas: [{ tipo: 'armas' }] },
      { n: 'Notas', pecas: [notas(['seeming', 'Seeming'], ['kith', 'Kith'], ['court', 'Corte'], ['clarity', 'Claridade'], ['concept', 'Conceito'])] },
    ],
  },
  // components/character/sheets/DemonSheet.tsx
  'Demon: The Descent': {
    familia: 'dots', regra: 'cod', linha: ['agenda', 'cover_identity'],
    atributos: { tipo: 'bolinhas', grupos: ATR3 },
    trilhas: [bola('Aether', ['Aether'], 10), bola('Cobertura', ['Cobertura'], 10), { n: 'Saúde', forma: 'niveis', tf: 'healthTrack', label: 'Saúde', niveis: NIVEIS_COD }],
    pilulas: [{ l: 'Glória', attr: ['Glória'] }, { l: 'Agenda', tf: 'agenda' }],
    secoes: [
      { n: 'Habilidades', pecas: [HAB3()] },
      { n: 'Forma Demoníaca', pecas: [{ tipo: 'texto', campos: [['demon_form', 'Forma Demoníaca', true]] }] },
      { n: 'Embeds e Exploits', pecas: [{ tipo: 'texto', campos: [['embeds_list', 'Embeds', true], ['exploits_list', 'Exploits', true]] }] },
      { n: 'Inventário', pecas: [{ tipo: 'armas' }] },
      { n: 'Notas', pecas: [{ tipo: 'texto', campos: [['agenda', 'Agenda'], ['cover_identity', 'Identidade de Cobertura'], ['xp_current', 'XP Atual'], ['xp_total', 'XP Total Gasto']] }] },
    ],
  },
  // components/character/sheets/GeistSheet.tsx
  'Geist: The Sin-Eaters': {
    familia: 'dots', regra: 'cod', linha: ['archetype'],
    atributos: { tipo: 'bolinhas', grupos: ATR3 },
    trilhas: [bola('Plasm', ['Plasm'], 10), bola('Synergy', ['Synergy'], 10), { n: 'Saúde', forma: 'niveis', tf: 'healthTrack', label: 'Saúde', niveis: NIVEIS_COD }],
    pilulas: [{ l: 'Arquétipo', tf: 'archetype' }],
    secoes: [
      { n: 'Habilidades', pecas: [HAB3()] },
      { n: 'Haunts', pecas: [{ tipo: 'texto', campos: [['haunts_text', 'Haunts', true]] }] },
      { n: 'Manifestações e Chaves', pecas: [{ tipo: 'texto', campos: [['manifestations_list', 'Manifestações / Keys', true]] }] },
      { n: 'Descrição do Geist', pecas: [{ tipo: 'texto', campos: [['geist_desc', 'Descrição do Geist', true]] }] },
      { n: 'Inventário', pecas: [{ tipo: 'armas' }] },
      { n: 'Notas', pecas: [{ tipo: 'texto', campos: [['archetype', 'Arquétipo'], ['xp_current', 'XP Atual'], ['xp_total', 'XP Total Gasto']] }] },
    ],
  },

  // ─── Família d20 ───
  // D&D 5e: personagens usam a SAGA Ficha própria; este spec serve à Ficha NPC.
  'D&D 5e': {
    familia: 'd20', regra: 'd20', linha: [],
    atributos: { tipo: 'tiles', sel: { nomes: D6 }, mostra: 'mod' },
    trilhas: [],
    pilulas: [{ l: 'CA', attr: ['Classe de Armadura'] }, { l: 'Iniciativa', attr: ['Iniciativa'] }],
    secoes: [
      { n: 'Perícias', pecas: [{ tipo: 'linhas', grupos: [{ sel: { prefixo: ['Perícia'] } }], min: '180px' }] },
      { n: 'Salvaguardas', pecas: [{ tipo: 'linhas', grupos: [{ sel: { prefixo: ['Salvaguarda'] } }] }] },
      { n: 'Ataques', pecas: [{ tipo: 'armas' }] },
      { n: 'Notas', pecas: [{ tipo: 'texto', campos: [['notes', 'Notas', true]] }] },
    ],
  },
  // components/character/sheets/DnD35Sheet.tsx
  'D&D 3.5e': {
    familia: 'd20', regra: 'd20', linha: ['race_notes', 'class_notes', 'alignment'],
    atributos: { tipo: 'tiles', sel: { nomes: D6 }, mostra: 'mod' },
    trilhas: [],
    pilulas: [{ sel: { prefixo: ['Combate'] } }],
    secoes: [
      { n: 'Perícias', pecas: [{ tipo: 'linhas', grupos: [{ sel: { prefixo: ['Perícia'] } }], min: '180px' }] },
      { n: 'Testes de Resistência', pecas: [{ tipo: 'linhas', grupos: [{ sel: { prefixo: ['Salvaguarda'] } }] }] },
      { n: 'Atributos de Combate', pecas: [{ tipo: 'linhas', grupos: [{ sel: { prefixo: ['Combate'] } }] }, { tipo: 'armas' }] },
      { n: 'Espaços de Magia', pecas: [{ tipo: 'espacos' }] },
      { n: 'Talentos', pecas: [{ tipo: 'texto', campos: [['feats', 'Talentos', true], ['special_abilities', 'Habilidades Especiais', true]] }] },
      { n: 'Notas', pecas: [{ tipo: 'texto', campos: [['race_notes', 'Raça'], ['class_notes', 'Classe'], ['alignment', 'Alinhamento'], ['deity', 'Deidade']] }] },
    ],
  },
  // components/character/sheets/Pathfinder1eSheet.tsx
  'Pathfinder 1e': {
    familia: 'd20', regra: 'd20', linha: ['race', 'class', 'alignment'], semPvFicha: true,
    atributos: { tipo: 'tiles', sel: { nomes: D6 }, mostra: 'mod' },
    trilhas: [pvTf()],
    pilulas: [{ l: 'CA', tf: 'ac' }, { l: 'BBA', tf: 'bab' }, { l: 'CMD', tf: 'cmd' }],
    secoes: [
      { n: 'Perícias', pecas: [{ tipo: 'linhas', grupos: [{ sel: { prefixo: ['Perícia', 'Skill'] } }], min: '180px' }, { tipo: 'texto', campos: [['skills_text', 'Perícias (notas)', true]] }] },
      { n: 'Combate', pecas: [{ tipo: 'texto', campos: [['bab', 'BAB'], ['initiative', 'Iniciativa'], ['ac', 'CA (AC)'], ['speed', 'Deslocamento'], ['hp_max', 'PV Máx.'], ['hp_current', 'PV Atual']] }, { tipo: 'linhas', grupos: [{ sel: { prefixo: ['Combate'] } }] }, { tipo: 'armas' }] },
      { n: 'CMB', pecas: [{ tipo: 'texto', campos: [['cmb', 'CMB'], ['cmd', 'CMD']] }] },
      { n: 'Testes de Resistência', pecas: [{ tipo: 'texto', campos: [['save_fort', 'Fortitude'], ['save_ref', 'Reflexo'], ['save_will', 'Vontade']] }, { tipo: 'linhas', grupos: [{ sel: { prefixo: ['Salvaguarda'] } }] }] },
      { n: 'Magias', pecas: [{ tipo: 'texto', campos: [['spells_per_day', 'Magias por Dia', true], ['spells_known', 'Magias Conhecidas', true]] }] },
      { n: 'Divindade', pecas: [{ tipo: 'texto', campos: [['deity', 'Divindade'], ['feats', 'Talentos (Feats)', true], ['traits', 'Traços', true]] }] },
      { n: 'Notas', pecas: [{ tipo: 'texto', campos: [['class', 'Classe'], ['race', 'Raça'], ['alignment', 'Alinhamento'], ['backstory', 'História', true]] }] },
    ],
  },
  // components/character/sheets/Pathfinder2eSheet.tsx
  'Pathfinder 2e': {
    familia: 'd20', regra: 'pf2', linha: ['ancestry', 'class', 'background'], semPvFicha: true,
    atributos: { tipo: 'tiles', sel: { nomes: D6 }, mostra: 'mod' },
    trilhas: [pvTf(), { n: 'Ferido', forma: 'dot', fonte: { tf: 'wounded', label: 'Ferido (Wounded)' }, max: 3, d: 'Condição Wounded' }],
    pilulas: [{ l: 'CA', tf: 'ac' }, { l: 'Deslocamento', tf: 'speed' }],
    secoes: [
      { n: 'Perícias', pecas: [{ tipo: 'linhas', grupos: [{ sel: { prefixo: ['Perícia'] } }], prof: ['D', 'T', 'E', 'M', 'L'], min: '240px' }, { tipo: 'texto', campos: [['skills_text', 'Perícias (notas)', true]] }] },
      { n: 'Testes de Resistência', pecas: [{ tipo: 'texto', campos: [['save_fort', 'Fortitude'], ['save_ref', 'Reflexo'], ['save_will', 'Vontade']] }, { tipo: 'linhas', grupos: [{ sel: { prefixo: ['Salvaguarda'] } }] }] },
      { n: 'Combate', pecas: [{ tipo: 'texto', campos: [['ac', 'CA'], ['speed', 'Deslocamento'], ['hp_max', 'PV Máx.'], ['hp_current', 'PV Atual']] }, { tipo: 'linhas', grupos: [{ sel: { prefixo: ['Combate'] } }] }, { tipo: 'armas' }] },
      { n: 'Ancestralidade', pecas: [{ tipo: 'texto', campos: [['ancestry', 'Ancestralidade'], ['background', 'Background'], ['alignment', 'Alinhamento'], ['feats', 'Talentos', true]] }] },
      { n: 'Espaços de Magia', pecas: [{ tipo: 'texto', campos: [['spell_slots', 'Espaços de Magia', true]] }] },
      { n: 'Magias Conhecidas', pecas: [{ tipo: 'texto', campos: [['spells_known', 'Magias Conhecidas', true]] }] },
      { n: 'Notas', pecas: [{ tipo: 'texto', campos: [['class', 'Classe'], ['backstory', 'História', true]] }] },
    ],
  },
  // components/character/sheets/Tormenta20Sheet.tsx
  'Tormenta20': {
    familia: 'd20', regra: 'd20', linha: ['race', 'class', 'origin'], semPvFicha: true,
    atributos: { tipo: 'tiles', sel: { nomes: D6 }, mostra: 'mod' },
    trilhas: [pvTf(), { n: 'Pontos de mana', forma: 'bar', fonte: { tf: 'pm_current', label: 'PM Atual' }, max: { tf: 'pm_max' } }],
    pilulas: [{ l: 'Defesa', tf: 'defense' }, { l: 'Iniciativa', tf: 'initiative' }],
    secoes: [
      { n: 'Perícias', pecas: [{ tipo: 'linhas', grupos: [{ sel: { prefixo: ['Perícia'] } }], min: '180px' }, { tipo: 'texto', campos: [['skills_text', 'Perícias (notas)', true]] }] },
      { n: 'Combate', pecas: [{ tipo: 'texto', campos: [['defense', 'Defesa'], ['initiative', 'Iniciativa'], ['hp_max', 'PV Máx.'], ['hp_current', 'PV Atual'], ['pm_max', 'PM Máx.'], ['pm_current', 'PM Atual'], ['save_fort', 'Fortitude'], ['save_ref', 'Reflexo'], ['save_will', 'Vontade']] }, { tipo: 'linhas', grupos: [{ sel: { prefixo: ['Combate', 'Salvaguarda'] } }] }, { tipo: 'armas' }] },
      { n: 'Origem', pecas: [{ tipo: 'texto', campos: [['origin', 'Origem'], ['race', 'Raça'], ['class', 'Classe']] }] },
      { n: 'Divindade', pecas: [{ tipo: 'texto', campos: [['deity', 'Divindade'], ['feats', 'Poderes', true]] }] },
      { n: 'Magias Conhecidas', pecas: [{ tipo: 'texto', campos: [['spells_known', 'Magias Conhecidas', true], ['powers_list', 'Poderes / Habilidades de Classe', true]] }] },
      { n: 'Notas', pecas: [{ tipo: 'texto', campos: [['backstory', 'História', true], ['notes', 'Notas', true]] }] },
    ],
  },
  // components/character/sheets/StarfinderSheet.tsx
  'Starfinder': {
    familia: 'd20', regra: 'd20', linha: ['race', 'theme'],
    atributos: { tipo: 'tiles', sel: { nomes: D6 }, mostra: 'mod' },
    trilhas: [],
    pilulas: [{ l: 'EAC', attr: ['EAC', 'CAE'] }, { l: 'KAC', attr: ['KAC', 'CAC'] }, { l: 'Pontos de Vigor', attr: ['Pontos de Vigor', 'SP', 'Stamina'] }],
    secoes: [
      { n: 'Salvaguardas', pecas: [{ tipo: 'linhas', grupos: [{ sel: { prefixo: ['Salvaguarda'] } }] }] },
      { n: 'Perícias', pecas: [{ tipo: 'linhas', grupos: [{ sel: { prefixo: ['Perícia'] } }], min: '180px' }] },
      { n: 'Combate', pecas: [{ tipo: 'linhas', grupos: [{ sel: { prefixo: ['Combate'] } }] }, { tipo: 'armas' }] },
      { n: 'Bulk Atual', pecas: [{ tipo: 'texto', campos: [['bulk_current', 'Bulk Atual'], ['bulk_max', 'Bulk Máximo']] }] },
      { n: 'Recursos', pecas: [{ tipo: 'texto', campos: [['class_abilities', 'Habilidades de Classe', true]] }] },
      { n: 'Notas', pecas: [{ tipo: 'texto', campos: [['race', 'Raça'], ['theme', 'Tema'], ['xp_current', 'XP Atual']] }] },
    ],
  },
  // components/character/sheets/Age13Sheet.tsx
  '13th Age': {
    familia: 'd20', regra: 'd20', linha: ['race_notes', 'class_notes'], semPvFicha: true,
    atributos: { tipo: 'tiles', sel: { nomes: D6 }, mostra: 'mod' },
    trilhas: [
      { n: 'Pontos de vida', forma: 'bar', fonte: { tf: 'hp_current', label: 'PV Atual' }, max: { attr: ['Pontos de Vida'] } },
      { n: 'Recuperações', forma: 'dot', fonte: { tf: 'recoveries_used', label: 'Usadas', gasto: true }, max: { attr: ['Recuperações'] } },
    ],
    pilulas: [{ l: 'CA', attr: ['Classe de Armadura'] }, { l: 'DF', attr: ['DP'] }, { l: 'DM', attr: ['DM'] }, { l: 'Dado de escalada', tf: 'escalation_die' }],
    secoes: [
      { n: 'One Unique Thing', pecas: [{ tipo: 'texto', campos: [['one_unique_thing', 'One Unique Thing', true]] }] },
      { n: 'Nome do Ícone', pecas: [{ tipo: 'texto', campos: [1, 2, 3].flatMap(i => [[`icon${i}_name`, `Ícone ${i}`], [`icon${i}_dice`, `Dados de Relacionamento ${i}`]] as [string, string][]) }] },
      { n: 'Backgrounds', pecas: [{ tipo: 'texto', campos: [['backgrounds', 'Backgrounds', true]] }] },
      { n: 'Talentos de Classe', pecas: [{ tipo: 'texto', campos: [['talents', 'Talentos de Classe', true]] }] },
      { n: 'Combate', pecas: [{ tipo: 'linhas', grupos: [{ sel: { prefixo: ['Combate'] } }] }, { tipo: 'texto', campos: [['escalation_die', 'Dado de escalada']] }, { tipo: 'armas' }] },
      { n: 'Notas', pecas: [{ tipo: 'texto', campos: [['race_notes', 'Raça'], ['class_notes', 'Classe'], ['background', 'Histórico Pessoal', true]] }] },
    ],
  },

  // ─── Porcentagem ───
  // components/character/sheets/CoC7eSheet.tsx
  'Call of Cthulhu 7e': {
    familia: 'pct', regra: 'coc', linha: ['occupation'],
    atributos: { tipo: 'tiles', sel: { prefixo: ['Característica'] }, mostra: 'pct' },
    trilhas: [{ n: 'Sanidade', forma: 'num', fonte: { attr: ['Sanidade', 'SAN'] }, max: 99, d: 'Perde em encontros com o Mito' }, { n: 'Sorte', forma: 'num', fonte: { tf: 'luck_current', label: 'Sorte Atual' }, max: 99, d: 'Pode gastar para passar' }],
    pilulas: [{ l: 'Sorte', attr: ['Sorte'] }, { l: 'Crédito', tf: 'credit_rating' }],
    secoes: [
      { n: 'Perícias', pecas: [{ tipo: 'linhas', grupos: [{ sel: { prefixo: ['Perícia'] } }], min: '180px' }] },
      { n: 'Derivados', pecas: [{ tipo: 'linhas', grupos: [{ sel: { prefixo: ['Derivado'] } }] }] },
      { n: 'Perícias de Combate', pecas: [{ tipo: 'armas' }] },
      { n: 'Personagem', pecas: [{ tipo: 'texto', campos: [['occupation', 'Ocupação'], ['credit_rating', 'Credenciamento'], ['fortune_max', 'Fortuna Máxima'], ['fortune_current', 'Fortuna Atual'], ['languages', 'Idiomas'], ['description', 'Descrição Física', true], ['backstory', 'Histórico', true]] }] },
    ],
  },
  // components/character/sheets/DeltaGreenSheet.tsx
  'Delta Green': {
    familia: 'pct', regra: 'pct', linha: ['agency', 'occupation'],
    atributos: { tipo: 'tiles', sel: { nomes: ['Força', 'Constituição', 'Destreza', 'Inteligência', 'Poder', 'Carisma', 'Educação'] }, mostra: 'x5' },
    trilhas: [{ n: 'Sanidade', forma: 'num', fonte: { attr: ['Sanidade'] }, max: c => (c.attr(['Poder']) ?? 0) * 5 || 99, d: 'Limiar de ruptura nos Pontos de Ruptura' }],
    pilulas: [{ l: 'Pontos de Ruptura', attr: ['Pontos de Ruptura'] }],
    secoes: [
      { n: 'Perícias (d100)', pecas: [{ tipo: 'linhas', grupos: [{ sel: { prefixo: ['Perícia'] } }], min: '180px' }] },
      { n: 'Vínculos', pecas: [{ tipo: 'pares', l: 'Vínculos', max: 10, itens: [1, 2, 3, 4].map(i => ({ nome: [`bond${i}_name`, `Vínculo ${i}`] as [string, string], valor: [`bond${i}_score`, `Vínculo ${i} Pontuação`] as [string, string] })) }] },
      { n: 'Transtornos', pecas: [{ tipo: 'texto', campos: [['disorders', 'Transtornos', true]] }] },
      { n: 'Adaptado à Violência', pecas: [{ tipo: 'texto', campos: [['violence_adapted', 'Adaptado à Violência'], ['helpless_adapted', 'Adaptado à Impotência']] }] },
      { n: 'Operações Anteriores', pecas: [{ tipo: 'texto', campos: [['ops_notes', 'Operações Anteriores', true]] }] },
      { n: 'Inventário', pecas: [{ tipo: 'armas' }] },
      { n: 'Personagem', pecas: [{ tipo: 'texto', campos: [['agency', 'Agência'], ['occupation', 'Ocupação'], ['training', 'Treinamento', true]] }] },
    ],
  },
  // components/character/sheets/MothershipSheet.tsx
  'Mothership': {
    familia: 'pct', regra: 'ms', linha: ['class'],
    atributos: { tipo: 'tiles', sel: { nomes: ['Força', 'Velocidade', 'Intelecto', 'Combate', 'Instinto'] }, mostra: 'pct' },
    trilhas: [{ n: 'Estresse', forma: 'num', fonte: { attr: ['Estresse', 'Stress'] }, max: 20, d: 'Pânico ao falhar com Estresse alto' }],
    pilulas: [{ sel: { prefixo: ['Salvaguarda', 'Save'] } }, { l: 'Sanidade', attr: ['Sanidade'] }],
    secoes: [
      { n: 'Salvaguardas', pecas: [{ tipo: 'linhas', grupos: [{ sel: { prefixo: ['Salvaguarda', 'Save'] } }] }, { tipo: 'texto', campos: [['save_notes', 'Notas de Salvaguarda', true]] }] },
      { n: 'Perícias', pecas: [{ tipo: 'linhas', grupos: [{ sel: { prefixo: ['Perícia'] } }], min: '180px' }] },
      { n: 'Ferimentos', pecas: [{ tipo: 'texto', campos: [['wounds', 'Ferimentos', true]] }] },
      { n: 'Classe', pecas: [{ tipo: 'texto', campos: [['class', 'Classe'], ['class_abilities', 'Habilidades de Classe', true]] }] },
      { n: 'Inventário', pecas: [{ tipo: 'texto', campos: [['equipment', 'Equipamento', true]] }, { tipo: 'armas' }] },
    ],
  },

  // ─── 2d6 e jornadas ───
  // components/character/sheets/DungeonWorldSheet.tsx
  'Dungeon World': {
    familia: 'pbta', regra: 'dw', linha: ['race_notes', 'alignment'], semPvFicha: true,
    atributos: { tipo: 'tiles', sel: { nomes: D6 }, mostra: 'mod' },
    trilhas: [{ n: 'Pontos de vida', forma: 'bar', fonte: { tf: 'hp_current', label: 'PV Atual' }, max: { attr: ['Pontos de Vida'] } }],
    pilulas: [{ l: 'Dano', attr: ['Dano Base', 'Dano'] }, { l: 'Armadura', tf: 'armor_value' }, { l: 'XP', attr: ['XP'] }],
    secoes: [
      { n: 'Moves da Classe', pecas: [{ tipo: 'texto', campos: [['class_moves', 'Moves da Classe', true]] }] },
      { n: 'Vínculos (Bonds)', pecas: [{ tipo: 'texto', campos: [['bonds_list', 'Vínculos (Bonds)', true]] }] },
      { n: 'Estado', pecas: [{ tipo: 'texto', campos: [['hp_current', 'PV Atual'], ['armor_value', 'Armadura Total'], ['conditions', 'Condições / Deformidades', true]] }, { tipo: 'linhas', grupos: [{ sel: { nomes: ['Pontos de Vida', 'Armadura', 'Dano Base', 'XP'] } }] }] },
      { n: 'Inventário', pecas: [{ tipo: 'armas' }] },
      { n: 'Alinhamento', pecas: [{ tipo: 'texto', campos: [['alignment', 'Alinhamento'], ['race_notes', 'Raça / Traço de Raça'], ['background', 'Histórico', true]] }] },
    ],
  },
  // components/character/sheets/IronswornSheet.tsx
  'Ironsworn': {
    familia: 'pbta', regra: 'isw', linha: [],
    atributos: { tipo: 'tiles', sel: { nomes: ['Edge', 'Heart', 'Iron', 'Shadow', 'Wits'] }, mostra: 'sinal' },
    trilhas: [{ n: 'Momentum', forma: 'momentum', fonte: { attr: ['Momentum'] } }, bola('Health', ['Health'], 5), bola('Spirit', ['Spirit'], 5), bola('Supply', ['Supply'], 5)],
    pilulas: [],
    secoes: [
      { n: 'Juras', pecas: [1, 2, 3, 4, 5].map(i => ({ tipo: 'jura' as const, i })) },
      { n: 'Assets', pecas: [{ tipo: 'texto', campos: [['asset1', 'Asset 1', true], ['asset2', 'Asset 2', true], ['asset3', 'Asset 3', true]] }] },
      { n: 'Vínculos (Bonds)', pecas: [{ tipo: 'texto', campos: [['bonds_list', 'Vínculos (Bonds)', true]] }] },
      { n: 'Condições', pecas: [{ tipo: 'marcas', l: 'Condições', itens: [['condition_wounded', 'Ferido'], ['condition_shaken', 'Abalado'], ['condition_unprepared', 'Despreparado'], ['condition_encumbered', 'Sobrecarregado']] }] },
      { n: 'Notas', pecas: [{ tipo: 'texto', campos: [['background', 'Histórico', true]] }] },
    ],
  },

  // ─── Narrativos ───
  // components/character/sheets/FateCoreSheet.tsx
  'Fate Core': {
    familia: 'narr', regra: 'fate', linha: ['highConcept'],
    atributos: { tipo: 'tiles', sel: { todos: true }, mostra: 'sinal' },
    trilhas: [
      { n: 'Estresse físico', forma: 'marcadas', tf: 'physicalStress', label: 'Estresse físico', max: c => estresseFate(c.attr(['Vigor', 'Físico', 'Physique'])) },
      { n: 'Estresse mental', forma: 'marcadas', tf: 'mentalStress', label: 'Estresse mental', max: c => estresseFate(c.attr(['Vontade', 'Will'])) },
    ],
    pilulas: [],
    secoes: [
      { n: 'Aspectos', pecas: [{ tipo: 'texto', campos: [['highConcept', 'Conceito Principal'], ['trouble', 'Problema'], ['aspect3', 'Aspecto Livre 1'], ['aspect4', 'Aspecto Livre 2'], ['aspect5', 'Aspecto Livre 3']] }] },
      { n: 'Façanhas', pecas: [{ tipo: 'texto', campos: [1, 2, 3, 4, 5].map(i => [`stunt${i}`, `Façanha ${i}`, true] as [string, string, boolean]) }] },
      { n: 'Consequências', pecas: [{ tipo: 'texto', campos: [['consMild', 'Leve (2)'], ['consModerate', 'Moderada (4)'], ['consSevere', 'Grave (6)'], ['consExtreme', 'Extrema (8)']] }] },
      { n: 'Notas', pecas: [{ tipo: 'texto', campos: [['notes', 'Notas', true]] }] },
    ],
  },
  // components/character/sheets/BitDSheet.tsx
  'Blades in the Dark': {
    familia: 'narr', regra: 'bitd', linha: ['playbook', 'heritage'],
    atributos: { tipo: 'bolinhas', grupos: [{ l: 'Insight', sel: { nomePrefixo: ['Insight'] } }, { l: 'Prowess', sel: { nomePrefixo: ['Prowess'] } }, { l: 'Resolve', sel: { nomePrefixo: ['Resolve'] } }], max: 4 },
    trilhas: [bola('Estresse', ['Stress', 'Estresse'], 9, 'Ao chegar em 9, um Trauma'), bola('Trauma', ['Trauma'], 4)],
    pilulas: [{ l: 'Carga', tf: 'load' }, { l: 'Vício', tf: 'vice' }],
    secoes: [
      { n: 'Playbook', pecas: [{ tipo: 'texto', campos: [['playbook', 'Playbook'], ['specialAbils', 'Habilidades Especiais', true]] }] },
      { n: 'Herança', pecas: [{ tipo: 'texto', campos: [['heritage', 'Herança'], ['background', 'Background'], ['alias', 'Alias']] }] },
      { n: 'Vício', pecas: [{ tipo: 'texto', campos: [['vice', 'Vício'], ['vicePurveyor', 'Fornecedor do Vício']] }] },
      { n: 'Dano', pecas: [{ tipo: 'texto', campos: [['harm1a', 'Dano Menor 1'], ['harm1b', 'Dano Menor 2'], ['harm2a', 'Dano Moderado 1'], ['harm2b', 'Dano Moderado 2'], ['harm3', 'Dano Grave'], ['harm4', 'Fatal'], ['trauma', 'Traumas', true]] }] },
      { n: 'Contatos', pecas: [{ tipo: 'texto', campos: [['contacts', 'Contatos', true]] }] },
      { n: 'Armadura', pecas: [{ tipo: 'texto', campos: [['load', 'Carga']] }, { tipo: 'armas' }] },
      { n: 'Notas', pecas: [{ tipo: 'texto', campos: [['notes', 'Notas', true]] }] },
    ],
  },

  // ─── Paradas e monitores ───
  // components/character/sheets/Shadowrun6eSheet.tsx
  'Shadowrun 6e': {
    familia: 'pool', regra: 'sr', linha: ['metatype'], outrosNome: 'Perícias Ativas',
    atributos: { tipo: 'tiles', sel: { nomes: ['Corpo', 'Agilidade', 'Reação', 'Força', 'Vontade', 'Lógica', 'Intuição', 'Carisma'] }, mostra: 'valor' },
    trilhas: [
      { n: 'Monitor físico', forma: 'box', fonte: { tf: 'physical_damage', label: 'Monitor Físico' }, max: c => 8 + Math.ceil((c.attr(['Corpo']) ?? 0) / 2), sangue: true },
      { n: 'Monitor mental', forma: 'box', fonte: { tf: 'mental_damage', label: 'Monitor Mental' }, max: c => 8 + Math.ceil((c.attr(['Vontade']) ?? 0) / 2), sangue: true },
      { n: 'Edge', forma: 'dot', fonte: { tf: 'edge_current', label: 'Atual' }, max: c => c.attr(['Edge']) ?? 7 },
    ],
    pilulas: [{ l: 'Essência', attr: ['Essência'] }, { l: 'Karma', tf: 'karma_current' }, { l: 'Nuyen', tf: 'nuyen' }],
    secoes: [
      { n: 'Recursos Especiais', pecas: [{ tipo: 'linhas', grupos: [{ sel: { nomes: ['Essência', 'Magia', 'Resonância', 'Edge'] } }] }] },
      { n: 'Karma Total', pecas: [{ tipo: 'texto', campos: [['karma_current', 'Karma Atual'], ['karma_total', 'Karma Total'], ['nuyen', 'Nuyen']] }] },
      { n: 'Cyberware', pecas: [{ tipo: 'texto', campos: [['cyberware', 'Cyberware/Bioware', true], ['qualities', 'Qualidades', true]] }] },
      { n: 'Inventário', pecas: [{ tipo: 'armas' }] },
      { n: 'Notas', pecas: [{ tipo: 'texto', campos: [['metatype', 'Metatipo'], ['contacts', 'Contatos', true]] }] },
    ],
  },
  // components/character/sheets/CyberpunkRedSheet.tsx
  'Cyberpunk Red': {
    familia: 'pool', regra: 'cpr', linha: ['role', 'origin'], outrosNome: 'Perícias',
    atributos: { tipo: 'tiles', sel: { nomes: ['Inteligência', 'Reflexos', 'Destreza', 'Habilidade Técnica', 'Cool', 'Força de Vontade', 'Sorte', 'Movimento', 'Corpo', 'Empatia'] }, mostra: 'valor' },
    trilhas: [{ n: 'Humanidade', forma: 'num', fonte: { tf: 'humanity_current', label: 'Humanidade' }, max: c => (c.attr(['Empatia']) ?? 0) * 10 || 100 }],
    pilulas: [{ l: 'Reputação', tf: 'reputation' }],
    secoes: [
      { n: 'Habilidade de Papel', pecas: [{ tipo: 'texto', campos: [['role', 'Papel (Role)'], ['role_ability', 'Habilidade de Papel', true]] }] },
      { n: 'Cyberware', pecas: [{ tipo: 'texto', campos: [['cyberware_list', 'Cyberware', true]] }] },
      { n: 'Armadura', pecas: [{ tipo: 'texto', campos: [['armor_head_sp', 'Cabeça · SP'], ['armor_head_pen', 'Cabeça · Penalidade'], ['armor_body_sp', 'Corpo · SP'], ['armor_body_pen', 'Corpo · Penalidade']] }, { tipo: 'armas' }] },
      { n: 'Reputação', pecas: [{ tipo: 'texto', campos: [['reputation', 'Reputação'], ['xp_current', 'XP Atual'], ['xp_total', 'XP Total']] }] },
      { n: 'Notas', pecas: [{ tipo: 'texto', campos: [['origin', 'Origens'], ['family', 'Família', true], ['friends_enemies', 'Amigos e Inimigos', true], ['style', 'Estilo']] }] },
    ],
  },
  // components/character/sheets/StarWarsSheet.tsx
  'Star Wars: Edge of the Empire': {
    familia: 'pool', regra: 'sw', linha: ['species', 'career'], outrosNome: 'Perícias',
    atributos: { tipo: 'tiles', sel: { nomes: ['Vigor', 'Agilidade', 'Intelecto', 'Astúcia', 'Força de Vontade', 'Presença'] }, mostra: 'valor' },
    trilhas: [
      { n: 'Ferimentos', forma: 'box', fonte: { tf: 'wounds_current', label: 'Ferimentos' }, max: { attr: ['Ferimento Limiar', 'Wound Threshold'] }, sangue: true },
      { n: 'Tensão', forma: 'box', fonte: { tf: 'strain_current', label: 'Tensão' }, max: { attr: ['Tensão Limiar', 'Strain Threshold'] } },
    ],
    pilulas: [{ l: 'Obrigação', tf: 'obligation_magnitude' }, { l: 'Destino (luz)', tf: 'destiny_light' }, { l: 'Destino (trevas)', tf: 'destiny_dark' }],
    secoes: [
      { n: 'Tipo de Obrigação', pecas: [{ tipo: 'texto', campos: [['obligation_type', 'Tipo de Obrigação'], ['obligation_magnitude', 'Magnitude']] }] },
      { n: 'Perícias de Combate', pecas: [{ tipo: 'linhas', grupos: [{ sel: { prefixo: ['Perícia Combate'] } }] }, { tipo: 'armas' }] },
      { n: 'Carreira', pecas: [{ tipo: 'texto', campos: [['career', 'Carreira'], ['specialization', 'Especialização'], ['species', 'Espécie']] }] },
      { n: 'Notas', pecas: [{ tipo: 'texto', campos: [['destiny_light', 'Destino Luz'], ['destiny_dark', 'Destino Trevas'], ['xp_current', 'XP Atual'], ['xp_total', 'XP Total'], ['background', 'Background', true]] }] },
    ],
  },

  // ─── Passos e pontos ───
  // components/character/sheets/SavageWorldsSheet.tsx
  'Savage Worlds': {
    familia: 'step', regra: 'savage', linha: ['race'], outrosNome: 'Perícias',
    atributos: { tipo: 'tiles', sel: { nomes: ['Agilidade', 'Astúcia', 'Espírito', 'Força', 'Vigor'] }, mostra: 'dado' },
    trilhas: [
      { n: 'Bennies', forma: 'dot', fonte: { tf: 'bennies', label: 'Bennies' }, max: 5, d: 'Rerrolar ou absorver' },
      { n: 'Ferimentos', forma: 'box', fonte: { tf: 'wounds_current', label: 'Ferimentos' }, max: 3, d: '−1 por ferimento', sangue: true },
      { n: 'Fadiga', forma: 'box', fonte: { tf: 'fatigue_current', label: 'Fadiga' }, max: 2 },
    ],
    pilulas: [{ l: 'Dado selvagem', attr: ['Wild Die'] }, { l: 'XP', tf: 'xp_current' }],
    secoes: [
      { n: 'Vantagens (Edges)', pecas: [{ tipo: 'texto', campos: [['edges', 'Vantagens (Edges)', true], ['hindrances', 'Impedimentos (Hindrances)', true]] }] },
      { n: 'Poderes Arcanos', pecas: [{ tipo: 'texto', campos: [['powers_list', 'Poderes Arcanos', true]] }] },
      { n: 'Inventário', pecas: [{ tipo: 'armas' }] },
      { n: 'Raça', pecas: [{ tipo: 'texto', campos: [['race', 'Raça'], ['xp_current', 'XP']] }] },
    ],
  },
  // components/character/sheets/GURPSSheet.tsx
  'GURPS 4e': {
    familia: 'step', regra: 'gurps', linha: [],
    atributos: { tipo: 'tiles', sel: { nomes: ['Força', 'Destreza', 'Inteligência', 'Saúde'] }, mostra: 'valor' },
    trilhas: [],
    pilulas: [{ l: 'Pontos', tf: 'points_total' }, { sel: { nomes: ['Pontos de Vida', 'Vontade', 'Percepção', 'Fadiga'] } }],
    secoes: [
      { n: 'Vantagens', pecas: [{ tipo: 'texto', campos: [['advantages', 'Vantagens', true]] }] },
      { n: 'Desvantagens e Quirks', pecas: [{ tipo: 'texto', campos: [['disadvantages', 'Desvantagens', true]] }] },
      { n: 'Perícias', pecas: [{ tipo: 'texto', campos: [['skills_list', 'Perícias', true]] }] },
      { n: 'Defesas Ativas', pecas: [{ tipo: 'linhas', grupos: [{ sel: { nomes: ['Pontos de Vida', 'Vontade', 'Percepção', 'Fadiga'] } }] }] },
      { n: 'Inventário', pecas: [{ tipo: 'armas' }] },
      { n: 'Notas', pecas: [{ tipo: 'texto', campos: [['points_total', 'Pontos Totais'], ['points_spent', 'Pontos Gastos'], ['background', 'Histórico', true]] }] },
    ],
  },
}
// Nome antigo do V20 no seed.
SPECS['Vampire: The Masquerade'] = SPECS['Vampire: The Masquerade V20']!
