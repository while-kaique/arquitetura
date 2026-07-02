// GERADO por build_worker.js — NAO editar src/worker.js na mao.
// Edite os .asm em asm/ ou este worker.template.js e rode: node build_worker.js
// Rotas:
//   /              -> pagina indice (guia + lista de questoes cadastradas)
//   /help          -> pagina de ajuda (explica tudo que o site faz)
//   /api/arq/{q}   -> versao ENXUTA em texto puro (KV faz fallback p/ questoes da turma)
//   /req_full/{q}  -> versao EXTENSA em texto puro
//   /dev           -> "terminal" (cmd falso) vazio, so o prompt piscando
//   /dev/{q}       -> se {q} existe (assada 50/54/55 ou cadastrada no KV): terminal com o codigo
//                     se {q} NAO existe: formulario "cadastrar" (cola o codigo)
//   /dev/{q}/full  -> terminal com a versao EXTENSA (so p/ as assadas)
//   POST /dev/{q}  -> salva o codigo colado no KV (WRITE-ONCE: se ja existe, ignora e mostra o que ja tem)
// q assadas: 50 (bissexto), 54 (triangular), 55 (perfeito). Qualquer outro id pode ser cadastrado.
// Toda rota /dev/{q} consulta a planilha publica da turma (Google Sheets, em tempo real com
// cache curto) p/ marcar tag temporaria (MARCADA/RESERVA) e barrar cadastro de SELECIONADAs.
const CODE = {"22":{"curto":"      org 0x7c00\r\n      bits 16\r\n      xor ax, ax\r\n      mov ds, ax\r\n      mov ss, ax\r\n      mov sp, 0x7c00\r\n      sti\r\n\r\n      mov si, msg\r\n      call prints\r\n      call geti\r\n      mov [idx], al      ; indice da cor na paleta\r\n      call geti\r\n      mov [rr], al       ; intensidade R\r\n      call geti\r\n      mov [gg], al       ; intensidade G\r\n      call geti\r\n      mov [bb], al       ; intensidade B\r\n\r\n      mov ax, 0x0013     ; modo grafico 320x200, 256 cores\r\n      int 0x10\r\n\r\n      ; atualiza a paleta: cor [idx] = (R,G,B) via portas do DAC VGA\r\n      mov dx, 0x3c8\r\n      mov al, [idx]\r\n      out dx, al         ; seleciona o indice\r\n      inc dx             ; 0x3c9 = dados (R, depois G, depois B)\r\n      mov al, [rr]\r\n      out dx, al\r\n      mov al, [gg]\r\n      out dx, al\r\n      mov al, [bb]\r\n      out dx, al\r\n\r\n      ; desenha a paleta: 256 cores, 10 pixels cada = 2560 pixels\r\n      mov ax, 0xa000\r\n      mov es, ax\r\n      xor di, di\r\n      xor bl, bl         ; cor atual (0..255)\r\n      mov cx, 256\r\npc:   mov al, bl\r\n      push cx\r\n      mov cx, 10\r\npp:   stosb\r\n      loop pp\r\n      pop cx\r\n      inc bl\r\n      loop pc\r\n      jmp $\r\n\r\ngeti: xor bx, bx\r\ngc:   xor ah, ah\r\n      int 0x16\r\n      cmp al, 13\r\n      je gf\r\n      mov ah, 0x0e\r\n      int 0x10\r\n      sub al, 48\r\n      mov cl, al\r\n      xor ch, ch\r\n      mov ax, bx\r\n      mov bx, 10\r\n      mul bx\r\n      mov bx, ax\r\n      add bx, cx\r\n      jmp gc\r\ngf:   mov ah, 0x0e       ; ecoa CRLF (cada numero numa linha)\r\n      mov al, 13\r\n      int 0x10\r\n      mov al, 10\r\n      int 0x10\r\n      mov ax, bx\r\n      ret\r\n\r\nprints: mov ah, 0x0e\r\nps:   lodsb\r\n      int 0x10\r\n      or al, al\r\n      jnz ps\r\n      ret\r\n\r\nmsg:  db \"indice, R, G, B (Enter apos cada):\",13,10,0\r\nidx:  db 0\r\nrr:   db 0\r\ngg:   db 0\r\nbb:   db 0\r\n\r\n      times 510 - ($ - $$) db 0\r\n      db 0x55\r\n      db 0xaa\r\n","full":"      org 0x7c00\r\n      bits 16\r\n\r\n      ; --- prologo robusto ---\r\n      xor ax, ax\r\n      mov ds, ax\r\n      mov ss, ax\r\n      mov sp, 0x7c00\r\n      sti\r\n\r\n      ; --- le 4 numeros (em modo texto): indice, R, G, B ---\r\n      mov si, msg\r\n      call prints\r\n      call geti\r\n      mov [idx], al\r\n      call geti\r\n      mov [rr], al\r\n      call geti\r\n      mov [gg], al\r\n      call geti\r\n      mov [bb], al\r\n\r\n      ; --- entra no modo grafico 13h (320x200, 256 cores) ---\r\n      mov ax, 0x0013\r\n      int 0x10\r\n\r\n      ; --- atualiza uma cor da paleta via DAC VGA ---\r\n      ; porta 0x3C8: escreve o indice da cor a alterar\r\n      ; porta 0x3C9: recebe R, G e B em sequencia (6 bits cada, 0..63)\r\n      mov dx, 0x3c8\r\n      mov al, [idx]\r\n      out dx, al\r\n      inc dx             ; 0x3c9\r\n      mov al, [rr]\r\n      out dx, al\r\n      mov al, [gg]\r\n      out dx, al\r\n      mov al, [bb]\r\n      out dx, al\r\n\r\n      ; --- desenha a paleta inteira em faixas de 10 pixels por cor ---\r\n      ; 256 cores * 10 = 2560 pixels, em sequencia a partir do pixel 0\r\n      mov ax, 0xa000\r\n      mov es, ax\r\n      xor di, di\r\n      xor bl, bl            ; BL = cor atual (0..255)\r\n      mov cx, 256\r\npcor: mov al, bl\r\n      push cx\r\n      mov cx, 10            ; 10 pixels desta cor\r\nppix: stosb\r\n      loop ppix\r\n      pop cx\r\n      inc bl                ; proxima cor\r\n      loop pcor\r\n      jmp $                 ; congela mostrando a paleta\r\n\r\n; ============ GET i: le um numero do teclado, devolve em AX ============\r\ngeti: xor bx, bx\r\ngc:   xor ah, ah\r\n      int 0x16\r\n      cmp al, 13\r\n      je gf\r\n      mov ah, 0x0e\r\n      int 0x10             ; ecoa o digito\r\n      sub al, 48\r\n      mov cl, al\r\n      xor ch, ch\r\n      mov ax, bx\r\n      mov bx, 10\r\n      mul bx\r\n      mov bx, ax\r\n      add bx, cx\r\n      jmp gc\r\ngf:   mov ah, 0x0e         ; pula linha ao teclar Enter\r\n      mov al, 13\r\n      int 0x10\r\n      mov al, 10\r\n      int 0x10\r\n      mov ax, bx\r\n      ret\r\n\r\n; ============ prints: imprime string terminada em 0 (SI) ============\r\nprints: mov ah, 0x0e\r\npsl:  lodsb\r\n      int 0x10\r\n      or al, al\r\n      jnz psl\r\n      ret\r\n\r\nmsg:  db \"indice, R, G, B (Enter apos cada):\",13,10,0\r\nidx:  db 0\r\nrr:   db 0\r\ngg:   db 0\r\nbb:   db 0\r\n\r\n      times 510 - ($ - $$) db 0\r\n      db 0x55\r\n      db 0xaa\r\n"},"23":{"curto":"      org 0x7c00\r\n      bits 16\r\n      xor ax, ax\r\n      mov ds, ax\r\n      mov ss, ax\r\n      mov sp, 0x7c00\r\n      sti\r\n\r\n      mov ax, 0x0013     ; modo grafico VGA 320x200, 256 cores\r\n      int 0x10\r\n      mov ax, 0xa000\r\n      mov es, ax         ; ES -> memoria de video\r\n\r\n      ; pinta o xadrez: 200 linhas x 320 colunas (0=preto, 15=branco)\r\n      xor di, di\r\n      mov dx, 200        ; contador de linhas\r\n      xor bl, bl         ; cor no inicio da linha\r\nlin:  mov al, bl\r\n      mov cx, 320\r\ncol:  stosb              ; pinta o pixel\r\n      xor al, 15         ; alterna preto<->branco a cada pixel\r\n      loop col\r\n      xor bl, 15         ; proxima linha comeca invertida (faz o xadrez)\r\n      dec dx\r\n      jnz lin\r\n\r\n      ; loop: inverte todos os pixels (branco<->preto), com uma pausa\r\ninv:  xor di, di\r\n      mov cx, 64000\r\nsl:   xor byte [es:di], 15\r\n      inc di\r\n      loop sl\r\n      mov ah, 0x86       ; espera ~0.3s (BIOS int 15h)\r\n      mov cx, 0x0004\r\n      mov dx, 0x93e0\r\n      int 0x15\r\n      jmp inv\r\n\r\n      times 510 - ($ - $$) db 0\r\n      db 0x55\r\n      db 0xaa\r\n","full":"      org 0x7c00\r\n      bits 16\r\n\r\n      ; --- prologo robusto ---\r\n      xor ax, ax\r\n      mov ds, ax\r\n      mov ss, ax\r\n      mov sp, 0x7c00\r\n      sti\r\n\r\n      ; --- modo grafico VGA 13h (320x200, 256 cores) ---\r\n      mov ax, 0x0013\r\n      int 0x10\r\n      mov ax, 0xa000\r\n      mov es, ax            ; ES -> memoria de video\r\n\r\n      ; --- pinta o tabuleiro de xadrez ---\r\n      ; a cada pixel alterna preto(0)/branco(15); como a largura (320) e par,\r\n      ; cada nova linha comeca com a cor invertida, senao sairiam listras.\r\n      xor di, di\r\n      mov dx, 200           ; 200 linhas\r\n      xor bl, bl            ; BL = cor no inicio da linha atual\r\nlin:  mov al, bl\r\n      mov cx, 320           ; 320 colunas\r\ncol:  stosb                 ; ES:[DI] = AL ; DI++\r\n      xor al, 15            ; alterna a cor\r\n      loop col\r\n      xor bl, 15            ; inverte o inicio da proxima linha\r\n      dec dx\r\n      jnz lin\r\n\r\n      ; --- fica em loop invertendo tudo: branco<->preto ---\r\ninv:  xor di, di\r\n      mov cx, 64000         ; 320*200 pixels\r\nsl:   xor byte [es:di], 15  ; inverte o pixel no lugar (0<->15)\r\n      inc di\r\n      loop sl\r\n      mov ah, 0x86          ; pausa ~0.3s p/ dar pra ver a troca (int 15h)\r\n      mov cx, 0x0004        ; CX:DX = 300000 microssegundos\r\n      mov dx, 0x93e0\r\n      int 0x15\r\n      jmp inv\r\n\r\n      times 510 - ($ - $$) db 0\r\n      db 0x55\r\n      db 0xaa\r\n"},"50":{"curto":"      org 0x7c00\r\n      bits 16\r\n      xor ax, ax\r\n      mov ds, ax\r\n      mov ss, ax\r\n      mov sp, 0x7c00\r\n      sti\r\n\r\n      mov si, msg\r\n      call prints\r\n      call geti          ; ax = ano digitado\r\n      mov cx, ax         ; cx guarda o ano (div nao mexe em cx)\r\n\r\n      mov ax, cx\r\n      xor dx, dx\r\n      mov bx, 400\r\n      div bx\r\n      or dx, dx\r\n      jz sim             ; ano % 400 == 0 -> bissexto\r\n\r\n      mov ax, cx\r\n      xor dx, dx\r\n      mov bx, 100\r\n      div bx\r\n      or dx, dx\r\n      jz nao             ; ano % 100 == 0 -> NAO\r\n\r\n      mov ax, cx\r\n      xor dx, dx\r\n      mov bx, 4\r\n      div bx\r\n      or dx, dx\r\n      jz sim             ; ano % 4 == 0 -> bissexto\r\n\r\nnao:  mov si, msgn\r\n      jmp show\r\nsim:  mov si, msgs\r\nshow: call prints\r\n      hlt\r\n\r\ngeti: xor bx, bx         ; bx = numero acumulado\r\nlerc: xor ah, ah\r\n      int 0x16           ; al = tecla\r\n      cmp al, 13         ; Enter termina\r\n      je fim\r\n      mov ah, 0x0e\r\n      int 0x10           ; ecoa\r\n      sub al, 48         ; ASCII -> digito\r\n      mov cl, al\r\n      xor ch, ch\r\n      mov ax, bx\r\n      mov bx, 10\r\n      mul bx             ; ax = acumulado * 10\r\n      mov bx, ax\r\n      add bx, cx         ; + digito\r\n      jmp lerc\r\nfim:  mov ax, bx\r\n      ret\r\n\r\nprints: mov ah, 0x0e\r\npl:   lodsb\r\n      int 0x10\r\n      or al, al\r\n      jnz pl\r\n      ret\r\n\r\nmsg:  db 13,10,\"Digite o ano: \",0\r\nmsgs: db 13,10,\"SIM\",0\r\nmsgn: db 13,10,\"NAO\",0\r\n\r\n      times 510 - ($ - $$) db 0\r\n      db 0x55\r\n      db 0xaa\r\n","full":"      org 0x7c00\r\n      bits 16\r\n\r\n      xor ax, ax\r\n      mov ds, ax\r\n      mov ss, ax\r\n      mov sp, 0x7c00\r\n      sti\r\n\r\n      ; --- pergunta o ano ---\r\n      mov si, msg\r\n      call prints\r\n\r\n      ; --- le o ano (GET i) -> ax ---\r\n      call geti\r\n      mov [ano], ax\r\n\r\n      ; --- pula uma linha ---\r\n      mov ah, 0x0e\r\n      mov al, 13\r\n      int 0x10\r\n      mov al, 10\r\n      int 0x10\r\n\r\n      ; --- ano % 400 == 0 ? -> bissexto ---\r\n      mov ax, [ano]\r\n      mov dx, 0\r\n      mov bx, 400\r\n      div bx\r\n      cmp dx, 0\r\n      je sim\r\n\r\n      ; --- ano % 100 == 0 ? -> NAO bissexto ---\r\n      mov ax, [ano]\r\n      mov dx, 0\r\n      mov bx, 100\r\n      div bx\r\n      cmp dx, 0\r\n      je nao\r\n\r\n      ; --- ano % 4 == 0 ? -> bissexto ---\r\n      mov ax, [ano]\r\n      mov dx, 0\r\n      mov bx, 4\r\n      div bx\r\n      cmp dx, 0\r\n      je sim\r\n\r\nnao:  mov si, msgnao\r\n      call prints\r\n      hlt\r\n\r\nsim:  mov si, msgsim\r\n      call prints\r\n      hlt\r\n\r\n; ============ GET i: le um numero do teclado, devolve em AX ============\r\ngeti:  push bx\r\n       push cx\r\n       push dx\r\n       mov bx, 0            ; bx = numero acumulado\r\nlerc:  mov ah, 0\r\n       int 0x16             ; al = tecla digitada (ASCII)\r\n       cmp al, 13           ; Enter? termina\r\n       je fimg\r\n       mov ah, 0x0e         ; ecoa a tecla na tela\r\n       int 0x10\r\n       sub al, 48           ; '0'..'9' -> 0..9\r\n       mov ah, 0\r\n       mov cx, ax           ; cx = digito\r\n       mov ax, bx\r\n       mov bx, 10\r\n       mul bx               ; ax = acumulado * 10\r\n       mov bx, ax\r\n       add bx, cx           ; bx = acumulado*10 + digito\r\n       jmp lerc\r\nfimg:  mov ax, bx           ; resultado em AX\r\n       pop dx\r\n       pop cx\r\n       pop bx\r\n       ret\r\n\r\n; ============ prints: imprime texto terminado em 0 (do professor) ======\r\nprints: push si\r\n        push ax\r\n        mov ah, 0x0e\r\npsl:    lodsb\r\n        int 0x10\r\n        or al, al\r\n        jnz psl\r\n        pop ax\r\n        pop si\r\n        ret\r\n\r\nmsg:    db \"Digite o ano: \", 0\r\nmsgsim: db \"BISSEXTO\", 0\r\nmsgnao: db \"NAO BISSEXTO\", 0\r\nano:    dw 0\r\n\r\n      times 510 - ($ - $$) db 0\r\n      db 0x55\r\n      db 0xaa\r\n"},"54":{"curto":"      org 0x7c00\r\n      bits 16\r\n      xor ax, ax\r\n      mov ds, ax\r\n      mov ss, ax\r\n      mov sp, 0x7c00\r\n      sti\r\n\r\n      mov si, msg\r\n      call prints\r\n      call geti          ; ax = n\r\n      mov di, ax         ; di = n\r\n      mov cx, 1          ; k = 1\r\ntl:   mov ax, cx\r\n      mov bx, cx\r\n      inc bx             ; k+1\r\n      mul bx             ; ax = k*(k+1)\r\n      mov bx, cx\r\n      add bx, 2          ; k+2\r\n      mul bx             ; dx:ax = k*(k+1)*(k+2)\r\n      or dx, dx          ; passou de 65535?\r\n      jnz tnao           ; produto grande demais -> nao\r\n      cmp ax, di\r\n      je tsim            ; produto == n -> sim\r\n      ja tnao            ; produto > n -> nao\r\n      inc cx\r\n      jmp tl\r\ntsim: mov si, msgs\r\n      jmp show\r\ntnao: mov si, msgn\r\nshow: call prints\r\n      hlt\r\n\r\ngeti: xor bx, bx         ; bx = numero acumulado\r\nlerc: xor ah, ah\r\n      int 0x16           ; al = tecla\r\n      cmp al, 13         ; Enter termina\r\n      je fim\r\n      mov ah, 0x0e\r\n      int 0x10           ; ecoa\r\n      sub al, 48         ; ASCII -> digito\r\n      mov cl, al\r\n      xor ch, ch\r\n      mov ax, bx\r\n      mov bx, 10\r\n      mul bx             ; ax = acumulado * 10\r\n      mov bx, ax\r\n      add bx, cx         ; + digito\r\n      jmp lerc\r\nfim:  mov ax, bx\r\n      ret\r\n\r\nprints: mov ah, 0x0e\r\npl:   lodsb\r\n      int 0x10\r\n      or al, al\r\n      jnz pl\r\n      ret\r\n\r\nmsg:  db 13,10,\"Digite um numero: \",0\r\nmsgs: db 13,10,\"TRIANGULAR\",0\r\nmsgn: db 13,10,\"NAO TRIANGULAR\",0\r\n\r\n      times 510 - ($ - $$) db 0\r\n      db 0x55\r\n      db 0xaa\r\n","full":"      org 0x7c00\r\n      bits 16\r\n\r\n      xor ax, ax\r\n      mov ds, ax\r\n      mov ss, ax\r\n      mov sp, 0x7c00\r\n      sti\r\n\r\n      ; --- pergunta o numero ---\r\n      mov si, msg\r\n      call prints\r\n\r\n      ; --- le o numero (GET i) ---\r\n      call geti\r\n      mov [n], ax\r\n\r\n      ; --- pula uma linha ---\r\n      mov ah, 0x0e\r\n      mov al, 13\r\n      int 0x10\r\n      mov al, 10\r\n      int 0x10\r\n\r\n      ; --- testa k*(k+1)*(k+2) para k = 1, 2, 3, ... ---\r\n      mov cx, 1             ; k = 1\r\nlaco: mov ax, cx\r\n      mov bx, cx\r\n      inc bx               ; k+1\r\n      mul bx               ; ax = k*(k+1)\r\n      mov bx, cx\r\n      add bx, 2            ; k+2\r\n      mul bx               ; dx:ax = k*(k+1)*(k+2)\r\n      cmp dx, 0\r\n      jne nao              ; produto > 65535 -> nao\r\n      cmp ax, [n]\r\n      je sim               ; produto == n -> triangular\r\n      ja nao               ; produto > n -> parou de dar, nao\r\n      inc cx\r\n      jmp laco\r\n\r\nsim:  mov si, msgsim\r\n      call prints\r\n      hlt\r\n\r\nnao:  mov si, msgnao\r\n      call prints\r\n      hlt\r\n\r\n; ============ GET i: le um numero do teclado, devolve em AX ============\r\ngeti:  push bx\r\n       push cx\r\n       push dx\r\n       mov bx, 0\r\nlerc:  mov ah, 0\r\n       int 0x16\r\n       cmp al, 13\r\n       je fimg\r\n       mov ah, 0x0e\r\n       int 0x10\r\n       sub al, 48\r\n       mov ah, 0\r\n       mov cx, ax\r\n       mov ax, bx\r\n       mov bx, 10\r\n       mul bx\r\n       mov bx, ax\r\n       add bx, cx\r\n       jmp lerc\r\nfimg:  mov ax, bx\r\n       pop dx\r\n       pop cx\r\n       pop bx\r\n       ret\r\n\r\n; ============ prints: imprime texto terminado em 0 ============\r\nprints: push si\r\n        push ax\r\n        mov ah, 0x0e\r\npsl:    lodsb\r\n        int 0x10\r\n        or al, al\r\n        jnz psl\r\n        pop ax\r\n        pop si\r\n        ret\r\n\r\nmsg:    db \"Digite um numero: \", 0\r\nmsgsim: db \"TRIANGULAR\", 0\r\nmsgnao: db \"NAO TRIANGULAR\", 0\r\nn:      dw 0\r\n\r\n      times 510 - ($ - $$) db 0\r\n      db 0x55\r\n      db 0xaa\r\n"},"55":{"curto":"      org 0x7c00\r\n      bits 16\r\n      xor ax, ax\r\n      mov ds, ax\r\n      mov ss, ax\r\n      mov sp, 0x7c00\r\n      sti\r\n\r\n      mov si, msg\r\n      call prints\r\n      call geti          ; ax = n\r\n      mov di, ax         ; di = n\r\n      xor si, si         ; si = soma dos divisores\r\n      mov bx, 1          ; bx = divisor d\r\npf:   cmp bx, di\r\n      jae pfim           ; d >= n -> acabou\r\n      mov ax, di\r\n      xor dx, dx\r\n      div bx             ; dx = n % d\r\n      or dx, dx\r\n      jnz pnx            ; resto != 0 -> nao e divisor\r\n      add si, bx         ; soma += d\r\npnx:  inc bx\r\n      jmp pf\r\npfim: cmp si, di         ; soma == n ?\r\n      jne pnao\r\n      mov si, msgs\r\n      jmp show\r\npnao: mov si, msgn\r\nshow: call prints\r\n      hlt\r\n\r\ngeti: xor bx, bx         ; bx = numero acumulado\r\nlerc: xor ah, ah\r\n      int 0x16           ; al = tecla\r\n      cmp al, 13         ; Enter termina\r\n      je fim\r\n      mov ah, 0x0e\r\n      int 0x10           ; ecoa\r\n      sub al, 48         ; ASCII -> digito\r\n      mov cl, al\r\n      xor ch, ch\r\n      mov ax, bx\r\n      mov bx, 10\r\n      mul bx             ; ax = acumulado * 10\r\n      mov bx, ax\r\n      add bx, cx         ; + digito\r\n      jmp lerc\r\nfim:  mov ax, bx\r\n      ret\r\n\r\nprints: mov ah, 0x0e\r\npl:   lodsb\r\n      int 0x10\r\n      or al, al\r\n      jnz pl\r\n      ret\r\n\r\nmsg:  db 13,10,\"Digite um numero: \",0\r\nmsgs: db 13,10,\"PERFEITO\",0\r\nmsgn: db 13,10,\"NAO PERFEITO\",0\r\n\r\n      times 510 - ($ - $$) db 0\r\n      db 0x55\r\n      db 0xaa\r\n","full":"      org 0x7c00\r\n      bits 16\r\n\r\n      xor ax, ax\r\n      mov ds, ax\r\n      mov ss, ax\r\n      mov sp, 0x7c00\r\n      sti\r\n\r\n      ; --- pergunta o numero ---\r\n      mov si, msg\r\n      call prints\r\n\r\n      ; --- le o numero (GET i) ---\r\n      call geti\r\n      mov [n], ax\r\n\r\n      ; --- pula uma linha ---\r\n      mov ah, 0x0e\r\n      mov al, 13\r\n      int 0x10\r\n      mov al, 10\r\n      int 0x10\r\n\r\n      ; --- soma os divisores proprios (1 ate n-1) ---\r\n      mov word [soma], 0\r\n      mov bx, 1              ; d = 1\r\nlaco: cmp bx, [n]\r\n      jae fimlaco           ; d >= n -> para\r\n      mov ax, [n]\r\n      mov dx, 0\r\n      div bx                ; dx = n % d\r\n      cmp dx, 0\r\n      jne prox              ; nao divide -> proximo\r\n      mov ax, [soma]\r\n      add ax, bx\r\n      mov [soma], ax        ; soma += d\r\nprox: inc bx\r\n      jmp laco\r\n\r\nfimlaco:\r\n      mov ax, [soma]\r\n      cmp ax, [n]           ; soma == n ?\r\n      je sim\r\n\r\n      mov si, msgnao\r\n      call prints\r\n      hlt\r\n\r\nsim:  mov si, msgsim\r\n      call prints\r\n      hlt\r\n\r\n; ============ GET i: le um numero do teclado, devolve em AX ============\r\ngeti:  push bx\r\n       push cx\r\n       push dx\r\n       mov bx, 0\r\nlerc:  mov ah, 0\r\n       int 0x16\r\n       cmp al, 13\r\n       je fimg\r\n       mov ah, 0x0e\r\n       int 0x10\r\n       sub al, 48\r\n       mov ah, 0\r\n       mov cx, ax\r\n       mov ax, bx\r\n       mov bx, 10\r\n       mul bx\r\n       mov bx, ax\r\n       add bx, cx\r\n       jmp lerc\r\nfimg:  mov ax, bx\r\n       pop dx\r\n       pop cx\r\n       pop bx\r\n       ret\r\n\r\n; ============ prints: imprime texto terminado em 0 ============\r\nprints: push si\r\n        push ax\r\n        mov ah, 0x0e\r\npsl:    lodsb\r\n        int 0x10\r\n        or al, al\r\n        jnz psl\r\n        pop ax\r\n        pop si\r\n        ret\r\n\r\nmsg:    db \"Digite um numero: \", 0\r\nmsgsim: db \"PERFEITO\", 0\r\nmsgnao: db \"NAO PERFEITO\", 0\r\nn:      dw 0\r\nsoma:   dw 0\r\n\r\n      times 510 - ($ - $$) db 0\r\n      db 0x55\r\n      db 0xaa\r\n"},"65":{"curto":"      org 0x7c00\r\n      bits 16\r\n      xor ax, ax\r\n      mov ds, ax\r\n      mov ss, ax\r\n      mov sp, 0x7c00\r\n      sti\r\n\r\n      mov ax, 0x0013     ; modo grafico VGA 320x200, 256 cores\r\n      int 0x10\r\n      mov ax, 0xa000\r\n      mov es, ax         ; ES -> memoria de video\r\n      xor di, di         ; DI = indice do pixel (comeca no 0)\r\n\r\nlerc: xor ah, ah\r\n      int 0x16           ; AL = byte da tecla\r\n      stosb              ; pinta o pixel [DI] com a cor AL e faz DI++\r\n      jmp lerc\r\n\r\n      times 510 - ($ - $$) db 0\r\n      db 0x55\r\n      db 0xaa\r\n","full":"      org 0x7c00\r\n      bits 16\r\n\r\n      ; --- prologo robusto (monta pilha e liga interrupcao) ---\r\n      xor ax, ax\r\n      mov ds, ax\r\n      mov ss, ax\r\n      mov sp, 0x7c00\r\n      sti\r\n\r\n      ; --- entra no modo grafico VGA 13h: 320x200, 256 cores ---\r\n      mov ax, 0x0013\r\n      int 0x10\r\n\r\n      ; --- ES aponta pra memoria de video (segmento 0xA000) ---\r\n      ; no modo 13h cada pixel e 1 byte (o indice da cor na paleta),\r\n      ; em sequencia: pixel 0 = A000:0000, pixel 1 = A000:0001, ...\r\n      mov ax, 0xa000\r\n      mov es, ax\r\n      xor di, di            ; DI = offset do proximo pixel (0,1,2,...)\r\n\r\n      ; --- a cada tecla, pinta o proximo pixel com a cor = byte da tecla ---\r\nlerc: xor ah, ah\r\n      int 0x16              ; espera tecla; AL = codigo ASCII digitado\r\n      stosb                 ; ES:[DI] = AL (cor);  DI = DI + 1\r\n      jmp lerc              ; proxima tecla -> proximo pixel em sequencia\r\n\r\n      times 510 - ($ - $$) db 0\r\n      db 0x55\r\n      db 0xaa\r\n"}};
const NOMES = {"22":"Atualizar paleta VGA","23":"Xadrez que pisca","50":"Ano bissexto","54":"Numero triangular","55":"Numero perfeito","65":"Pixels VGA por tecla"};

