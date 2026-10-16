const fs = require("node:fs/promises");
const path = require("node:path");
const { createClient } = require("@supabase/supabase-js");
const { cert, getApps, initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getStorage: getFirebaseStorage } = require("firebase-admin/storage");
const { getFirestore } = require("firebase-admin/firestore");
const { randomUUID } = require("node:crypto");

const FIREBASE_PROJECT_ID = "horariosprofsriolandocanno";
const PAGE_SIZE = 1000;
const BATCH_SIZE = 200;
const TABLES = [
    "Tabela _de _administradores",
    "acoes_checklist_paeet",
    "acompanhamento_alunos",
    "admin_profiles",
    "admins",
    "alunos_acompanhamento",
    "atendimentos_paeet",
    "aulas",
    "backup_eventos_15_30_junho_2026",
    "disciplinas",
    "eventos",
    "horarios_aulas",
    "logs_sistema",
    "perfis",
    "perfis_acesso",
    "portfolio_alunos",
    "push_agenda_logs",
    "push_subscriptions",
    "site_settings",
    "solicitacoes_ajuda",
    "turmas"
];

async function main() {
    await loadLocalEnvironment();
    const supabaseUrl = requiredEnv("SUPABASE_URL");
    const supabaseKey = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");
    const serviceAccountPath = requiredEnv("FIREBASE_SERVICE_ACCOUNT_FILE");
    const storageBucketName = requiredEnv("FIREBASE_STORAGE_BUCKET");
    const rawServiceAccount = await fs.readFile(path.resolve(process.cwd(), serviceAccountPath), "utf8");
    let serviceAccount;

    try {
        serviceAccount = JSON.parse(rawServiceAccount);
    } catch {
        throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON precisa conter o JSON completo da conta de serviço.");
    }

    if (serviceAccount.project_id !== FIREBASE_PROJECT_ID) {
        throw new Error(`A conta de serviço pertence a ${serviceAccount.project_id || "outro projeto"}; o destino esperado é ${FIREBASE_PROJECT_ID}.`);
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
        auth: { persistSession: false, autoRefreshToken: false }
    });
    const app = getApps().find(item => item.name === "supabase-migration") || initializeApp({
        credential: cert(serviceAccount),
        projectId: FIREBASE_PROJECT_ID
    }, "supabase-migration");
    const auth = getAuth(app);
    const db = getFirestore(app);
    const storageBucket = getFirebaseStorage(app).bucket(storageBucketName);

    console.log(`Migrando para Firebase ${FIREBASE_PROJECT_ID}.`);
    const users = await listSupabaseUsers(supabase);
    const resetLinks = [];
    let usersPrepared = 0;

    for (const user of users) {
        if (!user.id || !user.email) continue;
        const firebaseUser = await createOrCheckFirebaseUser(auth, user);
        const resetLink = await auth.generatePasswordResetLink(firebaseUser.email);
        resetLinks.push({ email: firebaseUser.email, uid: firebaseUser.uid, link: resetLink });
        usersPrepared += 1;
    }

    const resetPath = path.resolve(process.cwd(), "firebase-password-reset-links.csv");
    await writeCsv(resetPath, ["email", "uid", "password_reset_link"], resetLinks);
    console.log(`Preparados ${usersPrepared} usuários. Links de redefinição salvos localmente em firebase-password-reset-links.csv.`);

    const storageUrls = await migrateStorageObjects(supabase, storageBucket);
    console.log(`Arquivos copiados do Supabase Storage: ${storageUrls.size}.`);

    for (const table of TABLES) {
        const rows = (await loadTable(supabase, table)).map(row => replaceStorageUrls(row, storageUrls));
        let migrated = 0;

        for (let offset = 0; offset < rows.length; offset += BATCH_SIZE) {
            const batch = db.batch();
            const group = rows.slice(offset, offset + BATCH_SIZE);

            for (const row of group) {
                const id = documentIdFor(table, row);
                if (!id) {
                    throw new Error(`Registro sem identificador estável na tabela ${table}; nenhum lote desta tabela foi gravado.`);
                }
                const reference = db.collection(table).doc(id);

                if (table === "site_settings" && (await reference.get()).exists) {
                    continue;
                }

                batch.set(reference, row, { merge: true });
                migrated += 1;

                if (table === "admins" && row.email) {
                    batch.set(db.collection("_roles_admin").doc(normalizeEmail(row.email)), {
                        email: normalizeEmail(row.email),
                        active: true
                    }, { merge: true });
                }

                if (table === "perfis_acesso" && row.email && row.ativo === true && row.perfil === "coordenacao") {
                    batch.set(db.collection("_roles_coordenacao").doc(normalizeEmail(row.email)), {
                        email: normalizeEmail(row.email),
                        active: true
                    }, { merge: true });
                }
            }

            if (group.length > 0) await batch.commit();
        }

        console.log(`${table}: ${migrated}/${rows.length} registros copiados.`);
    }

    await pruneRoleCollection(db, "_roles_admin", new Set(
        (await loadTable(supabase, "admins")).map(row => normalizeEmail(row.email)).filter(Boolean)
    ));
    await pruneRoleCollection(db, "_roles_coordenacao", new Set(
        (await loadTable(supabase, "perfis_acesso"))
            .filter(row => row.perfil === "coordenacao" && row.ativo === true)
            .map(row => normalizeEmail(row.email)).filter(Boolean)
    ));

    console.log("Migração concluída. O CSV de redefinição contém links privados: não o publique nem o envie ao GitHub.");
}

