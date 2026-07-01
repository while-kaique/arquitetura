# Guia de Prova — Questão 55 (Número Perfeito) em Assembly x86

> Programa que lê um número pelo teclado e escreve se ele é **perfeito** ou não.
> Um número é perfeito se é igual à soma dos seus divisores positivos (menores que ele).
> Exemplo: 6 é perfeito, pois 1 + 2 + 3 = 6. (Outros: 28, 496, 8128.)

Ambas as versões abaixo foram **montadas e testadas rodando no emulador**. Escolha uma, cole, monte e rode.

---

## Como montar e rodar

Salve o código num arquivo (ex.: `prova.asm`) e rode **2 comandos**:

**Windows / Linux (QEMU):**
```
nasm -f bin prova.asm -o prova.img
qemu-system-i386 -fda prova.img
```

Se faltar ferramenta, instale antes:
- Windows: `winget install NASM.NASM` e `winget install SoftwareFreedomConservancy.QEMU`
- Linux: `sudo apt update && sudo apt install nasm qemu-system-x86`

Ao rodar: digite o número e aperte **Enter**. A resposta aparece na tela.

---

## Como funciona (resumo de 30 segundos)

1. **`geti`** — lê o número do teclado (junta os dígitos: `acumulado = acumulado*10 + digito`).
2. **Laço dos divisores** — para cada `d` de 1 até `n-1`, testa `n % d` (instrução `div`,
   o resto fica em `dx`). Se o resto for 0, `d` é divisor → soma em `soma`.
3. **Compara** — no fim, se `soma == n`, é PERFEITO.
4. **`prints`** — imprime a resposta.

Registradores (versão enxuta): **`di` = n**, **`si` = soma**, **`bx` = divisor d**.
Isso funciona porque o `div` só mexe em `ax` e `dx` — `di`, `si` e `bx` sobrevivem ao laço.

---

## VERSÃO 1 — Extensa (80 linhas, mais fácil de entender)

Guarda `n` e `soma` na memória, usa `push/pop`, imprime por extenso.

```asm
      org 0x7c00
      bits 16

      mov ax, 0
      mov ds, ax
      cli

      ; --- pergunta o numero ---
      mov si, msg
      call prints

      ; --- le o numero (GET i) ---
      call geti
      mov [n], ax

      ; --- pula uma linha ---
      mov ah, 0x0e
      mov al, 13
      int 0x10
      mov al, 10
      int 0x10

      ; --- soma os divisores proprios (1 ate n-1) ---
      mov word [soma], 0
      mov bx, 1              ; d = 1
laco: cmp bx, [n]
      jae fimlaco           ; d >= n -> para
      mov ax, [n]
      mov dx, 0
      div bx                ; dx = n % d
      cmp dx, 0
      jne prox              ; nao divide -> proximo
      mov ax, [soma]
      add ax, bx
      mov [soma], ax        ; soma += d
prox: inc bx
      jmp laco

fimlaco:
      mov ax, [soma]
      cmp ax, [n]           ; soma == n ?
      je sim

      mov si, msgnao
      call prints
      hlt

sim:  mov si, msgsim
      call prints
      hlt

; ============ GET i: le um numero do teclado, devolve em AX ============
geti:  push bx
       push cx
       push dx
       mov bx, 0
lerc:  mov ah, 0
       int 0x16
       cmp al, 13
       je fimg
       mov ah, 0x0e
       int 0x10
       sub al, 48
       mov ah, 0
       mov cx, ax
       mov ax, bx
       mov bx, 10
       mul bx
       mov bx, ax
       add bx, cx
       jmp lerc
fimg:  mov ax, bx
       pop dx
       pop cx
       pop bx
       ret

; ============ prints: imprime texto terminado em 0 ============
prints: push si
        push ax
        mov ah, 0x0e
psl:    lodsb
        int 0x10
        or al, al
        jnz psl
        pop ax
        pop si
        ret

msg:    db "Digite um numero: ", 0
msgsim: db "PERFEITO", 0
msgnao: db "NAO PERFEITO", 0
n:      dw 0
soma:   dw 0

      times 510 - ($ - $$) db 0
      db 0x55
      db 0xaa
```

---

## VERSÃO 2 — Enxuta (58 linhas, recomendada pra prova)

Guarda tudo em registradores, sem `push/pop`, quebra de linha embutida nos textos.

```asm
      org 0x7c00
      bits 16
      mov ax, 0
      mov ds, ax
      cli

      mov si, msg
      call prints
      call geti          ; ax = n
      mov di, ax         ; di = n
      xor si, si         ; si = soma dos divisores
      mov bx, 1          ; bx = divisor d
pf:   cmp bx, di
      jae pfim           ; d >= n -> acabou
      mov ax, di
      xor dx, dx
      div bx             ; dx = n % d
      or dx, dx
      jnz pnx            ; resto != 0 -> nao e divisor
      add si, bx         ; soma += d
pnx:  inc bx
      jmp pf
pfim: cmp si, di         ; soma == n ?
      jne pnao
      mov si, msgs
      jmp show
pnao: mov si, msgn
show: call prints
      hlt

geti: xor bx, bx         ; bx = numero acumulado
lerc: xor ah, ah
      int 0x16           ; al = tecla
      cmp al, 13         ; Enter termina
      je fim
      mov ah, 0x0e
      int 0x10           ; ecoa
      sub al, 48         ; ASCII -> digito
      mov cl, al
      xor ch, ch
      mov ax, bx
      mov bx, 10
      mul bx             ; ax = acumulado * 10
      mov bx, ax
      add bx, cx         ; + digito
      jmp lerc
fim:  mov ax, bx
      ret

prints: mov ah, 0x0e
pl:   lodsb
      int 0x10
      or al, al
      jnz pl
      ret

msg:  db 13,10,"Digite um numero: ",0
msgs: db 13,10,"PERFEITO",0
msgn: db 13,10,"NAO PERFEITO",0

      times 510 - ($ - $$) db 0
      db 0x55
      db 0xaa
```

---

## Testes já validados (ambas as versões)

| Número | Resposta | Certo? |
|--------|----------|--------|
| 6   | perfeito     | ✅ (1+2+3) |
| 28  | perfeito     | ✅ (1+2+4+7+14) |
| 10  | não perfeito | ✅ |
| 12  | não perfeito | ✅ |

---

## Se travar na hora — checklist rápido

- **Não monta?** Confira se salvou como `.asm` e se o `nasm` está instalado (`nasm -v`).
- **Tela preta / não dá boot?** Garanta as 3 últimas linhas (`times ...`, `db 0x55`, `db 0xaa`).
- **Não aparece o que digito?** É o `int 0x16` + o eco (`mov ah,0x0e / int 0x10`) dentro do `geti`.
- **16 bits:** funciona com números até 65535. Números perfeitos pequenos (6, 28, 496, 8128)
  estão todos dentro dessa faixa.
- **Cuidado com o zero:** se digitar 0, o laço não roda e ele responde "perfeito" — a questão
  fala em inteiro positivo, então não teste com 0.
