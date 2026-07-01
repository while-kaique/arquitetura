# arq-prova — Worker com os códigos de prova

Serve o código assembly das questões pra copiar e colar na hora da prova.
A página inicial traz um guia com **duas opções** (VirtualBox e QEMU).

## Rotas

| Rota | O que devolve |
|------|---------------|
| `/` | página índice com o guia (VirtualBox + QEMU) e os links |
| `/api/arq/{q}` | versão **enxuta** (recomendada) |
| `/req_full/{q}` | versão **extensa** |

`q` = `50` (bissexto), `54` (triangular), `55` (perfeito).

O código vem como `text/plain`: abra o link, **Ctrl+A → Ctrl+C**, cole no editor,
salve como `prova.asm` e rode conforme a opção escolhida (veja a página inicial).

## Estrutura (o `src/worker.js` é GERADO — não edite na mão)

| Arquivo | Papel |
|---------|-------|
| `asm/{q}_{curto\|full}.asm` | as **fontes** dos 6 programas |
| `worker.template.js` | roteamento + página `index()` com placeholders |
| `build_worker.js` | lê os `.asm` e gera `src/worker.js` |
| `test_worker.mjs` | testa rotas e confere servido == `.asm` |
| `src/worker.js` | **gerado** |

### Regenerar e testar
```
node build_worker.js
node test_worker.mjs
```

> Cuidado: `build_worker.js` injeta o código com **função** no `.replace` (não
> string). Com string, `$$` do `times 510 - ($ - $$)` viraria `$` e quebraria o
> boot sector.

## Deploy (uma vez)

Precisa de uma conta Cloudflare (grátis). Na pasta `arq-worker`:

```
node build_worker.js    # garante src/worker.js atualizado
npx wrangler login      # abre o navegador pra autenticar (só na 1ª vez)
npx wrangler deploy
```

No fim o Wrangler mostra a URL pública, algo como:
`https://arq-prova.SEU-SUBDOMINIO.workers.dev`

Aí seus links ficam:
- `https://arq-prova.SEU-SUBDOMINIO.workers.dev/api/arq/55`
- `https://arq-prova.SEU-SUBDOMINIO.workers.dev/req_full/55`