async function listSupabaseUsers(supabase) {
    const users = [];
    for (let page = 1; ; page += 1) {
        const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: PAGE_SIZE });
        if (error) throw new Error(`Não foi possível listar usuários do Supabase: ${error.message}`);
        users.push(...(data.users || []));
        if (!data.users || data.users.length < PAGE_SIZE) break;
    }
    return users;
}

async function createOrCheckFirebaseUser(auth, user) {
    try {
        return await auth.createUser({
            uid: user.id,
            email: user.email,
            displayName: user.user_metadata?.nome || user.user_metadata?.name || undefined,
            emailVerified: Boolean(user.email_confirmed_at),
            disabled: Boolean(user.banned_until && new Date(user.banned_until) > new Date())
        });
    } catch (error) {
        if (error.code === "auth/uid-already-exists") {
            const existing = await auth.getUser(user.id);
            if (existing.email?.toLowerCase() !== user.email.toLowerCase()) {
                throw new Error(`O UID ${user.id} já existe no Firebase com outro e-mail; migração interrompida para proteger a conta.`);
            }
            return existing;
        }
        if (error.code === "auth/email-already-exists") {
            const existing = await auth.getUserByEmail(user.email);
            throw new Error(`O e-mail ${user.email} já existe no Firebase com UID ${existing.uid}, mas o Supabase usa ${user.id}. Resolva o conflito de identidade antes de migrar os dados relacionados.`);
        }
        throw error;
    }
}

async function loadTable(supabase, table) {
    const records = [];
    const orderKey = table === "admin_profiles" ? "user_id" : table === "site_settings" ? "chave" : "id";
    for (let from = 0; ; from += PAGE_SIZE) {
        const to = from + PAGE_SIZE - 1;
        const { data, error } = await supabase.from(table).select("*").order(orderKey, { ascending: true }).range(from, to);
        if (error) throw new Error(`Erro ao ler ${table} no Supabase: ${error.message}`);
        records.push(...(data || []));
        if (!data || data.length < PAGE_SIZE) break;
    }
    return records;
}

function documentIdFor(table, row) {
    if (table === "site_settings") return safeDocumentId(row.chave);
    if (table === "horarios_aulas" && row.id !== undefined) return `supabase_${row.id}`;

    const primary = row.id ?? row.user_id ?? row.endpoint;
    if (primary !== undefined && primary !== null && primary !== "") return safeDocumentId(primary);
    return null;
}

function safeDocumentId(value) {
    const id = String(value);
    if (!id || id.includes("/")) throw new Error(`Identificador Firestore inválido: ${id}`);
    return id;
}

