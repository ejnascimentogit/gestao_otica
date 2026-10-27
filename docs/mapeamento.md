# Gestão Ótica — Mapeamento Funcional

Documento base para a nova versão do sistema de gestão para óticas.

**Referência:** vídeos públicos de demonstração de um sistema do mercado (usado só como referência de *funcionalidades*). Telas, textos, marca e identidade visual deste projeto são próprios.

**Legenda de origem**
- 🎥 visto nos vídeos de referência
- 💡 proposta nossa (padrão de mercado ou melhoria)

---

## 1. Visão geral

| Módulo | Origem | Prioridade | Observação |
|---|---|---|---|
| Ordem de Serviço (OS) | 🎥 | MVP | Núcleo do sistema |
| Clientes | 🎥 | MVP | Cadastro rápido dentro da OS |
| Produtos e Serviços | 🎥 | MVP | Lentes, armações, serviços |
| Financeiro (caixa, receber, pagar) | 🎥 | MVP | Integrado à OS |
| Crediário próprio + promissória | 🎥 | MVP | Diferencial para óticas de bairro |
| Dashboard | 🎥 | MVP | Indicadores do período |
| Simulador de lentes | 🎥 | Fase 2 | Ferramenta de venda |
| Agenda | 🎥 | Fase 2 | Exames / retiradas |
| NF-e / NFC-e | 🎥 | Fase 2 | Via provedor (Focus NFe, PlugNotas, etc.) |
| App do vendedor externo | 🎥 | Fase 3 | PWA sobre a mesma base |
| IA: leitura de receita por foto | 🎥 | Fase 2 | Vision LLM → JSON |
| IA: pupilômetro (DNP/altura por foto) | 🎥 | Fase 3 | No original ainda em teste |
| IA: consultor de lentes | 🎥 | Fase 3 | No original ainda em teste |
| Marketing | 🎥 (só menu) | Fase 3 | Escopo não mostrado |
| Estoque com grade de lentes e armações | 💡 | Fase 2 | Não aparece nos vídeos |
| Controle de laboratório (envio/retorno/atraso) | 💡 | MVP | Status existe, controle não |
| Comissão de vendedores | 💡 | Fase 2 | |
| Pós-venda via WhatsApp | 💡 | Fase 2 | Aviso de "óculos pronto", cobrança de parcela, renovação de receita |
| Multi-loja | 💡 | MVP (no schema) | Toda tabela com `loja_id` |

---

## 2. Ordem de Serviço

### 2.1 Cabeçalho
| Campo | Tipo | Regra |
|---|---|---|
| Número | sequencial por loja | gerado no salvar |
| Cliente | FK clientes | busca por nome, CPF ou celular; botão "novo cliente" sem sair da tela |
| Vendedor | FK usuários | obrigatório para comissão (💡) |
| Status | enum | ver 2.2 |
| Data da OS | data | default hoje |
| Previsão de entrega | data | 💡 alerta quando vencida |
| Controle interno | texto | código livre da loja |
| Observações | texto | |

### 2.2 Status (fluxo)
`orçamento → aberta → em laboratório → aguardando retirada → finalizada`
e `cancelada` a partir de qualquer status não finalizado.

💡 Regras propostas:
- Mudança de status grava histórico (quem, quando).
- Entrar em "aguardando retirada" dispara aviso ao cliente (WhatsApp).
- "Finalizada" exige o saldo resolvido (pago ou parcelado).
- Orçamento não gera lançamento financeiro.

### 2.3 Receita óptica
| Grupo | Campos (OD e OE) |
|---|---|
| Longe | esférico, cilindro, eixo, DNP, altura |
| Perto | esférico, cilindro, eixo |
| Adição | valor único |
| Armação | horizontal, vertical, diagonal maior, ponte, tipo de armação |
| Outros | laboratório de destino, observações da receita, imagem da receita |

Regras:
- **Cálculo de perto** (🎥): `esférico perto = esférico longe + adição`; cilindro e eixo repetidos.
- Validações 💡: esférico/cilindro em passos de 0,25; eixo 0–180; DNP 25–40 mm por olho; cilindro sempre armazenado no mesmo sinal (convenção da loja, padrão negativo) com transposição automática.
- **Leitura de receita por foto** (🎥): upload → IA extrai dioptrias → usuário confere com a imagem ao lado antes de confirmar. Nunca salvar sem conferência.
- **Pupilômetro** (🎥): foto do cliente com a armação + medidas da armação como escala → marcação de centro de pupila e bordas → DNP e altura por olho → enviar para a OS (editável).

