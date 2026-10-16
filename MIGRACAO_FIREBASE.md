# Migração para Firebase Spark (gratuito)

O destino é o projeto Firebase `horariosprofsriolandocanno`. A versão Spark usa Firebase Hosting para as páginas, Firebase Authentication para login e Cloud Firestore para os dados. O deploy não publica Cloud Functions nem Firebase Storage.

## O que funciona no Spark

- Páginas estáticas no Firebase Hosting.
- Login por e-mail e senha e redefinição de senha pelo Firebase Authentication.
- Dados no Firestore, protegidos por `firestore.rules`.
- Importação local das tabelas e contas do Supabase para Firestore/Auth usando o script de migração.
- Links de arquivos existentes continuam apontando para o Supabase enquanto esses arquivos permanecerem hospedados lá.

## Recursos que ficam indisponíveis

- Upload de fotos e materiais para Firebase Storage. Os formulários de upload informam que o recurso não está disponível; use URLs públicas já existentes.
- Funções de servidor: geração de conteúdo por IA, envio automático de notificações push e tarefas agendadas. A agenda continua mostrando os eventos, mas notificações automáticas ficam desativadas.
- O Firebase Spark não inclui Cloud Functions nem Firebase Storage para este projeto. Não faça upgrade para Blaze se a exigência é manter tudo gratuito.

O Spark tem limites de uso gratuitos. Consulte os limites atuais do [Firebase Spark](https://firebase.google.com/docs/projects/billing/firebase-pricing-plans), [Firestore](https://firebase.google.com/docs/firestore/pricing) e [Hosting](https://firebase.google.com/docs/hosting/usage-quotas-pricing). Ao atingir cotas gratuitas, alguns recursos podem parar até o próximo ciclo ou até reduzir o uso; o plano Spark não faz cobrança automática.

## Preparar a migração de dados

O arquivo `supabase_schema.sql` contém somente a estrutura e as políticas exportadas. Ele não contém as linhas de dados necessárias para fazer a cópia. As políticas RLS do Supabase não podem ser executadas no Firestore; a proteção equivalente está sendo definida em `firestore.rules`.

1. No Supabase, copie a **Project URL** e a chave **service_role** em Project Settings → API. Não compartilhe a chave nem a cole em mensagens.
2. Na pasta do projeto, copie `.env.example` para `.env.local` e preencha `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` com os valores do seu projeto. Deixe `FIREBASE_SERVICE_ACCOUNT_FILE=firebase-service-account.json`.
3. No Firebase Console do projeto `horariosprofsriolandocanno`, habilite Authentication com e-mail/senha e crie o banco Cloud Firestore. Mantenha o plano Spark.
4. Gere uma chave de conta de serviço Firebase para executar a migração localmente e salve como `firebase-service-account.json` na raiz. Esse arquivo é privado e não deve ser enviado ao GitHub.
5. No terminal, dentro da pasta do projeto, execute `npm run migrate:firebase`.

O script cria no Firebase Auth os usuários que existem no Supabase, preserva seus UIDs e prepara links para redefinição de senha, pois as senhas antigas não podem ser copiadas. Os links ficam em `firebase-password-reset-links.csv`; trate-os como credenciais privadas, envie cada link ao respectivo usuário por um canal privado e apague o arquivo depois. A migração copia as tabelas listadas no script e preserva IDs SQL no corpo dos documentos para não quebrar referências.

Faça a migração uma única vez após conferir que o Firestore está vazio ou que os dados existentes podem ser combinados. Em caso de conflito de e-mail/UID entre Supabase Auth e Firebase Auth, o script para e informa o conflito, para evitar associar uma conta à pessoa errada.

## Publicar no Firebase Hosting

Para deploy local, instale Firebase CLI, autentique a conta que administra `horariosprofsriolandocanno`, abra PowerShell na pasta do projeto e execute:

```powershell
firebase deploy --project horariosprofsriolandocanno --only firestore:rules,hosting
```

Para publicação automática a cada push em `main`, adicione no GitHub do repositório o secret `FIREBASE_SERVICE_ACCOUNT`, cujo valor é o JSON privado da conta de serviço com permissões de deploy. O workflow `.github/workflows/firebase-deploy.yml` publica somente as regras do Firestore e o Hosting.

O Hosting serve os arquivos estáticos; os dados e autenticação são acessados diretamente pelo SDK Firebase no navegador, sujeitos às regras do Firestore. Não coloque chaves de serviço ou `service_role` em HTML, JavaScript, no Git ou em secrets usados pelo site.

## Antes de encerrar a migração

- Revise os usuários importados e envie links individuais de redefinição.
- Confira os registros e permissões no aplicativo publicado.
- Arquivos e imagens já existentes dependem dos URLs e do projeto Supabase continuarem ativos. Este caminho Spark não migra bytes para Firebase Storage.
- Não publique a chave de conta de serviço, `.env.local` ou `firebase-password-reset-links.csv`.
