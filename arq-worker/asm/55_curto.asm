      org 0x7c00
      bits 16
      xor ax, ax
      mov ds, ax
      mov ss, ax
      mov sp, 0x7c00
      sti

      mov si, msg
      call prints
      call geti          ; ax = n
      mov di, ax         ; di = n
      xor si, si         ; si = soma dos divisores
      mov bx, 1          ; bx = divisor d
pf:   cmp bx, di
      jae pfim           ; d >= n -> acabou
      mov ax, di
      xor dx, dx
      div bx             ; dx = n % d
      or dx, dx
      jnz pnx            ; resto != 0 -> nao e divisor
      add si, bx         ; soma += d
pnx:  inc bx
      jmp pf
pfim: cmp si, di         ; soma == n ?
      jne pnao
      mov si, msgs
      jmp show
pnao: mov si, msgn
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
msgs: db 13,10,"PERFEITO",0
msgn: db 13,10,"NAO PERFEITO",0

      times 510 - ($ - $$) db 0
      db 0x55
      db 0xaa
