# Lista Compra

Aplicativo para organizar listas de mercado e roteiros de viagem. Funciona no navegador, no celular e pode ser instalado como aplicativo (PWA).

## Recursos

- Listas de **mercado** com categorias, quantidade, unidade, preço, fotos e anotações.
- Listas de **viagem** com atividades, gastos, data e horário opcional.
- Acompanhamento de itens pendentes, no carrinho e total estimado.
- Controle de itens pagos e não pagos em viagens.
- Compartilhamento de listas entre usuários autenticados.
- Sincronização em tempo real pelo Supabase e funcionamento offline com sincronização quando a rede retornar.
- Tema claro, escuro, preto e uso do tema do sistema.
- Cores configuráveis para listas de mercado e viagem.
- Cadastro de categorias, itens e modelos de lista.
- Importação de itens e modelos por planilhas Excel.
- Instalação pelo Chrome como aplicativo.

## Requisitos

- Node.js 20 ou superior
- npm
- Projeto Supabase configurado

## Configuração local

Instale as dependências:

```bash
npm install
```

Crie o arquivo `.env.local` na raiz do projeto:

```env
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anon
```

Execute o aplicativo em desenvolvimento:

```bash
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

## Banco de dados

As migrations do Supabase ficam em [supabase/migrations](./supabase/migrations). Execute-as no projeto Supabase antes de usar autenticação, compartilhamento ou sincronização.

As orientações específicas do banco ficam em [supabase/README.md](./supabase/README.md).

## Importação por Excel

Em **Configurações**, baixe o modelo de planilha antes de importar:

- **Itens cadastrados:** `Nome`, `valor`, `categoria`, `fator`.
- **Modelos de lista:** `Lista`, `descrição`, `ícone`, `Item`, `Categoria`, `quantidade`, `fator`, `valor`.

As categorias precisam existir antes da importação. Para modelos, cada item também deve estar previamente cadastrado e pertencer à categoria informada.

## Comandos

```bash
npm run dev    # inicia o ambiente local
npm run build  # gera e valida a versão de produção
npm run start  # inicia a versão de produção gerada
```

## Estrutura principal

```text
app/                    Rotas, estilos globais e manifesto PWA
components/             Telas e componentes da interface
lib/                    Armazenamento local, preferências e Supabase
supabase/migrations/    Estrutura e políticas do banco
types/                  Tipos TypeScript
```

Consulte também [CONTEXT.md](./CONTEXT.md) para as regras de produto e decisões atuais.
