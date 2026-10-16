const { onRequest } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { defineSecret } = require("firebase-functions/params");
const { initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore } = require("firebase-admin/firestore");
const webpush = require("web-push");
const crypto = require("node:crypto");
const { handler: handleTeacherSchedules } = require("./horarios-professores");
const { handler: handleGeneratedContent } = require("./generate-content");

initializeApp();
const db = getFirestore();
const auth = getAuth();
const openRouterKey = defineSecret("OPENROUTER_API_KEY");
const vapidPublicKey = defineSecret("VAPID_PUBLIC_KEY");
const vapidPrivateKey = defineSecret("VAPID_PRIVATE_KEY");
const MAX_ROWS = 5000;
const MAX_WRITES = 450;
const TABLES = new Set([
    "acoes_checklist_paeet", "acompanhamento_alunos", "admin_profiles", "admins",
    "alunos_acompanhamento", "atendimentos_paeet", "aulas", "backup_eventos_15_30_junho_2026",
    "disciplinas", "eventos", "horarios_aulas", "logs_sistema", "perfis", "perfis_acesso",
    "portfolio_alunos", "push_agenda_logs", "push_subscriptions", "site_settings",
    "solicitacoes_ajuda", "turmas"
]);

exports.databaseApi = onRequest({ region: "us-central1", maxInstances: 10 }, async (req, res) => {
    res.set("Cache-Control", "no-store");
    if (req.method !== "POST") return res.status(405).json({ message: "Método não permitido." });

    try {
        const user = await authenticate(req);
        const spec = req.body || {};
        validateRequest(spec);
        const access = await getAccess(user);
        const result = await execute(spec, user, access);
        return res.status(200).json(result);
    } catch (error) {
        const status = error.status || 500;
        if (status >= 500) console.error("Erro no Firebase database API:", error);
        return res.status(status).json({ message: status >= 500 ? "Erro interno ao acessar o banco Firebase." : error.message });
    }
});

exports.teacherSchedules = onRequest({ region: "us-central1", maxInstances: 10 }, handleTeacherSchedules);

exports.createStudent = onRequest({ region: "us-central1", maxInstances: 5 }, async (req, res) => {
    if (req.method !== "POST") return res.status(405).json({ sucesso: false, mensagem: "Método não permitido." });
    try {
        await requireAdmin(req);
        const body = req.body || {};
        const nome = String(body.nome || "").trim();
        const email = String(body.email || "").trim().toLowerCase();
        const turma = String(body.turma || "").trim();
        const curso = String(body.curso || "desenvolvimento_sistemas").trim();
        const password = String(body.senhaTemporaria || "");
        if (!nome || !email.includes("@") || password.length < 6) throw httpError(400, "Nome, e-mail válido e senha temporária de pelo menos 6 caracteres são obrigatórios.");
        const existing = await db.collection("perfis").where("email", "==", email).limit(1).get();
        if (!existing.empty) throw httpError(409, "Já existe um aluno cadastrado com este e-mail.");
        const user = await auth.createUser({ email, password, emailVerified: true, displayName: nome });
        try {
            await db.collection("perfis").doc(user.uid).set({
                id: user.uid, nome, email, funcao: "aluno", turma, curso,
                senha_temporaria: true, ativo: true, atualizado_em: new Date().toISOString()
            });
        } catch (error) {
            await auth.deleteUser(user.uid).catch(() => {});
            throw error;
        }
        return res.status(200).json({ sucesso: true, mensagem: "Aluno criado com sucesso.", aluno: { id: user.uid, nome, email, turma, curso, senha_temporaria: true, ativo: true } });
    } catch (error) {
        return respondFunctionError(res, error);
    }
});

exports.resetStudentPassword = onRequest({ region: "us-central1", maxInstances: 5 }, async (req, res) => {
    if (req.method !== "POST") return res.status(405).json({ sucesso: false, mensagem: "Método não permitido." });
    try {
        await requireAdmin(req);
        const body = req.body || {};
        const studentId = String(body.alunoId || "").trim();
        const password = String(body.novaSenhaTemporaria || "");
        if (!studentId || password.length < 6) throw httpError(400, "ID do aluno e senha temporária de pelo menos 6 caracteres são obrigatórios.");
        const profileRef = db.collection("perfis").doc(studentId);
        const profile = await profileRef.get();
        if (!profile.exists) throw httpError(404, "Aluno não encontrado.");
        if (profile.data().funcao !== "aluno") throw httpError(400, "Este usuário não é um aluno.");
        await auth.updateUser(studentId, { password });
        await profileRef.update({ senha_temporaria: true, atualizado_em: new Date().toISOString() });
        return res.status(200).json({ sucesso: true, mensagem: "Senha temporária redefinida com sucesso." });
    } catch (error) {
        return respondFunctionError(res, error);
    }
});

