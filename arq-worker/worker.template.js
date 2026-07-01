// GERADO por build_worker.js — NAO editar src/worker.js na mao.
// Edite os .asm em asm/ ou este worker.template.js e rode: node build_worker.js
// Rotas:
//   /              -> pagina indice (guia VirtualBox + QEMU)
//   /api/arq/{q}   -> versao ENXUTA  (recomendada)
//   /req_full/{q}  -> versao EXTENSA
// q em: 50 (bissexto), 54 (triangular), 55 (perfeito)
const CODE = __CODE_PLACEHOLDER__;
const NOMES = __NOMES_PLACEHOLDER__;

const TXT = { "content-type": "text/plain; charset=utf-8" };
const HTM = { "content-type": "text/html; charset=utf-8" };

function tabelaLinks() {
  let rows = "";
  for (const q of Object.keys(CODE)) {
    rows += `<tr><td>${q}</td><td>${NOMES[q]}</td>` +
      `<td><a href="/api/arq/${q}">/api/arq/${q}</a></td>` +
      `<td><a href="/req_full/${q}">/req_full/${q}</a></td></tr>`;
  }
  return `<table><tr><th>Q</th><th>Questão</th><th>Enxuta (recomendada)</th>` +
    `<th>Extensa (comentada)</th></tr>${rows}</table>` +
    `<p>Abra o link, <b>Ctrl+A</b> (selecionar tudo), <b>Ctrl+C</b>, cole no editor e ` +
    `salve como <code>prova.asm</code>.</p>`;
}

