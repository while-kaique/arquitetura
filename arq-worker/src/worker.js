// Gerado automaticamente. Serve o codigo assembly das questoes de prova.
// /api/arq/{q}   -> versao ENXUTA  (recomendada)
// /req_full/{q}  -> versao EXTENSA
// q em: 50 (bissexto), 54 (triangular), 55 (perfeito)
const CODE = {"50":{"curto":"      org 0x7c00\n      bits 16\n      mov ax, 0\n      mov ds, ax\n      cli\n\n      mov si, msg\n      call prints\n      call geti          ; ax = ano digitado\n      mov cx, ax         ; cx guarda o ano (div nao mexe em cx)\n\n      mov ax, cx\n      xor dx, dx\n      mov bx, 400\n      div bx\n      or dx, dx\n      jz sim             ; ano % 400 == 0 -> bissexto\n\n      mov ax, cx\n      xor dx, dx\n      mov bx, 100\n      div bx\n      or dx, dx\n      jz nao             ; ano % 100 == 0 -> NAO\n\n      mov ax, cx\n      xor dx, dx\n      mov bx, 4\n      div bx\n      or dx, dx\n      jz sim             ; ano % 4 == 0 -> bissexto\n\nnao:  mov si, msgn\n      jmp show\nsim:  mov si, msgs\nshow: call prints\n      hlt\n\ngeti: xor bx, bx         ; bx = numero acumulado\nlerc: xor ah, ah\n      int 0x16           ; al = tecla\n      cmp al, 13         ; Enter termina\n      je fim\n      mov ah, 0x0e\n      int 0x10           ; ecoa\n      sub al, 48         ; ASCII -> digito\n      mov cl, al\n      xor ch, ch\n      mov ax, bx\n      mov bx, 10\n      mul bx             ; ax = acumulado * 10\n      mov bx, ax\n      add bx, cx         ; + digito\n      jmp lerc\nfim:  mov ax, bx\n      ret\n\nprints: mov ah, 0x0e\npl:   lodsb\n      int 0x10\n      or al, al\n      jnz pl\n      ret\n\nmsg:  db 13,10,\"Digite o ano: \",0\nmsgs: db 13,10,\"SIM\",0\nmsgn: db 13,10,\"NAO\",0\n\n      times 510 - ($ - $$) db 0\n      db 0x55\n      db 0xaa\n","full":"      org 0x7c00\n      bits 16\n\n      mov ax, 0\n      mov ds, ax\n      cli\n\n      ; --- pergunta o ano ---\n      mov si, msg\n      call prints\n\n      ; --- le o ano (GET i) -> ax ---\n      call geti\n      mov [ano], ax\n\n      ; --- pula uma linha ---\n      mov ah, 0x0e\n      mov al, 13\n      int 0x10\n      mov al, 10\n      int 0x10\n\n      ; --- ano % 400 == 0 ? -> bissexto ---\n      mov ax, [ano]\n      mov dx, 0\n      mov bx, 400\n      div bx\n      cmp dx, 0\n      je sim\n\n      ; --- ano % 100 == 0 ? -> NAO bissexto ---\n      mov ax, [ano]\n      mov dx, 0\n      mov bx, 100\n      div bx\n      cmp dx, 0\n      je nao\n\n      ; --- ano % 4 == 0 ? -> bissexto ---\n      mov ax, [ano]\n      mov dx, 0\n      mov bx, 4\n      div bx\n      cmp dx, 0\n      je sim\n\nnao:  mov si, msgnao\n      call prints\n      hlt\n\nsim:  mov si, msgsim\n      call prints\n      hlt\n\n; ============ GET i: le um numero do teclado, devolve em AX ============\ngeti:  push bx\n       push cx\n       push dx\n       mov bx, 0            ; bx = numero acumulado\nlerc:  mov ah, 0\n       int 0x16             ; al = tecla digitada (ASCII)\n       cmp al, 13           ; Enter? termina\n       je fimg\n       mov ah, 0x0e         ; ecoa a tecla na tela\n       int 0x10\n       sub al, 48           ; '0'..'9' -> 0..9\n       mov ah, 0\n       mov cx, ax           ; cx = digito\n       mov ax, bx\n       mov bx, 10\n       mul bx               ; ax = acumulado * 10\n       mov bx, ax\n       add bx, cx           ; bx = acumulado*10 + digito\n       jmp lerc\nfimg:  mov ax, bx           ; resultado em AX\n       pop dx\n       pop cx\n       pop bx\n       ret\n\n; ============ prints: imprime texto terminado em 0 (do professor) ======\nprints: push si\n        push ax\n        mov ah, 0x0e\npsl:    lodsb\n        int 0x10\n        or al, al\n        jnz psl\n        pop ax\n        pop si\n        ret\n\nmsg:    db \"Digite o ano: \", 0\nmsgsim: db \"BISSEXTO\", 0\nmsgnao: db \"NAO BISSEXTO\", 0\nano:    dw 0\n\n      times 510 - ($ - $$) db 0\n      db 0x55\n      db 0xaa\n"},"54":{"curto":"      org 0x7c00\n      bits 16\n      mov ax, 0\n      mov ds, ax\n      cli\n\n      mov si, msg\n      call prints\n      call geti          ; ax = n\n      mov di, ax         ; di = n\n      mov cx, 1          ; k = 1\ntl:   mov ax, cx\n      mov bx, cx\n      inc bx             ; k+1\n      mul bx             ; ax = k*(k+1)\n      mov bx, cx\n      add bx, 2          ; k+2\n      mul bx             ; dx:ax = k*(k+1)*(k+2)\n      or dx, dx          ; passou de 65535?\n      jnz tnao           ; produto grande demais -> nao\n      cmp ax, di\n      je tsim            ; produto == n -> sim\n      ja tnao            ; produto > n -> nao\n      inc cx\n      jmp tl\ntsim: mov si, msgs\n      jmp show\ntnao: mov si, msgn\nshow: call prints\n      hlt\n\ngeti: xor bx, bx         ; bx = numero acumulado\nlerc: xor ah, ah\n      int 0x16           ; al = tecla\n      cmp al, 13         ; Enter termina\n      je fim\n      mov ah, 0x0e\n      int 0x10           ; ecoa\n      sub al, 48         ; ASCII -> digito\n      mov cl, al\n      xor ch, ch\n      mov ax, bx\n      mov bx, 10\n      mul bx             ; ax = acumulado * 10\n      mov bx, ax\n      add bx, cx         ; + digito\n      jmp lerc\nfim:  mov ax, bx\n      ret\n\nprints: mov ah, 0x0e\npl:   lodsb\n      int 0x10\n      or al, al\n      jnz pl\n      ret\n\nmsg:  db 13,10,\"Digite um numero: \",0\nmsgs: db 13,10,\"TRIANGULAR\",0\nmsgn: db 13,10,\"NAO TRIANGULAR\",0\n\n      times 510 - ($ - $$) db 0\n      db 0x55\n      db 0xaa\n","full":"      org 0x7c00\n      bits 16\n\n      mov ax, 0\n      mov ds, ax\n      cli\n\n      ; --- pergunta o numero ---\n      mov si, msg\n      call prints\n\n      ; --- le o numero (GET i) ---\n      call geti\n      mov [n], ax\n\n      ; --- pula uma linha ---\n      mov ah, 0x0e\n      mov al, 13\n      int 0x10\n      mov al, 10\n      int 0x10\n\n      ; --- testa k*(k+1)*(k+2) para k = 1, 2, 3, ... ---\n      mov cx, 1             ; k = 1\nlaco: mov ax, cx\n      mov bx, cx\n      inc bx               ; k+1\n      mul bx               ; ax = k*(k+1)\n      mov bx, cx\n      add bx, 2            ; k+2\n      mul bx               ; dx:ax = k*(k+1)*(k+2)\n      cmp dx, 0\n      jne nao              ; produto > 65535 -> nao\n      cmp ax, [n]\n      je sim               ; produto == n -> triangular\n      ja nao               ; produto > n -> parou de dar, nao\n      inc cx\n      jmp laco\n\nsim:  mov si, msgsim\n      call prints\n      hlt\n\nnao:  mov si, msgnao\n      call prints\n      hlt\n\n; ============ GET i: le um numero do teclado, devolve em AX ============\ngeti:  push bx\n       push cx\n       push dx\n       mov bx, 0\nlerc:  mov ah, 0\n       int 0x16\n       cmp al, 13\n       je fimg\n       mov ah, 0x0e\n       int 0x10\n       sub al, 48\n       mov ah, 0\n       mov cx, ax\n       mov ax, bx\n       mov bx, 10\n       mul bx\n       mov bx, ax\n       add bx, cx\n       jmp lerc\nfimg:  mov ax, bx\n       pop dx\n       pop cx\n       pop bx\n       ret\n\n; ============ prints: imprime texto terminado em 0 ============\nprints: push si\n        push ax\n        mov ah, 0x0e\npsl:    lodsb\n        int 0x10\n        or al, al\n        jnz psl\n        pop ax\n        pop si\n        ret\n\nmsg:    db \"Digite um numero: \", 0\nmsgsim: db \"TRIANGULAR\", 0\nmsgnao: db \"NAO TRIANGULAR\", 0\nn:      dw 0\n\n      times 510 - ($ - $$) db 0\n      db 0x55\n      db 0xaa\n"},"55":{"curto":"      org 0x7c00\n      bits 16\n      mov ax, 0\n      mov ds, ax\n      cli\n\n      mov si, msg\n      call prints\n      call geti          ; ax = n\n      mov di, ax         ; di = n\n      xor si, si         ; si = soma dos divisores\n      mov bx, 1          ; bx = divisor d\npf:   cmp bx, di\n      jae pfim           ; d >= n -> acabou\n      mov ax, di\n      xor dx, dx\n      div bx             ; dx = n % d\n      or dx, dx\n      jnz pnx            ; resto != 0 -> nao e divisor\n      add si, bx         ; soma += d\npnx:  inc bx\n      jmp pf\npfim: cmp si, di         ; soma == n ?\n      jne pnao\n      mov si, msgs\n      jmp show\npnao: mov si, msgn\nshow: call prints\n      hlt\n\ngeti: xor bx, bx         ; bx = numero acumulado\nlerc: xor ah, ah\n      int 0x16           ; al = tecla\n      cmp al, 13         ; Enter termina\n      je fim\n      mov ah, 0x0e\n      int 0x10           ; ecoa\n      sub al, 48         ; ASCII -> digito\n      mov cl, al\n      xor ch, ch\n      mov ax, bx\n      mov bx, 10\n      mul bx             ; ax = acumulado * 10\n      mov bx, ax\n      add bx, cx         ; + digito\n      jmp lerc\nfim:  mov ax, bx\n      ret\n\nprints: mov ah, 0x0e\npl:   lodsb\n      int 0x10\n      or al, al\n      jnz pl\n      ret\n\nmsg:  db 13,10,\"Digite um numero: \",0\nmsgs: db 13,10,\"PERFEITO\",0\nmsgn: db 13,10,\"NAO PERFEITO\",0\n\n      times 510 - ($ - $$) db 0\n      db 0x55\n      db 0xaa\n","full":"      org 0x7c00\n      bits 16\n\n      mov ax, 0\n      mov ds, ax\n      cli\n\n      ; --- pergunta o numero ---\n      mov si, msg\n      call prints\n\n      ; --- le o numero (GET i) ---\n      call geti\n      mov [n], ax\n\n      ; --- pula uma linha ---\n      mov ah, 0x0e\n      mov al, 13\n      int 0x10\n      mov al, 10\n      int 0x10\n\n      ; --- soma os divisores proprios (1 ate n-1) ---\n      mov word [soma], 0\n      mov bx, 1              ; d = 1\nlaco: cmp bx, [n]\n      jae fimlaco           ; d >= n -> para\n      mov ax, [n]\n      mov dx, 0\n      div bx                ; dx = n % d\n      cmp dx, 0\n      jne prox              ; nao divide -> proximo\n      mov ax, [soma]\n      add ax, bx\n      mov [soma], ax        ; soma += d\nprox: inc bx\n      jmp laco\n\nfimlaco:\n      mov ax, [soma]\n      cmp ax, [n]           ; soma == n ?\n      je sim\n\n      mov si, msgnao\n      call prints\n      hlt\n\nsim:  mov si, msgsim\n      call prints\n      hlt\n\n; ============ GET i: le um numero do teclado, devolve em AX ============\ngeti:  push bx\n       push cx\n       push dx\n       mov bx, 0\nlerc:  mov ah, 0\n       int 0x16\n       cmp al, 13\n       je fimg\n       mov ah, 0x0e\n       int 0x10\n       sub al, 48\n       mov ah, 0\n       mov cx, ax\n       mov ax, bx\n       mov bx, 10\n       mul bx\n       mov bx, ax\n       add bx, cx\n       jmp lerc\nfimg:  mov ax, bx\n       pop dx\n       pop cx\n       pop bx\n       ret\n\n; ============ prints: imprime texto terminado em 0 ============\nprints: push si\n        push ax\n        mov ah, 0x0e\npsl:    lodsb\n        int 0x10\n        or al, al\n        jnz psl\n        pop ax\n        pop si\n        ret\n\nmsg:    db \"Digite um numero: \", 0\nmsgsim: db \"PERFEITO\", 0\nmsgnao: db \"NAO PERFEITO\", 0\nn:      dw 0\nsoma:   dw 0\n\n      times 510 - ($ - $$) db 0\n      db 0x55\n      db 0xaa\n"}};
const NOMES = {"50":"Ano bissexto","54":"Numero triangular","55":"Numero perfeito"};

