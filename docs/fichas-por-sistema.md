# Fichas por Sistema — como está montado

Design: `SAGA Fichas por Sistema` (moldura) + `SAGA Pecas de Ficha` (o que vai dentro das abas de seção).
Rota: `/personagens/[id]` quando o sistema não é D&D 5e (o D&D 5e tem a `SAGA Ficha` própria).

## Peças
- `components/ficha-sistema/Pecas.tsx`: os 7 widgets genéricos do catálogo (texto, linhas, caixas, chips,
  passos, tabela, cartões), com o markup do `SAGA Pecas de Ficha`. Recebe objetos já prontos (`W`).
- `lib/ficha-sistema/specs.ts`: um `SistemaSpec` por sistema (atributos, trilhas, pílulas, seções → peças).
- `lib/ficha-sistema/montar.ts`: transforma spec + dados reais da ficha nos objetos do template e grava.

## Dados (os mesmos das fichas antigas, para ninguém perder nada)
- Atributo: `CharacterAttribute` pelo nome; grupos pelo prefixo da descrição do seed (`lib/systems-seed.ts`,
  ex. "Habilidade Social —", "Disciplina —"). Grava com `PATCH /api/characters/[id]/attributes/[attrId]`.
- Texto: `CharacterTextField` pela chave que a ficha antiga já usava. Grava com `POST /api/characters/[id]/text-fields`.
- Armas: `CharacterWeapon` (`/weapons`). Espaços de magia: `/spell-slots`.
- Codificações herdadas: saúde V5/Crônicas = CSV `0,1,2` em `healthDamage`; Força de Vontade gasta = número
  em `willpowerUsed`. Cada spec cita a chave da ficha antiga de onde veio.

## Andamento
Família por família; cada sistema migrado sai da `FichaAntiga`. Os que faltam continuam com a ficha antiga.
- Bolinhas (feito): V5, V20 (e "Vampire: The Masquerade"), Lobisomem, Mago A Ascensão, Mago O Despertar, Caçador, Changeling, Demônio, Geist.
- Falta: d20 (D&D 3.5, Pathfinder 1e/2e, Tormenta20, Starfinder, 13th Age), porcentagem (CoC 7e, Delta Green, Mothership),
  2d6 (Dungeon World, Ironsworn), narrativos (Fate, Blades), paradas (Shadowrun 6e, Cyberpunk Red, Star Wars), passos (Savage, GURPS).
- Depois: Ficha NPC (mesma moldura em modo NPC) e o mapa novo da Mesa e do Painel do Mestre (design de 2026-11-08).
