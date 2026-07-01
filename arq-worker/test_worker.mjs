// Teste rapido do worker: rotas + conteudo + cadastro no KV. Uso: node test_worker.mjs
import worker from "./src/worker.js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const DIR = dirname(fileURLToPath(import.meta.url));
let fails = 0;
const ok = (c, m) => { console.log((c ? "  OK  " : "  FALHA ") + m); if (!c) fails++; };

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
for (const q of ["50", "54", "55"]) {
  const curto = await get("/api/arq/" + q);
  const full = await get("/req_full/" + q);
  const srcCurto = readFileSync(join(DIR, "asm", `${q}_curto.asm`), "utf8");
  const srcFull = readFileSync(join(DIR, "asm", `${q}_full.asm`), "utf8");
  ok(curto.status === 200 && curto.body === srcCurto, `/api/arq/${q} == asm/${q}_curto.asm`);
  ok(full.status === 200 && full.body === srcFull, `/req_full/${q} == asm/${q}_full.asm`);
  ok(curto.body.includes("mov sp, 0x7c00") && curto.body.includes("sti"), `Q${q} curto tem prologo VirtualBox`);
}

// 3) rotas invalidas
ok((await get("/api/arq/99")).status === 404, "questao inexistente -> 404");
ok((await get("/xyz")).status === 404, "rota invalida -> 404");

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

console.log(fails === 0 ? "\nTODOS OS TESTES PASSARAM" : `\n${fails} TESTE(S) FALHARAM`);
process.exit(fails === 0 ? 0 : 1);
