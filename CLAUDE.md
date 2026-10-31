# CLAUDE.md — Gestão Ótica

Sistema de gestão para óticas (OS, receita, crediário, financeiro, simulador de lentes).

## Antes de qualquer tarefa
1. Leia `docs/mapeamento.md` (o que o sistema faz) e `docs/regras-de-negocio.md` (como calcular).
2. Use a skill certa:
   - nova tela/módulo no front → `.claude/skills/nova-tela`
   - mudança no banco → `.claude/skills/migracao-supabase`
   - qualquer coisa com receita, dioptria, DNP, adição → `.claude/skills/receita-optica`
   - entrada, crediário, parcelas, caixa → `.claude/skills/financeiro-crediario`
3. **Antes de alterar um fluxo que já existe** (OS, financeiro, status, cálculos), descreva a mudança e espere aprovação do Edimilson.

## Infraestrutura
- **Produto pessoal** do Edimilson. Nada em contas da Intelipulse ou da EFR.
- **Banco:** Supabase, projeto `gestao-otica` (ref `mhouxtzeomirluezzaql`), organização `ejnotica@gmail.com's Org`, plano Free (Nano), região `sa-east-1` (São Paulo). URL: `https://mhouxtzeomirluezzaql.supabase.co`.
- Criado com Data API ligada, **"expor tabelas automaticamente" desligado** (toda tabela nova precisa de `GRANT` explícito) e **RLS automática** ligada.
- **Front:** Cloudflare Workers, projeto `gestao-otica` (conta `ejnascimento1@gmail.com`), deploy pelo Workers Builds: raiz `web`, build `npm run build`, deploy `npx wrangler deploy` (config em `web/wrangler.jsonc`).
- **Login:** Supabase Auth (e-mail e senha). URL e chave publishable ficam em `web/src/lib/supabase.ts` (públicas por desenho; a secret nunca vai no front).
- **Usuários:** criados pela tela Usuários (admin/gerente) via Edge Function `gerenciar-usuarios`. Senha provisória obriga troca no primeiro acesso (`user_metadata.trocar_senha`).
- **Logo da loja:** `lojas.logo_url` (selo, impressões) e `lojas.logo_icone_url` (menu). Arquivos em `web/public/logos/`.
- **Lojas (31/10/2026), com código em `lojas.codigo`:** 1 = Ótica Nascimento (teste; Edimilson admin) e 2 = Studio Óptico Eucênia (CNPJ 29.488.278/0001-31, WhatsApp (81) 98642-8294, Instagram @studio_optico_eucenia; Eucenia admin; catálogo `/catalogo/studio-optico-eucenia`). Script em `supabase/setup/loja-studio-optico-eucenia.sql`. O app abre a primeira loja do usuário: ainda não há troca de loja no menu.
- **Aparência (pessoal, no navegador):** botão Aparência no rodapé do menu → modo escuro, linhas e contornos (Suave–Forte) e Estúdio "Temas e cores" (12 temas por clima, círculo cromático com harmonias, intensidade, menu claro/escuro, ajuste fino, teste de contraste 4,5, meus temas). Mesma proposta do Taskfull. Cálculo em `web/src/domain/temas.ts` (com teste), aplicação em `web/src/lib/aparencia.ts`, aplicado antes de pintar por um script no `web/index.html` (chaves `go_tema`, `go_tema_css`, `go_temas_meus`, `go_modo`, `go_contorno`). Cor nova no CSS: usar as variáveis (`--marca-tinta` para texto sobre `--marca`, `--lateral-*` no menu), nunca cor fixa.
- **Catálogo (tela Catálogo + link público `/catalogo/<slug>`, sem login):** produtos marcados "no catálogo" com foto (bucket público `catalogo`); o cliente deixa nome e WhatsApp (vira `interessados_catalogo`) e o WhatsApp abre por link **wa.me** no aparelho de quem clica. Nada é enviado sozinho, sem API (decisão do Edimilson: API oficial da Meta só quando houver cliente pagante). Regras em `web/src/domain/catalogo.ts`.
- **Provador virtual (botão "Provar" no catálogo público):** selfie no celular do cliente (não sai do aparelho), olhos achados pelo MediaPipe Face Landmarker (pacote `@mediapipe/tasks-vision` 0.10.35; wasm do jsDelivr e modelo do Google baixados pelo navegador; se falhar, ajuste manual com o dedo). Escala pela distância média entre pupilas (63 mm) e pela medida no `codigo` do produto (2 × lente + ponte + 10). Imagem em `produtos.provador_url` (frente, sem hastes, fundo transparente; o cadastro tira fundo branco sozinho). Regras em `web/src/domain/provador.ts`. As imagens atuais são desenhos (`public/catalogo-fotos/eucenia/provador/`, `public/exemplos/armacoes/provador/`) até chegarem fotos no padrão.
- **Modo demonstração:** `npm run build:single` gera o protótipo com dados de exemplo, sem login (`MODO_DEMO`).
- Antes do primeiro cliente pagante: plano Pro (o Free pausa por inatividade e não tem backup).

## Estrutura
```
docs/                    documentação funcional e técnica
supabase/migrations/     SQL versionado (nunca editar migração já aplicada)
web/                     front React + Vite + TypeScript
  src/domain/            regras puras (receita, crediário, totais) + testes
  src/pages/             uma pasta/arquivo por módulo
  src/components/        componentes reutilizáveis
  src/data/              store.ts (estado + ações), repo.ts (Supabase), mock.ts (demonstração)
.claude/skills/          skills do projeto
```

## Comandos
```bash
cd web
npm install
npm run dev        # protótipo em http://localhost:5173
npm test           # testes das regras de domínio (vitest)
npm run build      # build de produção
```

## Convenções
- Código e nomes de domínio em **português** (`ordemServico`, `parcelas`), termos técnicos em inglês quando padrão (`useState`, `props`).
- Regra de negócio **só** em `web/src/domain/`, sem React, com teste. Telas chamam essas funções.
- Dinheiro: calcule em centavos (inteiro) e formate com `formatarMoeda`. Nunca some floats de reais direto.
- Dioptria: passos de 0,25, sempre exibida com sinal e 2 casas (`+1,25`, `-0,50`).
- Banco: toda tabela de negócio tem `loja_id` e RLS por `minhas_lojas()`.
- Identidade visual é **própria** do projeto. Não copiar telas, textos, logos ou nomes de sistemas de referência.
