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
function WrapEnclosing([string]$c, [string]$anchor, [string]$tag, [string]$cond) {
  $i = $c.IndexOf($anchor, $O); if ($i -lt 0) { throw "âncora não achada: $anchor" }
  $s = $c.LastIndexOf("<$tag", $i, $O)
  $depth = 0; $p = $s
  while ($true) {
    $nOpen = $c.IndexOf("<$tag", $p + 1, $O); $nClose = $c.IndexOf("</$tag>", $p + 1, $O)
    if ($nOpen -ge 0 -and $nOpen -lt $nClose) { $depth++; $p = $nOpen; continue }
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
'pronto'
