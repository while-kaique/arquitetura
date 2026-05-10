# Projeto Arquitetura de Computadores - CPU Simulada

## Visao Geral
Simulador de CPU didatico em Python. Fluxo completo: `.asm` -> `assembler.py` -> `.bin` -> `computador.py` -> resultado.

---

## Arquivos do Projeto

| Arquivo | Funcao | Status |
|---------|--------|--------|
| `memory.py` | Modulo de memoria (1024 words x 32 bits) | Pronto |
| `ufc2x.py` | Processador/CPU (metodo `step()`, 22 instrucoes) | Pronto |
| `clock.py` | Clock que chama `step()` em loop, conta ticks | Pronto |
| `disk.py` | Le arquivo `.bin` e carrega na memoria | Pronto |
| `assembler.py` | Transforma `.asm` em `.bin` (suporte a labels) | Pronto |
| `computador.py` | Script principal — orquestra tudo | Pronto |
| `soma.asm` | Programa: A + B | Pronto (provisorio) |
| `subtracao.asm` | Programa: A - B | Pronto (provisorio) |
| `multiplicacao.asm` | Programa: A * B | Pronto (provisorio) |
| `fatorial.asm` | Programa: N! | Pronto (provisorio) |
| `computador_avaliador.py` | Arquivo do professor (referencia) | Referencia |
| `clocl_avaliador.py` | Arquivo do professor (referencia) | Referencia |

---

## O Que Sabemos (confirmado pelos arquivos do avaliador)

### Do `computador_avaliador.py`:
1. **Importa modulos**: `memory`, `clock`, `ufc2x as cpu`, `disk` — nomes obrigatorios
2. **Leitura do binario**: `disk.read(sys.argv[1])`
3. **Inputs**: `memory.write_word(2, input1)` e `memory.write_word(3, input2)`
4. **Saida zerada antes**: `memory.write_word(1, 0)`
5. **Execucao**: `clock.start([cpu])` retorna ticks
6. **Resultado**: `print(memory.read_word(1), ";", ticks)`
7. **Words sao 32 bits**: `int(sys.argv[2]) & 0xFFFFFFFF`
8. **Inputs podem ser negativos**: o `& 0xFFFFFFFF` sugere complemento de 2
9. **Pode ter 1 ou 2 inputs**: `if len(sys.argv) > 2` e `if len(sys.argv) == 4`
10. **Ordem de execucao**: carrega bin -> escreve inputs -> zera saida -> executa

### Do `clocl_avaliador.py` (clock):
1. **`ticks` e global**, comeca em 0
2. **Loop**: chama `dev.step()` para cada device
3. **step() retorna True** = continua, **False** = para (HALT)
4. **Cada step bem-sucedido = 1 tick**
5. **`auto=True`** por padrao (sem input interativo)

---

## Especificacoes da Arquitetura (nossas decisoes)

### Memoria
- **Tamanho**: 1024 words
- **Word**: 32 bits (unsigned, mascara `0xFFFFFFFF`)
- **Endereco 0**: reservado (NOP do assembler)
- **Endereco 1**: SAIDA (resultado do programa)
- **Endereco 2**: ENTRADA 1 (operando 1)
- **Endereco 3**: ENTRADA 2 (operando 2)
- **Enderecos 4+**: codigo do programa (instrucoes)
- **Enderecos 100+**: area livre para variaveis auxiliares

### Registradores
- **A** (indice 0): acumulador principal
- **B** (indice 1): registrador auxiliar
- **PC**: program counter (comeca em 4, pula os enderecos reservados)

### Formato da Instrucao (32 bits)
```
[8 bits opcode] [4 bits reg] [20 bits imediato/endereco]
  bits 31-24      bits 23-20      bits 19-0
```

### Conjunto de Instrucoes (ISA) — 22 instrucoes

