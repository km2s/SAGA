/** Rótulos dos campos de campanha gravados pelo app (CreateCampaignModal / Nova Campanha). */
export const FREQ_LABEL: Record<string, string> = { weekly: 'Semanal', biweekly: 'Quinzenal', monthly: 'Mensal', sporadic: 'Esporádico' }

/** "Semanal" / "One-shot"; o dia e a hora entram quando existir agendamento (TODO(api)). */
export function freqLabel(campaignType: string, sessionFrequency: string | null): string {
  if (campaignType === 'oneshot') return 'One-shot'
  return (sessionFrequency && FREQ_LABEL[sessionFrequency]) || ''
}

/** "mar/26" */
export function mesAno(d: Date): string {
  return `${d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}/${String(d.getFullYear()).slice(2)}`
}

/** Presença: o heartbeat é a cada 20 s; 60 s sem sinal = offline. */
export const ONLINE_MS = 60_000