function index() {
  return `<!doctype html><meta charset=utf-8><title>Codigos de prova — Arquitetura</title>` +
    `<style>body{font-family:monospace;max-width:860px;margin:40px auto;padding:0 16px;line-height:1.6;color:#111}` +
    `table{border-collapse:collapse;width:100%;margin:8px 0}td,th{border:1px solid #ccc;padding:6px 10px;text-align:left;vertical-align:top}` +
    `a{color:#06c}h1{font-size:1.5em}h2{font-size:1.2em;margin-top:1.8em;border-bottom:2px solid #333;padding-bottom:4px}` +
    `h3{font-size:1.02em;margin-top:1.2em}pre{background:#f4f4f4;border:1px solid #ddd;padding:10px 12px;overflow-x:auto;border-radius:4px}` +
    `code{background:#f4f4f4;padding:1px 4px;border-radius:3px}` +
    `.tip{background:#fffae6;border:1px solid #f0e0a0;padding:8px 12px;border-radius:4px}` +
    `.rec{background:#e9f7e9;border:1px solid #b9dfb9;padding:8px 12px;border-radius:4px}` +
    `ol{margin:8px 0 8px 22px}ol li{margin:3px 0}</style>` +

    `<h1>Códigos de prova — Arquitetura (Assembly x86)</h1>` +
    `<p>Programas de boot que leem um número pelo teclado e respondem na tela. ` +
    `Escolha <b>um</b> dos dois caminhos abaixo e siga na ordem: <b>instalar → configurar → pegar e rodar o código</b>.</p>` +
    `<p class=rec>Os códigos já vêm na versão robusta (montam a pilha e ligam a interrupção do teclado), ` +
    `então rodam nos dois. <b>Recomendado: VirtualBox</b> — é o mais provável no laboratório. ` +
    `QEMU é o mais simples de rodar, se estiver disponível.</p>` +

    // ===================== OPCAO A — VIRTUALBOX =====================
    `<h2>Opção A — VirtualBox (recomendada)</h2>` +

    `<h3>1. Instalar</h3>` +
    `<p><b>Windows</b> (PowerShell):</p>` +
    `<pre>winget install NASM.NASM
winget install Oracle.VirtualBox</pre>` +
    `<p class=tip>Depois de instalar, <b>feche e reabra o terminal</b> (pro PATH atualizar). ` +
    `Alternativa manual: NASM em <code>nasm.us</code>, VirtualBox em <code>virtualbox.org</code>.</p>` +

    `<h3>2. Configurar a VM (só uma vez)</h3>` +
    `<ol>` +
    `<li>Abra o VirtualBox → <b>Novo</b>.</li>` +
    `<li>Nome: <code>prova</code>. Tipo: <b>Other</b>. Versão: <b>Other/Unknown</b>. Avançar.</li>` +
    `<li>Memória: pode deixar o padrão. Avançar.</li>` +
    `<li>Disco rígido: escolha <b>"Não adicionar um disco rígido virtual"</b>. Criar.</li>` +
    `<li>Selecione a VM → <b>Configurações → Armazenamento</b>.</li>` +
    `<li>Se não houver, clique em <b>Adicionar controladora → Controladora de Disquete</b>.</li>` +
    `<li>Na controladora de disquete, adicione um dispositivo de disquete (você anexa o <code>prova.img</code> no passo 3).</li>` +
    `<li><b>Configurações → Sistema → Placa-mãe → Ordem de inicialização</b>: marque <b>Disquete</b> e mova para o <b>topo</b>.</li>` +
    `</ol>` +

    `<h3>3. Montar a imagem e rodar (cada vez que mudar o código)</h3>` +
    `<pre>nasm -f bin prova.asm -o prova.bin
fsutil file createnew pad.img 1474048
copy /b prova.bin+pad.img prova.img</pre>` +
    `<p>Isso gera <code>prova.img</code> com <b>exatamente 1.44 MB</b> (o setor de boot no início). Depois:</p>` +
    `<ol>` +
    `<li>VirtualBox → <b>Configurações → Armazenamento</b> → clique no disquete → escolha o arquivo <code>prova.img</code>.</li>` +
    `<li><b>Start</b> (se já estava rodando, use <b>Reset</b> para recarregar o novo código).</li>` +
    `<li>Digite o número, aperte <b>Enter</b>, a resposta aparece.</li>` +
    `</ol>` +

    `<h3>4. Pegar o código</h3>` +
    tabelaLinks() +

    // ===================== OPCAO B — QEMU =====================
    `<h2>Opção B — QEMU (mais simples de rodar)</h2>` +

    `<h3>1. Instalar</h3>` +
    `<p><b>Windows</b> (PowerShell):</p>` +
    `<pre>winget install NASM.NASM
winget install SoftwareFreedomConservancy.QEMU</pre>` +
    `<p><b>Linux</b> (Debian/Ubuntu):</p>` +
    `<pre>sudo apt update
sudo apt install nasm qemu-system-x86</pre>` +
    `<p class=tip>No Windows, feche e reabra o terminal depois de instalar. Se <code>qemu-system-i386</code> ` +
    `não for reconhecido, use o caminho completo (costuma ficar em <code>C:\\Program Files\\qemu\\</code>).</p>` +

    `<h3>2. Configurar</h3>` +
    `<p><b>Nada a configurar.</b> O QEMU boota o binário direto, sem criar VM nem imagem de disquete.</p>` +

    `<h3>3. Rodar (cada vez que mudar o código)</h3>` +
    `<pre>nasm -f bin prova.asm -o prova.bin
qemu-system-i386 -fda prova.bin</pre>` +
    `<p>Abre a janela do QEMU. Digite o número, <b>Enter</b>, a resposta aparece. ` +
    `Para fechar: feche a janela ou <code>Ctrl+C</code> no terminal.</p>` +

    `<h3>4. Pegar o código</h3>` +
    tabelaLinks() +

    // ===================== PROBLEMAS COMUNS =====================
    `<h2>Problemas comuns</h2>` +
    `<table>` +
    `<tr><th>Sintoma</th><th>Causa / solução</th></tr>` +
    `<tr><td><code>nasm</code> não reconhecido</td><td>NASM não instalado ou PATH não atualizado. Reabra o terminal ou use o caminho completo do exe.</td></tr>` +
    `<tr><td>(VBox) <code>FATAL: No bootable medium found!</code></td><td>O disquete não está anexado ou não está no topo da ordem de boot. Ajuste em <b>Armazenamento</b> (anexar <code>prova.img</code>) e <b>Sistema → Ordem de inicialização</b> (Disquete no topo).</td></tr>` +
    `<tr><td>(VBox) não aparece onde anexar disquete</td><td>Adicione uma <b>Controladora de Disquete</b> em Configurações → Armazenamento.</td></tr>` +
    `<tr><td>(VBox) mudei o código e não mudou nada</td><td>Regenere o <code>prova.img</code> (nasm → fsutil → copy) e dê <b>Reset</b> na VM. Confirme que o <code>prova.img</code> anexado é o novo.</td></tr>` +
    `<tr><td>(QEMU) <code>qemu-system-i386</code> não reconhecido</td><td>QEMU não instalado ou PATH. No Windows costuma ficar em <code>C:\\Program Files\\qemu\\</code>.</td></tr>` +
    `<tr><td>Janela abre preta / não dá boot</td><td>O arquivo precisa terminar com <code>times 510-($-$$) db 0</code>, <code>db 0x55</code>, <code>db 0xaa</code>. Não apague essas linhas ao copiar.</td></tr>` +
    `<tr><td>Não aparece o que eu digito</td><td>Normal; o eco vem do <code>int 0x10</code> dentro do <code>geti</code>. A resposta aparece após o Enter.</td></tr>` +
    `<tr><td>Resposta errada</td><td>Funciona com números até 65535 (16 bits). Não use números maiores.</td></tr>` +
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
