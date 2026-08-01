// Logging estruturado de eventos de segurança.
// Em desenvolvimento: vai para console.
// Em produção: pode ser direcionado para Sentry, Datadog ou Vercel Logs
// sem mudar o código dos endpoints.

export type SecurityEventType =
  | 'auth.unauthorized'       // 401 — acesso sem sessão
  | 'auth.forbidden'          // 403 — sessão válida mas sem permissão
  | 'auth.invalid_input'      // 400 em campo de segurança
  | 'rate_limit.exceeded'     // 429
  | 'api.import_used'         // Chamada paga à Anthropic
  | 'api.import_failed'       // Falha no import (arquivo inválido, prompt injection)
  | 'campaign.applied'        // Inscrição em campanha
  | 'session.started'         // Sessão iniciada
  | 'session.ended'           // Sessão encerrada
  | 'input.validation_failed' // Input rejeitado por validação

interface LogPayload {
  event: SecurityEventType
  userId?: string
  campaignId?: string
  path?: string
  details?: Record<string, unknown>
}

export function logSecurity(payload: LogPayload): void {
  const entry = {
    ...payload,
    ts: new Date().toISOString(),
    svc: 'saga-web',
  }
  // Produção: substituir por integração com Sentry/Datadog/etc.
  if (process.env.NODE_ENV !== 'test') {
    console.log('[SECURITY]', JSON.stringify(entry))
  }
}
