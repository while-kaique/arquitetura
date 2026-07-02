      org 0x7c00
      bits 16
      xor ax, ax
      mov ds, ax
      mov ss, ax
      mov sp, 0x7c00
      sti

      mov si, msg
      call prints

      ; le a lista A -> posicoes pares de nums (0,2,4,6,8)
      mov di, nums
      mov cx, 5
la:   call geti
      mov [di], ax
      add di, 4
      loop la
      ; le a lista B -> posicoes impares de nums (1,3,5,7,9)
      mov di, nums+2
      mov cx, 5
lb:   call geti
      mov [di], ax
      add di, 4
      loop lb

      ; imprime nums em ordem = A0,B0,A1,B1,...
      mov si, nums
      mov cx, 10
pr:   mov ax, [si]
      call printnum
      mov al, ','
      call putc
      add si, 2
      loop pr
      hlt

; ---- le um numero pelo teclado (ecoa, Enter termina) -> AX. preserva cx,dx ----
geti: push cx
      push dx
      xor bx, bx
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
gf:   mov ah, 0x0e         ; ecoa CRLF (cada numero numa linha)
      mov al, 13
      int 0x10
      mov al, 10
      int 0x10
      mov ax, bx
      pop dx
      pop cx
      ret

; ---- imprime AX em decimal. preserva ax,bx,cx,dx ----
printnum: push ax
      push bx
      push cx
      push dx
      mov cx, 10
      xor bx, bx           ; bx = qtd de digitos
pn1:  xor dx, dx
      div cx               ; AX = AX/10 ; DX = resto
      push dx
      inc bx
      test ax, ax
      jnz pn1
pn2:  pop ax
      add al, '0'
      call putc
      dec bx
      jnz pn2
      pop dx
      pop cx
      pop bx
      pop ax
      ret

; ---- imprime o caractere em AL ----
putc: push ax
      mov ah, 0x0e
      int 0x10
      pop ax
      ret

; ---- imprime string terminada em 0 (SI) ----
prints: mov ah, 0x0e
ps:   lodsb
      int 0x10
      or al, al
      jnz ps
      ret

msg:  db "Digite 5 numeros da lista A e depois 5 da B (Enter apos cada):",13,10,0
nums: times 10 dw 0

      times 510 - ($ - $$) db 0
      db 0x55
      db 0xaa
