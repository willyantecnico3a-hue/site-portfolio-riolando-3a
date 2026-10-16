const { cert, getApps, initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.SUPABASE_URL || "https://pwomyoprbvoimqmikvev.supabase.co";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "sb_publishable_elGQyDU7ngaUHCLWIHLhDQ_IxiLo6kD";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const FIREBASE_PROJECT_ID = "horariosprofsriolandocanno";

exports.handler = async function (event) {
    if (event.httpMethod !== "POST") {
        return responder(405, {
            sucesso: false,
            mensagem: "Método não permitido."
        });
    }

    if (!SUPABASE_SERVICE_ROLE_KEY) {
        return responder(500, {
            sucesso: false,
            mensagem: "SUPABASE_SERVICE_ROLE_KEY não está configurada no Netlify."
        });
    }

    if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
        return responder(500, {
            sucesso: false,
            mensagem: "FIREBASE_SERVICE_ACCOUNT não está configurada no Netlify."
        });
    }

    try {
        const autenticacao = await verificarPermissao(event);

        if (!autenticacao.sucesso) {
            return responder(autenticacao.status, {
                sucesso: false,
                mensagem: autenticacao.mensagem
            });
        }

        let corpo;

        try {
            corpo = JSON.parse(event.body || "{}");
        } catch (erro) {
            throw erroRequisicao("O corpo da solicitação não contém JSON válido.");
        }

        const bancoFirebase = obterBancoFirebase();
        const supabaseAdmin = criarSupabaseAdmin();
        const resultado = await executarAcao(corpo, bancoFirebase, supabaseAdmin);

        return responder(200, Object.assign({ sucesso: true }, resultado));
    } catch (erro) {
        console.error("Erro na função de horários do Firebase:", erro);
        return responder(erro.statusCode || 500, {
            sucesso: false,
            mensagem: erro.statusCode ? erro.message : "Erro interno ao acessar os horários do Firebase."
        });
    }
};

async function executarAcao(corpo, db, supabaseAdmin) {
    switch (corpo.acao) {
        case "list":
            return listarHorarios(db);
        case "save":
            return salvarHorario(db, corpo);
        case "set-active":
            return alterarStatusHorario(db, corpo);
        case "delete":
            return excluirHorario(db, corpo);
        case "import":
            return importarHorarios(db, corpo);
        case "get-setting":
            return buscarModoSemExpediente(db);
        case "set-setting":
            return salvarModoSemExpediente(db, corpo);
        case "add-discipline":
            return cadastrarDisciplina(db, corpo);
        case "migrate-existing":
            return migrarHorariosExistentes(db, supabaseAdmin);
        default:
            throw erroRequisicao("Ação de horários inválida.");
    }
}

async function listarHorarios(db) {
    const snapshot = await db.collection("horarios_aulas").get();

    return {
        horarios: snapshot.docs.map(function (documento) {
            return Object.assign({ id: documento.id }, documento.data());
        })
    };
}

async function salvarHorario(db, corpo) {
    const horario = validarHorario(corpo.horario);
    const id = corpo.horarioId ? validarId(corpo.horarioId) : null;
    const referencia = id
        ? db.collection("horarios_aulas").doc(id)
        : db.collection("horarios_aulas").doc();

    await gravarHorariosComCatalogos(db, [{ id: referencia.id, dados: horario }]);
    return { horarioId: referencia.id };
}

async function alterarStatusHorario(db, corpo) {
    const id = validarId(corpo.horarioId);

    if (typeof corpo.ativo !== "boolean") {
        throw erroRequisicao("O status do horário precisa ser verdadeiro ou falso.");
    }

    await db.collection("horarios_aulas").doc(id).update({
        ativo: corpo.ativo,
        atualizado_em: new Date().toISOString()
    });

    return {};
}

async function excluirHorario(db, corpo) {
    const id = validarId(corpo.horarioId);
    await db.collection("horarios_aulas").doc(id).delete();
    return {};
}

async function importarHorarios(db, corpo) {
    if (!Array.isArray(corpo.horarios) || corpo.horarios.length === 0) {
        throw erroRequisicao("Envie pelo menos um horário válido para importar.");
    }

    if (corpo.horarios.length > 150) {
        throw erroRequisicao("Importe no máximo 150 horários por vez.");
    }

    const registros = corpo.horarios.map(function (horario) {
        return {
            id: db.collection("horarios_aulas").doc().id,
            dados: validarHorario(horario)
        };
    });

    await gravarHorariosComCatalogos(db, registros);
    return { importados: registros.length };
}

async function buscarModoSemExpediente(db) {
    const documento = await db.collection("site_settings").doc("riolando_sem_expediente").get();
    const valor = documento.exists ? documento.data().valor : false;

    return { semExpediente: valor === true || valor === "true" };
}

async function salvarModoSemExpediente(db, corpo) {
    if (typeof corpo.semExpediente !== "boolean") {
        throw erroRequisicao("O modo sem expediente precisa ser verdadeiro ou falso.");
    }

    await db.collection("site_settings").doc("riolando_sem_expediente").set({
        valor: corpo.semExpediente,
        atualizado_em: new Date().toISOString()
    }, { merge: true });

    return {};
}

