/**
 * Links entre as telas do design (`href="SAGA X.dc.html?q"`) → rotas do app.
 * Telas que dependem de contexto (campanha, personagem, sessão) recebem os
 * ids em `ctx`; sem eles, caem na listagem mais próxima.
 */
export type DcCtx = { campaignId?: string; characterId?: string; sessionId?: string; npcId?: string }

export function dcHref(link: string, ctx: DcCtx = {}): string {
  const [file, query = ''] = link.split('?')
  const q = query ? `?${query}` : ''
  const c = ctx.campaignId
  switch (file.replace(/\.dc\.html$/, '')) {
    case 'SAGA Landing': return `/${q}`
    case 'SAGA Login': return `/login${q}`
    case 'SAGA Termos e Privacidade': return query.includes('privacidade') ? '/privacidade' : '/termos'
    case 'SAGA Inicio v2': return `/dashboard${q}`
    case 'SAGA Primeiros Passos': return '/dashboard?tour=1'
    case 'SAGA Campanhas': return `/campanhas${q}`
    case 'SAGA Nova Campanha': return `/campanhas/nova${q}`
    case 'SAGA Convite': return `/convite${q}`
    case 'SAGA Painel do Mestre': return c ? `/campaign/${c}${q}` : '/campanhas'
    case 'SAGA Mesa': return c ? `/campaign/${c}/mesa` : '/campanhas'
    case 'SAGA Membros': return c ? `/campaign/${c}/members` : '/campanhas'
    case 'SAGA NPCs': return c ? `/campaign/${c}/npcs${ctx.npcId ? `/${ctx.npcId}` : ''}` : '/campanhas'
    case 'SAGA Sessao': return c && ctx.sessionId ? `/campaign/${c}/sessions/${ctx.sessionId}` : c ? `/campaign/${c}?aba=sessoes` : '/campanhas'
    case 'SAGA Personagens': return `/personagens${q}`
    case 'SAGA Criar Personagem': return `/personagens/novo${q}`
    case 'SAGA Importar Ficha': return '/personagens?importar=1'
    case 'SAGA Ficha':
    case 'SAGA Fichas por Sistema': return ctx.characterId ? `/personagens/${ctx.characterId}` : '/personagens'
    case 'SAGA Ficha Publica': return ctx.characterId ? `/ficha/${ctx.characterId}` : '/personagens'
    case 'SAGA Explorar': return `/explorar${q}`
    case 'SAGA Sistemas': return `/sistemas${q}`
    case 'SAGA Criar Sistema': return `/sistemas/novo${q}`
    case 'SAGA Perfil': return `/perfil${q}`
    case 'SAGA Seguranca': return '/perfil/seguranca'
    case 'SAGA Mensagens': return `/mensagens${q}`
    default: return '/'
  }
}
