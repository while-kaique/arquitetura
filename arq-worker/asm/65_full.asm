      org 0x7c00
      bits 16

      ; --- prologo robusto (monta pilha e liga interrupcao) ---
      xor ax, ax
      mov ds, ax
      mov ss, ax
      mov sp, 0x7c00
      sti

      ; --- entra no modo grafico VGA 13h: 320x200, 256 cores ---
      mov ax, 0x0013
      int 0x10

      ; --- ES aponta pra memoria de video (segmento 0xA000) ---
      ; no modo 13h cada pixel e 1 byte (o indice da cor na paleta),
      ; em sequencia: pixel 0 = A000:0000, pixel 1 = A000:0001, ...
      mov ax, 0xa000
      mov es, ax
      xor di, di            ; DI = offset do proximo pixel (0,1,2,...)

      ; --- a cada tecla, pinta o proximo pixel com a cor = byte da tecla ---
lerc: xor ah, ah
      int 0x16              ; espera tecla; AL = codigo ASCII digitado
      stosb                 ; ES:[DI] = AL (cor);  DI = DI + 1
      jmp lerc              ; proxima tecla -> proximo pixel em sequencia

      times 510 - ($ - $$) db 0
      db 0x55
      db 0xaa
