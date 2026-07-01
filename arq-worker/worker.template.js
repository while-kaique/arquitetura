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
const CODE = __CODE_PLACEHOLDER__;
const NOMES = __NOMES_PLACEHOLDER__;

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

// ============================ pagina indice ============================
function tabelaLinks() {
  let rows = "";
  for (const q of Object.keys(CODE)) {
    rows += `<tr><td>${q}</td><td>${NOMES[q]}</td>` +
      `<td><a href="/api/arq/${q}">/api/arq/${q}</a></td>` +
      `<td><a href="/req_full/${q}">/req_full/${q}</a></td>` +
      `<td><a href="/dev/${q}">enxuta</a> · <a href="/dev/${q}/full">extensa</a></td></tr>`;
  }
  return `<table><tr><th>Q</th><th>Questão</th><th>Enxuta (recomendada)</th>` +
    `<th>Extensa (comentada)</th><th>Terminal</th></tr>${rows}</table>` +
    `<p>Abra o link, <b>Ctrl+A</b> (selecionar tudo), <b>Ctrl+C</b>, cole no editor e ` +
    `salve como <code>prova.asm</code>.</p>` +
    `<p class=tip><b>Coluna Terminal:</b> abre o código numa tela <b>idêntica ao Prompt de ` +
    `Comando</b> do Windows (fundo preto, fonte Consolas, cursor piscando). Dá ` +
    `<b>Ctrl+A → Ctrl+C</b> direto que só o código é copiado (o cabeçalho e o prompt não ` +
    `entram na seleção). É só visual — não roda nada, serve pra copiar com discrição.</p>`;
}

// lista "Questoes cadastradas": as assadas (50/54/55) + as da turma (KV)
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
  const rows = items.map((it) =>
    `<li><a href="/dev/${encodeURIComponent(it.n)}">/dev/${esc(it.n)}</a> — ${esc(it.nome)}` +
    (it.base ? ` <span class=badge>base</span>` : ` <span class=badge2>turma</span>`) + `</li>`
  ).join("");
  return `<h2>Questões cadastradas</h2>` +
    `<ul class=qlist>${rows}</ul>` +
    `<p class=rec><b>Cadastrar uma questão nova:</b> acesse <code>/dev/SEU-NUMERO</code> ` +
    `(um número ou nome ainda <b>não usado</b>), cole o código Assembly e salve. Ela passa a ` +
    `abrir em <code>/dev/SEU-NUMERO</code> pra todo mundo. <b>Cada id só pode ser cadastrado ` +
    `uma vez</b> — depois disso o código fica travado e não dá pra sobrescrever.</p>`;
}

