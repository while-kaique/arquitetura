      org 0x7c00
      bits 16

      xor ax, ax
      mov ds, ax
      mov ss, ax
      mov sp, 0x7c00
      sti

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