| Mnemonic | Opcode | Formato | Descricao |
|----------|--------|---------|-----------|
| NOP | 0x00 | NOP | Nao faz nada |
| LOAD | 0x01 | LOAD R, addr | R = mem[addr] |
| STORE | 0x02 | STORE R, addr | mem[addr] = R |
| LOADI | 0x03 | LOADI R, val | R = val (imediato, 20 bits) |
| ADD | 0x04 | ADD R, addr | R = R + mem[addr] |
| SUB | 0x05 | SUB R, addr | R = R - mem[addr] |
| MUL | 0x06 | MUL R, addr | R = R * mem[addr] |
| DIV | 0x07 | DIV R, addr | R = R / mem[addr] (inteiro) |
| AND | 0x08 | AND R, addr | R = R & mem[addr] |
| OR | 0x09 | OR R, addr | R = R \| mem[addr] |
| NOT | 0x0A | NOT R | R = ~R |
| JMP | 0x0B | JMP addr | PC = addr |
| JZ | 0x0C | JZ addr | se zero_flag: PC = addr |
| JNZ | 0x0D | JNZ addr | se !zero_flag: PC = addr |
| JG | 0x0E | JG addr | se A > B (unsigned): PC = addr |
| HALT | 0x0F | HALT | Para a CPU (step retorna False) |
| ADDI | 0x10 | ADDI R, val | R = R + val (imediato) |
| SUBI | 0x11 | SUBI R, val | R = R - val (imediato) |
| MOV | 0x12 | MOV R1, R2 | R1 = R2 |
| CMP | 0x13 | CMP R, addr | Compara R com mem[addr], seta flags |
| MODI | 0x14 | MODI R, val | R = R % val (imediato) |
| MOD | 0x15 | MOD R, addr | R = R % mem[addr] |

### Flags
- **zero_flag**: True quando resultado da ultima operacao = 0
- **sign_flag**: True quando bit 31 do resultado = 1 (negativo em complemento de 2)
- Atualizadas por: LOAD, LOADI, ADD, SUB, MUL, DIV, AND, OR, NOT, ADDI, SUBI, MOV, CMP, MODI, MOD

### Assembler
- Adiciona 4 NOPs automaticamente nos enderecos 0-3
- Suporta labels (ex: `LOOP:`) resolvidos para enderecos absolutos
- Suporta secao `.data` para variaveis
- Comentarios com `;`
- Gera binario big-endian, 4 bytes por word

---

## Fluxo de Uso

### Montar e executar:
```bash
python assembler.py programa.asm           # gera programa.bin
python computador.py programa.bin 5 3      # executa com inputs 5 e 3
# Saida: resultado ; ticks
```

### Fluxo interno:
```
programa.asm
  |  assembler.py
  v
programa.bin (words de 32 bits, big-endian)
  |  disk.read() carrega na memoria
  v
memoria[0..N] = instrucoes
  |  avaliador escreve inputs em mem[2] e mem[3], zera mem[1]
  v
clock.start([cpu]) -> cpu.step() em loop
  |  cada step = busca + decodifica + executa
  v
HALT -> resultado em memoria[1], total de ticks
```

---

## Testes Validados

| Programa | Entrada | Saida Esperada | Saida Real | Ticks |
|----------|---------|----------------|------------|-------|
| soma | 5, 3 | 8 | 8 | 3 |
| soma | 0, 0 | 0 | 0 | 3 |
| soma | 100, 200 | 300 | 300 | 3 |
| subtracao | 10, 4 | 6 | 6 | 3 |
| multiplicacao | 6, 7 | 42 | 42 | 3 |
| fatorial | 5 | 120 | 120 | 53 |
| fatorial | 1 | 1 | 1 | 17 |
| fatorial | 0 | 1 | 1 | 8 |
| fatorial | 10 | 3628800 | 3628800 | 98 |

---

## PENDENCIAS DE VALIDACAO

Itens que PRECISAM ser confirmados com o professor ou com material da disciplina.
Cada item pode fazer o projeto falhar se estiver diferente do esperado.

### P1 — Nome do modulo da CPU
- **O que fizemos**: arquivo `ufc2x.py`
- **O que o avaliador diz**: `import ufc2x as cpu`
- **Risco**: BAIXO — o nome `ufc2x` esta confirmado pelo avaliador
- **Mas**: se o professor mudar o nome do import no avaliador dele, precisamos renomear