exports.generateContent = onRequest({ region: "us-central1", maxInstances: 3, secrets: [openRouterKey] }, async (req, res) => {
    try {
        await requireAdmin(req);
        const result = await handleGeneratedContent({ httpMethod: req.method, body: JSON.stringify(req.body || {}) });
        return res.status(result.statusCode).set(result.headers || {}).send(result.body || "");
    } catch (error) {
        return respondFunctionError(res, error);
    }
});

exports.sendAgendaPush = onSchedule({
    schedule: "every 1 minutes",
    timeZone: "America/Sao_Paulo",
    region: "us-central1",
    maxInstances: 1,
    secrets: [vapidPublicKey, vapidPrivateKey]
}, async () => {
    const publicKey = vapidPublicKey.value();
    const privateKey = vapidPrivateKey.value();
    if (!publicKey || !privateKey) throw new Error("Configure os segredos VAPID_PUBLIC_KEY e VAPID_PRIVATE_KEY.");
    webpush.setVapidDetails("mailto:willyancruz@prof.educacao.sp.gov.br", publicKey, privateKey);
    const now = brazilNow();
    const eventSnapshot = await db.collection("eventos").where("data", "==", now.date).get();
    const subscriptionSnapshot = await db.collection("push_subscriptions").where("ativo", "==", true).get();
    if (eventSnapshot.empty || subscriptionSnapshot.empty) return;
    const subscriptions = subscriptionSnapshot.docs.map(doc => Object.assign({ id: doc.id }, doc.data()));

    for (const eventDoc of eventSnapshot.docs) {
        const event = Object.assign({ id: eventDoc.id }, eventDoc.data());
        const minutes = eventMinutesRemaining(event, now.time);
        const reminderMinutes = Number(event.lembrete_minutos ?? 10);
        if (minutes === null || reminderMinutes <= 0 || minutes < 0 || minutes > reminderMinutes) continue;
        const key = `${event.id}-${event.data}-${event.horario_inicio}`;
        const logId = crypto.createHash("sha256").update(key).digest("hex");
        const logRef = db.collection("push_agenda_logs").doc(logId);
        const previousLog = await db.collection("push_agenda_logs").where("chave_envio", "==", key).limit(1).get();
        if (!previousLog.empty || (await logRef.get()).exists) continue;
        const payload = JSON.stringify({ title: "Lembrete da Agenda Riolando", body: `${event.titulo} começa em ${minutes} minuto(s).`, url: "https://horariosprofsriolandocanno.web.app/agenda.html" });
        let sent = false;
        for (const item of subscriptions) {
            try {
                await webpush.sendNotification({ endpoint: item.endpoint, keys: { p256dh: item.p256dh, auth: item.auth } }, payload);
                sent = true;
            } catch (error) {
                if (error.statusCode === 404 || error.statusCode === 410) {
                    await db.collection("push_subscriptions").doc(String(item.id)).update({ ativo: false, atualizado_em: new Date().toISOString() });
                } else {
                    console.error("Falha ao enviar notificação push:", error.statusCode || error.message);
                }
            }
        }
        if (sent) await logRef.set({ evento_id: event.id, data_evento: event.data, horario_inicio: event.horario_inicio, chave_envio: key, enviado_em: new Date().toISOString() });
    }
});

async function authenticate(req) {
    const header = req.get("Authorization") || "";
    if (!header.startsWith("Bearer ")) return null;
    try {
        const decoded = await auth.verifyIdToken(header.slice(7));
        return { uid: decoded.uid, email: (decoded.email || "").toLowerCase() };
    } catch {
        throw httpError(401, "Sua sessão expirou. Entre novamente.");
    }
}

async function getAccess(user) {
    if (!user) return { admin: false, coordinator: false };
    const [admin, coordinator] = await Promise.all([
        db.collection("_roles_admin").doc(user.email).get(),
        db.collection("_roles_coordenacao").doc(user.email).get()
    ]);
    return {
        admin: admin.exists && admin.data().active === true,
        coordinator: coordinator.exists && coordinator.data().active === true
    };
}

