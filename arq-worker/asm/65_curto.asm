      org 0x7c00
      bits 16
      xor ax, ax
      mov ds, ax
      mov ss, ax
      mov sp, 0x7c00
      sti

      mov ax, 0x0013     ; modo grafico VGA 320x200, 256 cores
      int 0x10
      mov ax, 0xa000
      mov es, ax         ; ES -> memoria de video
      xor di, di         ; DI = indice do pixel (comeca no 0)

lerc: xor ah, ah
      int 0x16           ; AL = byte da tecla
      stosb              ; pinta o pixel [DI] com a cor AL e faz DI++
      jmp lerc

      times 510 - ($ - $$) db 0
      db 0x55
      db 0xaa
