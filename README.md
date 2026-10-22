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

## Instalando Node.js e npm no Windows

O npm já vem incluído na instalação do Node.js.

1. Baixe a versão **LTS** do Node.js em [nodejs.org](https://nodejs.org/).
2. Execute o instalador e mantenha as opções padrão, incluindo **Add to PATH**.
3. Feche e abra novamente o VS Code para que o terminal reconheça a instalação.
4. Abra um novo terminal no VS Code e confirme a instalação:

```powershell
node -v
npm -v
```

### Erro de política de execução no PowerShell

Se o PowerShell informar que `npm.ps1` não pode ser carregado porque a execução de scripts está desabilitada, escolha uma destas opções:

**Sem alterar configurações do Windows:** use o executável do npm diretamente.

```powershell
npm.cmd -v
npm.cmd install
npm.cmd run dev
```

**Para usar apenas `npm` no seu usuário do Windows:** execute o comando abaixo, confirme com `S` (Sim), e reabra o terminal do VS Code.

```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

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

## Enviando alterações para o GitHub

Antes de enviar, confira os arquivos modificados:

```bash
git status
```

Adicione as alterações desejadas, crie um commit com uma mensagem descritiva e envie para o repositório remoto:

```bash
git add .
git commit -m "descreve a alteração realizada"
git push
```

> Não envie arquivos com senhas ou chaves, como `.env.local`. Verifique o resultado de `git status` antes de executar `git add .`.

### Primeiro envio para um repositório novo

Crie um repositório vazio no GitHub e copie a URL HTTPS dele. Na pasta do projeto, execute:

```bash
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/SEU-REPOSITORIO.git
git push -u origin main
```

Nos próximos envios, basta usar `git add .`, `git commit -m "..."` e `git push`.

### Problemas comuns ao enviar

**Git informa `detected dubious ownership`:** isso acontece quando a pasta pertenceu a outra conta do Windows. Se você confia neste projeto, marque somente esta pasta como segura:

```powershell
git config --global --add safe.directory "D:/Documentos HD/CF/Lista_Compra"
```

Em seguida, confirme que o repositório remoto está configurado:

```powershell
git remote -v
```

> Não use `safe.directory '*'`, pois isso desativa essa proteção para todas as pastas do computador.

**Git informa `Author identity unknown`:** defina o nome e o e-mail que devem aparecer nos commits. Use o mesmo e-mail da sua conta do GitHub, se desejar associar os commits ao perfil:

```powershell
git config --global user.name "Seu Nome"
git config --global user.email "seu-email@exemplo.com"
```

Depois, execute novamente:

```powershell
git add .
git commit -m "Atualiza o projeto"
git push
```

Os avisos sobre `LF` e `CRLF` são apenas sobre a formatação das quebras de linha no Windows e não impedem o envio.

## Estrutura principal

```text
app/                    Rotas, estilos globais e manifesto PWA
components/             Telas e componentes da interface
lib/                    Armazenamento local, preferências e Supabase
supabase/migrations/    Estrutura e políticas do banco
types/                  Tipos TypeScript
```

Consulte também [CONTEXT.md](./CONTEXT.md) para as regras de produto e decisões atuais.
