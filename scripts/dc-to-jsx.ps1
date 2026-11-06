<#
  Converte o template de um Saga NOVO/*.dc.html em JSX 1:1 (redesign).

  Saída em -OutDir:
    Template.tsx   JSX com os estilos inline do design (style={{}}), recebe `v` (valores do renderVals)
    <prefix>.css   @keyframes com prefixo da tela + classes de :hover/:focus/:active (com !important,
                   porque precisam vencer o estilo inline, como o style-hover do design)
  A lógica (state/renderVals) é portada à mão em vals.ts, que exporta `type Vals`.

  Convenções do Template:
    {{ x }}            → v.x  (ou a variável do sc-for, se o caminho começar por ela)
    href="SAGA X.dc.html?q" → v.$href('SAGA X.dc.html?q')   (rotas resolvidas na tela)
    <image-slot id>    → <ImageSlot src={v.$img('id')} />
    ícone Lucide       → componente do lucide-react; url dinâmica → <DynIcon icon={...} />
    url do tema        → par Moon/Sun trocado por CSS (data-tema-icon)
    <dc-import SagaHeader> some (o layout de (app) já tem o header)

  Uso: pwsh scripts/dc-to-jsx.ps1 -In "Saga NOVO/handoff-claude-code/design/SAGA Landing.dc.html" -OutDir apps/web/src/components/screens/landing -Prefix landing
#>
param(
  [Parameter(Mandatory)] [string] $In,
  [Parameter(Mandatory)] [string] $OutDir,
  [Parameter(Mandatory)] [string] $Prefix,
  # Tags cujo primeiro elemento é descartado (ex.: o <header> próprio de uma tela que usa o SagaHeader do layout)
  [string[]] $SkipFirst = @()
)
$SkipFirst = @($SkipFirst | ForEach-Object { $_ -split ',' } | Where-Object { $_ })  # pwsh -File não separa por vírgula
$skipped = @{}
$ErrorActionPreference = 'Stop'
$warnings = [System.Collections.Generic.List[string]]::new()
function Warn($m) { $warnings.Add($m) }

$src = [IO.File]::ReadAllText((Resolve-Path $In))
$m = [regex]::Match($src, '(?s)<x-dc>(.*)</x-dc>')
if (-not $m.Success) { throw 'sem <x-dc>' }
$tpl = $m.Groups[1].Value

# ── Ícones disponíveis no lucide-react instalado ──
$root = Split-Path -Parent $PSScriptRoot
$dts = Get-ChildItem "$root\node_modules\.pnpm" -Directory -Filter 'lucide-react@*' | Select-Object -First 1 |
  ForEach-Object { Join-Path $_.FullName 'node_modules\lucide-react\dist\lucide-react.d.ts' }
$exported = [System.Collections.Generic.HashSet[string]]::new()
$expLine = (Select-String -Path $dts -Pattern '^export \{ AArrowDown' | Select-Object -First 1).Line
foreach ($part in ($expLine -replace '^export \{|\};?\s*$', '').Split(',')) {
  $p = $part.Trim(); if (-not $p) { continue }
  $name = if ($p -match '\sas\s(\w+)$') { $Matches[1] } else { $p }
  [void]$exported.Add($name)
}
# lucide-static 0.460 → lucide-react 1.x: nomes que mudaram e não têm alias.
$RENAME = @{ 'circle-help' = 'CircleQuestionMark' }
function IconName([string]$kebab) {
  if ($RENAME.ContainsKey($kebab)) { return $RENAME[$kebab] }
  $pascal = (($kebab -split '-') | ForEach-Object { if ($_ -match '^\d') { $_ } else { $_.Substring(0,1).ToUpper() + $_.Substring(1) } }) -join ''
  if (-not $exported.Contains($pascal)) { Warn "ícone sem equivalente no lucide-react: $kebab ($pascal)" }
  return $pascal
}
$usedIcons = [System.Collections.Generic.SortedSet[string]]::new()
# Ícones cujo nome colide com globais do JS ou com imports do Template → importados como XIcon.
$CLASH = @('Map','Set','Image','Link','Text','Option','Fragment','Function','Infinity','Proxy','Symbol','Option','Lock','History','Navigation','Screen')

# ── Helmet: keyframes e regras extras ──
$keyframes = [ordered]@{}
$helmet = [regex]::Match($tpl, '(?s)<helmet>(.*?)</helmet>')
if ($helmet.Success) {
  $css = ([regex]::Matches($helmet.Groups[1].Value, '(?s)<style>(.*?)</style>') | ForEach-Object { $_.Groups[1].Value }) -join "`n"
  foreach ($k in [regex]::Matches($css, '@keyframes\s+([\w-]+)\s*\{((?:[^{}]*\{[^{}]*\})*)\s*\}')) { $keyframes[$k.Groups[1].Value] = $k.Groups[2].Value }
  $rest = [regex]::Replace($css, '@keyframes\s+[\w-]+\s*\{(?:[^{}]*\{[^{}]*\})*\s*\}', '')
  foreach ($r in [regex]::Matches($rest, '([^{}]+)\{([^{}]*)\}')) {
    $sel = $r.Groups[1].Value.Trim()
    if ($sel -match '^(html,body|\*|a|a:hover|\[data-s\].*)$') { continue }
    Warn "regra CSS do helmet não portada: $sel { $($r.Groups[2].Value.Trim()) }"
  }
  $tpl = $tpl.Remove($helmet.Index, $helmet.Length)
}
$kfNames = @($keyframes.Keys | Sort-Object Length -Descending)
function PrefixAnim([string]$val) {
  foreach ($n in $kfNames) { $val = [regex]::Replace($val, "(?<![\w-])$([regex]::Escape($n))(?![\w-])", "$Prefix-$n") }
  return $val
}

# ── Tokenizer → árvore ──
$VOID = @('input','img','br','hr','meta','link','source','area','col','wbr')
$tokRe = [regex]'(?s)<!--.*?-->|<(/?)([a-zA-Z][\w-]*)((?:\s+[^\s=>/]+(?:="[^"]*")?)*)\s*(/?)>|[^<]+'
$attrRe = [regex]'([^\s=]+)(?:="([^"]*)")?'
$rootNode = @{ tag = '#root'; attrs = [ordered]@{}; kids = [System.Collections.Generic.List[object]]::new() }
$stack = [System.Collections.Generic.Stack[object]]::new(); $stack.Push($rootNode)
foreach ($t in $tokRe.Matches($tpl)) {
  $v = $t.Value
  if ($v.StartsWith('<!--')) { continue }
  if ($t.Groups[2].Success) {
    $tag = $t.Groups[2].Value
    if ($t.Groups[1].Value -eq '/') {
      while ($stack.Count -gt 1) { $n = $stack.Pop(); if ($n.tag -eq $tag) { break } }
      continue
    }
    $attrs = [ordered]@{}
    foreach ($a in $attrRe.Matches($t.Groups[3].Value)) { $attrs[$a.Groups[1].Value] = if ($a.Groups[2].Success) { $a.Groups[2].Value } else { $null } }
    $node = @{ tag = $tag; attrs = $attrs; kids = [System.Collections.Generic.List[object]]::new() }
    $stack.Peek().kids.Add($node)
    if (-not ($VOID -contains $tag.ToLower()) -and $t.Groups[4].Value -ne '/') { $stack.Push($node) }
  } else {
    $stack.Peek().kids.Add(@{ tag = '#text'; text = $v })
  }
}

# ── Expressões ──
function Decode([string]$s) { [System.Net.WebUtility]::HtmlDecode($s) }
function JsStr([string]$s) { "'" + ($s -replace '\\', '\\' -replace "'", "\'" -replace "`r?`n", ' ') + "'" }
function HoleExpr([string]$h, $loops) {
  $h = $h.Trim()
  if ($h -match '^(true|false|null|-?\d+(\.\d+)?)$') { return $h }
  $first = ($h -split '[.\[]')[0]
  if ($loops -contains $first) { return $h }
  return "v.$h"
}
# Valor de atributo/estilo com {{ }} → expressão JS (string literal, expr pura ou template literal)
function ValueExpr([string]$s, $loops, [switch]$Anim) {
  $s = Decode $s
  $parts = [regex]::Split($s, '(\{\{.*?\}\})')
  $holes = @($parts | Where-Object { $_ -match '^\{\{.*\}\}$' })
  if ($holes.Count -eq 0) { $out = if ($Anim) { PrefixAnim $s } else { $s }; return (JsStr $out) }
  if ($parts.Count -eq 3 -and $parts[0] -eq '' -and $parts[2] -eq '') {
    $e = HoleExpr ($holes[0] -replace '^\{\{|\}\}$', '') $loops
    if ($Anim) { Warn "animation dinâmica ({{ }}): aplicar o prefixo '$Prefix-' no vals.ts → $s" }
    return $e
  }
  $sb = '`'
  foreach ($p in $parts) {
    if ($p -match '^\{\{(.*)\}\}$') { $sb += '${' + (HoleExpr $Matches[1] $loops) + '}' }
    else { $lit = if ($Anim) { PrefixAnim $p } else { $p }; $sb += ($lit -replace '\\', '\\' -replace '`', '\`' -replace '\$\{', '\${') }
  }
  return $sb + '`'
}

function SplitDecls([string]$style) {
  $style = Decode $style
  $out = @(); $depth = 0; $q = $null; $cur = ''
  foreach ($ch in $style.ToCharArray()) {
    if ($q) { if ($ch -eq $q) { $q = $null } ; $cur += $ch; continue }
    if ($ch -eq '"' -or $ch -eq "'") { $q = $ch; $cur += $ch; continue }
    if ($ch -eq '(') { $depth++ } elseif ($ch -eq ')') { $depth-- }
    if ($ch -eq ';' -and $depth -eq 0) { if ($cur.Trim()) { $out += $cur.Trim() }; $cur = ''; continue }
    $cur += $ch
  }
  if ($cur.Trim()) { $out += $cur.Trim() }
  # {{ }} contém '.' e espaços mas não ';' — ok
  return $out
}
function CamelProp([string]$p) {
  $p = $p.Trim()
  if ($p.StartsWith('--')) { return (JsStr $p) }
  if ($p.StartsWith('-')) { $p = $p.Substring(1); $p = $p.Substring(0,1).ToUpper() + $p.Substring(1) }
  return [regex]::Replace($p, '-([a-z])', { param($x) $x.Groups[1].Value.ToUpper() })
}
function StyleObj([string]$style, $loops, [hashtable]$drop = @{}) {
  $entries = @()
  foreach ($d in (SplitDecls $style)) {
    $i = $d.IndexOf(':'); if ($i -lt 1) { continue }
    $prop = $d.Substring(0, $i).Trim(); $val = $d.Substring($i + 1).Trim()
    if ($drop.ContainsKey($prop)) { continue }
    $isAnim = $prop -eq 'animation' -or $prop -eq 'animation-name'
    $entries += "$(CamelProp $prop): $(ValueExpr ($val -replace '\{\{', '{{' ) $loops -Anim:$isAnim)"
  }
  if ($entries.Count -eq 0) { return $null }
  return '{ ' + ($entries -join ', ') + ' }'
}
function StyleDisplay([string]$style) { if ($style -and $style -match '(?:^|;)\s*display:\s*([\w-]+)') { return $Matches[1] } ; return $null }

# ── Hover/focus/active → classes ──
$hoverCss = [System.Text.StringBuilder]::new(); $hoverN = 0
function PseudoClass($attrs) {
  $cls = $null
  foreach ($pair in @(@('style-hover', ':hover'), @('style-focus', ':focus'), @('style-active', ':active'))) {
    $val = $attrs[$pair[0]]; if ($null -eq $val) { continue }
    if (-not $cls) { $script:hoverN++; $cls = "$Prefix-s$($script:hoverN)" }
    if ($val -match '\{\{') { Warn "$($pair[0]) com {{ }} não suportado: $val" ; continue }
    $decls = (SplitDecls $val | ForEach-Object { $_ + ' !important' }) -join '; '
    [void]$hoverCss.AppendLine(".$cls$($pair[1]) { $(PrefixAnim $decls) }")
  }
  return $cls
}

# ── Emissão ──
$SVG_KEEP = @('viewBox','preserveAspectRatio','gradientUnits','gradientTransform','patternUnits','stdDeviation','baseFrequency','numOctaves','stitchTiles','clipPathUnits')
$LOWER_MAP = @{ 'tabindex'='tabIndex'; 'maxlength'='maxLength'; 'minlength'='minLength'; 'readonly'='readOnly'; 'autofocus'='autoFocus'; 'autocomplete'='autoComplete'; 'spellcheck'='spellCheck'; 'colspan'='colSpan'; 'rowspan'='rowSpan'; 'for'='htmlFor'; 'class'='className'; 'contenteditable'='contentEditable'; 'xlink:href'='xlinkHref'; 'srcset'='srcSet'; 'crossorigin'='crossOrigin'; 'datetime'='dateTime'; 'inputmode'='inputMode'; 'enterkeyhint'='enterKeyHint' }
$EVENTS = @{ 'onclick'='onClick'; 'oninput'='onInput'; 'onchange'='onChange'; 'onkeydown'='onKeyDown'; 'onkeyup'='onKeyUp'; 'onmousemove'='onMouseMove'; 'onmouseleave'='onMouseLeave'; 'onmouseenter'='onMouseEnter'; 'onmousedown'='onMouseDown'; 'onmouseup'='onMouseUp'; 'onwheel'='onWheel'; 'onpaste'='onPaste'; 'onfocus'='onFocus'; 'onblur'='onBlur'; 'onsubmit'='onSubmit'; 'onpointerdown'='onPointerDown'; 'onpointermove'='onPointerMove'; 'onpointerup'='onPointerUp'; 'oncontextmenu'='onContextMenu'; 'ondblclick'='onDoubleClick'; 'ondragstart'='onDragStart'; 'ondragover'='onDragOver'; 'ondrop'='onDrop'; 'ondragleave'='onDragLeave'; 'onscroll'='onScroll' }
$usesLink = $false; $usesImageSlot = $false; $usesDyn = $false; $usesCorvin = $false; $usesFragment = $false

function AttrName([string]$n, [bool]$isSvg) {
  $l = $n.ToLower()
  if ($EVENTS.ContainsKey($l)) { return $EVENTS[$l] }
  if ($LOWER_MAP.ContainsKey($l)) { return $LOWER_MAP[$l] }
  if ($n.StartsWith('aria-') -or $n.StartsWith('data-')) { return $n }
  if ($n -match '-') { return [regex]::Replace($n, '-([a-z])', { param($x) $x.Groups[1].Value.ToUpper() }) }
  return $n
}

function IsHeaderImport($n) { $n.tag -eq 'dc-import' -and $n.attrs['name'] -eq 'SagaHeader' }
function ElementKids($n) { @($n.kids | Where-Object { $_.tag -ne '#text' -or $_.text.Trim() }) }

function EmitText([string]$raw, $loops, [bool]$flexParent) {
  $collapsed = [regex]::Replace($raw, '\s+', ' ')
  if ($collapsed -eq ' ') { if ($flexParent) { return '' } ; return "{' '}" }
  $parts = [regex]::Split($collapsed, '(\{\{.*?\}\})')
  $out = ''
  foreach ($p in $parts) {
    if ($p -eq '') { continue }
    if ($p -match '^\{\{(.*)\}\}$') { $out += '{' + (HoleExpr $Matches[1] $loops) + '}'; continue }
    $txt = Decode $p
    if ($txt -match '^\s|\s$' -or $txt -match '[{}<>]') { $out += '{' + (JsStr $txt) + '}' } else { $out += $txt }
  }
  return $out
}

$INLINE = @('span','a','button','input','img','svg','strong','em','b','i','small','label','select','textarea','code','kbd','sup','sub','image-slot','dc-import')
# Espaço em branco só renderiza entre dois irmãos inline num pai que não é flex/grid.
function IsInlineNode($k) {
  if ($null -eq $k -or $k.tag -eq '#text' -or $k.tag -match '^sc-') { return $false }
  $d = StyleDisplay $k.attrs['style']
  if ($d) { return $d -match '^inline' }
  return $INLINE -contains $k.tag
}
function EmitKids($n, $loops, [string]$parentStyle) {
  $disp = StyleDisplay $parentStyle
  $flex = $disp -and $disp -match 'flex|grid'
  $kids = @($n.kids)
  $out = ''
  for ($i = 0; $i -lt $kids.Count; $i++) {
    $k = $kids[$i]
    if ($k.tag -eq '#text') {
      if (-not $k.text.Trim()) {
        if ($flex -or $i -eq 0 -or $i -eq $kids.Count - 1) { continue }
        if (-not ((IsInlineNode $kids[$i - 1]) -and (IsInlineNode $kids[$i + 1]))) { continue }
        $out += "{' '}"; continue
      }
      $t = $k.text
      if ($i -eq 0) { $t = $t.TrimStart() }
      if ($i -eq $kids.Count - 1) { $t = $t.TrimEnd() }
      $out += EmitText $t $loops $flex
    } else { $out += Emit $k $loops $parentStyle }
  }
  return $out
}

function MaskIcon($n, $loops, [string]$parentStyle) {
  $style = $n.attrs['style']
  if (-not $style -or $n.tag -ne 'span' -or @(ElementKids $n).Count -gt 0) { return $null }
  if ($style -notmatch '(?:^|;)\s*mask:url\(([^)]*)\)') { return $null }
  $url = $Matches[1]
  $drop = @{ 'background' = 1; '-webkit-mask' = 1; 'mask' = 1; 'width' = 1; 'height' = 1 }
  $w = if ($style -match '(?:^|;)\s*width:\s*(\d+(?:\.\d+)?)px') { $Matches[1] } else { '16' }
  $h = if ($style -match '(?:^|;)\s*height:\s*(\d+(?:\.\d+)?)px') { $Matches[1] } else { $w }
  $so = StyleObj $style $loops $drop
  # Span inline sem display, fora de flex/grid: no design não teria largura; o ícone fica inline-block.
  $pd = StyleDisplay $parentStyle
  if (-not (StyleDisplay $style) -and -not ($pd -and $pd -match 'flex|grid')) {
    $so = if ($so) { $so -replace '^\{ ', "{ display: 'inline-block', " } else { "{ display: 'inline-block' }" }
  }
  $styleAttr = if ($so) { " style={$so}" } else { '' }
  $cls = PseudoClass $n.attrs; $clsAttr = if ($cls) { " className=`"$cls`"" } else { '' }
  if ($url -match 'lucide-static@[\d.]+/icons/([\w-]+)\.svg') {
    $name = IconName $Matches[1]; [void]$usedIcons.Add($name)
    if ($CLASH -contains $name) { $name = "${name}Icon" }
    return "<$name width={$w} height={$h}$clsAttr$styleAttr />"
  }
  if ($url -match 'simple-icons@v\d+/icons/(\w+)\.svg') {
    $brand = (Get-Culture).TextInfo.ToTitleCase($Matches[1]) + 'Icon'; [void]$usedIcons.Add("brand:$brand")
    return "<$brand size={$w}$clsAttr$styleAttr />"
  }
  if ($url -match '^\{\{\s*temaIcon\s*\}\}$') {
    [void]$usedIcons.Add('Moon'); [void]$usedIcons.Add('Sun')
    return "<Moon width={$w} height={$h} data-tema-icon=`"claro`"$clsAttr$styleAttr /><Sun width={$w} height={$h} data-tema-icon=`"escuro`"$clsAttr$styleAttr />"
  }
  if ($url -match '^\{\{(.*)\}\}$') {
    $script:usesDyn = $true
    return "<DynIcon icon={$(HoleExpr $Matches[1] $loops)} width={$w} height={$h}$clsAttr$styleAttr />"
  }
  Warn "mask com url desconhecida: $url"
  return $null
}

function Emit($n, $loops, [string]$parentStyle) {
  $tag = $n.tag
  switch ($tag) {
    'sc-for' {
      $list = ValueExpr $n.attrs['list'] $loops
      $as = $n.attrs['as']; $idx = "${as}Idx"
      $inner = @($loops) + $as
      $ek = @(ElementKids $n)
      if ($ek.Count -eq 1 -and $ek[0].tag -ne '#text' -and $ek[0].tag -notmatch '^sc-') {
        $body = Emit $ek[0] $inner $parentStyle
        $body = $body -replace '^<([\w.]+)', "<`$1 key={$idx}"
        return "{$list.map(($as, $idx) => ($body))}"
      }
      $script:usesFragment = $true
      return "{$list.map(($as, $idx) => (<Fragment key={$idx}>$(EmitKids $n $inner $parentStyle)</Fragment>))}"
    }
    'sc-if' {
      $cond = ValueExpr $n.attrs['value'] $loops
      $ek = @(ElementKids $n)
      if ($ek.Count -eq 1 -and $ek[0].tag -ne '#text') { return "{$cond && ($(Emit $ek[0] $loops $parentStyle))}" }
      return "{$cond && (<>$(EmitKids $n $loops $parentStyle)</>)}"
    }
    'image-slot' { $script:usesImageSlot = $true; return "<ImageSlot src={v.`$img($(ValueExpr $n.attrs['id'] $loops))} />" }
    'dc-import' {
      $name = $n.attrs['name']
      if ($name -eq 'SagaHeader') { return '' }
      if ($name -eq 'Corvin') {
        $script:usesCorvin = $true
        $props = ''
        foreach ($k in $n.attrs.Keys) { if ($k -in 'variante','falando') { $props += " $k={$(ValueExpr $n.attrs[$k] $loops)}" } }
        return "<Corvin$props />"
      }
      Warn "dc-import desconhecido: $name"; return ''
    }
  }

  $ek = @(ElementKids $n)
  if ($ek.Count -eq 1 -and (IsHeaderImport $ek[0])) { return '' }   # wrapper sticky do header
  if ($SkipFirst -contains $tag -and -not $skipped[$tag]) { $skipped[$tag] = $true; return '' }

  $icon = MaskIcon $n $loops $parentStyle
  if ($icon) { return $icon }

  $isSvg = $tag -in 'svg','path','g','circle','ellipse','rect','line','polyline','polygon','text','tspan','defs','linearGradient','radialGradient','stop','clipPath','mask','filter','feTurbulence','feColorMatrix','feGaussianBlur','pattern','use','symbol'
  $jsxTag = $tag
  $attrsOut = @()
  $style = $n.attrs['style']
  $hasValue = $n.attrs.Contains('value')
  $isDcLink = $false
  foreach ($k in $n.attrs.Keys) {
    $val = $n.attrs[$k]
    if ($k -like 'hint-*' -or $k -in 'style','style-hover','style-focus','style-active') { continue }
    if ($k -eq 'data-tema') { continue }
    if ($k -eq 'data-k') { $attrsOut += "key={$(ValueExpr $val $loops)}"; continue }
    if ($k -eq 'href' -and $val -and $val -match '\.dc\.html') {
      $isDcLink = $true; $script:usesLink = $true
      $attrsOut += "href={v.`$href($(JsStr ([uri]::UnescapeDataString($val))))}"; continue
    }
    $name = AttrName $k $isSvg
    if ($name -eq 'onInput' -and ($tag -in 'input','textarea','select') -and $hasValue) { $name = 'onChange' }
    if ($null -eq $val) { $attrsOut += $name; continue }
    if ($val -match '\{\{') { $attrsOut += "$name={$(ValueExpr $val $loops)}" }
    elseif ($name -eq 'value' -and $tag -in 'input','textarea') { $attrsOut += "defaultValue=$(JsStr (Decode $val) | ForEach-Object { '{' + $_ + '}' })" }
    elseif ($name -in 'checked','selected') { $attrsOut += "default$($name.Substring(0,1).ToUpper())$($name.Substring(1))" }
    else { $attrsOut += "$name={$(JsStr (Decode $val))}" }
  }
  if ($isDcLink) { $jsxTag = 'Link' }
  $cls = PseudoClass $n.attrs
  if ($cls) { $attrsOut += "className=`"$cls`"" }
  if ($style) { $so = StyleObj $style $loops; if ($so) { $attrsOut += "style={$so}" } }
  $open = "<$jsxTag" + $(if ($attrsOut.Count) { ' ' + ($attrsOut -join ' ') } else { '' })
  if ($VOID -contains $tag.ToLower() -or $n.kids.Count -eq 0) { return "$open />" }
  return "$open>$(EmitKids $n $loops $style)</$jsxTag>"
}

$body = EmitKids $rootNode @() ''
$body = $body.Trim()

# ── Arquivos ──
New-Item -ItemType Directory -Force $OutDir | Out-Null
$lucide = @($usedIcons | Where-Object { $_ -notlike 'brand:*' })
$brands = @($usedIcons | Where-Object { $_ -like 'brand:*' } | ForEach-Object { $_.Substring(6) })
$imports = @("'use client'", '', '/* Gerado por scripts/dc-to-jsx.ps1 a partir de', "   $([IO.Path]::GetFileName($In)). Estilos 1:1 com o design; lógica em vals.ts. */", '')
$reactImp = @(); if ($usesFragment) { $reactImp += 'Fragment' }
if ($reactImp.Count) { $imports += "import { $($reactImp -join ', ') } from 'react'" }
if ($usesLink) { $imports += "import Link from 'next/link'" }
if ($lucide.Count) { $imports += "import { $(($lucide | ForEach-Object { if ($CLASH -contains $_) { "$_ as ${_}Icon" } else { $_ } }) -join ', ') } from 'lucide-react'" }
$uiImp = @($brands); if ($usesImageSlot) { $uiImp += 'ImageSlot' }; if ($usesDyn) { $uiImp += 'DynIcon' }
if ($uiImp.Count) { $imports += "import { $($uiImp -join ', ') } from '@/components/ui/saga'" }
if ($usesCorvin) { $imports += "import { Corvin } from '@/components/corvin/Corvin'" }
$imports += "import type { Vals } from './vals'"
$imports += "import './$Prefix.css'"
$tsx = ($imports -join "`n") + "`n`nexport function Template({ v }: { v: Vals }) {`n  return (`n    $body`n  )`n}`n"
[IO.File]::WriteAllText((Join-Path $OutDir 'Template.tsx'), $tsx)

$cssOut = [System.Text.StringBuilder]::new()
[void]$cssOut.AppendLine("/* Gerado por scripts/dc-to-jsx.ps1 a partir de $([IO.Path]::GetFileName($In)). */")
foreach ($k in $keyframes.Keys) { [void]$cssOut.AppendLine("@keyframes $Prefix-$k {$($keyframes[$k])}") }
[void]$cssOut.Append($hoverCss.ToString())
[IO.File]::WriteAllText((Join-Path $OutDir "$Prefix.css"), $cssOut.ToString())

# ── Relatório: o que o vals.ts precisa fornecer ──
$holes = [System.Collections.Generic.SortedSet[string]]::new()
foreach ($h in [regex]::Matches($tsx, '(?<![\w.$])v\.([\w$]+)')) { [void]$holes.Add($h.Groups[1].Value) }
"Template: $(Join-Path $OutDir 'Template.tsx')  ($([math]::Round($tsx.Length/1KB)) KB)"
"Keyframes: $($keyframes.Keys -join ', ')"
"Valores usados (v.*): $($holes -join ', ')"
if ($warnings.Count) { 'AVISOS:'; $warnings | Sort-Object -Unique | ForEach-Object { "  - $_" } }
