<#
  Regenera os Template.tsx das telas do redesign a partir do handoff e
  reaplica os ajustes feitos à mão (textos de demonstração ligados a dados
  reais, marcadores do tour). Rode depois de mudar o conversor ou o design.

  Uso: pwsh scripts/dc-gerar.ps1 [-Only inicio,convite]
#>
param([string[]] $Only = @())
$ErrorActionPreference = 'Stop'
$Only = @($Only | ForEach-Object { $_ -split ',' } | Where-Object { $_ })
$root = Split-Path -Parent $PSScriptRoot
$design = Join-Path $root 'Saga NOVO\handoff-claude-code\design'
$screens = Join-Path $root 'apps\web\src\components\screens'
$O = [StringComparison]::Ordinal

function Gen([string]$file, [string]$prefix, [string[]]$skip = @()) {
  $args = @('-NoProfile', '-File', (Join-Path $PSScriptRoot 'dc-to-jsx.ps1'), '-In', (Join-Path $design "$file.dc.html"), '-OutDir', (Join-Path $screens $prefix), '-Prefix', $prefix)
  if ($skip.Count) { $args += @('-SkipFirst', ($skip -join ',')) }
  $out = & pwsh @args
  $out | Where-Object { $_ -match '^\s+- ' -and $_ -notmatch 'animation dinâmica' } | ForEach-Object { Write-Host "[$prefix] $_" }
  return (Join-Path $screens "$prefix\Template.tsx")
}
function Edit([string]$path, [scriptblock]$fn, [string]$nota) {
  $c = [IO.File]::ReadAllText($path)
  $c = & $fn $c
  $c = $c.Replace('lógica em vals.ts. */', "lógica em vals.ts.`n   Ajustado à mão (scripts/dc-gerar.ps1): $nota */")
  [IO.File]::WriteAllText($path, $c)
}
function Rep([string]$c, [string]$a, [string]$b) {
  $n = ([regex]::Matches($c, [regex]::Escape($a))).Count
  if ($n -ne 1) { throw "esperava 1 ocorrência, achei ${n}: $a" }
  return $c.Replace($a, $b)
}
# Envolve o elemento <tag> que contém `anchor` (o mais próximo antes dele) em {cond && (...)}.
# A tag que começa em $at termina em "/>"? (lê até o '>' fora de chaves: props podem ter "=>")
function IsSelfClosing([string]$c, [int]$at) {
  $b = 0
  for ($k = $at; $k -lt $c.Length; $k++) {
    $ch = $c[$k]
    if ($ch -eq '{') { $b++ } elseif ($ch -eq '}') { $b-- }
    elseif ($ch -eq '>' -and $b -eq 0) { return $c[$k - 1] -eq '/' }
  }
  return $false
}
# $up: quantos <tag> subir a partir do mais próximo (só vale sem outros <tag> no meio).
function WrapEnclosing([string]$c, [string]$anchor, [string]$tag, [string]$cond, [int]$up = 0) {
  $i = $c.IndexOf($anchor, $O); if ($i -lt 0) { throw "âncora não achada: $anchor" }
  $s = $c.LastIndexOf("<$tag", $i, $O)
  for ($k = 0; $k -lt $up; $k++) { $s = $c.LastIndexOf("<$tag", $s - 1, $O) }
  $depth = 0; $p = $s
  while ($true) {
    $nOpen = $c.IndexOf("<$tag", $p + 1, $O); $nClose = $c.IndexOf("</$tag>", $p + 1, $O)
    if ($nOpen -ge 0 -and $nOpen -lt $nClose) {
      $p = $nOpen
      if (-not (IsSelfClosing $c $nOpen)) { $depth++ }
      continue
    }
    if ($depth -eq 0) { $e = $nClose + "</$tag>".Length; break }
    $depth--; $p = $nClose
  }
  return $c.Substring(0, $s) + "{$cond && (" + $c.Substring($s, $e - $s) + ')}' + $c.Substring($e)
}
# Texto do elemento <tag> que contém `anchor` (mesma regra de WrapEnclosing).
function Enclosing([string]$c, [string]$anchor, [string]$tag) {
  $marca = '@@ENC@@'
  $w = WrapEnclosing $c $anchor $tag $marca
  $abre = "{$marca && ("
  $i = $w.IndexOf($abre, $O)
  $s = $i + $abre.Length
  # O envoltório fecha num ')}' depois do elemento; o certo é o que, tirado, devolve o texto original.
  $fimW = $w.IndexOf(')}', $s, $O)
  while ($fimW -ge 0) {
    $cand = $w.Substring($s, $fimW - $s)
    if (($w.Substring(0, $i) + $cand + $w.Substring($fimW + 2)) -eq $c) { return $cand }
    $fimW = $w.IndexOf(')}', $fimW + 1, $O)
  }
  throw "elemento não achado: $anchor"
}
function AddAttr([string]$c, [string]$anchor, [string]$tag, [string]$attr) {
  $i = $c.IndexOf($anchor, $O); if ($i -lt 0) { throw "âncora não achada: $anchor" }
  $s = $c.LastIndexOf("<$tag", $i, $O)
  return $c.Substring(0, $s + $tag.Length + 1) + " $attr" + $c.Substring($s + $tag.Length + 1)
}
$want = { param($k) $Only.Count -eq 0 -or $Only -contains $k }

if (& $want 'landing') { Gen 'SAGA Landing' 'landing' | Out-Null }

