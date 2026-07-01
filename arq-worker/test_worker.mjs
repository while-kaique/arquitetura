// Teste rapido do worker: rotas + conteudo. Uso: node test_worker.mjs
import worker from "./src/worker.js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const DIR = dirname(fileURLToPath(import.meta.url));
let fails = 0;
const ok = (c, m) => { console.log((c ? "  OK  " : "  FALHA ") + m); if (!c) fails++; };

async function get(path) {
  const res = await worker.fetch(new Request("http://x" + path));
  return { status: res.status, body: await res.text() };
}

// 1) indice
const idx = await get("/");
ok(idx.status === 200, "GET / -> 200");
ok(idx.body.includes("Opção A — VirtualBox"), "indice tem secao VirtualBox");
ok(idx.body.includes("Opção B — QEMU"), "indice tem secao QEMU");
ok(idx.body.indexOf("1. Instalar") < idx.body.indexOf("2. Configurar"), "ordem instalar->configurar (VBox)");
ok(idx.body.includes("fsutil file createnew pad.img 1474048"), "indice tem comando fsutil (1.44MB exato)");
ok(idx.body.includes("copy /b prova.bin+pad.img prova.img"), "indice tem copy /b");
ok(idx.body.includes("qemu-system-i386 -fda prova.bin"), "indice tem comando QEMU");
ok(idx.body.includes("winget install Oracle.VirtualBox"), "indice tem winget VirtualBox");
ok((idx.body.match(/api\/arq\/50/g) || []).length >= 2, "tabela de links aparece nas duas opcoes");

// 2) rotas de codigo batem com os .asm de origem
for (const q of ["50", "54", "55"]) {
  const curto = await get("/api/arq/" + q);
  const full = await get("/req_full/" + q);
  const srcCurto = readFileSync(join(DIR, "asm", `${q}_curto.asm`), "utf8");
  const srcFull = readFileSync(join(DIR, "asm", `${q}_full.asm`), "utf8");
  ok(curto.status === 200 && curto.body === srcCurto, `/api/arq/${q} == asm/${q}_curto.asm`);
  ok(full.status === 200 && full.body === srcFull, `/req_full/${q} == asm/${q}_full.asm`);
  ok(curto.body.includes("mov sp, 0x7c00") && curto.body.includes("sti"), `Q${q} curto tem prologo VirtualBox`);
  ok(full.body.includes("mov sp, 0x7c00") && full.body.includes("sti"), `Q${q} full tem prologo VirtualBox`);
}

// 3) rotas invalidas
ok((await get("/api/arq/99")).status === 404, "questao inexistente -> 404");
ok((await get("/xyz")).status === 404, "rota invalida -> 404");

console.log(fails === 0 ? "\nTODOS OS TESTES PASSARAM" : `\n${fails} TESTE(S) FALHARAM`);
process.exit(fails === 0 ? 0 : 1);