function normalizeEmail(email) {
    return String(email).trim().toLowerCase();
}

function requiredEnv(name) {
    const value = process.env[name];
    if (!value) throw new Error(`Defina a variável ${name} no ambiente local antes de iniciar a migração.`);
    return value;
}

async function loadLocalEnvironment() {
    const filePath = path.resolve(process.cwd(), ".env.local");
    let contents;
    try {
        contents = await fs.readFile(filePath, "utf8");
    } catch (error) {
        if (error.code === "ENOENT") return;
        throw error;
    }

    for (const line of contents.split(/\r?\n/)) {
        const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
        if (!match || process.env[match[1]]) continue;
        const value = match[2].replace(/^(["'])(.*)\1$/, "$2");
        process.env[match[1]] = value;
    }
}

async function writeCsv(filePath, headers, rows) {
    const quote = value => `"${String(value ?? "").replace(/"/g, '""')}"`;
    const contents = [headers, ...rows.map(row => headers.map(header => row[header]))]
        .map(row => row.map(quote).join(","))
        .join("\r\n") + "\r\n";
    await fs.writeFile(filePath, contents, { encoding: "utf8", flag: "w" });
}

async function pruneRoleCollection(db, collection, activeEmails) {
    const snapshot = await db.collection(collection).get();
    const stale = snapshot.docs.filter(doc => !activeEmails.has(doc.id));
    for (let offset = 0; offset < stale.length; offset += BATCH_SIZE) {
        const batch = db.batch();
        stale.slice(offset, offset + BATCH_SIZE).forEach(doc => batch.delete(doc.ref));
        await batch.commit();
    }
}

async function migrateStorageObjects(supabase, targetBucket) {
    const urls = new Map();
    for (const sourceBucket of ["admin-perfil", "materiais"]) {
        const objects = await listStorageObjects(supabase, sourceBucket);
        for (const object of objects) {
            const { data, error } = await supabase.storage.from(sourceBucket).download(object.path);
            if (error) throw new Error(`Não foi possível baixar ${sourceBucket}/${object.path} do Supabase Storage: ${error.message}`);
            const buffer = Buffer.from(await data.arrayBuffer());
            const token = randomUUID();
            const targetPath = `${sourceBucket}/${object.path}`;
            const file = targetBucket.file(targetPath);
            await file.save(buffer, {
                resumable: false,
                metadata: {
                    contentType: object.metadata?.mimetype || "application/octet-stream",
                    cacheControl: "public,max-age=3600",
                    metadata: { firebaseStorageDownloadTokens: token }
                }
            });
            const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(targetBucket.name)}/o/${encodeURIComponent(targetPath)}?alt=media&token=${token}`;
            urls.set(object.publicUrl, publicUrl);
        }
    }
    return urls;
}

function replaceStorageUrls(value, urlMap) {
    const result = {};
    for (const [key, current] of Object.entries(value)) {
        if (typeof current !== "string") {
            result[key] = current;
            continue;
        }
        let updated = current;
        for (const [oldUrl, newUrl] of urlMap) updated = updated.split(oldUrl).join(newUrl);
        result[key] = updated;
    }
    return result;
}

async function listStorageObjects(supabase, bucket, folder) {
    const objects = [];
    for (let offset = 0; ; offset += 100) {
        const { data, error } = await supabase.storage.from(bucket).list(folder || "", {
            limit: 100,
            offset,
            sortBy: { column: "name", order: "asc" }
        });
        if (error) throw new Error(`Não foi possível listar o bucket ${bucket}: ${error.message}`);
        for (const entry of data || []) {
            const objectPath = folder ? `${folder}/${entry.name}` : entry.name;
            if (entry.id === null) objects.push(...await listStorageObjects(supabase, bucket, objectPath));
            else objects.push({ path: objectPath, metadata: entry.metadata || {}, publicUrl: supabase.storage.from(bucket).getPublicUrl(objectPath).data.publicUrl });
        }
        if (!data || data.length < 100) break;
    }
    return objects;
}

main().catch(error => {
    console.error("Migração interrompida:", error.message);
    process.exitCode = 1;
});