async function cadastrarDisciplina(db, corpo) {
    const nome = limparTexto(corpo.nome, "Nome da disciplina", 120);
    const curso = limparTexto(corpo.curso, "Curso", 120);
    const descricao = (corpo.descricao || "").toString().trim().slice(0, 1000);
    const referencia = db.collection("disciplinas_horarios").doc(criarIdCatalogo(nome));

    await referencia.set({
        nome: nome,
        curso: curso,
        descricao: descricao,
        ativo: true,
        atualizado_em: new Date().toISOString()
    }, { merge: true });

    return {};
}

async function migrarHorariosExistentes(db, supabaseAdmin) {
    const { data, error } = await supabaseAdmin
        .from("horarios_aulas")
        .select("*")
        .order("id", { ascending: true });

    if (error) {
        throw new Error("Erro ao ler os horários atuais do Supabase: " + error.message);
    }

    const { data: disciplinas, error: erroDisciplinas } = await supabaseAdmin
        .from("disciplinas")
        .select("nome_disciplina, curso, descricao, ativo");

    if (erroDisciplinas) {
        throw new Error("Erro ao ler as disciplinas atuais do Supabase: " + erroDisciplinas.message);
    }

    const disciplinasValidas = (disciplinas || []).filter(function (disciplina) {
        return Boolean((disciplina.nome_disciplina || "").toString().trim());
    });

    for (let inicio = 0; inicio < disciplinasValidas.length; inicio += 400) {
        const lote = db.batch();
        disciplinasValidas.slice(inicio, inicio + 400).forEach(function (disciplina) {
            const nome = disciplina.nome_disciplina.toString().trim();
            const referencia = db.collection("disciplinas_horarios").doc(criarIdCatalogo(nome));
            lote.set(referencia, {
                nome: nome,
                curso: disciplina.curso || "",
                descricao: disciplina.descricao || "",
                ativo: disciplina.ativo !== false,
                atualizado_em: new Date().toISOString()
            }, { merge: true });
        });
        await lote.commit();
    }

    const { data: configuracao, error: erroConfiguracao } = await supabaseAdmin
        .from("site_settings")
        .select("valor")
        .eq("chave", "riolando_sem_expediente")
        .maybeSingle();

    if (erroConfiguracao) {
        throw new Error("Erro ao ler o modo de expediente atual: " + erroConfiguracao.message);
    }

    let modoSemExpedienteMigrado = false;
    const referenciaExpediente = db.collection("site_settings").doc("riolando_sem_expediente");
    const expedienteExistente = await referenciaExpediente.get();

    if (!expedienteExistente.exists && configuracao) {
        await referenciaExpediente.set({
            valor: configuracao.valor === true || configuracao.valor === "true",
            atualizado_em: new Date().toISOString()
        });
        modoSemExpedienteMigrado = true;
    }

    let migrados = 0;
    let ignorados = 0;

    for (let inicio = 0; inicio < data.length; inicio += 150) {
        const trecho = data.slice(inicio, inicio + 150);
        const validos = trecho.map(function (registro) {
            return {
                id: "supabase_" + validarId(registro.id.toString()),
                dados: Object.assign(validarHorario(Object.assign({}, registro, {
                    ativo: registro.ativo !== false
                })), {
                    supabase_id: registro.id
                })
            };
        });
        const existentes = await Promise.all(validos.map(function (registro) {
            return db.collection("horarios_aulas").doc(registro.id).get();
        }));
        const novos = validos.filter(function (registro, indice) {
            if (existentes[indice].exists) {
                ignorados += 1;
                return false;
            }
            return true;
        });

        migrados += await gravarHorariosComCatalogos(db, novos);
    }

    return {
        migrados: migrados,
        ignorados: ignorados,
        disciplinasMigradas: disciplinasValidas.length,
        modoSemExpedienteMigrado: modoSemExpedienteMigrado
    };
}

async function gravarHorariosComCatalogos(db, registros) {
    if (registros.length === 0) {
        return 0;
    }

    const lote = db.batch();
    const agora = new Date().toISOString();

    registros.forEach(function (registro) {
        const horarioRef = db.collection("horarios_aulas").doc(registro.id);
        lote.set(horarioRef, Object.assign({}, registro.dados, {
            atualizado_em: agora
        }));

        const professor = registro.dados.professor;
        const professorRef = db.collection("professores_horarios").doc(criarIdCatalogo(professor));
        lote.set(professorRef, {
            nome: professor,
            atualizado_em: agora
        }, { merge: true });

        if (registro.dados.disciplina) {
            const disciplinaRef = db.collection("disciplinas_horarios").doc(criarIdCatalogo(registro.dados.disciplina));
            lote.set(disciplinaRef, {
                nome: registro.dados.disciplina,
                atualizado_em: agora
            }, { merge: true });
        }
    });

    await lote.commit();
    return registros.length;
}

