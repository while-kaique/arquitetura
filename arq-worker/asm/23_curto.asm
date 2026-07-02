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

      ; pinta o xadrez: 200 linhas x 320 colunas (0=preto, 15=branco)
      xor di, di
      mov dx, 200        ; contador de linhas
      xor bl, bl         ; cor no inicio da linha
lin:  mov al, bl
      mov cx, 320
col:  stosb              ; pinta o pixel
      xor al, 15         ; alterna preto<->branco a cada pixel
      loop col
      xor bl, 15         ; proxima linha comeca invertida (faz o xadrez)
      dec dx
      jnz lin

      ; loop: inverte todos os pixels (branco<->preto), com uma pausa
inv:  xor di, di
      mov cx, 64000
sl:   xor byte [es:di], 15
      inc di
      loop sl
      mov ah, 0x86       ; espera ~0.3s (BIOS int 15h)
      mov cx, 0x0004
      mov dx, 0x93e0
      int 0x15
      jmp inv

      times 510 - ($ - $$) db 0
      db 0x55
      db 0xaa
