# Configuração do Supabase

1. Crie um projeto no Supabase.
2. Em um projeto novo, execute as migrations da pasta `supabase/migrations` em ordem. Se estiver reconstruindo as tabelas deste projeto, preserve `list_invitations`, `list_members`, `profiles`, `travel_entries` e `user_preferences`; após remover as outras tabelas, execute `202610210001_rebuild_editable_catalog.sql` e depois `202610260001_template_crud.sql`. Se a reconstrução já foi aplicada, execute apenas a migration de CRUD dos modelos.
3. Em **Authentication > Providers**, mantenha o provedor **Email** ativo. O app usa cadastro e acesso por e-mail e senha.
4. Copie `.env.example` para `.env.local` e informe:

```env
NEXT_PUBLIC_SUPABASE_URL="https://SEU-PROJETO.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="SUA_CHAVE_ANON"
```

5. Reinicie o servidor local.

Com o Supabase configurado, o usuário entra ou cria uma conta antes de acessar as listas. Alterações em listas, itens e roteiros de viagem são sincronizadas automaticamente. O botão **Sincronizar agora** também envia listas, categorias, modelos, preferências e histórico de preços. Os itens de **Configurações → Itens cadastrados** são salvos diretamente no catálogo compartilhado.

A migration de reconstrução cadastra os 38 itens iniciais com nomes curtos, como `Café` e `Feijão`. Ela arquiva eventuais cópias pessoais em `catalog_items_personal_archive`, consolida a edição mais recente de cada item e ativa a edição compartilhada para contas autenticadas. Mantenha a tabela de arquivo para uma futura volta ao modo por usuário.

O aplicativo usa o catálogo compartilhado por padrão. Para reativar o modo pessoal depois, ajuste `public.catalog_mode.shared_edit_enabled` para `false`, restaure os dados desejados de `catalog_items_personal_archive` e defina `NEXT_PUBLIC_SHARED_CATALOG_EDIT=false` antes de reiniciar o aplicativo.

Listas podem ser compartilhadas por e-mail com permissão de edição ou somente leitura. Atualizações feitas por participantes aparecem em tempo real para os demais usuários conectados.

## Tabelas

- `catalog_items`: catálogo único, editável por contas autenticadas no modo compartilhado.
- `catalog_mode`: chave do banco que permite desativar a edição compartilhada futuramente.
- `catalog_items_personal_archive`: cópia privada dos itens personalizados antes da consolidação.
- `shopping_lists`, `list_items`: backup das listas e seus produtos.
- `price_history`: histórico usado na comparação do preço atual com o anterior.
- `list_templates`, `template_items`: modelos prontos e personalizados; alterações e exclusões dos modelos padrão ficam registradas por usuário.
- `categories`: categorias padrão e personalizadas.
- `travel_entries`: passeios, comidas, bebidas e gastos de viagem.
- `user_preferences`: tema claro/escuro/sistema e cor principal.
- `profiles`: perfil associado ao usuário do Supabase Authentication.
- `list_members`: participantes e permissões de cada lista compartilhada.
- `list_invitations`: convites enviados para e-mails que ainda não possuem conta.

Todas as tabelas possuem RLS. O proprietário controla o compartilhamento; participantes acessam somente as listas para as quais receberam permissão. No modo compartilhado, toda conta autenticada pode editar o catálogo global. Cada usuário pode editar ou ocultar modelos padrão na própria conta sem alterar o registro original do sistema.
