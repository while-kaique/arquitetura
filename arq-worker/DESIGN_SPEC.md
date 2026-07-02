# Redesign — página inicial (`/`) e ajuda (`/help`)

> Escopo: **só** as páginas que **não** pertencem ao `/dev`. As telas de `/dev`
> (`devPage`, `formPage`, `blockPage`) continuam imitando o Prompt de Comando —
> **não são tocadas**. Aqui redesenhamos `index()` e `help()` em
> `worker.template.js`, mantendo o build (`node build_worker.js`) e os testes
> (`node test_worker.mjs`) passando.

## Brief (fixado)

- **Assunto:** um "cofre de códigos" de prova em Assembly x86 modo real
  (boot sectors de 512 bytes que terminam em `55 AA`).
- **Público:** colegas no laboratório sob pressão de tempo no dia da prova +
  quem chega novo e lê o `/help`.
- **Trabalho da página (um só):** levar a pessoa de "preciso do código da questão
  X" até "está rodando na tela" o mais rápido e confiante possível — e ensinar
  a instalar/rodar (NASM + VirtualBox/QEMU).

## Direção: "datasheet de boot sector"

Fundo de papel técnico **claro e frio** (não creme), tinta quase-preta,
**cabeçalhos e comandos em mono** / **corpo em sans**. As duas formas de rodar
são enquadradas como um **menu de bootloader** (VirtualBox = entrada *default*,
recomendada). Assinatura da página: os bytes mágicos **`55 AA`** que todo
programa desses tem no fim.

Escolha deliberada de divergir dos 3 defaults de IA: o look "terminal preto +
verde ácido" seria o óbvio pra esse assunto — e é justamente o que as telas
`/dev` já são. A home vira o oposto (datasheet claro), pra ler como **guia**, não
como terminal, e criar contraste com o `/dev`.

### Tokens

**Cor**
- `--paper #EEF1F7` — papel técnico frio (base)
- `--panel #FFFFFF` — cartões
- `--ink   #161A22` — texto
- `--muted #5B6270` — texto secundário / captions
- `--line  #D4DAE6` — hairlines / bordas
- `--accent #1F3BE0` — "boot blue": estrutura, links, ação primária
- `--signal #C8791A` — âmbar, **reservado** só pro selo `55 AA` e pro badge
  "recomendada" (o sinal do próprio assunto: os bytes mágicos são um sinal)

**Tipo**
- Corpo: `ui-sans-serif, -apple-system, "Segoe UI", Roboto, system-ui, sans-serif`
- Mono (títulos, comandos, dados, número da questão):
  `"Cascadia Code","Cascadia Mono",ui-monospace,"SF Mono",Consolas,monospace`
- Dispositivo: "prosa = orientação humana (sans), mono = verdade da máquina".
- Escala: hero `clamp(2rem,6vw,3.2rem)` · h2 `1.5rem` · h3 `1.05rem` ·
  corpo `1rem/1.65` · caption/dado `.8rem`.
- **Fontes só do sistema** (sem Google Fonts): dia de prova pode ser wi-fi ruim
  ou offline — nada de request externo.

**Layout** (topo → base, em ordem de importância)
1. **Barra de status "POST"** fina e fixa: `ARQ//x86 · boot sector 512B · 55 AA`
   + link `/help`.
2. **Hero** curto: eyebrow, H1 em mono ("Pega o código. Cola. Dá boot."), sub em
   sans, dois chips (`NASM` · `até 65535`).
3. **Cofre de questões** (maior destaque — é a ação do dia da prova):
   "Questões cadastradas" como **grade de cartões**; número **grande**, nome,
   ações `terminal` / `texto`. Base (50/54/55) + turma (KV). Dica de cadastrar.
4. **Menu de boot** — as duas opções como entradas de bootloader; VirtualBox com
   `▶` de entrada default + badge "recomendada".
5. **Passos** de cada opção (1 instalar → 2 configurar → 3/4 rodar/pegar) com
   **botões de copiar** em cada bloco de comando (utilidade real). Passo "pegar o
   código" repete um mini-cofre de links (satisfaz o teste de 2 ocorrências).
6. **Problemas comuns** (tabela limpa).
7. **Rodapé** com o selo `55 AA` (fim do setor).

**Assinatura:** o par `55 AA` (mono, âmbar) na barra de status e no rodapé, como
"fim do setor de boot" — espelha o `db 0x55 / db 0xaa` que fecha todo programa. +
o enquadramento de menu de bootloader com a entrada *default* marcada.

### Movimento (contido, respeita `prefers-reduced-motion`)
- Hero: uma revelação única no load (eyebrow/H1 sobem/aparecem). Curto.
- Cartões: hover com leve elevação + borda de acento.
- Botões copiar: clique → estado "copiado ✓".
- Sem parallax, sem scroll-jacking.

### Funcional / dinâmico
- **Copiar** em todo bloco de comando (nasm/fsutil/copy/qemu/winget…).
- Cartões de questão linkam `/dev/{q}` (terminal) e `/api/arq/{q}` (texto).

## Restrições técnicas (não quebrar)
- `src/worker.js` é **gerado** — editar só `worker.template.js`; depois
  `node build_worker.js` + `node test_worker.mjs`.
- Placeholders `__CODE_PLACEHOLDER__` / `__NOMES_PLACEHOLDER__` intactos.
- **Strings fixadas pelos testes que precisam continuar existindo:**
  - Índice: `Opção A — VirtualBox`, `Opção B — QEMU`, `Questões cadastradas`,
    `fsutil file createnew pad.img 1474048`, `copy /b prova.bin+pad.img prova.img`,
    `qemu-system-i386 -fda prova.bin`, `api/arq/50` (≥2×), `href="/help"`,
    e cada questão cadastrada renderiza `/dev/{id}` + nome.
  - Ajuda: `como usar o site`, `Como ver uma questão`, `Como cadastrar uma questão`,
    `href="/dev/50"`, `/api/arq/{id}`, `href="/help"`.
- Escapar `& < >` no conteúdo dinâmico (nomes de questões da turma) via `esc()`.
- `/help` deve refletir o site (convenção #3). CLAUDE.md atualizado (convenção #2).
</content>