if (& $want 'inicio') {
  $p = Gen 'SAGA Inicio v2' 'inicio' @('header')
  Edit $p {
    param($c)
    $c = Rep $c '>Quarta-feira, 8 de outubro · Anno MMXXVI</p>' '>{v.dataLonga}</p>'
    $c = Rep $c '>B</span><span' '>{v.saudacaoCap}</span><span'
    $c = Rep $c '>oa noite, Kael</span>' '>{v.saudacaoResto}</span>'
    $c = Rep $c '>A Ponte em Chamas</h2>' '>{v.aoVivo.titulo}</h2>'
    $c = Rep $c '>A Queda de Valdris · Sessão XII · combate em andamento, turno 2</p>' '>{v.aoVivo.sub}</p>'
    $c = Rep $c "<Link href={v.`$href('SAGA Mesa.dc.html')}" '<Link href={v.aoVivo.mesa}'
    $c = Rep $c "(<Link key={cIdx} href={v.`$href('SAGA Campanhas.dc.html')}" '(<Link key={cIdx} href={c.href}'
    $c = Rep $c "{c.sys}{' · '}{c.prog}" '{c.sysProg}'
    $c = WrapEnclosing $c '{v.timer}' 'section' 'v.aoVivo'
    $c = Rep $c "<Link href={v.`$href('SAGA Nova Campanha.dc.html')}" "<Link data-tour=`"nova`" href={v.`$href('SAGA Nova Campanha.dc.html')}"
    $c = AddAttr $c 'v.filtros' 'section' 'data-tour="camps"'
    $c = AddAttr $c 'v.dice.map' 'section' 'data-tour="dice"'
    $c
  } 'textos de demonstração ligados a dados reais; bloco ao vivo só com sessão ativa; alvos do tour (data-tour).'
}

if (& $want 'tour') { Gen 'SAGA Primeiros Passos' 'tour' @('header', 'main') | Out-Null }
if (& $want 'campanhas') { Gen 'SAGA Campanhas' 'campanhas' | Out-Null }