function validateRequest(spec) {
    if (!spec || !TABLES.has(spec.table)) throw httpError(400, "Tabela inválida.");
    if (!["select", "insert", "upsert", "update", "delete"].includes(spec.action)) throw httpError(400, "Operação inválida.");
    if (!Array.isArray(spec.filters) || !Array.isArray(spec.orders)) throw httpError(400, "Consulta inválida.");
    if (spec.filters.length > 20) throw httpError(400, "A consulta possui filtros demais.");
}

async function execute(spec, user, access) {
    if (spec.action === "select") {
        const rows = await findRows(spec.table, spec.filters, spec.orders, spec.limit, spec.range);
        const visible = rows.filter(row => mayRead(spec.table, row, user, access));
        const joined = await addRelations(spec.table, visible, spec.columns);
        return { data: joined.map(row => project(row, spec.columns)), count: visible.length };
    }

    if (spec.action === "insert" || spec.action === "upsert") {
        const input = Array.isArray(spec.payload) ? spec.payload : [spec.payload];
        if (!input.length || input.length > MAX_WRITES) throw httpError(400, `Envie entre 1 e ${MAX_WRITES} registros por operação.`);
        const output = [];
        for (let offset = 0; offset < input.length; offset += MAX_WRITES) {
            const batch = db.batch();
            for (const value of input.slice(offset, offset + MAX_WRITES)) {
                const row = cleanObject(value);
                const existing = spec.action === "upsert" ? await findConflict(spec.table, row, spec.conflict) : null;
                const ref = existing ? existing.ref : referenceForInsert(spec.table, row);
                const next = Object.assign({}, existing?.data || {}, row, { id: row.id ?? existing?.data?.id ?? ref.id });
                if (!mayWrite(spec.table, "insert", next, existing?.data || null, user, access)) {
                    throw httpError(403, "Você não tem permissão para gravar este registro.");
                }
                batch.set(ref, next, { merge: spec.action === "upsert" });
                output.push(next);
            }
            await batch.commit();
        }
        await syncCoordinatorIndex(spec.table, output);
        const relations = await addRelations(spec.table, output, spec.columns);
        return { data: relations.map(row => project(row, spec.columns)), count: output.length };
    }

    const matches = await findRows(spec.table, spec.filters, null, null, null);
    if (matches.length > MAX_WRITES) throw httpError(400, "A operação atingiria registros demais. Aplique filtros mais específicos.");
    const batch = db.batch();
    let affected = 0;
    const roleUpdates = [];

    for (const row of matches) {
        const ref = db.collection(spec.table).doc(String(row.__docId));
        const existing = Object.assign({}, row);
        delete existing.__docId;
        const next = spec.action === "update" ? Object.assign({}, existing, cleanObject(spec.payload)) : existing;
        if (!mayWrite(spec.table, spec.action, next, existing, user, access)) {
            throw httpError(403, "Você não tem permissão para alterar este registro.");
        }
        if (spec.action === "update") batch.set(ref, next, { merge: true });
        else batch.delete(ref);
        roleUpdates.push({ old: existing, next: spec.action === "update" ? next : null });
        affected += 1;
    }

    if (affected) await batch.commit();
    if (spec.table === "perfis_acesso") await syncCoordinatorIndex(spec.table, roleUpdates.filter(item => item.next).map(item => item.next), roleUpdates);
    return { data: [], count: affected };
}

async function syncCoordinatorIndex(table, rows, previousRows) {
    if (table !== "perfis_acesso") return;
    const all = [...(previousRows || []).map(item => item.old), ...rows].filter(Boolean);
    for (const row of all) {
        const email = String(row.email || "").trim().toLowerCase();
        if (!email) continue;
        const current = rows.find(item => String(item.email || "").trim().toLowerCase() === email);
        const allowed = current && current.perfil === "coordenacao" && current.ativo === true;
        const ref = db.collection("_roles_coordenacao").doc(email);
        if (allowed) await ref.set({ email, active: true }, { merge: true });
        else await ref.delete();
    }
}

