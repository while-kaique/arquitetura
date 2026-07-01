# Projeto Arquitetura de Computadores

Este repositorio tem DUAS fases distintas. Leia a que for relevante.

- **Fase 1 — Simulador de CPU em Python** (ENTREGUE, aprovado). Trabalho ja
  submetido; as 4 questoes foram enviadas e passaram. Mantido no repo como
  referencia. Ver secao "Fase 1" no fim deste arquivo.
- **Fase 2 — Prep de prova em Assembly x86 (FOCO ATUAL).** Preparacao para uma
  prova pratica surpresa no laboratorio. Ver logo abaixo.

---

# Convencoes de trabalho (SEMPRE seguir)

1. **Sempre usar worktree do git para trabalhos paralelos.** Antes de comecar
   qualquer tarefa de implementacao, crie/entre num worktree isolado (nao
   trabalhe direto na `main`). Isso mantem a `main` limpa e permite revisar/mergear
   depois. Ao terminar, commite no branch do worktree e mergeie na `main`.
2. **Sempre manter este CLAUDE.md atualizado.** A cada mudanca relevante no
   projeto (codigo, worker, fluxo, decisoes), atualize este arquivo no mesmo
   trabalho — nunca deixe o CLAUDE.md desatualizado em relacao ao que foi feito.
3. **Sempre manter a pagina `/help` do worker atualizada.** Toda vez que mudar
   rota, fluxo ou funcionalidade do site, atualize a funcao `help()` em
   `arq-worker/worker.template.js` (e o teste de `/help`) no mesmo trabalho.
   O `/help` deve sempre refletir o que o site realmente faz.

---

# FASE 2 — Prova pratica de Assembly x86 (foco atual)

## O cenario da prova

- Prova **surpresa** no laboratorio. Entra na sala, escolhe **1 questao** de uma
  lista pre-selecionada e escreve o codigo em Assembly x86 **modo real** que
  **precisa rodar na hora, na frente do professor**. Se roda, tira 10.
- As aulas finais da disciplina foram todas x86 modo real: interrupcao de
  teclado, leitura de disco, carregar imagem do disco, sprites/interacao
  (`aula4.asm`..`aula9.asm`, arquivos do professor).
- **A unica coisa que realmente precisa ser implementada e o `GET i`**: ler uma
  entrada de numero pelo teclado e transformar em numero de fato (ASCII ->
  inteiro). O resto e adaptar os codigos que o professor ja forneceu.
- Ambiente da prova: NASM + QEMU. (Um colega perdeu tempo instalando VirtualBox +
  NASM + atualizando APT no Linux; por isso os guias trazem instrucao de
  instalacao rapida.)

## Formato dos programas

Todos os programas sao **boot sectors** de 512 bytes que rodam em bare metal
(nao dependem de OS). Rodam tanto em **VirtualBox** quanto em **QEMU**:

- Prologo **robusto** (padronizado para funcionar bem no VirtualBox, e tambem
  no QEMU):
  ```
  org 0x7c00
  bits 16
  xor ax, ax
  mov ds, ax
  mov ss, ax
  mov sp, 0x7c00     ; monta a pilha (necessario p/ call/ret e push/pop)
  sti                ; liga interrupcao (necessario p/ ler teclado via BIOS)
  ```
  Antes usavamos `cli` e nao montavamos a pilha — funcionava no QEMU por sorte,
  mas era risco no VirtualBox. O `sti` + stack explicita elimina isso.
- Leem um numero pelo teclado via `int 0x16` (rotina `geti` = o "GET i").
- Ecoam e imprimem via `int 0x10`.
- Terminam **obrigatoriamente** com a assinatura de boot:
  ```
  times 510 - ($ - $$) db 0
  db 0x55
  db 0xaa
  ```
- Aritmetica em 16 bits — funcionam com numeros ate **65535**.

### Montar e rodar

**VirtualBox (recomendado — mais provavel no laboratorio):**
```
nasm -f bin prova.asm -o prova.bin
fsutil file createnew pad.img 1474048
copy /b prova.bin+pad.img prova.img     ; prova.img fica com 1.44MB exatos
```
Depois: criar VM (Type Other, sem HD), anexar `prova.img` como disquete,
por Disquete no topo da ordem de boot, Start. Instalacao:
`winget install NASM.NASM` e `winget install Oracle.VirtualBox`.

