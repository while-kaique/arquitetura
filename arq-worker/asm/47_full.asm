      org 0x7c00
      bits 16

      ; --- prologo robusto ---
      xor ax, ax
      mov ds, ax
      mov ss, ax
      mov sp, 0x7c00
      sti

      ; --- mensagem inicial ---
      mov si, msg
      call prints

      ; --- le a lista A (5 numeros) nas posicoes pares de 'nums' (0,2,4,6,8) ---
      mov di, nums
      mov cx, 5
lerA: call geti
      mov [di], ax          ; nums[par] = numero
      add di, 4             ; pula 2 words (deixa espaco p/ o B)
      loop lerA

      ; --- le a lista B (5 numeros) nas posicoes impares (1,3,5,7,9) ---
      mov di, nums+2
      mov cx, 5
lerB: call geti
      mov [di], ax
      add di, 4
      loop lerB

      ; --- agora 'nums' ja esta intercalado: A0,B0,A1,B1,...  ---
      ; --- basta imprimir os 10 em ordem, separados por virgula ---
      mov si, nums
      mov cx, 10
imp:  mov ax, [si]
      call printnum
      mov al, ','
      call putc
      add si, 2
      loop imp
      hlt

; ================= GET i: le um numero do teclado, devolve em AX =================
; ecoa cada digito, e no Enter ecoa CRLF (cada numero fica numa linha). preserva cx,dx.
geti:  push cx
       push dx
       xor bx, bx           ; bx = numero acumulado
gc:    xor ah, ah
       int 0x16             ; AL = tecla
       cmp al, 13           ; Enter termina
       je gfim
       mov ah, 0x0e
       int 0x10             ; ecoa o digito
       sub al, 48           ; ASCII -> valor
       mov cl, al
       xor ch, ch           ; cx = digito
       mov ax, bx
       mov bx, 10
       mul bx               ; ax = acumulado * 10
       mov bx, ax
       add bx, cx           ; + digito
       jmp gc
gfim:  mov ah, 0x0e         ; pula linha
       mov al, 13
       int 0x10
       mov al, 10
       int 0x10
       mov ax, bx           ; resultado em AX
       pop dx
       pop cx
       ret

; ================= imprime AX em decimal (preserva ax,bx,cx,dx) =================
printnum: push ax
          push bx
          push cx
          push dx
          mov cx, 10
          xor bx, bx        ; bx = quantos digitos empilhei
pnext:    xor dx, dx
          div cx            ; AX = AX/10 ; DX = resto (digito)
          push dx
          inc bx
          test ax, ax
          jnz pnext
pout:     pop ax            ; desempilha na ordem certa (mais significativo 1o)
          add al, '0'
          call putc
          dec bx
          jnz pout
          pop dx
          pop cx
          pop bx
          pop ax
          ret

; ================= imprime o caractere em AL =================
putc: push ax
      mov ah, 0x0e
      int 0x10
      pop ax
      ret

; ================= imprime string terminada em 0 (SI) =================
prints: mov ah, 0x0e
psl:  lodsb
      int 0x10
      or al, al
      jnz psl
      ret

msg:  db "Digite 5 numeros da lista A e depois 5 da B (Enter apos cada):",13,10,0
nums: times 10 dw 0

      times 510 - ($ - $$) db 0
      db 0x55
      db 0xaa
