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
      mov cx, 1          ; k = 1
tl:   mov ax, cx
      mov bx, cx
      inc bx             ; k+1
      mul bx             ; ax = k*(k+1)
      mov bx, cx
      add bx, 2          ; k+2
      mul bx             ; dx:ax = k*(k+1)*(k+2)
      or dx, dx          ; passou de 65535?
      jnz tnao           ; produto grande demais -> nao
      cmp ax, di
      je tsim            ; produto == n -> sim
      ja tnao            ; produto > n -> nao
      inc cx
      jmp tl
tsim: mov si, msgs
      jmp show
tnao: mov si, msgn
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
msgs: db 13,10,"TRIANGULAR",0
msgn: db 13,10,"NAO TRIANGULAR",0

      times 510 - ($ - $$) db 0
      db 0x55
      db 0xaa