### 2.4 Itens
- Produto ou serviço, quantidade, unidade (`UN` ou `PAR`), valor unitário, desconto.
- Regra (🎥): se o preço da lente é por unidade, quantidade 2; se é por par, quantidade 1. 💡 Melhor: o cadastro do produto define a unidade de venda e a OS sugere a quantidade.
- Desconto por item e desconto geral; total calculado.

### 2.5 Pagamento
- **Entrada** (🎥): valor + forma (dinheiro, PIX, cartão débito/crédito). Lança no caixa.
- **Saldo na finalização** (🎥): forma de pagamento; se crediário da loja:
  - número de parcelas, juros % ao mês, dia de vencimento, primeiro vencimento;
  - parcelas geradas em contas a receber.
- **Promissória** (🎥): impressão com dados do cliente e valores para assinatura.
- 💡 Juros: definir se simples (valor × taxa × n) ou Price. Proposta: Price, mostrando valor total e parcela antes de confirmar.

### 2.6 Impressão da OS (🎥)
Três vias: **cliente**, **loja** e **laboratório**. A via do laboratório **não mostra valores**, só receita, armação, lente e dados da loja.

---

## 3. Financeiro
- **Caixa**: abertura/fechamento 💡, entradas da OS, sangrias/suprimentos 💡.
- **Contas a receber**: parcelas de crediário, filtro por mês, baixa (total/parcial 💡), juros/multa por atraso 💡.
- **Contas a pagar**: fornecedores e laboratórios.
- 💡 Integração com o sistema de cobrança de inadimplência já idealizado (faixas de atraso, rotas, cobrador externo).

## 4. Clientes
Nome, CPF/CNPJ, celular (WhatsApp), e-mail, nascimento, endereço; para PJ/NF: IE, regime tributário, indicador de IE.
💡 Histórico: todas as OS e receitas do cliente; data da última receita para lembrete de renovação.

## 5. Produtos e Serviços
Tipos: lente, armação, lente de contato, acessório, serviço.
Campos: código, código de barras, descrição, marca, unidade de venda (UN/PAR), custo, preço, NCM/CFOP (fiscal), estoque.
💡 Lentes com atributos: material, índice de refração (1.50 / 1.56 / 1.59 / 1.67 / 1.74), tipo (mono, multifocal, ocupacional), tratamentos, faixa de dioptria atendida.

## 6. Simulador de lentes (🎥)
- **Espessura**: a partir da receita da OS, comparação por índice de refração; visualização da lente montada.
- **Multifocais**: comparação de campos de visão (estreito → super estendido).
- **Tratamentos**: antirreflexo, fotossensível (interno/externo, intensidade), filtro de luz azul.
- 💡 O simulador grava qual opção o cliente escolheu e já leva para os itens da OS.

## 7. Agenda (🎥)
Calendário mensal, agenda do dia, status agendado / realizado / cancelado, busca por nome.
💡 Tipos: exame de vista, retirada, ajuste; lembrete por WhatsApp na véspera.

## 8. Fiscal (🎥)
NF-e e NFC-e emitidas a partir da OS/venda. 💡 Usar um provedor de API fiscal em vez de emitir direto na SEFAZ.

## 9. App do vendedor externo (🎥)
Fluxo em etapas: cliente → produtos → receita → pagamento → resumo → emitir nota. Inclui o simulador.
💡 Mesmo front em PWA, com perfil "vendedor externo" e modo offline simples.

---

## 10. Pontos fracos observados e oportunidades
1. Recursos de IA (consultor, pupilômetro) ainda em teste no original → podemos lançar só a leitura de receita, que é a mais confiável e a que mais poupa digitação.
2. Não há controle visível de laboratório (prazo, atraso, retrabalho) → painel de OS por laboratório com SLA.
3. Não há pós-venda → WhatsApp: óculos pronto, parcela vencendo, aniversário, renovação de receita (12 meses).
4. Quantidade "1 ou 2" de lente depende do operador lembrar → unidade de venda no cadastro.
5. Juros do crediário sem regra explícita → simulação com total e parcela antes de confirmar.

## 11. Stack proposta
- **Banco/Auth/Storage**: Supabase (Postgres + RLS por loja; imagens de receita no Storage).
- **Front**: React + Vite + TypeScript (web e PWA do vendedor).
- **Back**: Edge Functions para IA (leitura de receita), fiscal e WhatsApp.

## 12. Roadmap
| Fase | Entrega |
|---|---|
| MVP | Clientes, produtos, OS completa, impressão 3 vias, caixa, crediário, contas a receber, dashboard |
| Fase 2 | Leitura de receita por IA, simulador, agenda, estoque, fiscal, WhatsApp |
| Fase 3 | PWA vendedor externo, pupilômetro, consultor IA, marketing |