async function findRows(table, filters, orders, limit, range) {
    let query = db.collection(table);
    const indexable = filters.find(filter => filter.operator === "eq" && !(typeof filter.value === "string" && /^\d+$/.test(filter.value)))
        || filters.find(filter => ["gte", "lte"].includes(filter.operator) && typeof filter.value === "string");
    if (indexable) query = query.where(indexable.column, toFirestoreOperator(indexable), indexable.value);
    query = query.limit(MAX_ROWS + 1);

    const snapshot = await query.get();
    if (snapshot.size > MAX_ROWS) throw httpError(413, "A consulta excedeu o limite de registros. Refine os filtros.");
    let rows = snapshot.docs.map(doc => Object.assign({ __docId: doc.id }, doc.data()));
    rows = rows.filter(row => filters.every(filter => matchesFilter(row, filter)));
    if (Array.isArray(orders)) {
        rows.sort((left, right) => {
            for (const order of orders) {
                const a = left[order.column];
                const b = right[order.column];
                if (a === b) continue;
                const comparison = a == null ? -1 : b == null ? 1 : a < b ? -1 : 1;
                return order.ascending === false ? -comparison : comparison;
            }
            return 0;
        });
    }
    if (range) rows = rows.slice(range.from, range.to + 1);
    else if (Number.isInteger(limit) && limit >= 0) rows = rows.slice(0, limit);
    return rows;
}

function toFirestoreOperator(filter) {
    if (["eq", "neq", "gt", "gte", "lt", "lte", "in"].includes(filter.operator)) {
        return filter.operator === "eq" ? "==" : filter.operator === "neq" ? "!=" : filter.operator;
    }
    if (filter.operator === "is" && filter.value !== null) return "==";
    if (filter.operator === "not" && filter.value?.operator === "is" && filter.value.value !== null) return "!=";
    return null;
}

function matchesFilter(row, filter) {
    const current = row[filter.column];
    const value = filter.value;
    switch (filter.operator) {
        case "eq": return sameValue(current, value);
        case "neq": return !sameValue(current, value);
        case "gt": return current > value;
        case "gte": return current >= value;
        case "lt": return current < value;
        case "lte": return current <= value;
        case "in": return Array.isArray(value) && value.some(candidate => sameValue(current, candidate));
        case "is": return value === null ? current === null || current === undefined : current === value;
        case "not":
            if (value?.operator === "is" && value.value === null) return current !== null && current !== undefined;
            return true;
        case "ilike":
        case "like": {
            const pattern = String(value ?? "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/%/g, ".*").replace(/_/g, ".");
            return new RegExp(`^${pattern}$`, filter.operator === "ilike" ? "i" : "").test(String(current ?? ""));
        }
        default: return false;
    }
}

function sameValue(left, right) {
    if (left === right) return true;
    if ((typeof left === "number" || typeof right === "number") && left !== null && right !== null) {
        return String(left) === String(right) && Number.isFinite(Number(left)) && Number.isFinite(Number(right));
    }
    return false;
}

function mayRead(table, row, user, access) {
    if (table === "admins") return Boolean(user && String(row.email || "").toLowerCase() === user.email);
    if (table === "admin_profiles") return Boolean(user && String(row.user_id) === user.uid);
    if (access.admin) return true;
    if (table === "perfis_acesso") return Boolean(user && String(row.email || "").toLowerCase() === user.email);
    if (table === "perfis") return Boolean(user && String(row.id) === user.uid);
    if (table === "solicitacoes_ajuda") return Boolean(user && String(row.aluno_id) === user.uid);
    if (table === "turmas" || table === "disciplinas" || table === "aulas") return row.ativo === true;
    if (table === "horarios_aulas") return row.ativo === true;
    if (table === "eventos" || table === "site_settings") return true;
    if (table === "portfolio_alunos") return row.autorizado === true && row.aprovado === true;
    if (table === "acompanhamento_alunos") return access.coordinator;
    return false;
}

function mayWrite(table, action, next, old, user, access) {
    if (table === "admins") return false;
    if (table === "admin_profiles") return Boolean(user && String(next.user_id) === user.uid && action !== "delete");
    if (access.admin) return true;
    if (table === "perfis" && user && String(next.id) === user.uid && action === "update") {
        return next.funcao === old.funcao && next.ativo === old.ativo;
    }
    if (table === "acompanhamento_alunos" && access.coordinator) return action !== "delete";
    if (table === "horarios_aulas" && access.coordinator) return action !== "insert" || next.ativo === true || next.ativo === false;
    if (table === "solicitacoes_ajuda" && action === "insert") return !user || String(next.aluno_id || "") === user.uid;
    if (table === "portfolio_alunos" && action === "insert") return next.autorizado === true && next.aprovado !== true;
    if (table === "push_subscriptions" && ["insert", "upsert", "update"].includes(action)) return true;
    if (table === "logs_sistema" && action === "insert") return Boolean(user);
    return false;
}

async function findConflict(table, row, conflict) {
    const keys = String(conflict || "id").split(",").map(value => value.trim()).filter(Boolean);
    if (!keys.length) return null;
    if (keys.length === 1) {
        const value = row[keys[0]];
        if (value !== undefined && value !== null) {
            const snapshot = await db.collection(table).where(keys[0], "==", value).limit(1).get();
            if (!snapshot.empty) return { ref: snapshot.docs[0].ref, data: snapshot.docs[0].data() };
        }
    }
    return null;
}

function referenceForInsert(table, row) {
    if (row.id !== undefined && row.id !== null) return db.collection(table).doc(String(row.id));
    if (table === "site_settings" && row.chave) return db.collection(table).doc(String(row.chave));
    if (table === "admin_profiles" && row.user_id) return db.collection(table).doc(String(row.user_id));
    return db.collection(table).doc();
}

async function addRelations(table, rows, columns) {
    const requested = String(columns || "").matchAll(/([a-z_][a-z0-9_]*)\s*\(([^()]*)\)/gi);
    const relationNames = [...requested].map(match => match[1]);
    const relationMap = {
        aulas: { disciplinas: { foreignKey: "disciplina_id", collection: "disciplinas" }, turmas: { foreignKey: "turma_id", collection: "turmas" } },
        atendimentos_paeet: { alunos_acompanhamento: { foreignKey: "aluno_id", collection: "alunos_acompanhamento" } }
    };
    const config = relationMap[table] || {};
    for (const relation of relationNames) {
        const join = config[relation];
        if (!join) continue;
        for (const row of rows) {
            const id = row[join.foreignKey];
            if (id === undefined || id === null) { row[relation] = null; continue; }
            const doc = await db.collection(join.collection).doc(String(id)).get();
            row[relation] = doc.exists ? doc.data() : null;
        }
    }
    return rows;
}

function project(row, columns) {
    if (!columns || columns.trim() === "*") {
        const copy = Object.assign({}, row);
        delete copy.__docId;
        return copy;
    }
    const parts = splitColumns(columns);
    const result = {};
    for (const part of parts) {
        const relation = part.match(/^([a-z_][a-z0-9_]*)\s*\((.*)\)$/i);
        if (relation) {
            const name = relation[1];
            const nested = relation[2].split(",").map(value => value.trim()).filter(Boolean);
            const value = row[name];
            result[name] = Array.isArray(value)
                ? value.map(item => pick(item, nested))
                : value ? pick(value, nested) : null;
            continue;
        }
        const alias = part.match(/^([a-z_][a-z0-9_]*)\s*:\s*([a-z_][a-z0-9_]*)$/i);
        if (alias) result[alias[1]] = row[alias[2]];
        else if (part === "*") return project(row, "*");
        else result[part] = row[part];
    }
    return result;
}

function pick(row, keys) {
    const output = {};
    for (const key of keys) output[key] = row?.[key];
    return output;
}

function splitColumns(columns) {
    const result = [];
    let depth = 0;
    let start = 0;
    for (let index = 0; index < columns.length; index += 1) {
        if (columns[index] === "(") depth += 1;
        else if (columns[index] === ")") depth -= 1;
        else if (columns[index] === "," && depth === 0) {
            result.push(columns.slice(start, index).trim());
            start = index + 1;
        }
    }
    result.push(columns.slice(start).trim());
    return result.filter(Boolean);
}

function cleanObject(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) throw httpError(400, "Registro inválido.");
    return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined));
}

