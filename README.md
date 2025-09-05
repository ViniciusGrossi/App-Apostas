# BetTracker - Pro Analytics

Sistema de gestão de apostas esportivas com integração ao Supabase.

## Configuração do Banco de Dados

### 1. Estrutura das Tabelas no Supabase

#### Tabela `aposta` (já existe)
A tabela `aposta` já existe no seu banco com a seguinte estrutura:
- `id` (int8) - ID único
- `data` (text) - Data da aposta
- `casa_de_apostas` (text) - Nome da casa de apostas
- `tipo_aposta` (text) - Tipo da aposta
- `categoria` (text) - Categoria da aposta
- `resultado` (text) - Status da aposta
- `valor_apostado` (num) - Valor apostado

#### Tabela `bookies` (casas de apostas) - JÁ EXISTE
A tabela `bookies` já existe no seu banco com a seguinte estrutura:
- `id` (int8) - ID único
- `name` (varchar) - Nome da casa de apostas
- `balance` (numeric) - Saldo atual da casa
- `last_deposit` (timestamptz) - Último depósito
- `last_withdraw` (timestamptz) - Último saque
- `last_update` (timestamptz) - Última atualização
- `created_at` (timestamptz) - Data de criação

#### Tabela `banca`
```sql
CREATE TABLE banca (
    id SERIAL PRIMARY KEY,
    saldo_atual DECIMAL(10,2) DEFAULT 0,
    saldo_inicial DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Inserir registro inicial
INSERT INTO banca (saldo_inicial, saldo_atual) VALUES (1000.00, 1000.00);
```

### 2. Políticas de Segurança (RLS)

```sql
-- Habilitar RLS
ALTER TABLE bets ENABLE ROW LEVEL SECURITY;
ALTER TABLE banca ENABLE ROW LEVEL SECURITY;

-- Política para apostas (permitir todas as operações)
CREATE POLICY "Permitir todas as operações em bets" ON bets
    FOR ALL USING (true);

-- Política para banca (permitir todas as operações)
CREATE POLICY "Permitir todas as operações em banca" ON banca
    FOR ALL USING (true);
```

### 3. Configuração das Credenciais

As credenciais do Supabase já estão configuradas nos arquivos HTML. Se precisar alterar:

1. Acesse o painel do Supabase
2. Vá em Settings > API
3. Copie a URL e a chave anônima
4. Atualize nos arquivos HTML ou no arquivo `config.js`

### 4. Sistema de Relacionamento entre Tabelas

O sistema implementa um fluxo realista de dinheiro entre apostas e casas de apostas:

#### **Fluxo de Dinheiro:**
1. **Inserção de Aposta**: 
   - Valor apostado é **subtraído** do saldo da casa de apostas
   - Se a casa não existir, é criada com saldo inicial de R$ 1.000

2. **Aposta Ganha**:
   - Valor final (valor apostado × odd) é **adicionado** ao saldo da casa
   - Simula o pagamento do prêmio

3. **Aposta Perdida**:
   - Nada acontece (valor já foi subtraído na inserção)
   - Casa de apostas fica com o lucro

4. **Cashout**:
   - Valor do cashout é **adicionado** ao saldo da casa
   - Simula o pagamento do cashout

5. **Cancelamento**:
   - Valor apostado é **estornado** (adicionado de volta) à casa
   - Simula o reembolso

### 5. Funcionalidades

- ✅ Cadastro de apostas com subtração automática
- ✅ Atualização de resultados com lógica de ganho/perda
- ✅ Sistema de cashout com valor personalizado
- ✅ Cancelamento de apostas com estorno
- ✅ Gestão de saldo das casas de apostas
- ✅ Interface responsiva e moderna

### 5. Como Usar

1. Abra o arquivo `teste.html` para a página inicial
2. Use `Apostas.html` para cadastrar novas apostas
3. Use `resultados.html` para atualizar resultados
4. Use `banca.html` para gerenciar o saldo

### 6. Solução de Problemas

**Erro "TomSelect is not defined":**
- Verifique se o script do TomSelect está carregado
- Certifique-se de que está usando a versão correta

**Erro de conexão com Supabase:**
- Verifique se as credenciais estão corretas
- Confirme se as políticas RLS estão configuradas
- Verifique se as tabelas existem no banco

**Erro "Failed to load resource":**
- O código agora usa Supabase diretamente, não mais endpoints locais
- Verifique se a conexão com a internet está funcionando
