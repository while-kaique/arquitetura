      org 0x7c00
      bits 16
      xor ax, ax
      mov ds, ax
      mov ss, ax
      mov sp, 0x7c00
      sti

      mov si, msg
      call prints
      call geti
      mov [idx], al      ; indice da cor na paleta
      call geti
      mov [rr], al       ; intensidade R
      call geti
      mov [gg], al       ; intensidade G
      call geti
      mov [bb], al       ; intensidade B

      mov ax, 0x0013     ; modo grafico 320x200, 256 cores
      int 0x10

      ; atualiza a paleta: cor [idx] = (R,G,B) via portas do DAC VGA
      mov dx, 0x3c8
      mov al, [idx]
      out dx, al         ; seleciona o indice
      inc dx             ; 0x3c9 = dados (R, depois G, depois B)
      mov al, [rr]
      out dx, al
      mov al, [gg]
      out dx, al
      mov al, [bb]
      out dx, al

      ; desenha a paleta: 256 cores, 10 pixels cada = 2560 pixels
      mov ax, 0xa000
      mov es, ax
      xor di, di
      xor bl, bl         ; cor atual (0..255)
      mov cx, 256
pc:   mov al, bl
      push cx
      mov cx, 10
pp:   stosb
      loop pp
      pop cx
      inc bl
      loop pc
      jmp $

geti: xor bx, bx
gc:   xor ah, ah
      int 0x16
      cmp al, 13
      je gf
      mov ah, 0x0e
      int 0x10
      sub al, 48
      mov cl, al
      xor ch, ch
      mov ax, bx
      mov bx, 10
      mul bx
      mov bx, ax
      add bx, cx
      jmp gc
gf:   mov ah, 0x0e       ; ecoa CRLF (cada numero numa linha)
      mov al, 13
      int 0x10
      mov al, 10
      int 0x10
      mov ax, bx
      ret

prints: mov ah, 0x0e
ps:   lodsb
      int 0x10
      or al, al
      jnz ps
      ret

msg:  db "indice, R, G, B (Enter apos cada):",13,10,0
idx:  db 0
rr:   db 0
gg:   db 0
bb:   db 0

      times 510 - ($ - $$) db 0
      db 0x55
      db 0xaa