const TXT = { "content-type": "text/plain; charset=utf-8" };
const HTM = { "content-type": "text/html; charset=utf-8" };

function index() {
  let rows = "";
  for (const q of Object.keys(CODE)) {
    rows += `<tr><td>${q}</td><td>${NOMES[q]}</td>` +
      `<td><a href="/api/arq/${q}">/api/arq/${q}</a></td>` +
      `<td><a href="/req_full/${q}">/req_full/${q}</a></td></tr>`;
  }
  return `<!doctype html><meta charset=utf-8><title>Codigos de prova — Arquitetura</title>` +
    `<style>body{font-family:monospace;max-width:820px;margin:40px auto;padding:0 16px;line-height:1.6;color:#111}` +
    `table{border-collapse:collapse;width:100%;margin:8px 0}td,th{border:1px solid #ccc;padding:6px 10px;text-align:left}` +
    `a{color:#06c}h1{font-size:1.5em}h2{font-size:1.15em;margin-top:1.6em;border-bottom:1px solid #ddd;padding-bottom:4px}` +
    `pre{background:#f4f4f4;border:1px solid #ddd;padding:10px 12px;overflow-x:auto;border-radius:4px}` +
    `code{background:#f4f4f4;padding:1px 4px;border-radius:3px}.tip{background:#fffae6;border:1px solid #f0e0a0;padding:8px 12px;border-radius:4px}</style>` +

    `<h1>Códigos de prova — Arquitetura (Assembly x86)</h1>` +
    `<p>Programas de boot que leem um número pelo teclado e respondem na tela. ` +
    `Testados no QEMU. Objetivo: abrir o link, copiar e rodar.</p>` +

    `<h2>1. Pegar o código</h2>` +
    `<p>Abra o link da questão, <b>Ctrl+A</b> (selecionar tudo), <b>Ctrl+C</b>, cole no editor e salve como <code>prova.asm</code>.</p>` +
    `<table><tr><th>Q</th><th>Questão</th><th>Enxuta (recomendada)</th><th>Extensa (comentada)</th></tr>${rows}</table>` +

    `<h2>2. Instalar as ferramentas</h2>` +
    `<p>São duas: <b>NASM</b> (monta o código) e <b>QEMU</b> (roda). Instale conforme o sistema do PC.</p>` +
    `<p><b>Windows</b> (no PowerShell):</p>` +
    `<pre>winget install NASM.NASM
winget install SoftwareFreedomConservancy.QEMU</pre>` +
    `<p class=tip>Depois de instalar, <b>feche e reabra o terminal</b> para o PATH atualizar. ` +
    `Se <code>nasm</code> ou <code>qemu-system-i386</code> não forem reconhecidos, use o caminho completo ` +
    `(ex.: <code>"C:\\Program Files\\qemu\\qemu-system-i386.exe"</code>).</p>` +
    `<p><b>Linux</b> (Debian/Ubuntu):</p>` +
    `<pre>sudo apt update
sudo apt install nasm qemu-system-x86</pre>` +

    `<h2>3. Montar e rodar</h2>` +
    `<p>Na pasta onde salvou o <code>prova.asm</code>, rode os dois comandos:</p>` +
    `<pre>nasm -f bin prova.asm -o prova.img
qemu-system-i386 -fda prova.img</pre>` +
    `<p>Abre uma janela do QEMU. Digite o número, aperte <b>Enter</b>, a resposta aparece na tela. ` +
    `Para fechar a janela do QEMU: feche a janela ou <code>Ctrl+C</code> no terminal.</p>` +

    `<h2>4. Problemas comuns</h2>` +
    `<table>` +
    `<tr><th>Sintoma</th><th>Causa / solução</th></tr>` +
    `<tr><td><code>nasm</code> não reconhecido</td><td>NASM não instalado ou PATH não atualizado. Reabra o terminal ou use o caminho completo do exe.</td></tr>` +
    `<tr><td><code>qemu-system-i386</code> não reconhecido</td><td>Idem QEMU. No Windows costuma ficar em <code>C:\\Program Files\\qemu\\</code>.</td></tr>` +
    `<tr><td>Janela abre e fica preta / não dá boot</td><td>O arquivo precisa terminar com <code>times 510-($-$$) db 0</code>, <code>db 0x55</code>, <code>db 0xaa</code>. Não apague essas linhas ao copiar.</td></tr>` +
    `<tr><td>Não aparece o que eu digito</td><td>Normal em alguns casos; o eco vem do <code>int 0x10</code> dentro do <code>geti</code>. A resposta aparece após o Enter.</td></tr>` +
    `<tr><td>Resposta errada</td><td>Funciona com números até 65535 (16 bits). Não use números maiores.</td></tr>` +
    `<tr><td>Trava / não responde</td><td>Feche o QEMU e rode de novo. Confira se copiou o código inteiro (do <code>org 0x7c00</code> até o <code>db 0xaa</code>).</td></tr>` +
    `</table>` +
    `<p class=tip>Se der problema, copie esta página inteira + a mensagem de erro do terminal e mande para uma IA — tem tudo que ela precisa para ajudar.</p>`;
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const parts = url.pathname.split("/").filter(Boolean);

    if (parts.length === 0) return new Response(index(), { headers: HTM });

    let q = null, variant = null;
    if (parts[0] === "api" && parts[1] === "arq" && parts[2]) { q = parts[2]; variant = "curto"; }
    else if (parts[0] === "req_full" && parts[1]) { q = parts[1]; variant = "full"; }

    if (!q) return new Response("Rota invalida.\nUse /api/arq/{50|54|55} ou /req_full/{50|54|55}", { status: 404, headers: TXT });

    const entry = CODE[q];
    if (!entry) return new Response("Questao " + q + " nao existe. Disponiveis: 50, 54, 55", { status: 404, headers: TXT });

    return new Response(entry[variant], { headers: TXT });
  }
};
