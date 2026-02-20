# Setup do Supabase (produção)

Este projeto usa **Supabase Auth (email/senha)** + tabelas (`services`, `records`, `profiles`, `user_roles`) com **RLS**.

## 1) Configurar variáveis de ambiente

Crie/edite o arquivo `.env` na raiz:

```env
VITE_SUPABASE_URL=https://zythdiekrprkcpzjfstl.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<SUA_ANON_KEY>
```

## 2) Criar o schema no Supabase

No painel do Supabase: **SQL Editor → New query → Run**

Copie e execute o conteúdo do arquivo:

- `supabase/migrations/20260220135321_*.sql`

> Observação: removemos a migration que tentava criar usuário demo em `auth.users`, pois isso **não funciona** em projetos Supabase hospedados (produção).

## 3) Criar usuário admin

1. No app (tela de login), clique em **Criar conta** e registre o usuário admin.
2. No Supabase: **Authentication → Users**, copie o UUID do usuário.
3. No SQL Editor, rode:

```sql
update public.user_roles
set role = 'admin'
where user_id = '<UUID_DO_USUARIO>';
```

## 4) Rodar local

```bash
npm install
npm run dev
```

Acesse: http://localhost:8080