function httpError(status, message) {
    const error = new Error(message);
    error.status = status;
    return error;
}

async function requireAdmin(req) {
    const user = await authenticate(req);
    if (!user) throw httpError(401, "Sessão administrativa não enviada.");
    const access = await getAccess(user);
    if (!access.admin) throw httpError(403, "Este usuário não tem permissão de administrador.");
    return user;
}

function respondFunctionError(res, error) {
    const status = error.status || 500;
    if (status >= 500) console.error("Erro em função Firebase:", error);
    return res.status(status).json({
        sucesso: false,
        mensagem: status >= 500 ? "Erro interno ao processar a solicitação." : error.message
    });
}

function brazilNow() {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Sao_Paulo",
        year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit", hour12: false
    }).formatToParts(new Date());
    const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
    const hour = values.hour === "24" ? "00" : values.hour;
    return { date: `${values.year}-${values.month}-${values.day}`, time: `${hour}:${values.minute}` };
}

function eventMinutesRemaining(event, currentTime) {
    if (!event.horario_inicio) return null;
    const toMinutes = value => {
        const [hours, minutes] = String(value).slice(0, 5).split(":").map(Number);
        return hours * 60 + minutes;
    };
    return toMinutes(event.horario_inicio) - toMinutes(currentTime);
}
