// Teste rapido do worker: rotas + conteudo + cadastro no KV + planilha. Uso: node test_worker.mjs
import worker, { _classificar } from "./src/worker.js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const DIR = dirname(fileURLToPath(import.meta.url));
let fails = 0;
const ok = (c, m) => { console.log((c ? "  OK  " : "  FALHA ") + m); if (!c) fails++; };

// mock da planilha (Google Sheets CSV) — intercepta o fetch do worker
const CANNED_SHEET = [
  '"Questões ","DISPONIBILIDADE ","Número de questões selecionadas"',
  '"1","SELECIONADA","50"',
  '"6","PH",""',
  '"16","",""',
  '"30","(Reserva Max)",""',
  '"50","(Reserva Arquitetura)",""',
  '"54","Tiago Juca",""',
].join("\n");
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, init) => {
  if (String(url).includes("docs.google.com")) {
    return new Response(CANNED_SHEET, { status: 200, headers: { "content-type": "text/csv" } });
  }
  return realFetch(url, init);
};

// KV falso em memoria (get/getWithMetadata/put/list) — mesma superficie usada pelo worker.
function makeKV() {
  const m = new Map();
  return {
    async get(k) { const e = m.get(k); return e ? e.value : null; },
    async getWithMetadata(k) { const e = m.get(k); return e ? { value: e.value, metadata: e.metadata || null } : { value: null, metadata: null }; },
    async put(k, v, opts) { m.set(k, { value: v, metadata: (opts && opts.metadata) || null }); },
    async list({ prefix } = {}) {
      const keys = [...m.entries()].filter(([k]) => !prefix || k.startsWith(prefix)).map(([name, e]) => ({ name, metadata: e.metadata || null }));
      return { keys, list_complete: true };
    },
  };
}

const KV = makeKV();
// get(path) usa env {KV} por padrao; opts.env=null forca env indefinido; opts.body faz POST form-urlencoded
async function get(path, opts = {}) {
  const init = {};
  if (opts.method) init.method = opts.method;
  if (opts.body != null) {
    init.method = init.method || "POST";
    init.headers = { "content-type": "application/x-www-form-urlencoded" };
    init.body = typeof opts.body === "string" ? opts.body : new URLSearchParams(opts.body).toString();
  }
  const env = opts.env === null ? undefined : (opts.env || { KV });
  const res = await worker.fetch(new Request("http://x" + path, init), env);
  return { status: res.status, body: await res.text() };
}

// 1) indice
const idx = await get("/");
ok(idx.status === 200, "GET / -> 200");
ok(idx.body.includes("Opção A — VirtualBox"), "indice tem secao VirtualBox");
ok(idx.body.includes("Opção B — QEMU"), "indice tem secao QEMU");
ok(idx.body.includes("Questões cadastradas"), "indice tem a lista de questoes cadastradas");
ok(idx.body.includes("fsutil file createnew pad.img 1474048"), "indice tem comando fsutil (1.44MB exato)");
ok(idx.body.includes("copy /b prova.bin+pad.img prova.img"), "indice tem copy /b");
ok(idx.body.includes("qemu-system-i386 -fda prova.bin"), "indice tem comando QEMU");
ok((idx.body.match(/api\/arq\/50/g) || []).length >= 2, "tabela de links aparece nas duas opcoes");

// 2) rotas de codigo (assadas) batem com os .asm de origem
for (const q of ["22", "23", "50", "54", "55", "65"]) {
  const curto = await get("/api/arq/" + q);
  const full = await get("/req_full/" + q);
  const srcCurto = readFileSync(join(DIR, "asm", `${q}_curto.asm`), "utf8");
  const srcFull = readFileSync(join(DIR, "asm", `${q}_full.asm`), "utf8");
  ok(curto.status === 200 && curto.body === srcCurto, `/api/arq/${q} == asm/${q}_curto.asm`);
  ok(full.status === 200 && full.body === srcFull, `/req_full/${q} == asm/${q}_full.asm`);
  ok(curto.body.includes("mov sp, 0x7c00") && curto.body.includes("sti"), `Q${q} curto tem prologo robusto`);
  ok(curto.body.includes("times 510 - ($ - $$) db 0") && curto.body.includes("db 0xaa"), `Q${q} curto termina com assinatura`);
}

