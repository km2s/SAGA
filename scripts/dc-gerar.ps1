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
    $c = WrapEnclosing $c 'onClick={v.endAsk}' 'button' 'v.podeEncerrar'
    # Tabuleiro cresce com o mapa e os tokens; o mapa é a imagem da sessão no tamanho natural (como na Mesa antiga).
    $c = Rep $c "width: '1200px', height: '800px', transformOrigin" 'width: `${v.boardW}px`, height: `${v.boardH}px`, transformOrigin'
    $c = Rep $c "<svg width={'1200'} height={'800'}" '<svg width={v.boardW} height={v.boardH}'
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
    # Encerrar: leva ao resumo da sessão.
    $c = Rep $c "href={v.`$href('SAGA Campanhas.dc.html')}" 'href={v.resumoHref}'
    Rep $c '>Voltar às campanhas</Link>' '>Escrever o resumo</Link>'
  } 'campanha, sessão, presença, tokens, mapa, música, chat, handouts, ao vivo e fichas reais; controles do mestre só para ele; sem cenas e sem rolagens privadas (TODO(api)).'
}'pronto'