**QEMU (mais simples de rodar, se disponivel):**
```
nasm -f bin prova.asm -o prova.bin
qemu-system-i386 -fda prova.bin
```
Instalacao (Windows): `winget install NASM.NASM` e
`winget install SoftwareFreedomConservancy.QEMU`.
Linux: `sudo apt update && sudo apt install nasm qemu-system-x86`.

> NASM instalado nesta maquina em `C:\Users\User\AppData\Local\bin\NASM\nasm.exe`
> (nao esta no PATH do PowerShell/bash por padrao).

## Questoes resolvidas

Cada questao tem **duas versoes** (ambas montadas e verificadas: 512 bytes,
assinatura `55 aa`):
- **enxuta** (~30 linhas) — recomendada para digitar rapido na prova.
- **extensa** (~79 linhas) — comentada, com `push`/`pop` e labels descritivos.

| Q | Nome | Logica |
|---|------|--------|
| `50` | Ano bissexto | divisivel por 400 -> sim; senao por 100 -> nao; senao por 4 -> sim |
| `54` | Numero triangular | testa `k*(k+1)*(k+2)` para k=1,2,... ate igualar/passar de n |
| `55` | Numero perfeito | soma divisores proprios (1..n-1); perfeito se soma == n |

## Arquivos da Fase 2

| Arquivo | Funcao |
|---------|--------|
| `GUIA_PROVA_BISSEXTO.md`   | Guia da Q50: explicacao + as 2 versoes copiaveis |
| `GUIA_PROVA_TRIANGULAR.md` | Guia da Q54: explicacao + as 2 versoes copiaveis |
| `GUIA_PROVA_PERFEITO.md`   | Guia da Q55: explicacao + as 2 versoes copiaveis |
| `arq-worker/`              | Cloudflare Worker que serve os codigos (ver abaixo) |

## arq-worker (Cloudflare Worker "arq-prova")

Worker que serve o assembly das questoes como `text/plain`, para abrir o link no
dia da prova, **Ctrl+A -> Ctrl+C**, colar e rodar. A pagina indice tem um guia
com **duas opcoes** (VirtualBox e QEMU), cada uma na ordem
**instalar -> configurar -> pegar/rodar o codigo**, + tabela de problemas comuns.

**Rotas:**

| Rota | Devolve |
|------|---------|
| `/` | pagina indice (guia VirtualBox + QEMU + lista de cadastradas) |
| `/help` | pagina de ajuda: explica ver/cadastrar questoes + links das paginas |
| `/api/arq/{q}` | versao **enxuta** (recomendada) |
| `/req_full/{q}` | versao **extensa** |
| `/dev` | **terminal falso** (cmd.exe) vazio: so o prompt com cursor piscando |
| `/dev/{q}` | se `{q}` existe (assada **ou** cadastrada): terminal com o codigo. Se NAO existe: **formulario de cadastro** |
| `/dev/{q}/full` | terminal falso com a versao **extensa** (so p/ as assadas) |
| `POST /dev/{q}` | **salva** o codigo colado no KV (write-once) e mostra o terminal |

`q` assadas = `50` (bissexto), `54` (triangular), `55` (perfeito). Qualquer outro id
(`[A-Za-z0-9_-]{1,40}`) pode ser cadastrado pela turma.

**Cadastro aberto de questoes (`/dev/{n}` + Workers KV).** Se `{n}` nao existe,
`/dev/{n}` mostra um formulario (estilo cmd) pra colar o assembly; ao salvar, vai
pro **Workers KV** (binding `KV`, namespace `arq-questoes`) e passa a abrir em
`/dev/{n}` pra todo mundo. **Write-once:** uma vez que `{n}` tem codigo (assada ou
no KV) **nunca** e sobrescrito — as assadas `50/54/55` ficam protegidas por isso.
Sem senha (uso combinado, poucas pessoas); protecoes: teto de 100 KB, validacao
leve (avisa+pede confirmacao se faltar `org 0x7c00`/`db 0xaa`), e escape de `& < >`
(anti-XSS, ja que o texto e publico). Leitura tambem cai no KV em `/api/arq/{n}`.
O indice lista as cadastradas ("Questoes cadastradas", badge `base` vs `turma`).
> O KV existe **so na conta UFC** (`kaique-ufc`). A gocase nao tem esse binding
> (e nao mexemos mais nela).

