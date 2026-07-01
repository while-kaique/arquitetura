      org 0x7c00
      bits 16

      xor ax, ax
      mov ds, ax
      mov ss, ax
      mov sp, 0x7c00
      sti

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
