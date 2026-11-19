# Configuração do Supabase

## Ambiente local para testar migrations

O arquivo `config.toml` permite recriar banco, autenticação, Realtime e Storage localmente antes de aplicar qualquer query no projeto remoto. Instale o Docker Desktop e a CLI do Supabase; depois, na raiz do projeto, execute:

```powershell
npx supabase start
npx supabase db reset
npx supabase status
```

O `db reset` recria o banco e executa todas as migrations em ordem. Portanto, adicione mudanças em um novo arquivo de `supabase/migrations`, rode o reset e valide o aplicativo antes de aplicar a migration remota. Para usar o app contra o ambiente local, copie a URL da API e a chave `anon` exibidas por `npx supabase status` para `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL="http://127.0.0.1:54321"
NEXT_PUBLIC_SUPABASE_ANON_KEY="CHAVE_ANON_LOCAL"
```

O painel local fica em `http://127.0.0.1:54323` e a caixa de e-mails de teste em `http://127.0.0.1:54324`. O reset também cria o bucket público `product-images`; somente uma conta autenticada pode gravar, alterar ou excluir arquivos dentro da própria pasta.

Para encerrar os serviços locais:

```powershell
npx supabase stop
```

## Projeto remoto

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

### Log de exclusões e lixeira recuperável

As migrations `20261119010456_group_list_trash_and_item_origin.sql` e `20261119011030_stable_template_trash_and_restore_scope.sql` agrupam a exclusão de listas/modelos completos em uma entrada recuperável, preservando seus filhos no snapshot e os eventos no log. Itens removidos individualmente ficam separados e registram o nome/tipo da lista de origem. Cópias antigas de cascata usam `parent_trash_id`; reposições internas de itens de modelos com conteúdo idêntico ao de um registro ativo recebem `superseded_at`. Nenhum desses ajustes apaga o histórico. A restauração da lista não marca como restaurado um item excluído individualmente que não constava em seu snapshot.

O backup do cliente sincroniza itens de modelos por upsert com IDs estáveis, pagina a leitura dos itens existentes e só exclui IDs ausentes na versão desejada. Novos itens recebem UUID determinístico por modelo/nome/ocorrência para evitar multiplicação entre dispositivos. Testes: `node scripts/test-template-sync.cjs`, `supabase/tests/group_list_trash.sql` e `supabase/tests/template_trash.sql`. Os testes de banco usam apenas dados sintéticos e rollback.

**Esvaziar lixeira:** a migration `20261119003915_empty_trash_preserve_audit.sql` adiciona a limpeza definitiva pela tela, com prévia da quantidade e confirmação. `preview_empty_trash()` obtém a contagem e o horário do servidor; `empty_trash(timestamptz)` limpa apenas registros pendentes da própria conta até esse horário, em todas as páginas. Um editor não pode apagar as cópias de recuperação de outro proprietário. Conteúdo e dados vinculados são removidos dos snapshots, os metadados recebem `purged_at`/`purged_by` e o log registra `purge`. Registros limpos não aparecem na lixeira nem podem ser restaurados. Registros restaurados e novas exclusões após a prévia são preservados. O teste `supabase/tests/empty_trash.sql` valida a limpeza com snapshots sintéticos e rollback, sem esvaziar a lixeira real.

A migration `20261119001508_deletion_audit_and_recoverable_trash.sql` foi aplicada no projeto remoto e protege as exclusões futuras. Ela não recupera nem importa exclusões anteriores. A tela **Configurações > Lixeira** permite restaurar os registros arquivados. Em novos ambientes, aplique essa migration para ativar a proteção.

- `deletion_logs`: histórico de exclusões físicas, ocultações (`is_deleted`) e restaurações. Registra a chave original, autor autenticado quando disponível, dono, data, transação, papel do banco e contexto limitado da requisição. Tokens e chaves de API não são gravados. Cabeçalhos identificam a origem apenas para diagnóstico, nunca para autorizar ações.
- `trash_bin`: cópia JSON completa do registro excluído e dos dados vinculados. Sem expiração ou limpeza automática. A exclusão e seu arquivamento fazem parte da mesma transação: se o arquivamento falhar, a exclusão não é concluída.
- As 14 tabelas atuais do aplicativo são monitoradas: listas, itens, roteiros, categorias, catálogo, modelos, itens de modelos, preços, perfis, preferências, participantes, convites, configuração do catálogo e arquivo pessoal do catálogo. Novas tabelas precisam receber os gatilhos em uma nova migration.
- `TRUNCATE` é bloqueado nessas tabelas, pois não dispara gatilhos de exclusão por linha. Operações de manutenção devem usar `DELETE` para manter a cópia e o histórico.
- Clientes podem consultar apenas os registros permitidos por RLS e não podem inserir, editar ou remover diretamente as tabelas de auditoria. Operações administrativas sem sessão autenticada ficam com autor nulo e papel do banco registrado.
- `restore_trash_item(uuid)` verifica permissões atuais, restaura de forma atômica, registra o evento e rejeita conflitos sem sobrescrever dados. Listas e modelos recuperam os itens junto. Participantes e convites ficam preservados para consulta, mas só podem ser restaurados individualmente pelo proprietário; restaurar uma lista não reativa compartilhamentos.
- A restauração administrativa de `catalog_mode` e `catalog_items_personal_archive` não é exposta no aplicativo. As outras 12 tabelas podem aparecer na lixeira da conta conforme suas permissões.
- Exclusões offline de registros que já existem no banco são arquivadas quando a sincronização for concluída. Dados criados e apagados apenas localmente, antes de qualquer envio, não chegam aos gatilhos do banco. A tela de lixeira exige conexão.

O teste transacional `supabase/tests/deletion_audit.sql` cria somente registros sintéticos associados a duas contas de teste e executa `ROLLBACK` ao final. Execute o arquivo completo em um banco de teste depois de aplicar a migration. Ele verifica exclusão, restauração, conteúdo vinculado, conflitos, chaves compostas, RLS, idempotência, metadados e ausência de segredos nos logs.

Validação local do cliente: `node scripts/test-trash.cjs`. A migration foi aplicada e os testes transacionais do banco passaram, sem persistir os dados sintéticos. A conferência confirmou 14 tabelas monitoradas, RLS nas duas tabelas de auditoria e nenhum alerta de segurança novo relacionado a esta alteração.

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
