# Contexto do projeto

## Aplicativo

Lista Compra é um aplicativo Next.js para listas de mercado e roteiros de viagem, com uso no navegador e como PWA instalada. A interface e os textos estão em português do Brasil.

## Tecnologias

- Next.js 15, React e TypeScript
- Tailwind CSS
- Supabase: Authentication, banco de dados, compartilhamento e sincronização em tempo real
- `xlsx` para importar itens e modelos de lista por Excel

## Tipos de lista

- **Mercado:** itens com quantidade, unidade, preço, categoria, foto e anotação.
- **Viagem:** atividades e gastos com data, horário opcional, categoria e estado de pagamento.

## Regras de interface

- No mobile (largura menor que 768 px), não exibir barras de rolagem na página, listas, campos ou modais; manter a rolagem por toque. No desktop, preservar as barras minimalistas.

- O botão Resumo fica ao lado de Por Categoria e Status na lista de compras, no celular e na Web. Avisos de mudança de categoria desaparecem automaticamente após três segundos.
- A tela inicial alterna entre **Mercado** e **Viagem**. O botão **Novo** cria a lista do tipo selecionado.
- A criação de novas listas fica somente na tela inicial; não exibir o botão Novo dentro de uma lista.
- Dentro da lista, a barra superior usa o menu de três pontos com Editar lista, Duplicar lista e Excluir lista, no celular e na Web. A engrenagem de configurações fica na tela inicial.
- Em celular, itens de mercado e viagem são excluídos ao arrastar para a esquerda. No desktop, a exclusão continua disponível pelo ícone de lixeira.
- Exclusões de itens exibem a opção de desfazer.
- A lista de mercado mantém os valores de pendente, no carrinho e total geral em uma barra fixa inferior. O botão **Adicionar** deve permanecer acima dessa barra.
- A lista de viagem considera um item selecionado como pago. Não exibir texto redundante de pago ou não pago na linha.
- O botão Novo para adicionar atividades à viagem fica flutuante no canto inferior direito, na mesma posição do Adicionar do mercado. No celular, exibir apenas o ícone de mais.
- A navegação atual é preservada por até cinco minutos após atualizar a página.

## Configurações

- As páginas de configurações não exibem subtítulos explicativos. A barra superior mostra o nome da seção aberta (Categorias, Itens cadastrados, Modelos de lista, Aparência ou Lixeira); na página inicial, mostra Configurações.

- Na lista de compras e em Itens cadastrados, clicar e segurar por 200 ms em qualquer parte do item permite arrastar para outra categoria no celular e na Web, sem ícone de arraste. Campos de entrada mantêm a edição normal; clique rápido e deslizar para excluir continuam disponíveis. Durante o arraste, um painel abaixo da lista de itens mostra todas as categorias, inclusive vazias. Alt + Enter com o item em foco permite escolher o destino pelo teclado; Escape cancela.
- Mover um item da lista altera apenas aquela lista. Mover um produto em Itens cadastrados salva a categoria no catálogo pelo fluxo de persistência e sincronização existente.

- Temas: claro, escuro, preto e sistema.
- Cor principal e cor da viagem são configuráveis.
- Há uma preferência para exibir ou ocultar fotos dos itens.
- Categorias padrão não podem ser alteradas ou excluídas.
- Categorias criadas pelo usuário recebem cor automática sem repetição. Toque em uma categoria para editar nome e cor; arraste para a esquerda para revelar a exclusão.
- Itens cadastrados e modelos de lista podem ser importados por Excel. As importações validam itens e categorias cadastrados.

## Dados e sincronização

- A auditoria de exclusões e restauração da tela Configurações > Lixeira está ativa no Supabase pela migration `20261119001508_deletion_audit_and_recoverable_trash.sql`. Não recuperar nem importar as listas antigas sem uma nova solicitação.
- A restauração não sobrescreve registros existentes e não reativa automaticamente compartilhamentos. O log permanece após a restauração. Exclusões offline são arquivadas quando chegarem ao Supabase.
- Excluir uma lista ou modelo completo gera uma única entrada recuperável com seu conteúdo. Itens excluídos individualmente permanecem separados; itens de listas exibem o nome da lista de origem. Eventos de cascata continuam no log.
- A sincronização de modelos reutiliza os IDs dos itens, usa IDs determinísticos para novos itens em diferentes dispositivos e exclui apenas itens realmente retirados. Nunca apagar e reinserir todos os itens em cada backup: isso multiplica entradas na lixeira. Reposições internas idênticas ficam no log e são ocultadas da lixeira recuperável.
- A lixeira permite esvaziar os registros pendentes da própria conta mediante confirmação com contagem total. O conteúdo recuperável é apagado, mas o log e os metadados permanecem. A limpeza não apaga cópias de outros proprietários nem exclusões posteriores à abertura da confirmação.

- As alterações são mantidas localmente e sincronizadas com o Supabase quando há rede.
- Listas podem ser compartilhadas entre usuários autenticados e devem refletir alterações em tempo real.
- Itens inseridos em listas recuperam o último preço conhecido do mesmo produto.

## Trabalho local

- Não publicar, criar deploy, commit ou push sem solicitação explícita do usuário.
- Não incluir `.codex-remote-attachments/` em commits.
- Após alterações relevantes, validar com `npm run build`.
