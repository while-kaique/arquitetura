// build_worker.js — gera src/worker.js embutindo os .asm de asm/.
// Uso:  node build_worker.js
// Le asm/{q}_{curto|full}.asm para cada q em QUESTOES, injeta no worker.template.js.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const DIR = dirname(fileURLToPath(import.meta.url));
const QUESTOES = {
  "47": "Intercalar duas listas",
  "50": "Ano bissexto",
  "54": "Numero triangular",
  "55": "Numero perfeito",
  "65": "Pixels VGA por tecla",
};

const CODE = {};
for (const q of Object.keys(QUESTOES)) {
  CODE[q] = {
    curto: readFileSync(join(DIR, "asm", `${q}_curto.asm`), "utf8"),
    full: readFileSync(join(DIR, "asm", `${q}_full.asm`), "utf8"),
  };
}

const template = readFileSync(join(DIR, "worker.template.js"), "utf8");
// IMPORTANTE: usar funcao de substituicao. Com string, o replace interpreta
// "$$", "$&" etc. como padroes especiais — e o assembly contem "$$" (times 510
// - ($ - $$)), que viraria "$" e geraria um boot sector invalido.
const out = template
  .replace("__CODE_PLACEHOLDER__", () => JSON.stringify(CODE))
  .replace("__NOMES_PLACEHOLDER__", () => JSON.stringify(QUESTOES));

writeFileSync(join(DIR, "src", "worker.js"), out);
console.log("src/worker.js gerado — questoes:", Object.keys(CODE).join(", "));
