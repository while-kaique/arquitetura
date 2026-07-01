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
