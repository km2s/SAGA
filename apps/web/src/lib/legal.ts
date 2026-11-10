/**
 * Termos de Uso e Política de Privacidade (SAGA Termos e Privacidade).
 * Títulos, resumos e "cover" de cada seção vêm do design. O texto jurídico,
 * a vigência, a versão e o contato são da Karine: enquanto estiverem `null`,
 * a tela mostra o marcador tracejado do design.
 * TODO(conteúdo): preencher antes de publicar — o handoff proíbe ir ao ar com marcador.
 */

export type LegalDoc = 'termos' | 'privacidade'

export const LEGAL_META: { vigencia: string | null; versao: string | null; contato: string | null } = {
  vigencia: null,
  versao: null,
  contato: null,
}

type Secao = { t: string; cover: string; texto: string[] | null }

export const LEGAL_DOCS: Record<LegalDoc, { t: string; cap: string; lead: string; secs: Secao[] }> = {
  termos: {
    t: 'Termos de Uso', cap: 'A',
    lead: 'o criar uma conta no Saga, você concorda com as regras desta mesa. Aqui fica o que cabe a você, o que cabe a nós e o que acontece com aquilo que você escreve.',
    secs: [
      { t: 'Aceitação dos termos', cover: 'Quem pode usar o Saga e o que significa aceitar.', texto: null },
      { t: 'Conta e acesso', cover: 'Entrada por Discord, Google ou e-mail; responsabilidade pela conta.', texto: null },
      { t: 'Seu conteúdo', cover: 'Fichas, sistemas, campanhas, notas e imagens: de quem são e o que o Saga pode fazer com eles.', texto: null },
      { t: 'Sistemas da comunidade', cover: 'Publicar, clonar e editar sistemas de outras pessoas.', texto: null },
      { t: 'Conduta na Taverna', cover: 'Inscrições em mesas abertas, mensagens e respeito entre jogadores.', texto: null },
      { t: 'Bot do Discord', cover: 'O que o bot faz no seu servidor e como removê-lo.', texto: null },
      { t: 'Importação com IA', cover: 'Limites da extração automática de fichas em PDF e HTML.', texto: null },
      { t: 'Suspensão e encerramento', cover: 'Quando uma conta pode ser suspensa e como apagar a sua.', texto: null },
      { t: 'Mudanças nestes termos', cover: 'Como avisamos quando algo mudar.', texto: null },
    ],
  },
  privacidade: {
    t: 'Política de Privacidade', cap: 'S',
    lead: 'eus dados existem para a mesa funcionar, não para outra coisa. Esta política lista o que o Saga guarda, por quanto tempo e como você pede para apagar.',
    secs: [
      { t: 'Dados que coletamos', cover: 'Perfil do Discord (ID, nome de usuário, avatar), e-mail quando usado, campanhas, fichas e rolagens.', texto: null },
      { t: 'Como usamos os dados', cover: 'Entrar, montar a mesa, mostrar quem está na campanha e registrar rolagens.', texto: null },
      { t: 'Presença online', cover: 'Sinal de “online” enviado a cada 20 s enquanto você está numa campanha.', texto: null },
      { t: 'Arquivos enviados à IA', cover: 'PDFs e HTMLs de fichas são lidos por um serviço de IA para extrair atributos.', texto: null },
      { t: 'Fichas públicas', cover: 'O que aparece para qualquer pessoa com o link quando você publica uma ficha.', texto: null },
      { t: 'Armazenamento no navegador', cover: 'Preferências locais, como o tema claro ou escuro.', texto: null },
      { t: 'Retenção e exclusão', cover: 'Por quanto tempo guardamos e como apagar sua conta.', texto: null },
      { t: 'Seus direitos (LGPD)', cover: 'Acesso, correção, portabilidade e exclusão.', texto: null },
      { t: 'Contato do encarregado', cover: 'Quem responde por dados pessoais no Saga.', texto: null },
    ],
  },
}