// 3) rotas invalidas
ok((await get("/api/arq/99")).status === 404, "questao inexistente -> 404");
ok((await get("/xyz")).status === 404, "rota invalida -> 404");

// 3b) pagina de ajuda /help
const h = await get("/help");
ok(h.status === 200, "GET /help -> 200");
ok(h.body.includes("como usar o site"), "/help tem titulo de ajuda");
ok(h.body.includes("Como ver uma questão") && h.body.includes("Como cadastrar uma questão"), "/help explica ver + cadastrar");
ok(h.body.includes('href="/dev/50"') && h.body.includes("/api/arq/{id}") && h.body.includes('href="/help"'), "/help linka as paginas principais");
ok(idx.body.includes('href="/help"'), "indice linka o /help");

// 4) modo terminal /dev (cmd falso) das questoes assadas
const dev0 = await get("/dev");
ok(dev0.status === 200 && dev0.body.includes("Microsoft Windows") && dev0.body.includes('class="caret"'), "/dev tem cmd + cursor");
ok(!dev0.body.includes("copy con prova.asm"), "/dev vazio nao tem codigo colado");
for (const q of ["50", "54", "55"]) {
  const d = await get("/dev/" + q);
  ok(d.status === 200 && d.body.includes("copy con prova.asm") && d.body.includes("org 0x7c00"), `/dev/${q} mostra o codigo assado`);
  ok(d.body.includes("-&gt;"), `/dev/${q} escapa o '->' (HTML valido)`);
}
ok((await get("/dev/50/full")).body.includes("pergunta o ano"), "/dev/50/full = versao extensa");
// 4c) guia "como rodar" embaixo do terminal, com a parte especifica da questao
const g50 = await get("/dev/50");
ok(g50.body.includes("Como rodar este codigo") && g50.body.includes("qemu-system-i386 -fda prova.bin -boot a") && g50.body.includes("Ordem de inicializacao"), "/dev/50 tem o guia (QEMU com -boot a + VirtualBox)");
ok(g50.body.includes("Digite um <b>ano</b>"), "/dev/50 guia tem a parte especifica da questao");
ok((await get("/dev/23")).body.includes("xadrez") && (await get("/dev/23")).body.includes("Como rodar este codigo"), "/dev/23 guia especifico + passo a passo");
ok(!(await get("/dev")).body.includes("Como rodar este codigo"), "/dev vazio nao tem guia");
// 4b) /dev/all: lista de links de todas as questoes
const all = await get("/dev/all");
ok(all.status === 200 && all.body.includes('href="/dev/50"') && all.body.includes('href="/dev/23"'), "/dev/all lista links das questoes");
ok(all.body.includes("Xadrez que pisca") && all.body.includes("Atualizar paleta VGA"), "/dev/all mostra nomes das novas");
ok(!all.body.includes("<textarea"), "/dev/all nao e formulario de cadastro");

