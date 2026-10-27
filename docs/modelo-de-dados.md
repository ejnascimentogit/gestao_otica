# Modelo de Dados

Projeto Supabase `gestao-otica` (ref `mhouxtzeomirluezzaql`, São Paulo).

| Migração | Conteúdo | Situação |
|---|---|---|
| `20261027000001_schema_inicial.sql` | Tabelas, gatilhos e RLS | A aplicar |
| `20261027000002_permissoes_e_storage.sql` | `GRANT` da Data API e bucket `receitas` | A aplicar |

Depois das migrações: `supabase/setup/primeira-loja.sql` cria a primeira loja e liga o usuário a ela.

```mermaid
erDiagram
  lojas ||--o{ perfis : tem
  lojas ||--o{ clientes : tem
  lojas ||--o{ produtos : tem
  lojas ||--o{ laboratorios : tem
  clientes ||--o{ ordens_servico : faz
  perfis ||--o{ ordens_servico : vende
  laboratorios ||--o{ ordens_servico : recebe
  ordens_servico ||--|| receitas : tem
  ordens_servico ||--o{ os_itens : contem
  produtos ||--o{ os_itens : referenciado
  ordens_servico ||--o{ os_status_historico : registra
  ordens_servico ||--o{ caixa_movimentos : gera
  ordens_servico ||--o| crediarios : parcela
  crediarios ||--o{ parcelas : tem
  parcelas ||--o{ caixa_movimentos : baixa
  caixas ||--o{ caixa_movimentos : agrupa
  clientes ||--o{ agendamentos : marca
```

## Tabelas

| Tabela | Para que serve | Pontos de atenção |
|---|---|---|
| `lojas` | Multi-loja | Logo usada na impressão |
| `perfis` | Usuário ↔ loja + papel | Base do RLS (`minhas_lojas()`) e da comissão |
| `clientes` | Cadastro | `unique(loja_id, cpf_cnpj)`; campos fiscais para NF |
| `laboratorios` | Destino das lentes | `prazo_dias` sugere a previsão de entrega |
| `produtos` | Lentes, armações, serviços | `unidade_venda` define quantidade sugerida; atributos de lente |
| `ordens_servico` | OS | `numero` sequencial por loja via trigger |
| `os_status_historico` | Auditoria de status | Preenchida por trigger |
| `receitas` | 1:1 com OS | Longe, perto, DNP, altura, armação, imagem e flag de IA |
| `os_itens` | Itens da OS | `total` é coluna gerada |
| `caixas` / `caixa_movimentos` | Caixa | Entradas da OS e baixas de parcela |
| `crediarios` / `parcelas` | Crediário próprio | Parcelas geradas pelo domínio, gravadas em transação |
| `contas_pagar` | Fornecedores/labs | |
| `agendamentos` | Agenda | Cliente cadastrado ou nome avulso |

## Segurança (RLS)
Todas as tabelas de negócio: `loja_id in (select minhas_lojas())` para leitura e escrita.
Papéis (`admin`, `gerente`, `vendedor`, `vendedor_externo`, `caixa`) refinam permissões nas próximas migrações (ex.: só `gerente` cancela OS finalizada).

## Storage
Bucket `receitas` (privado): `receitas/<loja_id>/<os_id>.<ext>`. Policy por `loja_id` no primeiro segmento do caminho.

## Próximas migrações previstas
- `estoque_movimentos` (entrada/saída por OS e compra)
- `comissoes`
- `notas_fiscais` (id do provedor, chave, status, XML/PDF)
- `mensagens_whatsapp` (fila de pós-venda)
