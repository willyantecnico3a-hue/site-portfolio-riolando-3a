# Migração do Supabase para Firebase

O arquivo `supabase_schema.sql` é a referência exportada do Supabase: 21 tabelas e 72 políticas RLS. As políticas usam funções e identidade do PostgreSQL/Supabase; elas precisam ser convertidas em regras de segurança do Firestore e não devem ser executadas no Firebase.

## Ferramenta de cópia de dados e contas

O script `scripts/migrate-supabase-to-firebase.js` copia as tabelas do Supabase para coleções Firestore, os arquivos dos buckets `admin-perfil` e `materiais` para Firebase Storage, atualiza os links dos arquivos nas linhas e cria no Firebase Auth as contas com os mesmos UIDs. Preservar os UIDs mantém as referências existentes nas linhas. O script não copia senhas: cria links de redefinição para os usuários.

Antes de executá-lo:

1. Crie uma chave de conta de serviço no projeto Firebase `horariosprofsriolandocanno` e salve o JSON como `firebase-service-account.json` na raiz do projeto. Não compartilhe nem faça commit desse arquivo.
2. Copie `.env.example` para `.env.local` e preencha a URL do Supabase e a chave `service_role` localmente. Não cole essas chaves no chat.
3. Execute `npm run migrate:firebase`.
4. O script grava os links de redefinição em `firebase-password-reset-links.csv`. Envie os links aos usuários por um canal privado e apague o CSV quando terminar.

O script para se um e-mail já existir no Firebase com UID diferente do Supabase, para evitar alterar referências de conta silenciosamente. Ele preserva configurações de `site_settings` que já existam no Firestore e grava horários migrados em documentos `supabase_<id>` para evitar colisão com os documentos de horários existentes.

## Estado da migração do app

As páginas agora usam Firebase Authentication, uma API de dados em Cloud Functions e Firebase Storage. As cinco operações backend (horários, criação de aluno, redefinição de senha, geração de conteúdo e notificações push) também têm implementações Firebase. O workflow do GitHub faz deploy de Hosting, Functions e regras quando a credencial do Firebase estiver cadastrada no repositório.

Antes do primeiro deploy:

1. No Firebase Console, habilite o provedor **E-mail/senha** em Authentication. Confirme que Firestore e Storage estão ativados.
2. Configure os segredos de função localmente, sem publicá-los: `firebase functions:secrets:set OPENROUTER_API_KEY`, `firebase functions:secrets:set VAPID_PUBLIC_KEY` e `firebase functions:secrets:set VAPID_PRIVATE_KEY`. O valor privado VAPID deve ser obtido no provedor onde está salvo hoje.
3. No GitHub, crie o segredo do repositório `FIREBASE_SERVICE_ACCOUNT` com o JSON da conta de serviço de deploy do projeto. O workflow não consegue autenticar enquanto esse segredo não existir.
4. Instale e autentique o Firebase CLI, preencha `.env.local` e execute `npm run migrate:firebase` para copiar as contas e tabelas. Não envie `.env.local`, a conta de serviço ou o CSV de links de redefinição ao GitHub.
5. Depois de conferir os dados e as contas no Firebase, publique pelo workflow **Deploy Firebase Hosting and Functions** na aba Actions do GitHub.

O deploy de Functions agendadas pode exigir o plano Blaze do Firebase/Google Cloud. O site não foi publicado ainda: este ambiente não tem Firebase CLI autenticado nem as chaves privadas necessárias para a migração e os serviços externos.
