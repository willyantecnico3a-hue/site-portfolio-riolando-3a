const { getAuth } = require("firebase-admin/auth");
const { getFirestore } = require("firebase-admin/firestore");

async function handler(req, res) {
    if (req.method !== "POST") return res.status(405).json({ sucesso: false, mensagem: "Método não permitido." });

    try {
        const access = await requireScheduleManager(req.get("Authorization"));
        const body = req.body || {};
        const db = getFirestore();
        let result;

        switch (body.acao) {
            case "list": result = await listSchedules(db); break;
            case "save": result = await saveSchedule(db, body); break;
            case "set-active": result = await setScheduleActive(db, body); break;
            case "delete": result = await deleteSchedule(db, body); break;
            case "import": result = await importSchedules(db, body); break;
            case "get-setting": result = await getSetting(db); break;
            case "set-setting": result = await setSetting(db, body); break;
            case "add-discipline": result = await addDiscipline(db, body); break;
            case "migrate-existing": throw httpError(410, "A migração dos dados agora é executada pelo script local npm run migrate:firebase.");
            default: throw httpError(400, "Ação de horários inválida.");
        }
        return res.status(200).json(Object.assign({ sucesso: true }, result));
    } catch (error) {
        const status = error.status || 500;
        if (status >= 500) console.error("Erro ao acessar horários do Firebase:", error);
        return res.status(status).json({ sucesso: false, mensagem: status >= 500 ? "Erro interno ao acessar os horários do Firebase." : error.message });
    }
}

async function requireScheduleManager(header) {
    if (!header || !header.startsWith("Bearer ")) throw httpError(401, "Sessão administrativa não enviada.");
    let decoded;
    try { decoded = await getAuth().verifyIdToken(header.slice(7)); }
    catch { throw httpError(401, "Sessão inválida ou expirada."); }
    const email = String(decoded.email || "").toLowerCase();
    if (!email) throw httpError(401, "A conta não possui e-mail verificado.");
    const db = getFirestore();
    const [admin, coordinator] = await Promise.all([
        db.collection("_roles_admin").doc(email).get(),
        db.collection("_roles_coordenacao").doc(email).get()
    ]);
    if (!admin.exists && !coordinator.exists) throw httpError(403, "Este usuário não pode gerenciar horários.");
    return { admin: admin.exists, coordinator: coordinator.exists };
}

async function listSchedules(db) {
    const snapshot = await db.collection("horarios_aulas").get();
    return { horarios: snapshot.docs.map(doc => Object.assign({ id: doc.id }, doc.data())) };
}

async function saveSchedule(db, body) {
    const dados = validateSchedule(body.horario);
    const reference = body.horarioId ? db.collection("horarios_aulas").doc(validId(body.horarioId)) : db.collection("horarios_aulas").doc();
    await writeScheduleRows(db, [{ id: reference.id, dados }]);
    return { horarioId: reference.id };
}

async function setScheduleActive(db, body) {
    if (typeof body.ativo !== "boolean") throw httpError(400, "O status do horário precisa ser verdadeiro ou falso.");
    await db.collection("horarios_aulas").doc(validId(body.horarioId)).update({ ativo: body.ativo, atualizado_em: new Date().toISOString() });
    return {};
}

async function deleteSchedule(db, body) {
    await db.collection("horarios_aulas").doc(validId(body.horarioId)).delete();
    return {};
}

async function importSchedules(db, body) {
    if (!Array.isArray(body.horarios) || !body.horarios.length || body.horarios.length > 150) {
        throw httpError(400, "Envie entre 1 e 150 horários por lote.");
    }
    const rows = body.horarios.map(horario => ({ id: db.collection("horarios_aulas").doc().id, dados: validateSchedule(horario) }));
    await writeScheduleRows(db, rows);
    return { importados: rows.length };
}

async function getSetting(db) {
    const snap = await db.collection("site_settings").doc("riolando_sem_expediente").get();
    return { semExpediente: snap.exists && (snap.data().valor === true || snap.data().valor === "true") };
}

async function setSetting(db, body) {
    if (typeof body.semExpediente !== "boolean") throw httpError(400, "O modo sem expediente precisa ser verdadeiro ou falso.");
    await db.collection("site_settings").doc("riolando_sem_expediente").set({ valor: body.semExpediente, atualizado_em: new Date().toISOString() }, { merge: true });
    return {};
}

async function addDiscipline(db, body) {
    const nome = cleanText(body.nome, "Nome da disciplina", 120);
    const curso = cleanText(body.curso, "Curso", 120);
    const reference = db.collection("disciplinas_horarios").doc(catalogId(nome));
    await reference.set({ nome, curso, descricao: String(body.descricao || "").trim().slice(0, 1000), ativo: true, atualizado_em: new Date().toISOString() }, { merge: true });
    return {};
}

async function writeScheduleRows(db, rows) {
    for (let start = 0; start < rows.length; start += 150) {
        const batch = db.batch();
        for (const row of rows.slice(start, start + 150)) {
            batch.set(db.collection("horarios_aulas").doc(row.id), Object.assign({}, row.dados, { atualizado_em: new Date().toISOString() }));
            batch.set(db.collection("professores_horarios").doc(catalogId(row.dados.professor)), { nome: row.dados.professor }, { merge: true });
            if (row.dados.disciplina) batch.set(db.collection("disciplinas_horarios").doc(catalogId(row.dados.disciplina)), { nome: row.dados.disciplina }, { merge: true });
        }
        await batch.commit();
    }
}

function validateSchedule(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) throw httpError(400, "Dados de horário inválidos.");
    const day = String(value.dia_semana || "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/-feira$/, "");
    if (!["segunda", "terca", "quarta", "quinta", "sexta"].includes(day)) throw httpError(400, "Selecione um dia da semana válido.");
    const start = String(value.horario_inicio || "").trim().slice(0, 5);
    const end = String(value.horario_fim || "").trim().slice(0, 5);
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(start) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(end) || end <= start) throw httpError(400, "Preencha um intervalo de horários válido em HH:mm.");
    if (typeof value.ativo !== "boolean") throw httpError(400, "O status do horário é inválido.");
    return {
        dia_semana: day,
        horario_inicio: start,
        horario_fim: end,
        turma: cleanText(value.turma, "Turma", 120),
        professor: cleanText(value.professor, "Professor", 120),
        disciplina: String(value.disciplina || "").trim().slice(0, 120) || null,
        ambiente: String(value.ambiente || "").trim().slice(0, 120) || null,
        ativo: value.ativo
    };
}

function cleanText(value, label, max) {
    const text = String(value || "").trim();
    if (!text || text.length > max) throw httpError(400, `${label} é obrigatório e aceita até ${max} caracteres.`);
    return text;
}

function validId(value) {
    const id = String(value || "").trim();
    if (!id || id.length > 150 || id.includes("/")) throw httpError(400, "Identificador inválido.");
    return id;
}

function catalogId(value) {
    const id = String(value).trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    if (!id) throw httpError(400, "Não foi possível gerar identificador para o cadastro.");
    return id;
}

function httpError(status, message) {
    const error = new Error(message);
    error.status = status;
    return error;
}

module.exports = { handler };
