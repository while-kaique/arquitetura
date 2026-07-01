      org 0x7c00
      bits 16
      xor ax, ax
      mov ds, ax
      mov ss, ax
      mov sp, 0x7c00
      sti

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
