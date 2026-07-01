# Guia de Prova — Questão 50 (Ano Bissexto) em Assembly x86

> Programa que lê um ano pelo teclado e escreve se ele é **bissexto** ou não.
> Regra: bissexto se divisível por 4 e **não** por 100, **exceto** se também for divisível por 400.
> (1984 = bissexto, 1100 = não, 2000 = bissexto.)

Ambas as versões abaixo foram **montadas e testadas rodando no emulador**. Escolha uma, cole, monte e rode.

---

## Como montar e rodar

Salve o código num arquivo (ex.: `prova.asm`) e rode **2 comandos**:

**Windows (QEMU):**
```
nasm -f bin prova.asm -o prova.img
qemu-system-i386 -fda prova.img
```

**Linux (QEMU):**
```
nasm -f bin prova.asm -o prova.img
qemu-system-i386 -fda prova.img
```

Se o QEMU não existir na máquina, instale antes:
- Windows: `winget install NASM.NASM` e `winget install SoftwareFreedomConservancy.QEMU`
- Linux: `sudo apt update && sudo apt install nasm qemu-system-x86`

Ao rodar: digite o ano e aperte **Enter**. A resposta aparece na tela.

---

## Como funciona (resumo de 30 segundos)

1. **`geti`** — lê o ano do teclado. O teclado entrega uma tecla por vez (`'2'`, `'0'`...), então
   ele junta os dígitos com a conta `acumulado = acumulado*10 + digito`. Esta é a única parte
   "nova" (o famoso *GET i*).
2. **Lógica** — testa o resto (`div`) por 400, por 100 e por 4, nessa ordem, e desvia pro
   resultado certo.
3. **`prints`** — imprime o texto da resposta na tela (rotina padrão do professor).

Registrador-chave: o ano fica guardado em **`cx`**, porque o `div` mexe em `ax` e `dx` mas
**não** mexe em `cx` — assim o ano sobrevive aos três testes.

---

## VERSÃO 1 — Extensa (79 linhas, mais fácil de entender)

Guarda o ano na memória, usa `push/pop`, imprime o resultado por extenso. É a mais "didática".

```asm
      org 0x7c00
      bits 16

      mov ax, 0
      mov ds, ax
      cli

      ; --- pergunta o ano ---
      mov si, msg
      call prints

      ; --- le o ano (GET i) -> ax ---
      call geti
      mov [ano], ax

      ; --- pula uma linha ---
      mov ah, 0x0e
      mov al, 13
      int 0x10
      mov al, 10
      int 0x10

      ; --- ano % 400 == 0 ? -> bissexto ---
      mov ax, [ano]
      mov dx, 0
      mov bx, 400
      div bx
      cmp dx, 0
      je sim

      ; --- ano % 100 == 0 ? -> NAO bissexto ---
      mov ax, [ano]
      mov dx, 0
      mov bx, 100
      div bx
      cmp dx, 0
      je nao

      ; --- ano % 4 == 0 ? -> bissexto ---
      mov ax, [ano]
      mov dx, 0
      mov bx, 4
      div bx
      cmp dx, 0
      je sim

nao:  mov si, msgnao
      call prints
      hlt

sim:  mov si, msgsim
      call prints
      hlt

; ============ GET i: le um numero do teclado, devolve em AX ============
geti:  push bx
       push cx
       push dx
       mov bx, 0            ; bx = numero acumulado
lerc:  mov ah, 0
       int 0x16             ; al = tecla digitada (ASCII)
       cmp al, 13           ; Enter? termina
       je fimg
       mov ah, 0x0e         ; ecoa a tecla na tela
       int 0x10
       sub al, 48           ; '0'..'9' -> 0..9
       mov ah, 0
       mov cx, ax           ; cx = digito
       mov ax, bx
       mov bx, 10
       mul bx               ; ax = acumulado * 10
       mov bx, ax
       add bx, cx           ; bx = acumulado*10 + digito
       jmp lerc
fimg:  mov ax, bx           ; resultado em AX
       pop dx
       pop cx
       pop bx
       ret

; ============ prints: imprime texto terminado em 0 (do professor) ======
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

msg:    db "Digite o ano: ", 0
msgsim: db "BISSEXTO", 0
msgnao: db "NAO BISSEXTO", 0
ano:    dw 0

      times 510 - ($ - $$) db 0
      db 0x55
      db 0xaa
```

---

## VERSÃO 2 — Enxuta (62 linhas, recomendada pra prova)

Guarda o ano em `cx`, sem `push/pop`, quebra de linha embutida nos textos. Mesmo resultado,
menos linhas. **É a que eu recomendo copiar.**

```asm
      org 0x7c00
      bits 16
      mov ax, 0
      mov ds, ax
      cli

      mov si, msg
      call prints
      call geti          ; ax = ano digitado
      mov cx, ax         ; cx guarda o ano (div nao mexe em cx)

      mov ax, cx
      xor dx, dx
      mov bx, 400
      div bx
      or dx, dx
      jz sim             ; ano % 400 == 0 -> bissexto

      mov ax, cx
      xor dx, dx
      mov bx, 100
      div bx
      or dx, dx
      jz nao             ; ano % 100 == 0 -> NAO

      mov ax, cx
      xor dx, dx
      mov bx, 4
      div bx
      or dx, dx
      jz sim             ; ano % 4 == 0 -> bissexto

nao:  mov si, msgn
      jmp show
sim:  mov si, msgs
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

msg:  db 13,10,"Digite o ano: ",0
msgs: db 13,10,"SIM",0
msgn: db 13,10,"NAO",0

      times 510 - ($ - $$) db 0
      db 0x55
      db 0xaa
```

---

## Testes já validados (ambas as versões)

| Ano digitado | Resposta | Certo? |
|--------------|----------|--------|
| 2024 | bissexto  | ✅ (÷4, não ÷100) |
| 2000 | bissexto  | ✅ (÷400) |
| 1900 | não       | ✅ (÷100, não ÷400) |
| 2023 | não       | ✅ (não ÷4) |

---

## Se travar na hora — checklist rápido

- **Não monta?** Confira se salvou como `.asm` e se o `nasm` está instalado (`nasm -v`).
- **Tela preta / não dá boot?** Garanta as 3 últimas linhas (`times ...`, `db 0x55`, `db 0xaa`).
- **Não aparece o que digito?** É o `int 0x16` + o eco (`mov ah,0x0e / int 0x10`) dentro do `geti`.
- **Resposta errada?** A ordem dos testes importa: **400 primeiro**, depois 100, depois 4.
- **Adaptar pra OUTRA questão numérica?** Reaproveite `geti` (ler número) e `prints`/`printi`
  (imprimir); troque só o miolo da lógica no meio.