// 5) cadastro de questao nova (KV, write-once)
const novo = "org 0x7c00\nbits 16\nhlt\ntimes 510-($-$$) db 0\ndb 0x55\ndb 0xaa\n";
// 5a) GET de id inexistente -> formulario de cadastro
const f = await get("/dev/teste1");
ok(f.status === 200 && f.body.includes("cadastrar questão") && f.body.includes("<textarea"), "/dev/{novo} mostra formulario de cadastro");
ok(!f.body.includes("copy con prova.asm"), "formulario nao mostra codigo (ainda nao existe)");
// 5b) POST vazio -> erro, nao salva
const vazio = await get("/dev/teste1", { body: { codigo: "", nome: "x" } });
ok(vazio.body.includes("Cole algum código"), "POST vazio -> erro de validacao");
ok((await get("/dev/teste1")).body.includes("<textarea"), "apos POST vazio segue sem cadastro");
// 5c) POST codigo sem assinatura, sem confirmar -> aviso, nao salva
const semSig = await get("/dev/teste1", { body: { codigo: "mov ax, bx", nome: "x" } });
ok(semSig.body.includes("salvar assim mesmo") && semSig.body.includes("Atenção"), "POST sem assinatura -> aviso + checkbox");
ok((await get("/dev/teste1")).body.includes("<textarea"), "apos aviso segue sem cadastro");
// 5d) POST valido -> salva e mostra o codigo no terminal
const salvo = await get("/dev/teste1", { body: { codigo: novo, nome: "Questao de teste" } });
ok(salvo.status === 200 && salvo.body.includes("copy con prova.asm") && salvo.body.includes("db 0xaa"), "POST valido -> salva e mostra terminal");
// 5e) GET depois -> mostra o codigo salvo (persistiu no KV)
const depois = await get("/dev/teste1");
ok(depois.body.includes("copy con prova.asm") && depois.body.includes("times 510"), "/dev/teste1 depois mostra o codigo salvo");
// 5f) WRITE-ONCE: segundo POST com codigo diferente e ignorado
const novo2 = "org 0x7c00\nMARCADOR_DIFERENTE\ndb 0xaa\n";
const seg = await get("/dev/teste1", { body: { codigo: novo2, nome: "outro" } });
ok(!seg.body.includes("MARCADOR_DIFERENTE") && seg.body.includes("hlt"), "write-once: 2o POST nao sobrescreve");
// 5g) rota de texto puro cai no KV
const txt = await get("/api/arq/teste1");
ok(txt.status === 200 && txt.body.includes("db 0xaa") && txt.body.includes("hlt"), "/api/arq/teste1 serve o codigo cadastrado (texto)");
// 5h) aparece na lista do indice
const idx2 = await get("/");
ok(idx2.body.includes('/dev/teste1') && idx2.body.includes("Questao de teste"), "indice lista a questao cadastrada");
// 5i) id invalido -> 400
ok((await get("/dev/a!b")).status === 400, "id invalido -> 400");

// 6) disponibilidade (planilha)
// 6a) classificacao
ok(_classificar("SELECIONADA")?.tipo === "selecionada", "classifica SELECIONADA");
ok(_classificar("(Reserva Max)")?.tipo === "reserva", "classifica reserva com parenteses");
ok(_classificar("Reserva(Tiago Juca)")?.tipo === "reserva", "classifica reserva colada no nome");
ok(_classificar("(reserva Henrique)")?.tipo === "reserva", "classifica reserva minuscula");
ok(_classificar("PH")?.tipo === "marcada", "classifica nome como marcada");
ok(_classificar("") === null && _classificar(undefined) === null, "vazio/undefined -> null");
// 6b) SELECIONADA barra o cadastro (GET e POST)
const sel = await get("/dev/1");
ok(sel.status === 403 && sel.body.includes("SELECIONADA") && !sel.body.includes("<textarea"), "/dev/1 SELECIONADA barra cadastro");
const selPost = await get("/dev/1", { body: { codigo: novo, nome: "x" } });
ok(selPost.status === 403 && !(await get("/api/arq/1")).body.includes("hlt"), "POST em SELECIONADA nao salva");
// 6c) marcada -> tag + nome, mas deixa cadastrar
const marc = await get("/dev/6");
ok(marc.body.includes('class="tagpop tag-marcada"') && marc.body.includes("PH") && marc.body.includes("<textarea"), "/dev/6 marcada: tag + nome + form");
// 6d) reserva -> tag reserva com texto cru
const res = await get("/dev/30");
ok(res.body.includes('class="tagpop tag-reserva"') && res.body.includes("(Reserva Max)"), "/dev/30 reserva: tag + texto cru");
// 6e) vazio -> sem tag (checa o elemento id="tagpop", nao o CSS .tagpop)
ok(!(await get("/dev/16")).body.includes('id="tagpop"'), "/dev/16 sem marcacao: sem tag");
// 6f) questao assada mostra codigo + tag da planilha
const b50 = await get("/dev/50");
ok(b50.body.includes("copy con prova.asm") && b50.body.includes("tag-reserva") && b50.body.includes("Reserva Arquitetura"), "/dev/50 (assada) mostra codigo + tag reserva");
const b54 = await get("/dev/54");
ok(b54.body.includes("tag-marcada") && b54.body.includes("Tiago Juca"), "/dev/54 (assada) mostra tag marcada");

console.log(fails === 0 ? "\nTODOS OS TESTES PASSARAM" : `\n${fails} TESTE(S) FALHARAM`);
process.exit(fails === 0 ? 0 : 1);