if (& $want 'convite') {
  $p = Gen 'SAGA Convite' 'convite'
  Edit $p {
    param($c)
    WrapEnclosing $c 'Recebidos no Discord' 'div' 'v.recent.length > 0'
  } "'Recebidos no Discord' só aparece com códigos recebidos."
}
if (& $want 'novacampanha') { Gen 'SAGA Nova Campanha' 'novacampanha' | Out-Null }
if (& $want 'painel') {
  $p = Gen 'SAGA Painel do Mestre' 'painel'
  Edit $p {
    param($c)
    $c = Rep $c '>A Queda de Valdris</h1>' '>{v.campanha}</h1>'
    $c = Rep $c "{'D&D 5e · Semanal · quartas, 20h · '}" '{v.heroLine}'
    $c = Rep $c '>Lembretes e rolagens em #a-queda-de-valdris · Taverna do Javali</p>' '>{v.botLine}</p>'
    $c = Rep $c '>Modelo de ficha: D&D 5e (pré-definido)</p>' '>{v.modeloLine}</p>'
    $c = Rep $c "<Link href={v.`$href('SAGA Criar Sistema.dc.html')}" '<Link href={v.modeloHref}'
    $c = Rep $c "<Link href={v.`$href('SAGA Sessao.dc.html')}" '<Link href={p.href}'
    # Aba Mapas: o <dc-import name="SagaMapas"> do design vira o componente real.
    $c = Rep $c "border: '1px solid var(--line)' }}></section><aside style={{ flex: '1 1 260px', maxWidth: '340px'" "border: '1px solid var(--line)' }}><SagaMapas {...v.mapasProps} /></section><aside style={{ flex: '1 1 260px', maxWidth: '340px'"
    Rep $c "import type { Vals } from './vals'" "import type { Vals } from './vals'`nimport { SagaMapas } from '@/components/screens/sagamapas/SagaMapas'"
  } 'nome, linha do topo, bot e modelo de ficha com dados da campanha; resumo por sessão; aba Mapas com o SagaMapas.'
}
if (& $want 'personagens') {
  $p = Gen 'SAGA Personagens' 'personagens'
  Edit $p {
    param($c)
    $c = WrapEnclosing $c 'v.$img(v.sel.slot)' 'aside' 'v.temSel'
    Rep $c "<Link href={v.`$href('SAGA Painel do Mestre.dc.html?aba=npcs')}" '<Link href={g.href}'
  } 'painel do personagem só com personagem; link do grupo para o Painel daquela campanha.'
}
if (& $want 'criarpersonagem') {
  $p = Gen 'SAGA Criar Personagem' 'criarpersonagem'
  Edit $p {
    param($c)
    $c = Rep $c '>D&D 5e</p>' '>{v.sistemaNome}</p>'
    Rep $c '>Livro do Jogador · ficha completa com rolagens</p>' '>{v.sistemaLinha}</p>'
  } 'cartão do sistema mostra o sistema da campanha escolhida.'
}
if (& $want 'ficha') {
  $p = Gen 'SAGA Ficha' 'ficha'
  Edit $p {
    param($c)
    $c = Rep $c ">A</span><ImageSlot src={v.`$img('pers-retrato-2')} />" ">{v.init}</span><ImageSlot src={v.`$img('retrato')} />"
    $c = Rep $c '>D&D 5e · Sem campanha</p>' '>{v.sysCamp}</p>'
    $c = Rep $c '>Sir Aldric de Vernay</h1>' '>{v.nome}</h1>'
    $c = Rep $c '>Humano · Paladino (Juramento de Devoção) · Nível 3 · Acólito · Leal e Bom</p>' '>{v.linha}</p>'
    $c = WrapEnclosing $c '{v.xp}' 'div' 'v.temXp'
    $c = Rep $c '>+0</p>' '>{v.ini}</p>'
    $c = WrapEnclosing $c '>Destruição Divina no próximo dano<' 'div' 'v.isPaladino' 1
    $c = WrapEnclosing $c '>Cura pelas Mãos</p>' 'div' 'v.isPaladino'
    $c = Rep $c '>/ 15</span>' '>/ {v.lohMax}</span>'
    $c = Rep $c '>Espaços de 1º círculo<' '>{v.slotsTitulo}<'
    $c = Rep $c '>Percepção passiva 11 · Intuição passiva 13<' '>{v.passivas}<'
    # Inventário, moedas e XP (SAGA Ficha Inventario): peças de components/inventario.
    $c = Rep $c "{v.xp}{' XP'}" '{v.inv.xpLine}'
    $c = Rep $c 'width: `${v.xpPct}%`' 'width: `${v.inv.xpPct}%`'
    $c = Rep $c '>2.700 · Nv 4</span>' '>{`Nível ${v.inv.lvl}`}</span>'
    $c = Rep $c '<button onClick={v.toggleInsp}' '<XpBotao v={v.inv} /><button onClick={v.toggleInsp}'
    $c = Rep $c '{v.tMain && (' '<XpNivel v={v.inv} />{v.tMain && ('
    $i = $c.IndexOf('{v.tInv && (', $O); $fim = $c.IndexOf('{v.tFeat && (', $O)
    if ($i -lt 0 -or $fim -lt $i) { throw 'aba Inventário não achada' }
    $c = $c.Substring(0, $i) + "{v.tInv && (<div style={{ marginTop: '20px', animation: 'ficha-up .35s both' }}><Inventario v={v.inv} /></div>)}" + $c.Substring($fim)
    $c = Rep $c "import type { Vals } from './vals'" "import type { Vals } from './vals'`nimport { Inventario, XpBotao, XpNivel } from '@/components/inventario/Inventario'"
    Rep $c '>Diário de Aldric<' '>{v.diarioTitulo}<'
  } 'cabeçalho, passivas e notas com dados da ficha; Destruição Divina e Cura pelas Mãos só para Paladino; XP, inventário e bolsa pelas peças de components/inventario.'
}
if (& $want 'fichainventario') {
  # Não é tela: fonte das peças de components/inventario (scripts/recortar-inventario.js).
  $t = Gen 'SAGA Ficha Inventario' 'fichainventario' @('header')
  & node (Join-Path $PSScriptRoot 'recortar-inventario.js')
  # Só o CSS fica (as peças importam); o Template inteiro não compila sem tela.
  Remove-Item $t
}
if (& $want 'fichapersonalizada') {
  $p = Gen 'SAGA Ficha Personalizada' 'fichapersonalizada' @('header')
  Edit $p {
    param($c)
    $c = Rep $c "v.`$href('SAGA Personagens.dc.html')" 'v.voltarHref'
    $c = Rep $c ">N</span><ImageSlot src={v.`$img('fp-retrato')} />" ">{v.init}</span><ImageSlot src={v.img} />"
    $c = Rep $c '>Crônicas de Arton (Homebrew)<' '>{v.sistema}<'
    $c = Rep $c '>sistema da comunidade · por Kael<' '>{v.autorLine}<'
    $c = Rep $c '>Nyra das Areias<' '>{v.nome}<'
    $c = Rep $c '>Andarilha do deserto · A Queda de Valdris<' '>{v.linha}<'
    $c = WrapEnclosing $c '>Perícias<' 'section' 'v.temPericias'
    # Aba Inventário: a mesma peça da Ficha de D&D, sem CA.
    $i = $c.IndexOf('{v.tInv && (', $O); $fim = $c.IndexOf('{v.tNotes && (', $O)
    if ($i -lt 0 -or $fim -lt $i) { throw 'aba Inventário não achada' }
    $c = $c.Substring(0, $i) + "{v.tInv && (<div style={{ marginTop: '18px' }}><Inventario v={v.inv} /></div>)}" + $c.Substring($fim)
    Rep $c "import type { Vals } from './vals'" "import type { Vals } from './vals'`nimport { Inventario } from '@/components/inventario/Inventario'"
  } 'ficha de um sistema feito por usuário: atributos, perícias e recursos do sistema; inventário pela peça de components/inventario.'
}
if (& $want 'criarsistema') {
  # Campos extras (SAGA Criar Sistema Extras): capa por URL e "Começar a partir de outros sistemas".
  # Gerado com prefixo próprio (as classes não colidem); só o CSS fica.
  $x = Gen 'SAGA Criar Sistema Extras' 'csextra' @('header')
  $ex = [IO.File]::ReadAllText($x)
  $capa = Enclosing $ex '>Imagem da capa (URL)<' 'label'
  $origem = Enclosing $ex '>Começar a partir de outros sistemas<' 'section'
  Remove-Item $x
  $p = Gen 'SAGA Criar Sistema' 'criarsistema' @('header')
  Edit $p {
    param($c)
    $ident = Enclosing $c '>Nome do sistema<' 'section'
    $novo = $ident.Substring(0, $ident.Length - '</section>'.Length) + $capa + '</section>' + $origem
    $c = Rep $c $ident $novo
    Rep $c "import './criarsistema.css'" "import './criarsistema.css'`nimport '../csextra/csextra.css'"
  } 'capa por URL e "Começar a partir de outros sistemas" (SAGA Criar Sistema Extras) no passo de identidade.'
}
if (& $want 'seguranca') {
  $p = Gen 'SAGA Seguranca' 'seguranca' @('header')
  Edit $p {
    param($c)
    $c = Rep $c "v.`$href('SAGA Perfil.dc.html')" "'/perfil?aba=conta'"
    $c = Rep $c "gridTemplateColumns: 'repeat(21,1fr)'" 'gridTemplateColumns: `repeat(${v.qrN},1fr)`'
    $c = Rep $c '>KJ7Q 2MXA 9FDP 4TRW<' '>{v.chave}<'
    $c = Rep $c '>No protótipo, o código certo é 123456.<' '>{v.codeHint}<'
    $c = AddAttr $c '>Baixar .txt</button>' 'button' 'onClick={v.baixar}'
    $c
  } 'chave e QR reais do TOTP, códigos de recuperação para baixar e o link de volta ao Perfil.'
  # O passo "Digite o código" também é a verificação no login (/verificar).
  $c = [IO.File]::ReadAllText($p)
  $passo = Enclosing $c '>Digite o código de 6 dígitos que aparece no app<' 'div'
  $icones = ([regex]::Match($c, "import \{([^}]*)\} from 'lucide-react'")).Groups[1].Value
  $comp = @"
'use client'

/* Recortado de screens/seguranca/Template.tsx (passo "Digite o código") por scripts/dc-gerar.ps1.
   Usado na Segurança e na verificação do login (/verificar). */

import {$icones} from 'lucide-react'
import type { Vals } from './vals'
import './seguranca.css'

export type CodigoVals = Pick<Vals, 'codeShake' | 'codeHint' | 'boxes' | 'code' | 'onCode' | 'codeKey' | 'codeErr' | 'back1' | 'verify'>

export function Codigo({ v }: { v: CodigoVals }) {
  return ($passo)
}
"@
  [IO.File]::WriteAllText((Join-Path $screens 'seguranca\Codigo.tsx'), $comp)
}
if (& $want 'explorar') {
  $p = Gen 'SAGA Explorar' 'explorar'
  Edit $p { param($c) WrapEnclosing $c 'Em destaque esta semana' 'section' 'v.temFeat' } 'destaque só com alguma mesa aberta.'
}
if (& $want 'perfil') {
  $p = Gen 'SAGA Perfil' 'perfil'
  Edit $p {
    param($c)
    $m = [regex]::Match($c, '(<span style=\{\{[^>]*?\}\})>D&D 5e</span><span style=\{\{[^>]*?\}\}>Vampiro V5</span><span style=\{\{[^>]*?\}\}>Tormenta20</span>')
    if (-not $m.Success) { throw 'favoritos não achados' }
    $c = $c.Remove($m.Index, $m.Length).Insert($m.Index, "{v.favs.map((f, fIdx) => ($($m.Groups[1].Value -replace '^<span', '<span key={fIdx}')>{f}</span>))}")
    $c = Rep $c '>kael@exemplo.com</p>' '>{v.email}</p>'
    $c = Rep $c '>Alterada há 3 meses</p>' '>{v.senhaQuando}</p>'
    Rep $c "<a href={'#'}" '<a href={v.inviteUrl} target="_blank" rel="noopener noreferrer"'
  } 'sistemas favoritos, e-mail, senha e convite do bot com dados reais.'
}
if (& $want 'fichapublica') {
  $p = Gen 'SAGA Ficha Publica' 'fichapublica'
  Edit $p {
    param($c)
    $c = Rep $c '>saga.gg/ficha/ck7v2q…<' '>{v.linkCurto}<'
    $c = Rep $c '>Sir Aldric de Vernay<' '>{v.nome}<'
    $c = Rep $c '>Humano · Paladino<' '>{v.sub}<'
    $c = Rep $c '>Nível 3<' '>{v.nivel}<'
    $c = Rep $c '>A Queda de Valdris<' '>{v.campanha}<'
    Rep $c '>D&D 5e<' '>{v.sistema}<'
  } 'nome, linha, nível, campanha, sistema e link com dados da ficha.'
}
if (& $want 'importar') {
  $p = Gen 'SAGA Importar Ficha' 'importar' @('main')
  Edit $p {
    param($c)
    $c = WrapEnclosing $c '>Protótipo: escolha um arquivo de exemplo<' 'p' 'v.temExemplos'
    $c = WrapEnclosing $c 'v.samples.map' 'div' 'v.temExemplos'
    $c = Rep $c '>D&D 5e<' '>{v.sistemaDetectado}<'
    WrapEnclosing $c '>alta confiança<' 'span' 'v.temConfianca'
  } 'sem página falsa atrás do modal nem arquivos de exemplo; sistema detectado pela extração.'
}
if (& $want 'membros') {
  $p = Gen 'SAGA Membros' 'membros'
  Edit $p {
    param($c)
    $c = Rep $c '>A Queda de Valdris</Link>' '>{v.campanha}</Link>'
    $c = WrapEnclosing $c '>Visão de<' 'div' 'v.temVisao'
    $c = Rep $c '>K<span' '>{v.gmInicial}<span'
    $c = Rep $c "{'Kael '}" "{v.gmNome}{' '}"
    $c = Rep $c '>@kael · online agora · narrando desde março<' '>{v.gmLinha}<'
    $c = Rep $c '>KRAK-3D7M<' '>{v.codigo}<'
    $c = Rep $c "v.`$href('SAGA Ficha.dc.html')" 'p.fichaHref'
    # PV (número e barra) só quando a campanha usa PV.
    $c = [regex]::new([regex]::Escape('{p.hasChar && (<div')).Replace($c, '{p.hasHp && (<div', 1)
    WrapEnclosing $c '${p.pct}%' 'div' 'p.hasHp' 1
  } 'campanha, mestre e código com dados reais; visão pelo papel (sem o seletor do protótipo); ficha de cada jogador.'
}
if (& $want 'sessao') {
  $p = Gen 'SAGA Sessao' 'sessao'
  Edit $p {
    param($c)
    $c = Rep $c '>A Queda de Valdris<' '>{v.campanha}<'
    $c = Rep $c '>Sessão 12 · encerrada<' '>{v.estado}<'
    $c = Rep $c '>Sessão 12<' '>{v.sessaoN}<'
    $c = Rep $c '>O cerco ao mosteiro<' '>{v.titulo}<'
    $c = Rep $c '>3h 42m<' '>{v.duracao}<'
    $c = WrapEnclosing $c '>Visão de<' 'div' 'v.temVisao'
    $c = Rep $c '>@bruna acertou a flecha que derrubou o portão<' '>{v.destaque.t}<'
    $c = Rep $c '>1d20+7 · [20] · maior rolagem da noite<' '>{v.destaque.d}<'
    $c = Rep $c '>27<' '>{v.destaque.total}<'
    WrapEnclosing $c '>Destaque da sessão<' 'section' 'v.temDestaque'
  } 'cabeçalho e destaque com dados da sessão; visão pelo papel; destaque some sem rolagens.'
}
if (& $want 'npcs') {
  $p = Gen 'SAGA NPCs' 'npcs'
  Edit $p {
    param($c)
    $c = Rep $c '>A Queda de Valdris<' '>{v.campanha}<'
    $c = WrapEnclosing $c '>Visão de<' 'div' 'v.temVisao'
    Rep $c "v.`$href('SAGA Fichas por Sistema.dc.html')" 'v.fichaHref'
  } 'campanha real; visão pelo papel; ficha completa do NPC selecionado.'
}
if (& $want 'mesa') {
  $p = Gen 'SAGA Mesa' 'mesa'
  Edit $p {
    param($c)
    $F = '\''Geist\'',sans-serif'
    $SC = '\''IM Fell English SC\'',serif'
    $FE = '\''IM Fell English\'',serif'
    # Cabeçalho: campanha, sessão e presença reais; controles do mestre só para ele.
    $c = Rep $c "<Link href={v.`$href('SAGA Campanhas.dc.html')} title={'Voltar'}" "<Link href={v.voltarHref} title={'Voltar'}"
    $c = Rep $c '>A Queda de Valdris</p>' '>{v.campanha}</p>'
    $c = Rep $c ">{'Sessão XII · '}{v.sceneName}</p>" '>{v.sceneName}</p>'
    $c = Rep $c '>4/5</span>' '>{v.onlineLabel}</span>'
    $c = WrapEnclosing $c 'onClick={v.togglePV}' 'button' 'v.souMestre'
    $c = WrapEnclosing $c 'onClick={v.toggleMapEdit}' 'button' 'v.souMestre'
    $c = Rep $c '{v.mLiveOn && (<button onClick={v.endAsk}' '{v.mLiveOn && v.podeEncerrar && (<button onClick={v.endAsk}'
    # Tabuleiro cresce com o mapa e os tokens; o mapa é a imagem da sessão no tamanho natural (como na Mesa antiga).
    $c = Rep $c 'outline: v.slotOutline }}><ImageSlot src={v.$img(v.mapSlot)} /></div>' "outline: v.slotOutline, pointerEvents: 'none' }}>{v.mapa && (<img src={v.mapa} alt={''} draggable={false} onLoad={v.onMapLoad} style={{ position: 'absolute', left: '0', top: '0', maxWidth: 'none' }} />)}</div>"
    $c = AddAttr $c 'onClick={f.go}' 'div' 'data-nevoa="" onContextMenu={f.remove}'
    $c = Rep $c 'animation: t.turn }}>{t.i}</span>' "animation: t.turn, overflow: 'hidden' }}>{t.img ? (<img src={t.img} alt={''} draggable={false} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />) : t.i}</span>"
    $c = Rep $c ">Kael</span></Fragment>" '>{p.who}</span></Fragment>'
    # Dica da ferramenta: ao trocar o mapa, campo para o link da imagem.
    $c = Rep $c '<DynIcon icon={v.toolIcon} width={14} height={14} />{v.toolHint}</div>' ("<DynIcon icon={v.toolIcon} width={14} height={14} />{v.toolHint}{v.mapEdit && (<><input value={v.mapDraft} onChange={v.onMapDraft} onPointerDown={v.stop} placeholder={'https://…'} style={{ pointerEvents: 'auto', width: '260px', height: '22px', padding: '0 8px', borderRadius: '999px', border: '1px solid rgb(230 213 172/.4)', background: 'rgb(20 12 6/.6)', color: '#e6d5ac', font: '400 12px/1 $F' }} />{v.mapa && (<button onClick={v.tirarMapa} style={{ all: 'unset', cursor: 'pointer', pointerEvents: 'auto', textDecoration: 'underline' }}>Tirar mapa</button>)}</>)}</div>")
    # Popover do token: CA só quando existe; vida e condições só o mestre mexe.
    $c = Rep $c "{v.sel.kind}{' · CA '}{v.sel.ca}" '{v.sel.kind}{v.sel.caTxt}'
    $c = Rep $c "<div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', fontSize: '11px'" "{v.sel.hasHp && (<><div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', fontSize: '11px'"
    $c = Rep $c "<div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '4px', marginTop: '8px' }}>{v.hpBtns.map" "{v.souMestre && (<div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '4px', marginTop: '8px' }}>{v.hpBtns.map"
    $c = Rep $c '>{b.l}</button>))}</div><div' '>{b.l}</button>))}</div>)}</>)}<div'
    $c = WrapEnclosing $c '{v.conds.map' 'div' 'v.souMestre'
    $c = WrapEnclosing $c 'onClick={v.attack}' 'button' 'v.sel.podeRolar'
    $c = WrapEnclosing $c 'onClick={v.removeTok}' 'button' 'v.souMestre'
    # Adicionar token: aviso quando a campanha não tem NPCs salvos.
    $c = Rep $c '{n.cta}</span></button>))}' ("{n.cta}</span></button>))}{v.semNpcs && (<p style={{ margin: '0', padding: '14px 6px', textAlign: 'center', color: 'var(--muted)' }}>Nenhum NPC salvo nesta campanha.</p>)}")
    # TODO(api): rolagens privadas. O seletor volta quando RollLog.visibility existir.
    $c = WrapEnclosing $c "role={'radiogroup'}" 'div' 'v.temVisibilidade'
    # Iniciativa: vazio, rolar iniciativa e troca de turno (só o mestre).
    $c = Rep $c ">{'Rodada '}{v.round}</span></div>" ">{'Rodada '}{v.round}</span></div>{v.iniVazia && (<p style={{ margin: '10px 0 0', color: 'var(--muted)' }}>Ninguém rolou iniciativa ainda.</p>)}"
    $c = WrapEnclosing $c 'onClick={v.prevTurn}' 'div' 'v.souMestre && !v.iniVazia'
    $c = Rep $c "{v.nextName}</button></div>)}" ("{v.nextName}</button></div>)}{v.souMestre && (<button onClick={v.rolarIniciativa} className=`"mesa-s22`" style={{ all: 'unset', cursor: 'pointer', display: 'block', boxSizing: 'border-box', width: '100%', marginTop: '6px', height: '36px', borderRadius: '4px', border: '1px solid var(--line)', textAlign: 'center', font: '500 12px/36px $F' }}>Rolar iniciativa</button>)}")
    # Fichas: vazio sem ficha; salvaguardas só na família d20.
    $c = Rep $c '{p.label}</button>))}</div>' ("{p.label}</button>))}</div>{!v.temFicha && (<p style={{ margin: '12px 0 0', color: 'var(--muted)' }}>Nenhuma ficha na mesa ainda.</p>)}{v.temFicha && (<>")
    $c = Rep $c 'Editar ficha completa</a>' 'Editar ficha completa</a></>)}'
    $c = Rep $c "<p style={{ margin: '10px 0 4px', font: '400 15px/1 $SC', color: 'var(--muted)' }}>Salvaguardas</p>" "{v.fs.temSaves && (<><p style={{ margin: '10px 0 4px', font: '400 15px/1 $SC', color: 'var(--muted)' }}>Salvaguardas</p>"
    $c = Rep $c '{vItem.b}</span></button>))}</div>' '{vItem.b}</span></button>))}</div></>)}'
    # Música: atmosferas e link do YouTube só para o mestre.
    $c = Rep $c "<p style={{ margin: '14px 0 6px', font: '400 15px/1 $SC' }}>Atmosferas</p>" "{v.souMestre && (<><p style={{ margin: '14px 0 6px', font: '400 15px/1 $SC' }}>Atmosferas</p>"
    $c = Rep $c '{t.d}</span></button>))}' ("{t.d}</span></button>))}<div style={{ display: 'flex', gap: '6px', marginTop: '10px' }}><input value={v.linkMusica} onChange={v.onLinkMusica} placeholder={'Link do YouTube'} style={{ flex: '1', minWidth: '0', height: '32px', padding: '0 10px', borderRadius: '4px', border: '1px solid var(--line)', background: 'var(--surface)', color: 'var(--ink)', font: '400 12px/1 $F' }} /><button onClick={v.tocarLink} className=`"mesa-s22`" style={{ all: 'unset', cursor: 'pointer', height: '32px', padding: '0 12px', borderRadius: '4px', border: '1px solid var(--line)', font: '500 12px/32px $F' }}>Tocar</button></div></>)}")
    # Mapas (SAGA Mapas): o <dc-import name="SagaMapas"> do painel lateral vira o componente real.
    $c = Rep $c "animation: 'mesa-popIn .25s both' }}></div>)}" "animation: 'mesa-popIn .25s both' }}><SagaMapas {...v.mapasProps} /></div>)}"
    $c = Rep $c "import type { Vals } from './vals'" "import type { Vals } from './vals'`nimport { SagaMapas } from '@/components/screens/sagamapas/SagaMapas'"
    # Mesa sem sessão: "Ver a campanha" volta para a campanha real.
    $c = Rep $c "v.`$href('SAGA Campanha Jogador.dc.html?sessao=sem-sessao')" 'v.voltarHref'
    # Tutorial: os destaques medem os elementos reais (data-tour), como nos Primeiros Passos.
    $c = AddAttr $c '{v.tools.map' 'nav' 'data-tour="ferramentas"'
    $c = AddAttr $c "left: '50%', bottom: '16px'" 'div' 'data-tour="dados"'
    $c = AddAttr $c "width: '320px', display: 'flex', flexDirection: 'column'" 'aside' 'data-tour="painel"'
    $c = AddAttr $c 'onClick={v.liveToggle} aria-expanded' 'button' 'data-tour="aovivo"'
    # Encerrar: leva ao resumo da sessão.
    $c = Rep $c "href={v.`$href('SAGA Campanhas.dc.html')}" 'href={v.resumoHref}'
    Rep $c '>Voltar às campanhas</Link>' '>Escrever o resumo</Link>'
  } 'campanha, sessão, presença, tokens, mapa, música, chat, handouts, ao vivo e fichas reais; controles do mestre só para ele; sem cenas e sem rolagens privadas (TODO(api)).'
}if (& $want 'erro') {
  $p = Gen 'SAGA Erro' 'erro'
  Edit $p {
    param($c)
    # Referência de suporte = digest do erro do Next; some quando não há.
    $c = Rep $c "{'Se continuar, mande este código para o suporte: '}<span" "{v.temRef && (<>{'Se continuar, mande este código para o suporte: '}<span"
    Rep $c '>ref 7F3A-21C9</span>' '>ref {v.ref}</span></>)}'
  } 'referência de suporte = digest do erro do Next.'
}
if (& $want 'sessoes') {
  $p = Gen 'SAGA Sessoes' 'sessoes'
  Edit $p {
    param($c)
    $c = Rep $c '>A Queda de Valdris<' '>{v.campanha}<'
    WrapEnclosing $c '>Visão de<' 'div' 'v.temVisao'
  } 'campanha real; visão pelo papel.'
}
if (& $want 'notas') {
  $p = Gen 'SAGA Notas' 'notas'
  Edit $p {
    param($c)
    $c = Rep $c '>A Queda de Valdris<' '>{v.campanha}<'
    WrapEnclosing $c '>Visão de<' 'div' 'v.temVisao'
  } 'campanha real; visão pelo papel.'
}
if (& $want 'estados') {
  $p = Gen 'SAGA Estados' 'estados'
  Edit $p {
    param($c)
    # As abas são do protótipo (alternam os estados); no app cada estado aparece na sua tela.
    $c = WrapEnclosing $c "role={'tablist'}" 'div' 'v.temAbas'
    # Nota para o desenvolvedor, não é texto da tela.
    $c = [regex]::Replace($c, "<p style=\{\{ margin: '12px 2px 0', fontSize: '12px', color: 'var\(--muted\)' \}\}>Neste estado o painel lateral[^<]*</p>", '')
    Rep $c "v.`$href('SAGA Importar Ficha.dc.html')" 'v.importarHref'
  } 'sem as abas do protótipo; importar abre o modal em /personagens?importar=1.'
}
if (& $want 'campanhajogador') {
  $p = Gen 'SAGA Campanha Jogador' 'campanhajogador'
  Edit $p {
    param($c)
    $c = Rep $c '<span>❦</span>D&D 5e · Mestre Kael</p>' '<span>❦</span>{v.linhaSis}</p>'
    $c = Rep $c '>A Queda de Valdris</h1>' '>{v.campanha}</h1>'
    $c = Rep $c '>Um mosteiro em ruínas, um cálice negro e uma carta que ninguém pode abrir.</p>' '>{v.descricao}</p>'
    $c = WrapEnclosing $c '>{v.descricao}</p>' 'p' 'v.descricao'
    $c = Rep $c "v.`$href('SAGA Mesa.dc.html')} className=`"campanhajogador-s2`"" 'v.mesaHref} className="campanhajogador-s2"'
    $c = Rep $c '>Sessão XII ao vivo · Entrar na mesa</Link>' '>{v.aoVivoLabel}</Link>'
    $c = Rep $c '>Quarta, 11 de novembro · 20h</p>' '>{v.proxima}</p>'
    # Personagem do jogador nesta campanha.
    $c = Rep $c "color: 'rgb(255 240 210/.5)' }}>A</span><ImageSlot src={v.`$img('pers-retrato-2')} />" "color: 'rgb(255 240 210/.5)' }}>{v.pers.i}</span><ImageSlot src={v.pers.img} />"
    $c = Rep $c '>Sir Aldric de Vernay</p>' '>{v.pers.n}</p>'
    $c = Rep $c '>Humano · Paladino · Nível 3</p>' '>{v.pers.sub}</p>'
    $c = Rep $c '>24/28 PV</span>' '>{v.pers.hpTxt}</span>'
    $c = Rep $c "width: '86%', background: 'var(--ok)' }}" 'width: `${v.pers.pct}%`, background: v.pers.hpC }}'
    $c = WrapEnclosing $c '>{v.pers.hpTxt}</span>' 'div' 'v.pers.temHp'
    $c = Rep $c "v.`$href('SAGA Ficha.dc.html')" 'v.pers.href'
    $c = WrapEnclosing $c 'href={v.pers.href}' 'div' 'v.pers.temFicha'
    # Sessões e handouts reais.
    $c = Rep $c "key={sIdx} href={v.`$href('SAGA Sessao.dc.html')}" 'key={sIdx} href={s.href}'
    $c = Rep $c "<Link href={v.`$href('SAGA Mesa.dc.html')} style={{ font: '500 13px/1 \'Geist\',sans-serif' }}>Ver na mesa →</Link>" "{v.live && (<Link href={v.mesaHref} style={{ font: '500 13px/1 \'Geist\',sans-serif' }}>Ver na mesa →</Link>)}"
    $i = $c.IndexOf("<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: '10px', marginTop: '12px' }}>", $O)
    $f = $c.IndexOf('>Planta do claustro</p></div></div>', $O); if ($i -lt 0 -or $f -lt 0) { throw 'grade de handouts não achada' }
    $f += '>Planta do claustro</p></div></div>'.Length
    $grade = "{v.semHands && (<p style={{ margin: '12px 0 0', color: 'var(--muted)' }}>Nenhum handout ainda.</p>)}<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: '10px', marginTop: '12px' }}>{v.hands.map((h, hIdx) => (<div key={hIdx} style={{ borderRadius: '4px', overflow: 'hidden', border: ``1px solid `${h.ring}``, boxShadow: h.sh }}><div style={{ position: 'relative', height: '80px', background: h.art }}>{h.isNew && (<span style={{ position: 'absolute', left: '0', top: '8px', height: '20px', padding: '0 10px 0 7px', display: 'flex', alignItems: 'center', background: 'var(--accent)', color: '#fff8f0', font: '400 12px/1 \'IM Fell English SC\',serif', clipPath: 'polygon(0 0,100% 0,calc(100% - 6px) 50%,100% 100%,0 100%)' }}>Novo</span>)}</div><p style={{ margin: '0', padding: '8px 10px', font: '400 16px/1.2 \'IM Fell English\',serif' }}>{h.t}</p></div>))}</div>"
    $c = $c.Substring(0, $i) + $grade + $c.Substring($f)
    $c = Rep $c "v.`$href('SAGA Sessoes.dc.html')" 'v.sessoesHref'
    $c = Rep $c "v.`$href('SAGA Membros.dc.html')" 'v.membrosHref'
    Rep $c "v.`$img('camp-capa')" 'v.capa'
  } 'campanha, sessão ao vivo, personagem, sessões, handouts e companhia reais; próxima sessão "A combinar" até o agendamento (TODO(api)).'
}
if (& $want 'editarsistema') {
  $p = Gen 'SAGA Editar Sistema' 'editarsistema'
  Edit $p {
    param($c)
    $c = Rep $c '>Comunidade · por Kael · usado em 2 mesas<' '>{v.meta}<'
    # "Ver na biblioteca" e "Importar de outro sistema" abrem o códice na estante (/sistemas?id=…).
    $c = Rep $c "v.`$href('SAGA Sistemas.dc.html')} className=`"editarsistema-s2`"" 'v.bibliotecaHref} className="editarsistema-s2"'
    Rep $c "v.`$href('SAGA Sistemas.dc.html')} className=`"editarsistema-s8`"" 'v.bibliotecaHref} className="editarsistema-s8"'
  } 'meta real; biblioteca e importar abrem o códice em /sistemas?id=.'
}
if (& $want 'mesacelular') {
  $p = Gen 'SAGA Mesa Celular' 'mesacelular'
  Edit $p {
    param($c)
    # O conversor gera ({…}) quando o filho único do && é um laço; vira fragmento.
    $c = Rep $c '{v.tIni && ({v.ini.map(' '{v.tIni && (<>{v.ini.map('
    $c = Rep $c '{r.now}</span></div>))})}' '{r.now}</span></div>))}</>)}'
    $c = Rep $c "v.`$href('SAGA Campanha Jogador.dc.html')" 'v.voltarHref'
    $c = Rep $c '>A Queda de Valdris</p>' '>{v.campanha}</p>'
    $c = Rep $c '/>Sessão XII ao vivo · rodada 3</p>' '/>{v.subLinha}</p>'
    # Mapa real: tabuleiro do tamanho do mapa, arrastar e pinça (o protótipo era fixo em 640×520).
    $c = Rep $c "overflow: 'hidden', background: 'radial-gradient(circle at 40% 35%, #3a2a1c, #120c08 75%)' }}>" "overflow: 'hidden', background: 'radial-gradient(circle at 40% 35%, #3a2a1c, #120c08 75%)', touchAction: 'none' }} onPointerDown={v.mapDown} onPointerMove={v.mapMove} onPointerUp={v.mapUp} onPointerCancel={v.mapUp}>"
    $c = Rep $c "left: '50%', top: v.mapTop, width: '640px', height: '520px', transform: ``translate(-50%,0) scale(`${v.zoom})``, transformOrigin: 'center top'" "left: '0', top: '0', width: ``$`{v.boardW}px``, height: ``$`{v.boardH}px``, transform: ``translate($`{v.panX}px,$`{v.panY}px) scale($`{v.zoom})``, transformOrigin: '0 0'"
    $c = Rep $c '{v.toks.map((t, tIdx) => (' "<div style={{ position: 'absolute', inset: '0', background: v.terrain }} />{v.mapa && (<img src={v.mapa} alt={''} draggable={false} style={{ position: 'absolute', left: '0', top: '0', maxWidth: 'none', pointerEvents: 'none' }} />)}<div style={{ position: 'absolute', inset: '0', pointerEvents: 'none', backgroundImage: 'linear-gradient(rgb(40 25 10/.16) 1px, transparent 1px),linear-gradient(90deg, rgb(40 25 10/.16) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />{v.toks.map((t, tIdx) => ("
    $c = Rep $c "{v.sel.hp}/{v.sel.max}{' PV · CA '}{v.sel.ca}" '{v.sel.linha}'
    $c = Rep $c "v.`$href('SAGA Ficha.dc.html')" 'v.fichaHref'
    $c = Rep $c "<input placeholder={'Mensagem ou /r 1d20+5'}" "<input value={v.chatIn} onChange={v.onChatIn} onKeyDown={v.chatKey} disabled={v.chatOff} placeholder={'Mensagem ou /r 1d20+5'}"
    Rep $c "<button aria-label={'Enviar'}" "<button onClick={v.chatSend} aria-label={'Enviar'}"
  } 'mapa, tokens, iniciativa, ficha, chat e dados da Mesa real (mesma lógica do desktop); arrastar e pinça no mapa.'
}
if (& $want 'fichasistema') {
  $p = Gen 'SAGA Fichas por Sistema' 'fichasistema'
  Edit $p {
    param($c)
    $F = '\''IM Fell English SC\'',serif'
    $c = Rep $c "v.`$href('SAGA Personagens.dc.html')" 'v.voltarHref'
    # O design é um mostruário (famílias e sistemas); no app a ficha é de um personagem só.
    $c = WrapEnclosing $c '>Uma ficha, vinte e sete sistemas<' 'div' 'v.mostruario' 1
    $c = WrapEnclosing $c "aria-label={'Famílias de regras'}" 'div' 'v.mostruario'
    $c = WrapEnclosing $c '{v.famNote}' 'div' 'v.mostruario'
    $c = Rep $c "<ImageSlot src={v.`$img('ficha-sis-retrato')} />" '<ImageSlot src={v.img} />'
    $c = Rep $c "{' · A Queda de Valdris'}" '{v.campanha ? ` · ${v.campanha}` : ''''}'
    # "Cada seção vira uma aba": abas com as peças de SAGA Pecas de Ficha (components/ficha-sistema/Pecas.tsx).
    $i = $c.LastIndexOf('<section', $c.IndexOf("{'Seções próprias de '}", $O), $O)
    $fim = $c.IndexOf('</section></div><aside', $O); if ($i -lt 0 -or $fim -lt 0) { throw 'bloco de seções não achado' }
    $abas = "<section style={{ padding: '6px 18px 18px', borderRadius: '5px', background: 'linear-gradient(180deg, var(--surface), color-mix(in oklab, var(--surface) 60%, var(--surface2)))', border: '1px solid var(--line)' }}><div role={'tablist'} aria-label={'Seções da ficha'} style={{ display: 'flex', gap: '4px', borderBottom: '1px solid var(--line)', overflowX: 'auto' }}>{v.abas.map((a, aIdx) => (<button key={aIdx} role={'tab'} aria-selected={a.on} onClick={a.go} className=`"fichasistema-s2`" style={{ all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 14px', font: '400 17px/1 $F', color: a.color, boxShadow: a.line, whiteSpace: 'nowrap' }}>{a.l}</button>))}</div><Pecas ws={v.secao} />"
    $c = $c.Substring(0, $i) + $abas + $c.Substring($fim)
    Rep $c "import type { Vals } from './vals'" "import type { Vals } from './vals'`nimport { Pecas } from '@/components/ficha-sistema/Pecas'"
  } 'ficha de um personagem (sem o mostruário de famílias); seções viram abas com as peças de SAGA Pecas de Ficha.'
}
if (& $want 'fichanpc') {
  $p = Gen 'SAGA Ficha NPC' 'fichanpc'
  Edit $p {
    param($c)
    $F = '\''IM Fell English SC\'',serif'
    # Mesmo tratamento da Ficha por Sistema (sem o mostruário; seções viram abas com as peças).
    $c = Rep $c "v.`$href('SAGA NPCs.dc.html')" 'v.voltarHref'
    $c = WrapEnclosing $c "aria-label={'Famílias de regras'}" 'div' 'v.mostruario'
    $c = WrapEnclosing $c '{v.famNote}' 'div' 'v.mostruario'
    $c = Rep $c "<ImageSlot src={v.`$img('ficha-sis-retrato')} />" '<ImageSlot src={v.img} />'
    $c = Rep $c "{' · A Queda de Valdris'}" '{v.campanha ? ` · ${v.campanha}` : ''''}'
    # Só o mestre alterna Mestre/Jogador (prévia do que a companhia vê).
    $c = WrapEnclosing $c '>Visão de<' 'div' 'v.trocaVisao'
    $i = $c.LastIndexOf('<section', $c.IndexOf("{'Seções próprias de '}", $O), $O)
    $fim = $c.IndexOf('</section></div><aside', $O); if ($i -lt 0 -or $fim -lt 0) { throw 'bloco de seções não achado' }
    $abas = "<section style={{ padding: '6px 18px 18px', borderRadius: '5px', background: 'linear-gradient(180deg, var(--surface), color-mix(in oklab, var(--surface) 60%, var(--surface2)))', border: '1px solid var(--line)' }}><div role={'tablist'} aria-label={'Seções da ficha'} style={{ display: 'flex', gap: '4px', borderBottom: '1px solid var(--line)', overflowX: 'auto' }}>{v.abas.map((a, aIdx) => (<button key={aIdx} role={'tab'} aria-selected={a.on} onClick={a.go} className=`"fichanpc-s2`" style={{ all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 14px', font: '400 17px/1 $F', color: a.color, boxShadow: a.line, whiteSpace: 'nowrap' }}>{a.l}</button>))}</div><Pecas ws={v.secao} />"
    $c = $c.Substring(0, $i) + $abas + $c.Substring($fim)
    Rep $c "import type { Vals } from './vals'" "import type { Vals } from './vals'`nimport { Pecas } from '@/components/ficha-sistema/Pecas'"
  } 'ficha de um NPC real; visibilidade por jogador, segredos e a troca de visão (só o mestre).'
}
'pronto'
