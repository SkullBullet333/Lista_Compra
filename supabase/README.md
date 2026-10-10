# Configuração do Supabase

1. Crie um projeto no Supabase.
2. Execute, em ordem, os arquivos de `supabase/migrations` no SQL Editor. Se usar a CLI, rode `supabase db push`.
3. Em **Authentication > Providers**, mantenha o provedor **Email** ativo. O app usa cadastro e acesso por e-mail e senha.
4. Copie `.env.example` para `.env.local` e informe:

```env
NEXT_PUBLIC_SUPABASE_URL="https://SEU-PROJETO.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="SUA_CHAVE_ANON"
```

5. Reinicie o servidor local.

Com o Supabase configurado, o usuário entra ou cria uma conta antes de acessar as listas. Alterações em listas, itens e roteiros de viagem são sincronizadas automaticamente. O botão **Sincronizar agora** também envia listas, itens, categorias, modelos, preferências e histórico de preços.

Listas podem ser compartilhadas por e-mail com permissão de edição ou somente leitura. Atualizações feitas por participantes aparecem em tempo real para os demais usuários conectados.

## Tabelas

- `catalog_items`: itens pré-configurados e itens cadastrados pelo usuário.
- `shopping_lists`, `list_items`: backup das listas e seus produtos.
- `price_history`: histórico usado na comparação do preço atual com o anterior.
- `list_templates`, `template_items`: modelos prontos e modelos personalizados.
- `categories`: categorias padrão e personalizadas.
- `travel_entries`: passeios, comidas, bebidas e gastos de viagem.
- `user_preferences`: tema claro/escuro/sistema e cor principal.
- `profiles`: perfil associado ao usuário do Supabase Authentication.
- `list_members`: participantes e permissões de cada lista compartilhada.
- `list_invitations`: convites enviados para e-mails que ainda não possuem conta.

Todas as tabelas possuem RLS. O proprietário controla o compartilhamento; participantes acessam somente as listas para as quais receberam permissão. Catálogo e modelos marcados como sistema são somente leitura.
