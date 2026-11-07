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
    $c
  } 'nome, linha do topo, bot e modelo de ficha com dados da campanha; resumo por sessão.'
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
    $c = Rep $c "{' / 120 kg'}" "{' / '}{v.cargaMax}{' kg'}"
    $c = Rep $c '>FOR 16 × 7,5 kg. A cota de malha impõe desvantagem em Furtividade.</p>' '>{v.cargaNota}</p>'
    Rep $c '>Diário de Aldric<' '>{v.diarioTitulo}<'
  } 'cabeçalho, passivas, carga e notas com dados da ficha; Destruição Divina e Cura pelas Mãos só para Paladino; XP escondido sem dado.'
}
if (& $want 'explorar') {
  $p = Gen 'SAGA Explorar' 'explorar'
  Edit $p { param($c) WrapEnclosing $c 'Em destaque esta semana' 'section' 'v.temFeat' } 'destaque só com alguma mesa aberta.'
}
'pronto'