**Modo terminal (`/dev`) — disfarce visual.** Pagina HTML que IMITA o Prompt de
Comando do Windows (fundo `#0c0c0c`, fonte Consolas 16px cor `#cccccc`, cabecalho
`Microsoft Windows [versao ...]`, prompt `C:\Users\User>copy con prova.asm` e um
**cursor bloco piscando** colado no fim do codigo). **Nao e um terminal de
verdade** — nao roda nem le pastas; e texto fixo com cara de cmd, pra abrir em
tela cheia (F11) e copiar com discricao. So a regiao `<span class="code">` e
selecionavel; o cabecalho/prompt tem `user-select:none`, entao **Ctrl+A -> Ctrl+C
copia exatamente o assembly** (sem o cabecalho). O indice tem uma coluna
**Terminal** linkando `/dev/{q}` e `/dev/{q}/full`. A funcao `dev()` normaliza
CRLF->LF e escapa `& < >` (o assembly usa `->` nos comentarios) via `esc()`.

**Estrutura (o worker.js e GERADO — nao editar na mao):**
- `asm/{q}_{curto|full}.asm` — as **fontes** de verdade dos 6 programas.
- `worker.template.js` — roteamento (`fetch(request, env)`) + `index()` (async,
  guia VBox/QEMU + lista de cadastradas), `handleDev()` (GET mostra codigo/form,
  POST salva write-once), `devPage()` (terminal cmd), `formPage()` (form de
  cadastro), `help()` (pagina de ajuda — manter em dia, convencao #3),
  `listaCadastradas()`, `esc()`. Placeholders `__CODE_PLACEHOLDER__` /
  `__NOMES_PLACEHOLDER__`. O acesso ao KV e `env.KV` (com guarda: sem KV a feature
  desliga sozinha, e os testes rodam com um KV falso em memoria).
- `build_worker.js` — le os `.asm`, embute e gera `src/worker.js`.
  Rodar: `node build_worker.js`.
- `test_worker.mjs` — testa rotas e confere que o servido == os `.asm`.
  Rodar: `node test_worker.mjs`.
- `src/worker.js` — **gerado**, nao editar.
- `wrangler.toml` / `package.json` (`type: module`; scripts `dev`/`deploy`).

**Editar codigos:** edite o `.asm` em `asm/`, rode `node build_worker.js`, depois
`node test_worker.mjs`, e re-deploy. As versoes servidas devem bater com os
`GUIA_PROVA_*.md`.

> CUIDADO (bug ja corrigido): `build_worker.js` injeta o codigo com **funcao** de
> substituicao no `.replace`, nao string. Com string, `String.replace` interpreta
> `$$` (que existe em `times 510 - ($ - $$)`) como `$`, gerando boot sector
> invalido. Nunca trocar por substituicao via string.

**Deploy** (dentro de `arq-worker/`):
```
node build_worker.js   # regenera src/worker.js a partir dos .asm
npx wrangler login     # so na 1a vez
npx wrangler deploy
```
URL publica (conta UFC): `https://arq-prova.kaique-ufc.workers.dev`.
Existe tambem uma copia antiga em `https://arq-prova.kaique-rpa.workers.dev`
(conta gocase) — **congelada, sem KV**; nao mexemos mais nela.

**Setup do KV (uma vez por conta):** `npx wrangler kv namespace create arq-questoes`
-> pega o `id` e poe no `wrangler.toml` como `[[kv_namespaces]] binding="KV" id="..."`.
Na conta UFC o namespace `arq-questoes` ja existe (id no `wrangler.toml`).
Apagar uma questao cadastrada: `npx wrangler kv key delete --binding KV "q:{n}"`
(ou `--namespace-id`).

**Como rodar o que o worker serve** (resumo; detalhes na pagina indice):
- **VirtualBox:** `nasm -f bin prova.asm -o prova.bin` -> `fsutil file createnew
  pad.img 1474048` -> `copy /b prova.bin+pad.img prova.img` -> anexar como
  disquete e dar boot.
- **QEMU:** `nasm -f bin prova.asm -o prova.bin` -> `qemu-system-i386 -fda prova.bin`.

## Possiveis proximas questoes (nao resolvidas)

- **Q53** — ler um caractere e contar quantas vezes aparece num texto carregado do
  disco (arquivo concatenado ao binario via `cat`/`type`). Envolve leitura de
  disco (aula5/aula6), nao so `geti`. Avaliada mas nao implementada.

---

# FASE 1 — Simulador de CPU em Python (ENTREGUE, aprovado)

> Trabalho ja submetido e aprovado. Secao mantida como referencia; nao e o foco
> atual. As pendencias de validacao que existiam (formato de binario, quem
> fornece cada modulo, etc.) foram resolvidas na entrega.

Simulador de CPU didatico. Fluxo: `.asm` -> `assembler.py` -> `.bin` ->
`computador.py` -> resultado.

## Arquivos

| Arquivo | Funcao |
|---------|--------|
| `memory.py` | Memoria (1024 words x 32 bits) |
| `ufc2x.py` | Processador/CPU (`step()`, 22 instrucoes) |
| `clock.py` | Clock que chama `step()` em loop, conta ticks |
| `disk.py` | Le `.bin` e carrega na memoria |
| `assembler.py` | `.asm` -> `.bin` (suporta labels, `.data`, comentarios `;`) |
| `computador.py` | Script principal — orquestra tudo |
| `soma.asm` / `subtracao.asm` / `multiplicacao.asm` / `fatorial.asm` | Programas |
| `computador_avaliador.py` / `clocl_avaliador.py` | Arquivos do professor (ref.) |

## Arquitetura

- **Memoria**: 1024 words de 32 bits (mascara `0xFFFFFFFF`). Enderecos
  reservados: `0`=NOP, `1`=saida, `2`=entrada1, `3`=entrada2, `4+`=codigo.
- **Registradores**: A (idx 0), B (idx 1), PC (comeca em 4, pula os 4 NOPs).
- **Instrucao (32 bits)**: `[8 opcode][4 reg][20 imediato/endereco]`.
- **Binario**: 4 bytes por word, big-endian.
- **Flags**: `zero_flag`, `sign_flag`.
- **1 tick = 1 `step()`** bem-sucedido; HALT retorna False (nao conta tick).

### ISA — 22 instrucoes

| Mnemonic | Opcode | Descricao |
|----------|--------|-----------|
| NOP | 0x00 | nada |
| LOAD R, addr | 0x01 | R = mem[addr] |
| STORE R, addr | 0x02 | mem[addr] = R |
| LOADI R, val | 0x03 | R = val (imediato 20 bits) |
| ADD R, addr | 0x04 | R = R + mem[addr] |
| SUB R, addr | 0x05 | R = R - mem[addr] |
| MUL R, addr | 0x06 | R = R * mem[addr] |
| DIV R, addr | 0x07 | R = R / mem[addr] |
| AND R, addr | 0x08 | R = R & mem[addr] |
| OR R, addr | 0x09 | R = R \| mem[addr] |
| NOT R | 0x0A | R = ~R |
| JMP addr | 0x0B | PC = addr |
| JZ addr | 0x0C | se zero_flag: PC = addr |
| JNZ addr | 0x0D | se !zero_flag: PC = addr |
| JG addr | 0x0E | se A > B: PC = addr |
| HALT | 0x0F | para a CPU |
| ADDI R, val | 0x10 | R = R + val |
| SUBI R, val | 0x11 | R = R - val |
| MOV R1, R2 | 0x12 | R1 = R2 |
| CMP R, addr | 0x13 | compara, seta flags |
| MODI R, val | 0x14 | R = R % val |
| MOD R, addr | 0x15 | R = R % mem[addr] |

### Uso
```
python assembler.py programa.asm       # gera programa.bin
python computador.py programa.bin 5 3   # executa com inputs
# Saida: resultado ; ticks
```

### Testes validados
soma(5,3)=8 [3t]; subtracao(10,4)=6 [3t]; multiplicacao(6,7)=42 [3t];
fatorial(5)=120 [53t]; fatorial(10)=3628800 [98t].
