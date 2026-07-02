      org 0x7c00
      bits 16

      ; --- prologo robusto ---
      xor ax, ax
      mov ds, ax
      mov ss, ax
      mov sp, 0x7c00
      sti

      ; --- le 4 numeros (em modo texto): indice, R, G, B ---
      mov si, msg
      call prints
      call geti
      mov [idx], al
      call geti
      mov [rr], al
      call geti
      mov [gg], al
      call geti
      mov [bb], al

      ; --- entra no modo grafico 13h (320x200, 256 cores) ---
      mov ax, 0x0013
      int 0x10

      ; --- atualiza uma cor da paleta via DAC VGA ---
      ; porta 0x3C8: escreve o indice da cor a alterar
      ; porta 0x3C9: recebe R, G e B em sequencia (6 bits cada, 0..63)
      mov dx, 0x3c8
      mov al, [idx]
      out dx, al
      inc dx             ; 0x3c9
      mov al, [rr]
      out dx, al
      mov al, [gg]
      out dx, al
      mov al, [bb]
      out dx, al

      ; --- desenha a paleta inteira em faixas de 10 pixels por cor ---
      ; 256 cores * 10 = 2560 pixels, em sequencia a partir do pixel 0
      mov ax, 0xa000
      mov es, ax
      xor di, di
      xor bl, bl            ; BL = cor atual (0..255)
      mov cx, 256
pcor: mov al, bl
      push cx
      mov cx, 10            ; 10 pixels desta cor
ppix: stosb
      loop ppix
      pop cx
      inc bl                ; proxima cor
      loop pcor
      jmp $                 ; congela mostrando a paleta

; ============ GET i: le um numero do teclado, devolve em AX ============
geti: xor bx, bx
gc:   xor ah, ah
      int 0x16
      cmp al, 13
      je gf
      mov ah, 0x0e
      int 0x10             ; ecoa o digito
      sub al, 48
      mov cl, al
      xor ch, ch
      mov ax, bx
      mov bx, 10
      mul bx
      mov bx, ax
      add bx, cx
      jmp gc
gf:   mov ah, 0x0e         ; pula linha ao teclar Enter
      mov al, 13
      int 0x10
      mov al, 10
      int 0x10
      mov ax, bx
      ret

; ============ prints: imprime string terminada em 0 (SI) ============
prints: mov ah, 0x0e
psl:  lodsb
      int 0x10
      or al, al
      jnz psl
      ret

msg:  db "indice, R, G, B (Enter apos cada):",13,10,0
idx:  db 0
rr:   db 0
gg:   db 0
bb:   db 0

      times 510 - ($ - $$) db 0
      db 0x55
      db 0xaa