async function index(kv) {
  const lista = await listaCadastradas(kv);
  return `<!doctype html><meta charset=utf-8><title>Codigos de prova — Arquitetura</title>` +
    `<style>body{font-family:monospace;max-width:860px;margin:40px auto;padding:0 16px;line-height:1.6;color:#111}` +
    `table{border-collapse:collapse;width:100%;margin:8px 0}td,th{border:1px solid #ccc;padding:6px 10px;text-align:left;vertical-align:top}` +
    `a{color:#06c}h1{font-size:1.5em}h2{font-size:1.2em;margin-top:1.8em;border-bottom:2px solid #333;padding-bottom:4px}` +
    `h3{font-size:1.02em;margin-top:1.2em}pre{background:#f4f4f4;border:1px solid #ddd;padding:10px 12px;overflow-x:auto;border-radius:4px}` +
    `code{background:#f4f4f4;padding:1px 4px;border-radius:3px}` +
    `.tip{background:#fffae6;border:1px solid #f0e0a0;padding:8px 12px;border-radius:4px}` +
    `.rec{background:#e9f7e9;border:1px solid #b9dfb9;padding:8px 12px;border-radius:4px}` +
    `.qlist{list-style:none;margin:8px 0;padding:0}.qlist li{margin:5px 0}` +
    `.badge{background:#555;color:#fff;font-size:.72em;padding:1px 7px;border-radius:9px;margin-left:6px}` +
    `.badge2{background:#2a8c4a;color:#fff;font-size:.72em;padding:1px 7px;border-radius:9px;margin-left:6px}` +
    `ol{margin:8px 0 8px 22px}ol li{margin:3px 0}</style>` +

    `<h1>Códigos de prova — Arquitetura (Assembly x86)</h1>` +
    `<p>Programas de boot que leem um número pelo teclado e respondem na tela. ` +
    `Escolha <b>um</b> dos dois caminhos abaixo e siga na ordem: <b>instalar → configurar → pegar e rodar o código</b>. ` +
    `Novo aqui? Veja a <a href="/help">página de ajuda</a>.</p>` +
    `<p class=rec>Os códigos já vêm na versão robusta (montam a pilha e ligam a interrupção do teclado), ` +
    `então rodam nos dois. <b>Recomendado: VirtualBox</b> — é o mais provável no laboratório. ` +
    `QEMU é o mais simples de rodar, se estiver disponível.</p>` +

    lista +

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
  `::-moz-selection{background:#cccccc;color:#0c0c0c}`;

const CMD_HEADER =
  "Microsoft Windows [versão 10.0.26200.6584]\n" +
  "(c) Microsoft Corporation. Todos os direitos reservados.\n\n";

// devPage(): IMITA o cmd.exe. Recebe o codigo cru (string) ou null (prompt vazio).
// So a regiao do codigo e selecionavel; cabecalho/prompt tem user-select:none, entao
// Ctrl+A -> Ctrl+C copia exatamente o assembly.
function devPage(codigo) {
  const norm = codigo != null
    ? esc(String(codigo).replace(/\r\n/g, "\n").replace(/\n+$/, ""))
    : null;
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
    `</style></head><body><div id="term">${corpo}</div></body></html>`;
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
    `</form></div></div></body></html>`;
}

// ============================ /dev handler ============================
async function handleDev(request, parts, kv) {
  const n = parts[1] || null;

  // /dev  -> prompt vazio piscando
  if (!n) return new Response(devPage(null), { headers: HTM });

  // questao assada (50/54/55): sempre vence, imutavel
  if (CODE[n]) {
    const variant = parts[2] === "full" ? "full" : "curto";
    return new Response(devPage(CODE[n][variant]), { headers: HTM });
  }

  // id fora do padrao
  if (!ID_OK.test(n)) {
    return new Response(devPage("; id invalido — use so letras, numeros, - ou _ (ate 40 caracteres)."),
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
      return new Response(devPage(existing.value), { headers: HTM });
    }
    if (!kv) {
      return new Response(devPage("; armazenamento indisponivel no momento — tente de novo mais tarde."),
        { status: 503, headers: HTM });
    }

    let form;
    try { form = await request.formData(); } catch (e) { form = null; }
    if (!form) {
      return new Response(formPage(n, { erro: "Envio inválido. Use o formulário para colar o código." }),
        { headers: HTM });
    }
    const codigo = String(form.get("codigo") || "");
    const nome = String(form.get("nome") || "").trim().slice(0, 60);
    const confirmar = form.get("confirmar");

    // validacao dura: vazio / tamanho
    const codeTrim = codigo.replace(/\r\n/g, "\n").replace(/\s+$/, "");
    if (!codeTrim.trim()) {
      return new Response(formPage(n, { codigo, nome, erro: "Cole algum código antes de salvar." }),
        { headers: HTM });
    }
    if (codigo.length > MAX_BYTES) {
      return new Response(formPage(n, { nome, erro: "Código grande demais (máximo 100 KB)." }),
        { headers: HTM });
    }

    // validacao leve: avisa (e pede confirmacao) se nao parecer boot sector
    const low = codeTrim.toLowerCase();
    const faltas = [];
    if (!low.includes("org 0x7c00")) faltas.push("org 0x7c00");
    if (!low.includes("0xaa")) faltas.push("db 0xaa (assinatura de boot)");
    if (faltas.length && !confirmar) {
      return new Response(formPage(n, { codigo, nome, aviso: faltas }), { headers: HTM });
    }

    // salva (write-once) e mostra o codigo direto (nao depende da propagacao do KV)
    try {
      await kv.put(KV_PREFIX + n, codeTrim, { metadata: { nome: nome || ("Questão " + n) } });
    } catch (e) {
      return new Response(formPage(n, { codigo, nome, erro: "Falha ao salvar. Tente de novo." }),
        { headers: HTM });
    }
    return new Response(devPage(codeTrim), { headers: HTM });
  }

  // GET: mostra o codigo se ja existe, senao o formulario de cadastro
  if (existing && existing.value != null) {
    return new Response(devPage(existing.value), { headers: HTM });
  }
  return new Response(formPage(n, {}), { headers: HTM });
}

// ============================ pagina /help ============================
// IMPORTANTE: mantenha esta pagina em dia. Toda vez que mudar rota ou fluxo do
// site, atualize help() (regra registrada no CLAUDE.md).
function help() {
  return `<!doctype html><meta charset=utf-8><title>Ajuda — Códigos de prova</title>` +
    `<style>body{font-family:monospace;max-width:820px;margin:40px auto;padding:0 16px;line-height:1.6;color:#111}` +
    `h1{font-size:1.5em}h2{font-size:1.15em;margin-top:1.8em;border-bottom:2px solid #333;padding-bottom:4px}` +
    `a{color:#06c}code{background:#f4f4f4;padding:1px 5px;border-radius:3px}` +
    `table{border-collapse:collapse;width:100%;margin:10px 0}td,th{border:1px solid #ccc;padding:6px 10px;text-align:left;vertical-align:top}` +
    `ol,ul{margin:8px 0 8px 22px}li{margin:4px 0}` +
    `.aviso{background:#fffae6;border:1px solid #f0e0a0;padding:8px 12px;border-radius:4px}` +
    `.lead{background:#eef4ff;border:1px solid #cdddf7;padding:8px 12px;border-radius:4px}</style>` +

    `<h1>Ajuda — como usar o site</h1>` +
    `<p class=lead>Este site guarda <b>códigos de prova em Assembly x86</b> (programas de boot que ` +
    `leem um número pelo teclado e respondem na tela). Serve pra <b>ver</b> um código, <b>copiar</b> ` +
    `e <b>cadastrar</b> códigos novos. O passo a passo de instalar (NASM + VirtualBox/QEMU) e rodar ` +
    `está na <a href="/">página inicial</a>.</p>` +

    `<h2>Páginas principais</h2>` +
    `<table>` +
    `<tr><th>Endereço</th><th>O que é</th></tr>` +
    `<tr><td><a href="/">/</a></td><td>Página inicial: guia de instalação (VirtualBox e QEMU), ` +
    `lista de <b>questões cadastradas</b> e as tabelas de links.</td></tr>` +
    `<tr><td><a href="/help">/help</a></td><td>Esta ajuda.</td></tr>` +
    `<tr><td><a href="/dev">/dev</a></td><td>Uma tela que <b>imita o Prompt de Comando</b> (cmd), vazia — só o cursor piscando.</td></tr>` +
    `<tr><td><code>/dev/{id}</code></td><td>Abre a questão <code>{id}</code> nessa tela de cmd. ` +
    `Se o <code>{id}</code> ainda <b>não existe</b>, mostra o formulário pra cadastrar.</td></tr>` +
    `<tr><td><code>/api/arq/{id}</code></td><td>O código em <b>texto puro</b> (versão enxuta), sem o visual de cmd.</td></tr>` +
    `<tr><td><code>/req_full/{id}</code></td><td>Texto puro da versão <b>extensa</b>/comentada (quando existe).</td></tr>` +
    `</table>` +
    `<p>Exemplos prontos: <a href="/dev/50">/dev/50</a> (bissexto), <a href="/dev/54">/dev/54</a> ` +
    `(triangular), <a href="/dev/55">/dev/55</a> (perfeito).</p>` +

    `<h2>Como ver uma questão</h2>` +
    `<ol>` +
    `<li>Na <a href="/">página inicial</a>, olhe a lista <b>Questões cadastradas</b> e clique no link (ex.: <code>/dev/50</code>).</li>` +
    `<li>Abre uma tela <b>igual ao Prompt de Comando</b> com o código. Aperte <b>Ctrl+A</b> e <b>Ctrl+C</b>: ` +
    `copia <b>só o código</b> (o cabeçalho e o prompt não entram na seleção).</li>` +
    `<li>Cole no seu editor, salve como <code>prova.asm</code> e monte/rode (guia completo na página inicial).</li>` +
    `</ol>` +
    `<p>Prefere sem o visual de cmd? Use <code>/api/arq/{id}</code> pra pegar o texto puro.</p>` +

    `<h2>Como cadastrar uma questão nova</h2>` +
    `<ol>` +
    `<li>Acesse <code>/dev/</code> seguido de um <b>id ainda não usado</b> — ex.: <code>/dev/60</code> ou ` +
    `<code>/dev/fibonacci</code>. (letras, números, <code>-</code> e <code>_</code>, até 40 caracteres.)</li>` +
    `<li>Como não existe ainda, aparece um <b>formulário</b>. Cole o código Assembly, dê um nome (opcional) ` +
    `e clique em <b>Salvar</b>.</li>` +
    `<li>Pronto: a questão passa a abrir em <code>/dev/SEU-ID</code> <b>pra todo mundo</b> e entra na lista ` +
    `da página inicial.</li>` +
    `</ol>` +
    `<p class=aviso><b>Só dá pra cadastrar uma vez.</b> Depois de salvo, o id fica <b>travado</b> — ninguém ` +
    `sobrescreve (as questões base <code>50</code>/<code>54</code>/<code>55</code> também são protegidas assim).</p>` +
    `<p><b>Regras do código:</b> deve ser um boot sector completo — começa com <code>org 0x7c00</code> e ` +
    `termina com <code>times 510-($-$$) db 0</code> / <code>db 0x55</code> / <code>db 0xaa</code>. ` +
    `Tamanho máximo 100 KB. Se faltar a assinatura de boot, o site <b>avisa</b> e pede confirmação antes de salvar.</p>` +

    `<h2>Bom saber</h2>` +
    `<ul>` +
    `<li>O modo terminal é <b>só visual</b> — não executa nada. Serve pra ler e copiar o código com discrição.</li>` +
    `<li>Os programas funcionam com números até <b>65535</b> (aritmética de 16 bits).</li>` +
    `<li>Problemas ao montar/rodar? A página inicial tem uma tabela de <b>problemas comuns</b>.</li>` +
    `</ul>` +
    `<p><a href="/">← voltar para a página inicial</a></p>`;
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
