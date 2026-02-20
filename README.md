# Central de Integrações

Aplicação web moderna e responsiva para gestão operacional dos serviços:
- Integrações SMP
- Multicadastro
- RC-V
- Tecnologia Logística

## Stack
- Vite + React + TypeScript
- Tailwind + shadcn/ui
- Supabase (Auth + Postgres)

## Rodar localmente

Requisitos: Node.js 18+

```bash
npm install
npm run dev
```

## Variáveis de ambiente

Copie/ajuste o arquivo `.env` conforme o seu projeto Supabase.

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY` (pode ser a **anon key** do Supabase)

## Build

```bash
npm run build
npm run preview
```


## Supabase

Veja o arquivo **SUPABASE_SETUP.md** para configurar Auth, tabelas e permissões.
