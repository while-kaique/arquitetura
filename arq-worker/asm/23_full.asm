      org 0x7c00
      bits 16

      ; --- prologo robusto ---
      xor ax, ax
      mov ds, ax
      mov ss, ax
      mov sp, 0x7c00
      sti

      ; --- modo grafico VGA 13h (320x200, 256 cores) ---
      mov ax, 0x0013
      int 0x10
      mov ax, 0xa000
      mov es, ax            ; ES -> memoria de video

      ; --- pinta o tabuleiro de xadrez ---
      ; a cada pixel alterna preto(0)/branco(15); como a largura (320) e par,
      ; cada nova linha comeca com a cor invertida, senao sairiam listras.
      xor di, di
      mov dx, 200           ; 200 linhas
      xor bl, bl            ; BL = cor no inicio da linha atual
lin:  mov al, bl
      mov cx, 320           ; 320 colunas
col:  stosb                 ; ES:[DI] = AL ; DI++
      xor al, 15            ; alterna a cor
      loop col
      xor bl, 15            ; inverte o inicio da proxima linha
      dec dx
      jnz lin

      ; --- fica em loop invertendo tudo: branco<->preto ---
inv:  xor di, di
      mov cx, 64000         ; 320*200 pixels
sl:   xor byte [es:di], 15  ; inverte o pixel no lugar (0<->15)
      inc di
      loop sl
      mov ah, 0x86          ; pausa ~0.3s p/ dar pra ver a troca (int 15h)
      mov cx, 0x0004        ; CX:DX = 300000 microssegundos
      mov dx, 0x93e0
      int 0x15
      jmp inv

      times 510 - ($ - $$) db 0
      db 0x55
      db 0xaa
