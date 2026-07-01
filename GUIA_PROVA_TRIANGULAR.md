# Guia de Prova — Questão 54 (Número Triangular) em Assembly x86

> Programa que lê um número pelo teclado e escreve se ele é **triangular** ou não.
> Um número é triangular se é o produto de três naturais consecutivos.
> Exemplo: 120 é triangular, pois 4 · 5 · 6 = 120. (Outros: 6 = 1·2·3, 24 = 2·3·4, 210 = 5·6·7.)

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
2. **Laço do teste** — para `k = 1, 2, 3, ...`, calcula `p = k*(k+1)*(k+2)` (instrução `mul`):
   - se `p == n` → é TRIANGULAR;
   - se `p > n` → passou, **não** é (os produtos só crescem);
   - senão, tenta o próximo `k`.
3. **`prints`** — imprime a resposta.

Registradores (versão enxuta): **`di` = n**, **`cx` = k**. O `mul` só mexe em `ax` e `dx`,
então `di` e `cx` sobrevivem ao laço.

**Detalhe importante (overflow):** depois do `mul`, checamos `dx`. Se `dx != 0`, o produto
passou de 65535 (é maior que qualquer `n` de 16 bits) → resposta "não" e o laço para. É isso
que impede o programa de travar com número grande.

---

## VERSÃO 1 — Extensa (76 linhas, mais fácil de entender)

Guarda `n` na memória, usa `push/pop`, imprime por extenso.

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

      ; --- testa k*(k+1)*(k+2) para k = 1, 2, 3, ... ---
      mov cx, 1             ; k = 1
laco: mov ax, cx
      mov bx, cx
      inc bx               ; k+1
      mul bx               ; ax = k*(k+1)
      mov bx, cx
      add bx, 2            ; k+2
      mul bx               ; dx:ax = k*(k+1)*(k+2)
      cmp dx, 0
      jne nao              ; produto > 65535 -> nao
      cmp ax, [n]
      je sim               ; produto == n -> triangular
      ja nao               ; produto > n -> parou de dar, nao
      inc cx
      jmp laco

sim:  mov si, msgsim
      call prints
      hlt

nao:  mov si, msgnao
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
msgsim: db "TRIANGULAR", 0
msgnao: db "NAO TRIANGULAR", 0
n:      dw 0

      times 510 - ($ - $$) db 0
      db 0x55
      db 0xaa
```

---

## VERSÃO 2 — Enxuta (59 linhas, recomendada pra prova)

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
      mov cx, 1          ; k = 1
tl:   mov ax, cx
      mov bx, cx
      inc bx             ; k+1
      mul bx             ; ax = k*(k+1)
      mov bx, cx
      add bx, 2          ; k+2
      mul bx             ; dx:ax = k*(k+1)*(k+2)
      or dx, dx          ; passou de 65535?
      jnz tnao           ; produto grande demais -> nao
      cmp ax, di
      je tsim            ; produto == n -> sim
      ja tnao            ; produto > n -> nao
      inc cx
      jmp tl
tsim: mov si, msgs
      jmp show
tnao: mov si, msgn
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
msgs: db 13,10,"TRIANGULAR",0
msgn: db 13,10,"NAO TRIANGULAR",0

      times 510 - ($ - $$) db 0
      db 0x55
      db 0xaa
```

---

## Testes já validados (ambas as versões)

| Número | Resposta | Certo? |
|--------|----------|--------|
| 120 | triangular     | ✅ (4·5·6) |
| 24  | triangular     | ✅ (2·3·4) |
| 100 | não triangular | ✅ |
| 50  | não triangular | ✅ |

---

## Se travar na hora — checklist rápido

- **Não monta?** Confira se salvou como `.asm` e se o `nasm` está instalado (`nasm -v`).
- **Tela preta / não dá boot?** Garanta as 3 últimas linhas (`times ...`, `db 0x55`, `db 0xaa`).
- **Não aparece o que digito?** É o `int 0x16` + o eco (`mov ah,0x0e / int 0x10`) dentro do `geti`.
- **Resposta errada / travou?** O `cmp dx, 0 / jne nao` (o teste de overflow) tem que estar
  logo depois do segundo `mul` — é ele que impede o laço infinito com número grande.
- **16 bits:** funciona com números até 65535 (o maior triangular nessa faixa é 39·40·41 = 63960).