function validarHorario(valor) {
    if (!valor || typeof valor !== "object" || Array.isArray(valor)) {
        throw erroRequisicao("Os dados do horário são inválidos.");
    }

    const dia = normalizarDia(valor.dia_semana);
    const inicio = normalizarHora(valor.horario_inicio);
    const fim = normalizarHora(valor.horario_fim);
    const turma = limparTexto(valor.turma, "Turma", 120);
    const professor = limparTexto(valor.professor, "Professor", 120);
    const disciplina = (valor.disciplina || "").toString().trim().slice(0, 120);
    const ambiente = (valor.ambiente || "").toString().trim().slice(0, 120);

    if (fim <= inicio) {
        throw erroRequisicao("O horário final precisa ser maior que o horário inicial.");
    }

    if (typeof valor.ativo !== "boolean") {
        throw erroRequisicao("O status do horário é inválido.");
    }

    return {
        dia_semana: dia,
        horario_inicio: inicio,
        horario_fim: fim,
        turma: turma,
        professor: professor,
        disciplina: disciplina || null,
        ambiente: ambiente || null,
        ativo: valor.ativo
    };
}

function normalizarDia(valor) {
    const dia = (valor || "")
        .toString()
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/-feira$/, "");
    const permitidos = ["segunda", "terca", "quarta", "quinta", "sexta"];

    if (!permitidos.includes(dia)) {
        throw erroRequisicao("Selecione um dia da semana válido.");
    }

    return dia;
}

function normalizarHora(valor) {
    const hora = (valor || "").toString().trim().substring(0, 5);

    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(hora)) {
        throw erroRequisicao("Preencha horários válidos no formato HH:mm.");
    }

    return hora;
}

function limparTexto(valor, nome, limite) {
    const texto = (valor || "").toString().trim();

    if (!texto || texto.length > limite) {
        throw erroRequisicao(nome + " é obrigatório e precisa ter até " + limite + " caracteres.");
    }

    return texto;
}

function validarId(valor) {
    const id = (valor || "").toString().trim();

    if (!id || id.length > 150 || id.includes("/")) {
        throw erroRequisicao("Identificador de horário inválido.");
    }

    return id;
}

function criarIdCatalogo(nome) {
    const id = nome
        .toString()
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

    if (!id) {
        throw erroRequisicao("Não foi possível gerar um identificador para o cadastro.");
    }

    return id;
}

function obterBancoFirebase() {
    const credenciais = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

    if (credenciais.project_id !== FIREBASE_PROJECT_ID) {
        throw new Error("A conta de serviço configurada não pertence ao projeto Firebase dos horários.");
    }

    credenciais.private_key = credenciais.private_key.replace(/\\n/g, "\n");

    const app = getApps().find(function (instancia) {
        return instancia.name === "horarios-professores";
    }) || initializeApp({
        credential: cert(credenciais),
        projectId: FIREBASE_PROJECT_ID
    }, "horarios-professores");

    return getFirestore(app);
}

function erroRequisicao(mensagem) {
    const erro = new Error(mensagem);
    erro.statusCode = 400;
    return erro;
}

function criarSupabaseAdmin() {
    return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
        auth: {
            persistSession: false,
            autoRefreshToken: false
        }
    });
}

async function verificarPermissao(event) {
    const authorization = event.headers.authorization || event.headers.Authorization || "";

    if (!authorization.startsWith("Bearer ")) {
        return { sucesso: false, status: 401, mensagem: "Sessão administrativa não enviada." };
    }

    const token = authorization.slice("Bearer ".length).trim();
    const supabasePublico = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
            persistSession: false,
            autoRefreshToken: false
        }
    });
    const { data: usuarioData, error: erroUsuario } = await supabasePublico.auth.getUser(token);

    if (erroUsuario || !usuarioData.user || !usuarioData.user.email) {
        return { sucesso: false, status: 401, mensagem: "Sessão inválida ou expirada." };
    }

    const supabaseAdmin = criarSupabaseAdmin();
    const email = usuarioData.user.email.toLowerCase();
    const { data: administrador, error: erroAdmin } = await supabaseAdmin
        .from("admins")
        .select("email")
        .ilike("email", email)
        .maybeSingle();

    if (erroAdmin) {
        throw new Error("Erro ao verificar perfil administrativo: " + erroAdmin.message);
    }

    if (administrador) {
        return { sucesso: true };
    }

    const { data: coordenacao, error: erroCoordenacao } = await supabaseAdmin
        .from("perfis_acesso")
        .select("email")
        .ilike("email", email)
        .eq("perfil", "coordenacao")
        .eq("ativo", true)
        .maybeSingle();

    if (erroCoordenacao) {
        throw new Error("Erro ao verificar permissão de coordenação: " + erroCoordenacao.message);
    }

    if (!coordenacao) {
        return { sucesso: false, status: 403, mensagem: "Este usuário não tem permissão para gerenciar horários." };
    }

    return { sucesso: true };
}

function responder(statusCode, dados) {
    return {
        statusCode: statusCode,
        headers: {
            "Content-Type": "application/json; charset=utf-8"
        },
        body: JSON.stringify(dados)
    };
}
