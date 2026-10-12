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

- A tela inicial alterna entre **Mercado** e **Viagem**. O botão **Novo** cria a lista do tipo selecionado.
- Em celular, itens de mercado e viagem são excluídos ao arrastar para a esquerda. No desktop, a exclusão continua disponível pelo ícone de lixeira.
- Exclusões de itens exibem a opção de desfazer.
- A lista de mercado mantém os valores de pendente, no carrinho e total geral em uma barra fixa inferior. O botão **Adicionar** deve permanecer acima dessa barra.
- A lista de viagem considera um item selecionado como pago. Não exibir texto redundante de pago ou não pago na linha.
- A navegação atual é preservada por até cinco minutos após atualizar a página.

## Configurações

- Temas: claro, escuro, preto e sistema.
- Cor principal e cor da viagem são configuráveis.
- Há uma preferência para exibir ou ocultar fotos dos itens.
- Categorias padrão não podem ser alteradas ou excluídas.
- Categorias criadas pelo usuário recebem cor automática sem repetição. Toque em uma categoria para editar nome e cor; arraste para a esquerda para revelar a exclusão.
- Itens cadastrados e modelos de lista podem ser importados por Excel. As importações validam itens e categorias cadastrados.

## Dados e sincronização

- As alterações são mantidas localmente e sincronizadas com o Supabase quando há rede.
- Listas podem ser compartilhadas entre usuários autenticados e devem refletir alterações em tempo real.
- Itens inseridos em listas recuperam o último preço conhecido do mesmo produto.

## Trabalho local

- Não publicar, criar deploy, commit ou push sem solicitação explícita do usuário.
- Não incluir `.codex-remote-attachments/` em commits.
- Após alterações relevantes, validar com `npm run build`.
