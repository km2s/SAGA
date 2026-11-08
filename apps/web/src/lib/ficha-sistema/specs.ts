import type { SistemaSpec } from './spec'

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
}
