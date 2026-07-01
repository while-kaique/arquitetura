# arq-prova — Worker com os códigos de prova

Serve o código assembly das questões pra copiar e colar na hora da prova.

## Rotas

| Rota | O que devolve |
|------|---------------|
| `/` | página índice com os links |
| `/api/arq/{q}` | versão **enxuta** (recomendada) |
| `/req_full/{q}` | versão **extensa** |

`q` = `50` (bissexto), `54` (triangular), `55` (perfeito).

O código vem como `text/plain`: abra o link, **Ctrl+A → Ctrl+C**, cole no editor,
salve como `prova.asm` e rode:

```
nasm -f bin prova.asm -o prova.img
qemu-system-i386 -fda prova.img
```

## Deploy (uma vez)

Precisa de uma conta Cloudflare (grátis). Na pasta `arq-worker`:

```
npx wrangler login      # abre o navegador pra autenticar (só na 1ª vez)
npx wrangler deploy
```

No fim o Wrangler mostra a URL pública, algo como:
`https://arq-prova.SEU-SUBDOMINIO.workers.dev`

Aí seus links ficam:
- `https://arq-prova.SEU-SUBDOMINIO.workers.dev/api/arq/55`
- `https://arq-prova.SEU-SUBDOMINIO.workers.dev/req_full/55`

## Regerar o worker.js a partir dos .asm

O `src/worker.js` foi gerado embutindo os `.asm` já testados. Se mudar um código,
regenere com o script `build_worker.js` (no rascunho da sessão) ou edite as strings direto.