### P2 — Nome do arquivo clock
- **O que fizemos**: `clock.py`
- **O que o avaliador diz**: `import clock` (no computador_avaliador) MAS o arquivo dele se chama `clocl_avaliador.py` (com typo "clocl")
- **Risco**: MEDIO — o avaliador real pode importar `clock` ou `clocl`
- **Acao**: perguntar ao professor se e `clock` ou `clocl`. Nosso import usa `clock`

### P3 — PC inicial: 0 ou 4?
- **O que fizemos**: PC comeca em 4 (pula os 4 NOPs que o assembler insere)
- **Risco**: ALTO — se o avaliador do professor espera PC=0, nosso processador vai executar os NOPs (desperdicando 4 ticks) mas ainda funciona. Se o professor tiver um processador proprio com PC=0 e nao inserir NOPs no binario, nosso assembler esta gerando lixo
- **Acao**: confirmar se o professor fornece o processador ou se nos devemos fornecer. Se nos fornecemos tudo (memory, cpu, disk, clock), entao PC=4 com NOPs esta correto. Se o professor usa o processador DELE, precisamos saber onde o PC dele comeca

### P4 — Quem fornece o processador?
- **O que fizemos**: nos fornecemos `ufc2x.py` com nossa ISA
- **Risco**: CRITICO — o avaliador importa `ufc2x as cpu`. Se o professor tem um `ufc2x.py` DELE com uma ISA diferente, nossos binarios serao incompativeis
- **Acao**: confirmar se devemos entregar o processador OU se o professor fornece um. O roteiro original diz "pegar o emulador fornecido" — pode ser que o professor forneca o `ufc2x.py` e nos so escrevemos o assembler e os `.asm`

### P5 — Quem fornece o memory.py?
- **O que fizemos**: nos fornecemos `memory.py`
- **Risco**: ALTO — mesma questao do P4. O avaliador importa `memory`. Se o professor tem um `memory.py` dele, o nosso pode conflitar
- **Acao**: confirmar com o professor

### P6 — Quem fornece o disk.py?
- **O que fizemos**: nos fornecemos `disk.py`
- **Risco**: ALTO — se o professor tem `disk.py` dele, pode ler o binario de forma diferente (little-endian? formato diferente?)
- **Acao**: confirmar com o professor

### P7 — Formato do binario (.bin)
- **O que fizemos**: 4 bytes por word, big-endian
- **Risco**: ALTO — se o formato esperado for little-endian, ou texto, ou outro encoding, tudo quebra
- **Acao**: se o professor fornecer disk.py, ver como ele le. Se nos fornecemos tudo, big-endian esta ok

### P8 — Os 4 problemas reais
- **O que fizemos**: soma, subtracao, multiplicacao, fatorial (suposicoes)
- **Risco**: CRITICO — os problemas reais podem ser completamente diferentes (ordenacao, fibonacci, potencia, conversao de base, etc.)
- **Acao**: obter os 4 problemas reais do professor assim que forem liberados

### P9 — Tamanho da word: 32 bits ou outro?
- **O que fizemos**: 32 bits (baseado no `& 0xFFFFFFFF` do avaliador)
- **Risco**: BAIXO — o `0xFFFFFFFF` no avaliador confirma 32 bits
- **Status**: PROVAVELMENTE CORRETO

### P10 — Formato da instrucao: [8 opcode][4 reg][20 imm] ou outro?
- **O que fizemos**: 8+4+20 = 32 bits
- **Risco**: ALTO — se o professor usa formato diferente (ex: 6+2+24, ou 8+8+16, ou 16+16), nada funciona
- **Acao**: confirmar com o professor. Se nos fornecemos o processador e assembler juntos, qualquer formato funciona desde que sejam consistentes. Se o professor fornece o processador, precisamos saber o formato dele

### P11 — Numero de registradores
- **O que fizemos**: 2 (A e B)
- **Risco**: MEDIO — pode ser que o professor espere mais (C, D, ou R0-R7)
- **Acao**: confirmar. Com 2 registradores o sistema funciona mas e mais limitado