const TXT = { "content-type": "text/plain; charset=utf-8" };
const HTM = { "content-type": "text/html; charset=utf-8" };

// id de questao aceito no cadastro: letras, numeros, - e _ (ate 40)
const ID_OK = /^[A-Za-z0-9_-]{1,40}$/;
const MAX_BYTES = 100 * 1024;      // teto do codigo colado
const KV_PREFIX = "q:";

// escapa os caracteres que quebrariam o HTML (o assembly usa "->" nos comentarios,
// e o codigo colado pode conter "<", ">", "&", ate "</textarea>")
function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// ============ disponibilidade (planilha publica da turma, Google Sheets) ============
// Planilha compartilhada como "qualquer um com o link: leitor" -> lida via export CSV
// (gviz), sem chave/OAuth. Colunas: A=numero da questao, B=DISPONIBILIDADE.
// B pode ser: "SELECIONADA" (nao pode cadastrar), um nome (marcada) ou algo com
// "reserva" (reserva de alguem, texto livre). O ID da planilha NAO e segredo.
const SHEET_ID = "1pAWwq5J6BtbijprP5d8fJPM7R5WyKXg3gaUcCF3SwLI";
const SHEET_GID = "0";
const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&gid=${SHEET_GID}`;
const SHEET_TTL_MS = 10000; // cache curto: "tempo real" na pratica, sem estourar a cota
let _sheetCache = { t: 0, map: null };

// CSV com campos entre aspas (aspas escapadas como "")
function parseCSV(text) {
  const rows = []; let row = [], field = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else q = false; }
      else field += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else if (c !== "\r") field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}

// baixa a planilha (com cache) -> { "<numero>": "<disponibilidade>" }. Fail-open.
async function getDisponibilidade() {
  const now = Date.now();
  if (_sheetCache.map && now - _sheetCache.t < SHEET_TTL_MS) return _sheetCache.map;
  try {
    const res = await fetch(SHEET_URL, { cf: { cacheTtl: 5 } });
    if (!res.ok) throw new Error("http " + res.status);
    const rows = parseCSV(await res.text());
    const map = {};
    for (let i = 1; i < rows.length; i++) { // pula o cabecalho
      const num = (rows[i][0] || "").trim();
      if (num) map[num] = (rows[i][1] || "").trim();
    }
    _sheetCache = { t: now, map };
    return map;
  } catch (e) {
    return _sheetCache.map || {}; // se falhar, usa o ultimo cache (ou vazio) e segue
  }
}

// minusculo p/ comparar ("selecionada"/"reserva" nao tem acento, entao basta isso)
function _norm(s) { return String(s == null ? "" : s).toLowerCase(); }

// classifica a celula DISPONIBILIDADE -> {tipo, texto} ou null
export function _classificar(disp) {
  const raw = String(disp == null ? "" : disp).trim();
  if (!raw) return null;
  const n = _norm(raw);
  if (n === "selecionada") return { tipo: "selecionada", texto: raw };
  if (n.includes("reserva")) return { tipo: "reserva", texto: raw };
  return { tipo: "marcada", texto: raw };
}

// overlay temporario (some em ~5s via JS, respeitando o disfarce de cmd)
function tagHTML(cls) {
  if (!cls) return "";
  const label =
    cls.tipo === "selecionada" ? "SELECIONADA · não disponível"
    : cls.tipo === "reserva" ? "RESERVA · " + esc(cls.texto)
    : "MARCADA · " + esc(cls.texto);
  return `<div id="tagpop" class="tagpop tag-${cls.tipo}" role="status" aria-live="polite">${label}</div>` +
    `<script>setTimeout(function(){var t=document.getElementById("tagpop");if(!t)return;` +
    `t.style.transition="opacity .5s ease";t.style.opacity="0";` +
    `setTimeout(function(){t.remove();},550);},4500);</script>`;
}

// ==================== identidade visual (paginas publicas) ====================
// "Datasheet de boot sector": papel tecnico claro, cabecalhos/comandos em mono,
// corpo em sans, menu de bootloader e o selo 55 AA como assinatura. Compartilhado
// por index() e help() via siteShell() — as telas /dev NAO usam isto (imitam cmd).
// Ver arq-worker/DESIGN_SPEC.md. Regra: qualquer edicao nestas paginas segue esta
// identidade (CLAUDE.md, convencao #4).
const SITECSS = `
:root{--paper:#EDF0F6;--panel:#fff;--ink:#161A22;--muted:#5B6270;--line:#D6DBE7;
--accent:#1F3BE0;--accent-weak:#E9EDFC;--signal:#B96E16;--signal-weak:#FAF2E4;--ink-panel:#0E1220;--radius:14px;
--sans:ui-sans-serif,-apple-system,"Segoe UI",Roboto,system-ui,sans-serif;
--mono:"Cascadia Code","Cascadia Mono",ui-monospace,"SF Mono",Consolas,"Liberation Mono",monospace}
*{box-sizing:border-box}
html{scroll-behavior:smooth}
body{margin:0;background:var(--paper);color:var(--ink);font-family:var(--sans);line-height:1.65;-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}
a{color:var(--accent);text-decoration:none}
a:hover{text-decoration:underline}
a:focus-visible,button:focus-visible{outline:2px solid var(--accent);outline-offset:2px;border-radius:5px}
code{font-family:var(--mono);font-size:.86em;background:#E3E7F1;padding:1px 5px;border-radius:5px}
b{font-weight:650}
.wrap{max-width:960px;margin:0 auto;padding:0 20px}
.statusbar{position:sticky;top:0;z-index:50;display:flex;gap:14px;align-items:center;justify-content:space-between;background:var(--ink-panel);color:#C3CBDA;font-family:var(--mono);font-size:.72rem;letter-spacing:.03em;padding:8px 18px;-webkit-user-select:none;user-select:none}
.statusbar a{color:#C3CBDA;border-bottom:1px solid #38415c;padding-bottom:1px}
.statusbar a:hover{color:#fff;text-decoration:none;border-color:#6a76a0}
.sig{color:var(--signal);font-weight:700;letter-spacing:.12em}
.hero{padding:64px 0 30px}
.eyebrow{font-family:var(--mono);font-size:.76rem;letter-spacing:.2em;text-transform:uppercase;color:var(--accent);margin:0 0 14px}
.hero h1{font-family:var(--mono);font-weight:700;font-size:clamp(2.1rem,6.4vw,3.4rem);line-height:1.04;letter-spacing:-.03em;margin:0 0 18px}
.lead{font-size:1.14rem;color:var(--muted);max-width:58ch;margin:0 0 22px}
.chips{display:flex;gap:10px;flex-wrap:wrap;margin:0}
.chip{font-family:var(--mono);font-size:.72rem;letter-spacing:.02em;color:var(--ink);background:var(--panel);border:1px solid var(--line);border-radius:999px;padding:6px 13px}
.section{padding:36px 0;border-top:1px solid var(--line)}
.section-head{display:flex;align-items:center;flex-wrap:wrap;gap:12px;margin:2px 0 8px}
h2{font-family:var(--mono);font-weight:700;font-size:1.5rem;letter-spacing:-.01em;margin:0}
h3{font-family:var(--mono);font-weight:650;font-size:1.05rem;margin:0 0 8px}
.sub{color:var(--muted);margin:0 0 20px;max-width:66ch}
.pill{font-family:var(--mono);font-size:.68rem;text-transform:uppercase;letter-spacing:.08em;color:var(--signal);background:var(--signal-weak);border:1px solid #E7CFA0;padding:3px 9px;border-radius:999px}
.locker{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:14px;margin:6px 0 4px}
.qcard{background:var(--panel);border:1px solid var(--line);border-radius:var(--radius);padding:16px 16px 14px;display:flex;flex-direction:column;gap:6px;transition:transform .15s ease,box-shadow .15s ease,border-color .15s ease}
.qcard:hover{transform:translateY(-3px);box-shadow:0 12px 26px rgba(22,32,64,.10);border-color:var(--accent)}
.qtop{display:flex;align-items:flex-start;justify-content:space-between}
.num{font-family:var(--mono);font-weight:700;font-size:2.5rem;line-height:.95;letter-spacing:-.04em;min-width:0;overflow-wrap:anywhere}
.qcard.word .num{font-size:1.5rem;align-self:flex-end}
.tag{font-family:var(--mono);font-size:.64rem;text-transform:uppercase;letter-spacing:.08em;padding:3px 8px;border-radius:999px}
.tag.base{color:#4a5568;background:#EAEDF3;border:1px solid var(--line)}
.tag.turma{color:#1f6b3a;background:#E6F4EC;border:1px solid #BFE3CC}
.qname{font-weight:600;font-size:1rem}
.acts{margin-top:8px;display:flex;flex-wrap:wrap;gap:6px}
.acts a{font-family:var(--mono);font-size:.74rem;color:var(--accent);border:1px solid var(--line);border-radius:8px;padding:4px 9px;background:#fff}
.acts a:hover{text-decoration:none;border-color:var(--accent);background:var(--accent-weak)}
.note{border-left:3px solid var(--accent);background:var(--accent-weak);padding:11px 15px;border-radius:0 10px 10px 0;margin:16px 0}
.note.tip{border-left-color:var(--signal);background:var(--signal-weak)}
.bootmenu{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin:4px 0}
.opt{position:relative;display:block;background:var(--panel);border:1px solid var(--line);border-radius:var(--radius);padding:20px;color:inherit;transition:transform .15s,box-shadow .15s,border-color .15s}
.opt:hover{transform:translateY(-3px);box-shadow:0 12px 28px rgba(22,32,64,.10);text-decoration:none;border-color:var(--accent)}
.opt.default{border-color:var(--accent);box-shadow:inset 0 0 0 1px var(--accent)}
.opt .marker{font-family:var(--mono);color:var(--accent);font-weight:700;margin-right:6px}
.opt .rec{float:right;font-family:var(--mono);font-size:.66rem;text-transform:uppercase;letter-spacing:.08em;color:var(--signal);background:var(--signal-weak);border:1px solid #E7CFA0;padding:3px 9px;border-radius:999px}
.opt .rec.alt{color:var(--muted);background:#EEF1F7;border-color:var(--line)}
.opt h3{font-size:1.35rem;margin:10px 0 6px}
.opt p{margin:0;color:var(--muted);font-size:.94rem}
.step{display:flex;gap:16px;padding:16px 0;border-top:1px dashed var(--line)}
.step:first-of-type{border-top:0;padding-top:6px}
.step-n{flex:none;width:30px;height:30px;display:grid;place-items:center;font-family:var(--mono);font-weight:700;font-size:.9rem;color:#fff;background:var(--accent);border-radius:9px}
.step-b{min-width:0;flex:1}
.step-b>p{margin:0 0 4px}
.step-b ol{margin:8px 0 0;padding-left:20px}
.step-b ol li{margin:4px 0}
.cmd{position:relative;margin:12px 0}
.cmd pre{margin:0;background:var(--ink-panel);color:#E7EBF4;font-family:var(--mono);font-size:.85rem;line-height:1.55;padding:14px 66px 14px 16px;border-radius:11px;overflow-x:auto;white-space:pre}
.copy{position:absolute;top:9px;right:9px;font-family:var(--mono);font-size:.68rem;color:#C3CBDA;background:#20263B;border:1px solid #313a58;border-radius:8px;padding:5px 10px;cursor:pointer;transition:background .12s,color .12s}
.copy:hover{background:#2b3352;color:#fff}
.copy.done{color:#84e3a6;border-color:#2f5a44}
.codelinks{display:flex;flex-wrap:wrap;gap:10px;margin:8px 0}
.codelink{display:flex;align-items:center;gap:10px;background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:8px 12px}
.cl-n{font-family:var(--mono);font-weight:700;font-size:1.05rem}
.cl-name{color:var(--muted);font-size:.9rem}
.codelink a{font-family:var(--mono);font-size:.74rem;border:1px solid var(--line);border-radius:8px;padding:3px 8px}
.codelink a:hover{text-decoration:none;border-color:var(--accent);background:var(--accent-weak)}
.mini{color:var(--muted);font-size:.9rem;margin:6px 0 0}
table{width:100%;border-collapse:collapse;margin:8px 0;font-size:.94rem}
th,td{text-align:left;padding:11px 13px;border-bottom:1px solid var(--line);vertical-align:top}
th{font-family:var(--mono);font-size:.72rem;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);font-weight:650}
tbody tr:hover td{background:#F6F8FC}
.foot{display:flex;flex-wrap:wrap;gap:10px;justify-content:space-between;align-items:center;border-top:1px solid var(--line);margin-top:20px;padding:24px 20px 60px;color:var(--muted);font-family:var(--mono);font-size:.78rem}
@media(max-width:640px){.bootmenu{grid-template-columns:1fr}.hero{padding:44px 0 24px}}
@media(prefers-reduced-motion:no-preference){
.reveal{opacity:0;transform:translateY(12px);animation:rise .6s cubic-bezier(.2,.7,.2,1) forwards}
.reveal.d1{animation-delay:.04s}.reveal.d2{animation-delay:.13s}.reveal.d3{animation-delay:.22s}
@keyframes rise{to{opacity:1;transform:none}}}
@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}}
`;

// liga os botoes "copiar" ao <pre> vizinho (utilidade real; funciona sem framework)
const COPYJS = `<script>(function(){var b=document.querySelectorAll(".copy");for(var i=0;i<b.length;i++){(function(x){x.addEventListener("click",function(){var p=x.parentNode.querySelector("pre");if(!p||!navigator.clipboard)return;navigator.clipboard.writeText(p.innerText).then(function(){x.textContent="copiado \\u2713";x.classList.add("done");setTimeout(function(){x.textContent="copiar";x.classList.remove("done");},1400);});});})(b[i]);}})();</script>`;

// casca comum das paginas publicas: barra de status "POST", conteudo e rodape 55 AA.
function siteShell(title, main, nav) {
  return `<!doctype html><html lang="pt-br"><head><meta charset="utf-8">` +
    `<meta name="viewport" content="width=device-width, initial-scale=1">` +
    `<title>${title}</title><style>${SITECSS}</style></head><body>` +
    `<div class="statusbar"><span><b class="sig">ARQ//x86</b> · boot sector 512B · <span class="sig">55 AA</span></span>` +
    `<span>${nav || ""}</span></div>` +
    `<main class="wrap">${main}</main>` +
    `<footer class="foot"><span>fim do setor · <span class="sig">55 AA</span></span>` +
    `<span>Arquitetura · Assembly x86 modo real</span></footer>${COPYJS}</body></html>`;
}

// bloco de comando com botao copiar (esc() protege &<> mesmo que hoje nao apareca)
function cmd(code) {
  return `<div class="cmd"><button class="copy" type="button" aria-label="copiar comando">copiar</button>` +
    `<pre>${esc(code)}</pre></div>`;
}

// mini-cofre repetido no passo "pegar o codigo" de cada opcao (links das assadas)
function codeLinks() {
  let rows = "";
  for (const q of Object.keys(CODE)) {
    rows += `<div class="codelink"><span class="cl-n">${q}</span>` +
      `<span class="cl-name">${esc(NOMES[q])}</span>` +
      `<a href="/dev/${q}">terminal</a><a href="/api/arq/${q}">texto</a></div>`;
  }
  return `<div class="codelinks">${rows}</div>` +
    `<p class="mini">Abra, <b>Ctrl+A → Ctrl+C</b>, cole e salve como <code>prova.asm</code>. ` +
    `Todas (base + turma) estão no <a href="#cofre">cofre no topo</a>.</p>`;
}

// cofre "Questoes cadastradas": grade de cartoes — assadas (50/54/55) + turma (KV)
async function listaCadastradas(kv) {
  const items = Object.keys(CODE).map((q) => ({ n: q, nome: NOMES[q], base: true }));
  if (kv) {
    try {
      const { keys = [] } = await kv.list({ prefix: KV_PREFIX });
      for (const k of keys) {
        const n = k.name.slice(KV_PREFIX.length);
        if (CODE[n]) continue; // ja listado como assada
        items.push({ n, nome: (k.metadata && k.metadata.nome) || ("Questão " + n), base: false });
      }
    } catch (e) { /* KV indisponivel: mostra so as assadas */ }
  }
  const cards = items.map((it) => {
    const id = encodeURIComponent(it.n);
    const acts = `<a href="/dev/${id}">terminal</a><a href="/api/arq/${id}">texto</a>` +
      (it.base ? `<a href="/dev/${id}/full">extensa</a>` : ``);
    const word = /^[0-9]+$/.test(it.n) ? "" : " word"; // ids com letras: número menor
    return `<div class="qcard${word}"><div class="qtop"><span class="num">${esc(it.n)}</span>` +
      `<span class="tag ${it.base ? "base" : "turma"}">${it.base ? "base" : "turma"}</span></div>` +
      `<div class="qname">${esc(it.nome)}</div><div class="acts">${acts}</div></div>`;
  }).join("");
  return `<section class="section" id="cofre"><p class="eyebrow">arquivo // pega o código</p>` +
    `<div class="section-head"><h2>Questões cadastradas</h2></div>` +
    `<p class="sub">Cada cartão abre num <b>terminal</b> (tela igual ao cmd, pra copiar com discrição), ` +
    `em <b>texto</b> puro, ou na versão <b>extensa</b> comentada. Abra, <b>Ctrl+A → Ctrl+C</b> e cole.</p>` +
    `<div class="locker">${cards}</div>` +
    `<div class="note"><b>Cadastrar uma questão nova:</b> abra <code>/dev/SEU-ID</code> ` +
    `(um número ou nome ainda <b>não usado</b>), cole o Assembly e salve — passa a abrir em ` +
    `<code>/dev/SEU-ID</code> pra todo mundo. <b>Cada id só entra uma vez</b>; depois disso trava.</div>` +
    `</section>`;
}

async function index(kv) {
  const cofre = await listaCadastradas(kv);
  const main =
    // ===================== HERO =====================
    `<section class="hero">` +
    `<p class="eyebrow reveal d1">assembly x86 · modo real · boot sector</p>` +
    `<h1 class="reveal d2">Pega o código.<br>Cola. Dá boot.</h1>` +
    `<p class="lead reveal d3">Programas de 512 bytes que leem um número pelo teclado e ` +
    `respondem na tela — sem sistema operacional. Escolha a questão, copie e rode no ` +
    `VirtualBox ou no QEMU. Novo por aqui? Veja a <a href="/help">ajuda</a>.</p>` +
    `<div class="chips reveal d3"><span class="chip">NASM + QEMU / VBox</span>` +
    `<span class="chip">boot sector · 55 AA</span><span class="chip">até 65535</span></div>` +
    `</section>` +

    // ===================== COFRE (destaque principal) =====================
    cofre +

    // ===================== MENU DE BOOT (escolha o caminho) =====================
    `<section class="section"><p class="eyebrow">execução // escolha um caminho</p>` +
    `<div class="section-head"><h2>Como rodar</h2></div>` +
    `<p class="sub">Os códigos já montam a pilha e ligam a interrupção do teclado, então rodam ` +
    `nos dois. Siga um caminho na ordem <b>instalar → configurar → pegar e rodar</b>.</p>` +
    `<div class="bootmenu">` +
    `<a class="opt default" href="#opcao-a"><span class="rec">recomendada</span>` +
    `<h3><span class="marker">▶</span>VirtualBox</h3>` +
    `<p>Mais provável no laboratório. Cria uma VM que dá boot pelo disquete.</p></a>` +
    `<a class="opt" href="#opcao-b"><span class="rec alt">mais simples</span>` +
    `<h3>QEMU</h3><p>Dá boot no binário direto, sem criar VM nem imagem de disquete.</p></a>` +
    `</div></section>` +

    // ===================== OPCAO A — VIRTUALBOX =====================
    `<section class="section" id="opcao-a"><p class="eyebrow">caminho A</p>` +
    `<div class="section-head"><h2>Opção A — VirtualBox</h2><span class="pill">recomendada</span></div>` +

    `<div class="step"><div class="step-n">1</div><div class="step-b"><h3>Instalar</h3>` +
    `<p><b>Windows</b> (PowerShell):</p>` +
    cmd("winget install NASM.NASM\nwinget install Oracle.VirtualBox") +
    `<div class="note tip">Depois de instalar, <b>feche e reabra o terminal</b> (pro PATH atualizar). ` +
    `Alternativa manual: NASM em <code>nasm.us</code>, VirtualBox em <code>virtualbox.org</code>.</div>` +
    `</div></div>` +

    `<div class="step"><div class="step-n">2</div><div class="step-b"><h3>Configurar a VM (só uma vez)</h3>` +
    `<ol>` +
    `<li>Abra o VirtualBox → <b>Novo</b>.</li>` +
    `<li>Nome: <code>prova</code>. Tipo: <b>Other</b>. Versão: <b>Other/Unknown</b>. Avançar.</li>` +
    `<li>Memória: pode deixar o padrão. Avançar.</li>` +
    `<li>Disco rígido: escolha <b>"Não adicionar um disco rígido virtual"</b>. Criar.</li>` +
    `<li>Selecione a VM → <b>Configurações → Armazenamento</b>.</li>` +
    `<li>Se não houver, clique em <b>Adicionar controladora → Controladora de Disquete</b>.</li>` +
    `<li>Na controladora de disquete, adicione um dispositivo de disquete (você anexa o <code>prova.img</code> no passo 3).</li>` +
    `<li><b>Configurações → Sistema → Placa-mãe → Ordem de inicialização</b>: marque <b>Disquete</b> e mova para o <b>topo</b>.</li>` +
    `</ol></div></div>` +

    `<div class="step"><div class="step-n">3</div><div class="step-b"><h3>Montar a imagem e rodar (cada vez que mudar o código)</h3>` +
    cmd("nasm -f bin prova.asm -o prova.bin\nfsutil file createnew pad.img 1474048\ncopy /b prova.bin+pad.img prova.img") +
    `<p>Isso gera <code>prova.img</code> com <b>exatamente 1.44 MB</b> (o setor de boot no início). Depois:</p>` +
    `<ol>` +
    `<li>VirtualBox → <b>Configurações → Armazenamento</b> → clique no disquete → escolha o arquivo <code>prova.img</code>.</li>` +
    `<li><b>Start</b> (se já estava rodando, use <b>Reset</b> para recarregar o novo código).</li>` +
    `<li>Digite o número, aperte <b>Enter</b>, a resposta aparece.</li>` +
    `</ol></div></div>` +

    `<div class="step"><div class="step-n">4</div><div class="step-b"><h3>Pegar o código</h3>` +
    codeLinks() + `</div></div></section>` +

    // ===================== OPCAO B — QEMU =====================
    `<section class="section" id="opcao-b"><p class="eyebrow">caminho B</p>` +
    `<div class="section-head"><h2>Opção B — QEMU</h2><span class="pill">mais simples</span></div>` +

    `<div class="step"><div class="step-n">1</div><div class="step-b"><h3>Instalar</h3>` +
    `<p><b>Windows</b> (PowerShell):</p>` +
    cmd("winget install NASM.NASM\nwinget install SoftwareFreedomConservancy.QEMU") +
    `<p><b>Linux</b> (Debian/Ubuntu):</p>` +
    cmd("sudo apt update\nsudo apt install nasm qemu-system-x86") +
    `<div class="note tip">No Windows, feche e reabra o terminal depois de instalar. Se ` +
    `<code>qemu-system-i386</code> não for reconhecido, use o caminho completo ` +
    `(costuma ficar em <code>C:\\Program Files\\qemu\\</code>).</div>` +
    `</div></div>` +

    `<div class="step"><div class="step-n">2</div><div class="step-b"><h3>Configurar</h3>` +
    `<p><b>Nada a configurar.</b> O QEMU dá boot no binário direto, sem criar VM nem imagem de disquete.</p>` +
    `</div></div>` +

    `<div class="step"><div class="step-n">3</div><div class="step-b"><h3>Rodar (cada vez que mudar o código)</h3>` +
    cmd("nasm -f bin prova.asm -o prova.bin\nqemu-system-i386 -fda prova.bin -boot a") +
    `<p>Abre a janela do QEMU. Digite o número, <b>Enter</b>, a resposta aparece. ` +
    `Para fechar: feche a janela ou <code>Ctrl+C</code> no terminal.</p>` +
    `</div></div>` +

    `<div class="step"><div class="step-n">4</div><div class="step-b"><h3>Pegar o código</h3>` +
    codeLinks() + `</div></div></section>` +

    // ===================== PROBLEMAS COMUNS =====================
    `<section class="section"><p class="eyebrow">quando não roda</p>` +
    `<div class="section-head"><h2>Problemas comuns</h2></div>` +
    `<table><thead><tr><th>Sintoma</th><th>Causa / solução</th></tr></thead><tbody>` +
    `<tr><td><code>nasm</code> não reconhecido</td><td>NASM não instalado ou PATH não atualizado. Reabra o terminal ou use o caminho completo do exe.</td></tr>` +
    `<tr><td>(VBox) <code>FATAL: No bootable medium found!</code></td><td>O disquete não está anexado ou não está no topo da ordem de boot. Ajuste em <b>Armazenamento</b> (anexar <code>prova.img</code>) e <b>Sistema → Ordem de inicialização</b> (Disquete no topo).</td></tr>` +
    `<tr><td>(VBox) não aparece onde anexar disquete</td><td>Adicione uma <b>Controladora de Disquete</b> em Configurações → Armazenamento.</td></tr>` +
    `<tr><td>(VBox) mudei o código e não mudou nada</td><td>Regenere o <code>prova.img</code> (nasm → fsutil → copy) e dê <b>Reset</b> na VM. Confirme que o <code>prova.img</code> anexado é o novo.</td></tr>` +
    `<tr><td>(QEMU) <code>qemu-system-i386</code> não reconhecido</td><td>QEMU não instalado ou PATH. No Windows costuma ficar em <code>C:\\Program Files\\qemu\\</code>.</td></tr>` +
    `<tr><td>Janela abre preta / não dá boot</td><td>O arquivo precisa terminar com <code>times 510-($-$$) db 0</code>, <code>db 0x55</code>, <code>db 0xaa</code>. Não apague essas linhas ao copiar.</td></tr>` +
    `<tr><td>Não aparece o que eu digito</td><td>Normal; o eco vem do <code>int 0x10</code> dentro do <code>geti</code>. A resposta aparece após o Enter.</td></tr>` +
    `<tr><td>Resposta errada</td><td>Funciona com números até 65535 (16 bits). Não use números maiores.</td></tr>` +
    `</tbody></table>` +
    `<div class="note tip">Se der problema, copie esta página inteira + a mensagem de erro do ` +
    `terminal e mande para uma IA — tem tudo que ela precisa para ajudar.</div>` +
    `</section>`;

  return siteShell("Códigos de prova — Arquitetura x86", main, `<a href="/help">ajuda ↗</a>`);
}

// ============================ paginas "cmd" ============================
// CSS base compartilhado pelas telas que imitam o Prompt de Comando.
const CMDCSS =
  `:root{--bg:#0c0c0c;--fg:#cccccc}` +
  `*{margin:0;padding:0;box-sizing:border-box}` +
  `html,body{background:var(--bg)}` +
  `body{color:var(--fg);font-family:Consolas,"Cascadia Mono","Lucida Console","Courier New",monospace;` +
  `font-size:16px;line-height:1.2;min-height:100vh;padding:2px 6px 48px;-webkit-font-smoothing:antialiased}` +
  `#term{white-space:pre-wrap;overflow-wrap:break-word}` +
  `.chrome{-webkit-user-select:none;user-select:none}` +
  `::selection{background:#cccccc;color:#0c0c0c}` +
  `::-moz-selection{background:#cccccc;color:#0c0c0c}` +
  // tag temporaria de disponibilidade (some em ~5s p/ nao perder o disfarce de cmd)
  `.tagpop{position:fixed;top:14px;left:50%;transform:translateX(-50%);z-index:99999;` +
  `padding:9px 18px;border-radius:6px;font-weight:bold;font-size:15px;letter-spacing:.3px;` +
  `box-shadow:0 6px 24px rgba(0,0,0,.55);-webkit-user-select:none;user-select:none;` +
  `pointer-events:none;max-width:92vw;text-align:center}` +
  `.tag-marcada{background:#4a3800;color:#ffe08a;border:1px solid #e5c07b}` +
  `.tag-reserva{background:#08343f;color:#9fe0f0;border:1px solid #4fc3d9}` +
  `.tag-selecionada{background:#4a1010;color:#ffb3b3;border:1px solid #f48771}`;

const CMD_HEADER =
  "Microsoft Windows [versão 10.0.26200.6584]\n" +
  "(c) Microsoft Corporation. Todos os direitos reservados.\n\n";

// devPage(): IMITA o cmd.exe. Recebe o codigo cru (string) ou null (prompt vazio).
// So a regiao do codigo e selecionavel; cabecalho/prompt tem user-select:none, entao
// Ctrl+A -> Ctrl+C copia exatamente o assembly.
// ============ guia "como rodar" (embaixo do terminal, por questao) ============
// O que cada questao pede/mostra quando roda (o resto do passo a passo e igual p/ todas).
const GUIA_Q = {
  "50": "Digite um <b>ano</b> (ex.: 2024) e tecle <b>Enter</b> &rarr; responde se e bissexto (na enxuta: <b>SIM</b>/<b>NAO</b>; na extensa: <b>BISSEXTO</b>/<b>NAO BISSEXTO</b>).",
  "54": "Digite um <b>numero</b> e tecle <b>Enter</b> &rarr; responde <b>TRIANGULAR</b> ou <b>NAO TRIANGULAR</b>.",
  "55": "Digite um <b>numero</b> e tecle <b>Enter</b> &rarr; responde <b>PERFEITO</b> ou <b>NAO PERFEITO</b>.",
  "65": "<b>Aperte teclas</b>: cada tecla pinta <b>1 pixel</b> no canto superior esquerdo (a cor vem do codigo da tecla). Os pixels sao pequenos — olhe de perto.",
  "22": "Digite <b>4 numeros</b>, um por linha (Enter apos cada): <b>indice</b> da cor (0–255), <b>R</b>, <b>G</b>, <b>B</b> (0–63). Depois a tela mostra faixas com as 256 cores.",
  "23": "Nao pede nada: aparece um <b>xadrez preto e branco</b> que fica <b>piscando</b> (invertendo as cores) sozinho.",
};

function cmdLine(cmd) {
  const e = esc(cmd);
  return `<div class="cmdline"><code>${e}</code><button class="cp" type="button" data-cmd="${e}">copiar</button></div>`;
}

function guiaHTML(n) {
  if (!n) return "";
  const oque = GUIA_Q[n] || "Rode e interaja conforme o enunciado da questao.";
  return `<section class="guia" aria-label="como rodar este codigo">` +
    `<h2>Como rodar este codigo (passo a passo)</h2>` +
    `<p class="oque"><b>Nesta questao:</b> ${oque}</p>` +

    `<h3>Passo 1 &middot; salvar o codigo</h3>` +
    `<p>Aqui em cima: <b>Ctrl+A</b> (seleciona tudo) &rarr; <b>Ctrl+C</b> (copia). Cole no <b>Bloco de Notas</b> ` +
    `e salve como <b>prova.asm</b>. No "Salvar como", troque <b>Tipo</b> para <b>Todos os arquivos</b> ` +
    `(senao o Windows salva como <code>prova.asm.txt</code> e nao funciona). Guarde a pasta onde salvou.</p>` +

    `<h3>Passo 2 &middot; montar (gera o programa)</h3>` +
    `<p>Abra o <b>PowerShell na pasta do arquivo</b> (na pasta, segure <b>Shift</b> + clique com o botao direito &rarr; ` +
    `"Abrir janela do PowerShell aqui") e rode:</p>` +
    cmdLine("nasm -f bin prova.asm -o prova.bin") +
    `<p>Se der "nasm nao e reconhecido": o NASM nao esta instalado/no PATH. Instale com ` +
    `<code>winget install NASM.NASM</code>, feche e reabra o terminal.</p>` +

    `<h3>Passo 3A &middot; rodar no QEMU (mais facil)</h3>` +
    `<p>Um comando so — abre a janela ja executando:</p>` +
    cmdLine("qemu-system-i386 -fda prova.bin -boot a") +
    `<p>O <code>-boot a</code> forca dar boot pelo disquete — sem ele o QEMU as vezes tenta o HD e mostra ` +
    `"Boot failed: could not read the boot disk". Para fechar, feche a janela do QEMU.</p>` +

    `<h3>Passo 3B &middot; rodar no VirtualBox (o "dar play")</h3>` +
    `<p>O VirtualBox nao roda o <code>.bin</code> direto — ele da boot num "disquete". ` +
    `Primeiro gere a imagem do disquete (no PowerShell, mesma pasta):</p>` +
    cmdLine("fsutil file createnew pad.img 1474048") +
    cmdLine("copy /b prova.bin+pad.img prova.img") +
    `<p>Isso cria o arquivo <b>prova.img</b>. Agora, no VirtualBox:</p>` +
    `<ol>` +
    `<li><b>Criar a maquina (so na 1ª vez):</b> clique em <b>Novo</b> &rarr; Nome: <code>prova</code> ` +
    `&rarr; Tipo: <b>Other</b> &rarr; Versao: <b>Other/Unknown</b> &rarr; <b>Proximo</b> &rarr; ` +
    `memoria pode deixar como esta &rarr; <b>Proximo</b> &rarr; marque <b>"Nao adicionar um disco rigido virtual"</b> &rarr; <b>Finalizar</b>.</li>` +
    `<li><b>Anexar o disquete:</b> selecione a VM <code>prova</code> &rarr; <b>Configuracoes</b> (engrenagem) &rarr; <b>Armazenamento</b>. ` +
    `Se nao houver uma "Controladora de Disquete", clique no icone pequeno <b>"Adiciona controladora"</b> (embaixo da arvore de armazenamento) e escolha <b>Controladora de Disquete (Floppy)</b>. ` +
    `Selecione essa controladora e clique no icone <b>"Adiciona disquete"</b>; na janela que abre, use <b>Adicionar</b> (icone de pasta) para escolher o <b>prova.img</b> e confirme em <b>Escolher</b>.</li>` +
    `<li><b>Pôr o disquete no topo do boot:</b> ainda em <b>Configuracoes</b> &rarr; <b>Sistema</b> &rarr; aba <b>Placa-mae</b> ` +
    `&rarr; secao <b>Ordem de inicializacao</b>. <b>Marque a caixinha do "Disquete"</b> e, com ele selecionado, use a <b>seta &uarr;</b> ao lado da lista ` +
    `para mover o <b>Disquete para o topo</b> (acima de Disco rigido e Optico). Clique <b>OK</b>.</li>` +
    `<li><b>Rodar:</b> selecione a VM <code>prova</code> e clique em <b>Iniciar</b> (a seta verde). A maquina "liga pelo disquete" e executa seu programa.</li>` +
    `<li><b>Mudou o codigo?</b> Refaca os comandos (<code>nasm</code> &rarr; <code>fsutil</code> &rarr; <code>copy</code>) e, na VM, use ` +
    `<b>Maquina &rarr; Reiniciar</b> (ou feche a janela &rarr; "Desligar" &rarr; <b>Iniciar</b> de novo).</li>` +
    `</ol>` +
    `<p class="rodape">Guia de referencia — nao entra na selecao (o <b>Ctrl+A</b> ali em cima copia so o codigo).</p>` +
    `</section>` +
    `<script>document.querySelectorAll(".cp").forEach(function(b){b.addEventListener("click",function(){` +
    `try{navigator.clipboard.writeText(b.dataset.cmd);}catch(e){}var t=b.textContent;b.textContent="copiado!";` +
    `setTimeout(function(){b.textContent=t;},1200);});});</script>`;
}

const GUIA_CSS =
  `.guia{max-width:820px;margin:0 auto;padding:26px 18px 64px;color:#d4d4d4;` +
  `font-family:-apple-system,"Segoe UI",Roboto,Arial,sans-serif;line-height:1.6;` +
  `border-top:2px solid #333;-webkit-user-select:none;user-select:none}` +
  `.guia h2{color:#fff;font-size:1.25rem;margin:6px 0 12px}` +
  `.guia h3{color:#dcdcaa;font-size:1.02rem;margin:20px 0 6px}` +
  `.guia p{margin:6px 0}.guia code{background:#000;color:#9cdcfe;padding:1px 5px;border-radius:3px;font-family:Consolas,monospace}` +
  `.guia ol{margin:8px 0 8px 20px}.guia li{margin:9px 0}` +
  `.guia .oque{background:#12241a;border:1px solid #2a5c3a;border-radius:6px;padding:10px 12px;color:#cfe9d8}` +
  `.cmdline{display:flex;align-items:center;gap:8px;background:#000;border:1px solid #333;border-radius:6px;padding:8px 10px;margin:6px 0;overflow-x:auto}` +
  `.cmdline code{background:none;color:#9cdcfe;white-space:pre;flex:1 1 auto}` +
  `.cmdline .cp{flex:0 0 auto;background:#2a2a2a;color:#ddd;border:1px solid #555;border-radius:4px;padding:3px 10px;font:inherit;font-size:.8rem;cursor:pointer}` +
  `.cmdline .cp:hover{background:#3a3a3a;border-color:#6a9955}` +
  `.guia .rodape{color:#888;font-size:.85rem;margin-top:18px}`;

function devPage(codigo, cls, n) {
  const norm = codigo != null
    ? esc(String(codigo).replace(/\r\n/g, "\n").replace(/\n+$/, ""))
    : null;
  const guia = norm != null ? guiaHTML(n) : "";
  const corpo = norm != null
    ? `<span class="chrome">${esc(CMD_HEADER)}C:\\Users\\User&gt;copy con prova.asm\n</span>` +
      `<span class="code">${norm}</span>` +
      `<span class="caret" aria-hidden="true"></span>`
    : `<span class="chrome">${esc(CMD_HEADER)}C:\\Users\\User&gt;</span>` +
      `<span class="caret" aria-hidden="true"></span>`;

  return `<!doctype html><html lang="pt-br"><head><meta charset="utf-8">` +
    `<meta name="viewport" content="width=device-width, initial-scale=1">` +
    `<title>C:\\Windows\\System32\\cmd.exe</title>` +
    `<style>` + CMDCSS +
    `.code{-webkit-user-select:text;user-select:text}` +
    `.caret{display:inline-block;width:.55em;height:1.05em;background:var(--fg);` +
    `vertical-align:text-bottom;margin-left:1px;animation:cmdblink 1.06s steps(1,end) infinite;` +
    `-webkit-user-select:none;user-select:none}` +
    `@keyframes cmdblink{0%,49%{opacity:1}50%,100%{opacity:0}}` +
    `@media(prefers-reduced-motion:reduce){.caret{animation:none}}` +
    (guia ? `#term{min-height:100vh}` + GUIA_CSS : ``) +
    `</style></head><body><div id="term">${corpo}</div>${tagHTML(cls)}${guia}</body></html>`;
}

// formPage(): tela (estilo cmd) pra cadastrar o codigo de uma questao ainda inexistente.
// opts: { codigo (prefill), nome (prefill), erro (bloqueio), aviso ([faltas] -> pede confirmar) }
function formPage(n, opts) {
  opts = opts || {};
  const codigoVal = opts.codigo ? esc(String(opts.codigo).replace(/\r\n/g, "\n")) : "";
  const nomeVal = opts.nome ? esc(opts.nome) : "";
  let msg = "";
  if (opts.erro) {
    msg = `<p class="erro">! ${esc(opts.erro)}</p>`;
  } else if (opts.aviso && opts.aviso.length) {
    msg = `<p class="aviso">! Atenção: isso não parece um boot sector completo ` +
      `(faltando: ${opts.aviso.map(esc).join(", ")}). Confira se não esqueceu nada. ` +
      `Se tiver certeza, marque a caixa abaixo e salve.</p>`;
  }

  return `<!doctype html><html lang="pt-br"><head><meta charset="utf-8">` +
    `<meta name="viewport" content="width=device-width, initial-scale=1">` +
    `<title>C:\\Windows\\System32\\cmd.exe</title>` +
    `<style>` + CMDCSS +
    `body{line-height:1.35}` +
    `.box{white-space:normal;max-width:920px;margin-top:2px}` +
    `.titulo{color:#dcdcaa;margin-bottom:8px}` +
    `.hint{margin:6px 0}` +
    `.hint2{margin:6px 0 10px 20px;color:#9d9d9d}.hint2 li{margin:2px 0}` +
    `code{color:#ce9178}` +
    `.erro{color:#f48771;border-left:3px solid #f48771;padding:6px 10px;margin:10px 0;background:#2a1414}` +
    `.aviso{color:#e5c07b;border-left:3px solid #e5c07b;padding:6px 10px;margin:10px 0;background:#282110}` +
    `label{display:block;margin:10px 0 4px}` +
    `input[type=text]{background:#1a1a1a;color:var(--fg);border:1px solid #3a3a3a;font:inherit;padding:5px 7px;width:100%;max-width:340px}` +
    `textarea{display:block;width:100%;height:52vh;min-height:280px;background:#000;color:var(--fg);` +
    `border:1px solid #3a3a3a;font:inherit;padding:8px;resize:vertical;white-space:pre;tab-size:8}` +
    `textarea:focus,input:focus{outline:none;border-color:#6a9955}` +
    `.chk{color:#e5c07b;display:flex;align-items:center;gap:8px;margin-top:12px}` +
    `.chk input{width:auto}` +
    `button{margin-top:14px;background:#1f1f1f;color:var(--fg);border:1px solid #4a4a4a;font:inherit;padding:9px 18px;cursor:pointer}` +
    `button:hover{background:#2d2d2d;border-color:#6a9955}` +
    `</style></head><body><div id="term">` +
    `<span class="chrome">${esc(CMD_HEADER)}C:\\Users\\User&gt;type ${esc(n)}.asm\n` +
    `O sistema não pode encontrar o arquivo especificado.\n\n</span>` +
    `<div class="box">` +
    `<div class="titulo">:: cadastrar questão "${esc(n)}"</div>` +
    `<p class="hint">Cole abaixo o código Assembly desta questão e clique em <b>Salvar</b>. ` +
    `Ele passa a abrir pra todo mundo em <b>/dev/${esc(n)}</b>. ` +
    `<b>Só dá pra cadastrar uma vez</b> — depois disso o código fica travado.</p>` +
    `<ul class="hint2">` +
    `<li>Deve ser um boot sector completo (começa com <code>org 0x7c00</code>).</li>` +
    `<li>Termina com <code>times 510-($-$$) db 0</code> / <code>db 0x55</code> / <code>db 0xaa</code>.</li>` +
    `<li>Tamanho máximo: 100 KB.</li></ul>` +
    msg +
    `<form method="POST" action="/dev/${encodeURIComponent(n)}">` +
    `<label for="nome">nome (opcional):</label>` +
    `<input id="nome" type="text" name="nome" maxlength="60" value="${nomeVal}" placeholder="ex: Fibonacci">` +
    `<label for="codigo">código:</label>` +
    `<textarea id="codigo" name="codigo" spellcheck="false" autocapitalize="off" autocorrect="off" ` +
    `placeholder="; cole aqui o codigo assembly (org 0x7c00 ... db 0xaa)">${codigoVal}</textarea>` +
    (opts.aviso && opts.aviso.length
      ? `<label class="chk"><input type="checkbox" name="confirmar" value="1"> salvar assim mesmo (sei que pode faltar algo)</label>`
      : ``) +
    `<button type="submit">Salvar e abrir /dev/${esc(n)}</button>` +
    `</form></div></div>${tagHTML(opts.cls)}</body></html>`;
}

// blockPage(): cadastro barrado porque a questao esta SELECIONADA na planilha.
function blockPage(n, cls) {
  return `<!doctype html><html lang="pt-br"><head><meta charset="utf-8">` +
    `<meta name="viewport" content="width=device-width, initial-scale=1">` +
    `<title>C:\\Windows\\System32\\cmd.exe</title>` +
    `<style>` + CMDCSS +
    `.code{-webkit-user-select:text;user-select:text}` +
    `.caret{display:inline-block;width:.55em;height:1.05em;background:var(--fg);` +
    `vertical-align:text-bottom;margin-left:1px;animation:cmdblink 1.06s steps(1,end) infinite}` +
    `@keyframes cmdblink{0%,49%{opacity:1}50%,100%{opacity:0}}` +
    `@media(prefers-reduced-motion:reduce){.caret{animation:none}}` +
    `</style></head><body><div id="term">` +
    `<span class="chrome">${esc(CMD_HEADER)}C:\\Users\\User&gt;copy con ${esc(n)}.asm\n` +
    `Acesso negado. A questão "${esc(n)}" está marcada como SELECIONADA e não pode ser cadastrada.\n</span>` +
    `<span class="caret" aria-hidden="true"></span></div>${tagHTML(cls)}</body></html>`;
}

// ============================ /dev handler ============================
// devAll(): lista simples (estilo cmd) com links pra todas as questoes.
async function devAll(kv) {
  const items = Object.keys(CODE).map((q) => ({ n: q, nome: NOMES[q], base: true }));
  if (kv) {
    try {
      const { keys = [] } = await kv.list({ prefix: KV_PREFIX });
      for (const k of keys) {
        const n = k.name.slice(KV_PREFIX.length);
        if (CODE[n]) continue;
        items.push({ n, nome: (k.metadata && k.metadata.nome) || ("Questão " + n), base: false });
      }
    } catch (e) { /* fail-open */ }
  }
  items.sort((a, b) => {
    const na = parseInt(a.n, 10), nb = parseInt(b.n, 10);
    if (!isNaN(na) && !isNaN(nb)) return na - nb;
    return String(a.n).localeCompare(String(b.n));
  });
  const linhas = items.map((it) =>
    `<a href="/dev/${encodeURIComponent(it.n)}">/dev/${esc(it.n)}</a>  —  ${esc(it.nome)}` +
    (it.base ? "" : "  (turma)")
  ).join("\n");
  return `<!doctype html><html lang="pt-br"><head><meta charset="utf-8">` +
    `<meta name="viewport" content="width=device-width, initial-scale=1">` +
    `<title>C:\\Windows\\System32\\cmd.exe</title>` +
    `<style>` + CMDCSS +
    `#term a{color:#9cdcfe;text-decoration:none}#term a:hover{text-decoration:underline}` +
    `.caret{display:inline-block;width:.55em;height:1.05em;background:var(--fg);` +
    `vertical-align:text-bottom;margin-left:1px;animation:cmdblink 1.06s steps(1,end) infinite}` +
    `@keyframes cmdblink{0%,49%{opacity:1}50%,100%{opacity:0}}` +
    `@media(prefers-reduced-motion:reduce){.caret{animation:none}}` +
    `</style></head><body><div id="term">` +
    `<span class="chrome">${esc(CMD_HEADER)}C:\\Users\\User&gt;dir /b questoes\\\n\n</span>` +
    linhas + `\n\n<span class="chrome">C:\\Users\\User&gt;</span>` +
    `<span class="caret" aria-hidden="true"></span></div></body></html>`;
}

async function handleDev(request, parts, kv) {
  const n = parts[1] || null;

  // /dev  -> prompt vazio piscando (nao precisa consultar a planilha)
  if (!n) return new Response(devPage(null, null), { headers: HTM });

  // /dev/all -> lista de todas as questoes (links simples)
  if (n === "all") return new Response(await devAll(kv), { headers: HTM });

  // disponibilidade da planilha (tempo real, com cache curto; fail-open)
  const dispMap = await getDisponibilidade();
  const cls = _classificar(dispMap[n]);

  // questao assada (50/54/55): sempre vence, imutavel — mostra o codigo + tag
  if (CODE[n]) {
    const variant = parts[2] === "full" ? "full" : "curto";
    return new Response(devPage(CODE[n][variant], cls, n), { headers: HTM });
  }

  // id fora do padrao
  if (!ID_OK.test(n)) {
    return new Response(devPage("; id invalido — use so letras, numeros, - ou _ (ate 40 caracteres).", null),
      { status: 400, headers: HTM });
  }

  // ja cadastrada no KV?
  let existing = { value: null };
  if (kv) {
    try { existing = await kv.getWithMetadata(KV_PREFIX + n); } catch (e) { existing = { value: null }; }
  }

  if (request.method === "POST") {
    // WRITE-ONCE: se ja existe, ignora o envio e mostra o codigo que ja esta la
    if (existing && existing.value != null) {
      return new Response(devPage(existing.value, cls, n), { headers: HTM });
    }
    // BLOQUEIO: questao SELECIONADA na planilha nao pode ser cadastrada
    if (cls && cls.tipo === "selecionada") {
      return new Response(blockPage(n, cls), { status: 403, headers: HTM });
    }
    if (!kv) {
      return new Response(devPage("; armazenamento indisponivel no momento — tente de novo mais tarde.", null),
        { status: 503, headers: HTM });
    }

    let form;
    try { form = await request.formData(); } catch (e) { form = null; }
    if (!form) {
      return new Response(formPage(n, { cls, erro: "Envio inválido. Use o formulário para colar o código." }),
        { headers: HTM });
    }
    const codigo = String(form.get("codigo") || "");
    const nome = String(form.get("nome") || "").trim().slice(0, 60);
    const confirmar = form.get("confirmar");

    // validacao dura: vazio / tamanho
    const codeTrim = codigo.replace(/\r\n/g, "\n").replace(/\s+$/, "");
    if (!codeTrim.trim()) {
      return new Response(formPage(n, { cls, codigo, nome, erro: "Cole algum código antes de salvar." }),
        { headers: HTM });
    }
    if (codigo.length > MAX_BYTES) {
      return new Response(formPage(n, { cls, nome, erro: "Código grande demais (máximo 100 KB)." }),
        { headers: HTM });
    }

    // validacao leve: avisa (e pede confirmacao) se nao parecer boot sector
    const low = codeTrim.toLowerCase();
    const faltas = [];
    if (!low.includes("org 0x7c00")) faltas.push("org 0x7c00");
    if (!low.includes("0xaa")) faltas.push("db 0xaa (assinatura de boot)");
    if (faltas.length && !confirmar) {
      return new Response(formPage(n, { cls, codigo, nome, aviso: faltas }), { headers: HTM });
    }

    // salva (write-once) e mostra o codigo direto (nao depende da propagacao do KV)
    try {
      await kv.put(KV_PREFIX + n, codeTrim, { metadata: { nome: nome || ("Questão " + n) } });
    } catch (e) {
      return new Response(formPage(n, { cls, codigo, nome, erro: "Falha ao salvar. Tente de novo." }),
        { headers: HTM });
    }
    return new Response(devPage(codeTrim, cls, n), { headers: HTM });
  }

  // GET: mostra o codigo se ja existe
  if (existing && existing.value != null) {
    return new Response(devPage(existing.value, cls, n), { headers: HTM });
  }
  // GET de questao SELECIONADA (ainda sem codigo) -> barra o cadastro
  if (cls && cls.tipo === "selecionada") {
    return new Response(blockPage(n, cls), { status: 403, headers: HTM });
  }
  // senao, formulario de cadastro (com tag se for marcada/reserva)
  return new Response(formPage(n, { cls }), { headers: HTM });
}

// ============================ pagina /help ============================
// IMPORTANTE: mantenha esta pagina em dia. Toda vez que mudar rota ou fluxo do
// site, atualize help() (regra registrada no CLAUDE.md).
function help() {
  const main =
    `<section class="hero">` +
    `<p class="eyebrow reveal d1">manual // referência</p>` +
    `<h1 class="reveal d2">Ajuda</h1>` +
    `<p class="lead reveal d3">Guia rápido de <b>como usar o site</b>: ver, copiar e cadastrar ` +
    `códigos de prova em Assembly x86 (programas de boot que leem um número pelo teclado e ` +
    `respondem na tela). O passo a passo de instalar e rodar (NASM + VirtualBox/QEMU) está na ` +
    `<a href="/">página inicial</a>.</p></section>` +

    `<section class="section"><p class="eyebrow">mapa</p>` +
    `<div class="section-head"><h2>Páginas principais</h2></div>` +
    `<table><thead><tr><th>Endereço</th><th>O que é</th></tr></thead><tbody>` +
    `<tr><td><a href="/">/</a></td><td>Página inicial: cofre de <b>questões cadastradas</b>, ` +
    `menu de instalação (VirtualBox e QEMU) e problemas comuns.</td></tr>` +
    `<tr><td><a href="/help">/help</a></td><td>Esta ajuda.</td></tr>` +
    `<tr><td><a href="/dev">/dev</a></td><td>Uma tela que <b>imita o Prompt de Comando</b> (cmd), vazia — só o cursor piscando.</td></tr>` +
    `<tr><td><a href="/dev/all">/dev/all</a></td><td>Lista simples com links pra <b>todas as questões</b>.</td></tr>` +
    `<tr><td><code>/dev/{id}</code></td><td>Abre a questão <code>{id}</code> nessa tela de cmd. ` +
    `<b>Role a página pra baixo</b>: tem o <b>passo a passo detalhado de como rodar</b> (QEMU e VirtualBox, ` +
    `onde clicar). Se o <code>{id}</code> ainda <b>não existe</b>, mostra o formulário pra cadastrar.</td></tr>` +
    `<tr><td><code>/api/arq/{id}</code></td><td>O código em <b>texto puro</b> (versão enxuta), sem o visual de cmd.</td></tr>` +
    `<tr><td><code>/req_full/{id}</code></td><td>Texto puro da versão <b>extensa</b>/comentada (quando existe).</td></tr>` +
    `</tbody></table>` +
    `<p class="sub">Exemplos prontos: <a href="/dev/50">/dev/50</a> (bissexto), ` +
    `<a href="/dev/54">/dev/54</a> (triangular), <a href="/dev/55">/dev/55</a> (perfeito).</p></section>` +

    `<section class="section"><p class="eyebrow">fluxo</p>` +
    `<div class="section-head"><h2>Como ver uma questão</h2></div>` +
    `<div class="step"><div class="step-n">1</div><div class="step-b">` +
    `<p>Na <a href="/">página inicial</a>, ache a questão no cofre <b>Questões cadastradas</b> e clique em <b>terminal</b> (ex.: <code>/dev/50</code>).</p></div></div>` +
    `<div class="step"><div class="step-n">2</div><div class="step-b">` +
    `<p>Abre uma tela <b>igual ao Prompt de Comando</b> com o código. Aperte <b>Ctrl+A</b> e <b>Ctrl+C</b>: ` +
    `copia <b>só o código</b> (o cabeçalho e o prompt não entram na seleção).</p></div></div>` +
    `<div class="step"><div class="step-n">3</div><div class="step-b">` +
    `<p>Cole no seu editor, salve como <code>prova.asm</code> e monte/rode (guia completo na página inicial).</p></div></div>` +
    `<div class="note">Prefere sem o visual de cmd? Use <code>/api/arq/{id}</code> pra pegar o texto puro.</div></section>` +

    `<section class="section"><p class="eyebrow">fluxo</p>` +
    `<div class="section-head"><h2>Como cadastrar uma questão nova</h2></div>` +
    `<div class="step"><div class="step-n">1</div><div class="step-b">` +
    `<p>Acesse <code>/dev/</code> seguido de um <b>id ainda não usado</b> — ex.: <code>/dev/60</code> ou ` +
    `<code>/dev/fibonacci</code> (letras, números, <code>-</code> e <code>_</code>, até 40 caracteres).</p></div></div>` +
    `<div class="step"><div class="step-n">2</div><div class="step-b">` +
    `<p>Como não existe ainda, aparece um <b>formulário</b>. Cole o código Assembly, dê um nome (opcional) e clique em <b>Salvar</b>.</p></div></div>` +
    `<div class="step"><div class="step-n">3</div><div class="step-b">` +
    `<p>Pronto: a questão passa a abrir em <code>/dev/SEU-ID</code> <b>pra todo mundo</b> e entra no cofre da página inicial.</p></div></div>` +
    `<div class="note tip"><b>Só dá pra cadastrar uma vez.</b> Depois de salvo, o id fica <b>travado</b> — ninguém ` +
    `sobrescreve (as questões base <code>50</code>/<code>54</code>/<code>55</code> também são protegidas assim).</div>` +
    `<p class="sub"><b>Regras do código:</b> deve ser um boot sector completo — começa com <code>org 0x7c00</code> e ` +
    `termina com <code>times 510-($-$$) db 0</code> / <code>db 0x55</code> / <code>db 0xaa</code>. ` +
    `Tamanho máximo 100 KB. Se faltar a assinatura de boot, o site <b>avisa</b> e pede confirmação antes de salvar.</p></section>` +

    `<section class="section"><p class="eyebrow">planilha da turma</p>` +
    `<div class="section-head"><h2>Disponibilidade das questões</h2></div>` +
    `<p class="sub">Ao abrir <code>/dev/{id}</code>, o site consulta a planilha da turma <b>em tempo real</b> e ` +
    `mostra um aviso rápido (some em ~5s pra não atrapalhar):</p>` +
    `<ul>` +
    `<li><b>MARCADA · nome</b> — alguém já marcou essa questão como sua.</li>` +
    `<li><b>RESERVA · ...</b> — é reserva de alguém (mostra o texto como está na planilha).</li>` +
    `<li><b>SELECIONADA</b> — questão fora da prova: <b>não pode ser cadastrada</b> (o cadastro é barrado).</li>` +
    `</ul>` +
    `<p class="sub">Serve pra ninguém pegar uma questão que já é de outra pessoa (não pode repetir na prova).</p></section>` +

    `<section class="section"><p class="eyebrow">bom saber</p>` +
    `<div class="section-head"><h2>Detalhes</h2></div>` +
    `<ul>` +
    `<li>O modo terminal é <b>só visual</b> — não executa nada. Serve pra ler e copiar o código com discrição.</li>` +
    `<li>Os programas funcionam com números até <b>65535</b> (aritmética de 16 bits).</li>` +
    `<li>Problemas ao montar/rodar? A página inicial tem uma tabela de <b>problemas comuns</b>.</li>` +
    `</ul></section>`;

  return siteShell("Ajuda — Códigos de prova x86", main, `<a href="/">← início</a>`);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const parts = url.pathname.split("/").filter(Boolean);
    const kv = env && env.KV ? env.KV : null;

    if (parts.length === 0) return new Response(await index(kv), { headers: HTM });

    // /help -> pagina de ajuda
    if (parts[0] === "help") return new Response(help(), { headers: HTM });

    // /dev, /dev/{q}, /dev/{q}/full, POST /dev/{q}
    if (parts[0] === "dev") return await handleDev(request, parts, kv);

    // texto puro: /api/arq/{q} (enxuta) e /req_full/{q} (extensa)
    let q = null, variant = null;
    if (parts[0] === "api" && parts[1] === "arq" && parts[2]) { q = parts[2]; variant = "curto"; }
    else if (parts[0] === "req_full" && parts[1]) { q = parts[1]; variant = "full"; }

    if (!q) return new Response("Rota invalida.\nUse /api/arq/{q} ou /req_full/{q}", { status: 404, headers: TXT });

    const entry = CODE[q];
    if (entry) return new Response(entry[variant], { headers: TXT });

    // fallback: questao cadastrada pela turma (KV) — codigo unico p/ os dois variants
    if (kv) {
      try {
        const v = await kv.get(KV_PREFIX + q);
        if (v != null) return new Response(v, { headers: TXT });
      } catch (e) { /* ignora */ }
    }

    return new Response("Questao " + q + " nao existe. Assadas: 50, 54, 55 (ou cadastre em /dev/" + q + ")",
      { status: 404, headers: TXT });
  }
};