### P12 — Tamanho da memoria
- **O que fizemos**: 1024 words
- **Risco**: BAIXO — 1024 e um valor didatico comum. Pode ser 256 ou 512, mas nao afeta a funcionalidade desde que os enderecos usados caibam
- **Acao**: confirmar se ha limite

### P13 — Contagem de ticks
- **O que fizemos**: 1 tick = 1 chamada de `step()` = 1 instrucao executada
- **Risco**: BAIXO — confirmado pelo clock do avaliador
- **Status**: CORRETO (o clock do avaliador faz exatamente isso)

### P14 — O tick do HALT conta?
- **O que fizemos**: HALT retorna False, entao o clock NAO incrementa ticks nesse step
- **Risco**: BAIXO — confirmado: o clock so incrementa `if success`, e HALT retorna False
- **Status**: CORRETO

### P15 — Numeros negativos como input
- **O que fizemos**: suportamos via complemento de 2 (32 bits unsigned internamente)
- **O que o avaliador faz**: `int(sys.argv[2]) & 0xFFFFFFFF` — converte para unsigned 32 bits
- **Risco**: BAIXO — se o professor passar -1, vira 0xFFFFFFFF. Nossas operacoes SUB ja produzem resultado correto em complemento de 2
- **Status**: PROVAVELMENTE CORRETO

### P16 — O avaliador reseta o processador antes de rodar?
- **O que fizemos**: o processador inicializa com estado limpo quando importado
- **Risco**: MEDIO — se o avaliador rodar multiplos testes sem reimportar, o PC e registradores ficam sujos. Nosso processador nao tem reset automatico no computador.py
- **Acao**: confirmar se roda 1 teste por execucao (provavelmente sim, ja que e `python computador.py prog.bin ...`)

### P17 — Timeout de 30 segundos
- **Origem**: mencionado no roteiro original do aluno
- **Risco**: BAIXO — nossos programas executam em milissegundos
- **Acao**: so preocupar se os problemas reais tiverem loops muito grandes

### P18 — Quais arquivos devem ser entregues?
- **O que fizemos**: memory.py, ufc2x.py, clock.py, disk.py, assembler.py, computador.py + 4 .asm
- **Risco**: MEDIO — o professor pode esperar apenas 3 arquivos (processador.py, memoria.py, assembler.py) + 4 .asm, ou pode esperar nomes diferentes
- **Acao**: confirmar quais arquivos e quais nomes sao esperados na entrega

### P19 — O campo `reg` nos jumps
- **O que fizemos**: JZ/JNZ testam a `zero_flag` (que e setada pela ultima operacao)
- **Risco**: BAIXO se nos fornecemos o processador. Se o professor fornecer outro, pode ser diferente
- **Acao**: nenhuma se nos fornecemos tudo

### P20 — Valores imediatos negativos no assembly
- **O que fizemos**: LOADI/ADDI/SUBI aceitam valores de 0 a 1048575 (20 bits unsigned)
- **Risco**: BAIXO — para valores negativos, usar SUB com endereco de memoria
- **Acao**: se precisar de imediatos negativos, considerar tratar os 20 bits como signed

---

## Resumo de Prioridade das Pendencias

### CRITICAS (podem fazer o projeto falhar completamente):
- **P4** — Quem fornece o processador (ufc2x.py)?
- **P8** — Quais sao os 4 problemas reais?

### ALTAS (podem causar incompatibilidade):
- **P3** — PC inicial (0 ou 4?)
- **P5** — Quem fornece memory.py?
- **P6** — Quem fornece disk.py?
- **P7** — Formato do binario (big/little endian?)
- **P10** — Formato da instrucao

### MEDIAS (podem causar problemas menores):
- **P2** — Nome do clock (clock vs clocl)
- **P11** — Numero de registradores
- **P16** — Reset entre testes
- **P18** — Nomes dos arquivos de entrega

### BAIXAS (provavelmente corretos):
- P1, P9, P12, P13, P14, P15, P17, P19, P20
