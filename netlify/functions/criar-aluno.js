const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.SUPABASE_URL || "https://pwomyoprbvoimqmikvev.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = createClient(
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY
);

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
            mensagem: "SUPABASE_SERVICE_ROLE_KEY não configurada no Netlify."
        });
    }

    try {
        const corpo = JSON.parse(event.body || "{}");

        const nome = limparTexto(corpo.nome);
        const email = limparTexto(corpo.email).toLowerCase();
        const turma = limparTexto(corpo.turma);
        const curso = limparTexto(corpo.curso) || "desenvolvimento_sistemas";
        const senhaTemporaria = limparTexto(corpo.senhaTemporaria);

        if (!nome || !email || !senhaTemporaria) {
            return responder(400, {
                sucesso: false,
                mensagem: "Nome, e-mail e senha temporária são obrigatórios."
            });
        }

        if (!email.includes("@")) {
            return responder(400, {
                sucesso: false,
                mensagem: "E-mail inválido."
            });
        }

        if (senhaTemporaria.length < 6) {
            return responder(400, {
                sucesso: false,
                mensagem: "A senha temporária precisa ter pelo menos 6 caracteres."
            });
        }

        const { data: usuarioCriado, error: erroCriarUsuario } = await supabaseAdmin.auth.admin.createUser({
            email: email,
            password: senhaTemporaria,
            email_confirm: true,
            user_metadata: {
                nome: nome,
                turma: turma,
                curso: curso,
                funcao: "aluno"
            }
        });

        if (erroCriarUsuario) {
            return responder(400, {
                sucesso: false,
                mensagem: "Erro ao criar usuário: " + erroCriarUsuario.message
            });
        }

        const usuario = usuarioCriado.user;

        if (!usuario || !usuario.id) {
            return responder(500, {
                sucesso: false,
                mensagem: "Usuário criado, mas não foi possível localizar o ID."
            });
        }

        const { error: erroPerfil } = await supabaseAdmin
            .from("perfis")
            .upsert(
                [
                    {
                        id: usuario.id,
                        nome: nome,
                        email: email,
                        funcao: "aluno",
                        turma: turma,
                        curso: curso,
                        senha_temporaria: true,
                        ativo: true,
                        atualizado_em: new Date().toISOString()
                    }
                ],
                {
                    onConflict: "id"
                }
            );

        if (erroPerfil) {
            return responder(500, {
                sucesso: false,
                mensagem: "Usuário criado, mas houve erro ao criar perfil: " + erroPerfil.message
            });
        }

        return responder(200, {
            sucesso: true,
            mensagem: "Aluno criado com sucesso.",
            aluno: {
                id: usuario.id,
                nome: nome,
                email: email,
                turma: turma,
                curso: curso,
                senha_temporaria: true,
                ativo: true
            }
        });

    } catch (erro) {
        return responder(500, {
            sucesso: false,
            mensagem: "Erro interno ao criar aluno: " + erro.message
        });
    }
};

function responder(statusCode, dados) {
    return {
        statusCode: statusCode,
        headers: {
            "Content-Type": "application/json; charset=utf-8"
        },
        body: JSON.stringify(dados)
    };
}

function limparTexto(valor) {
    if (valor === null || valor === undefined) {
        return "";
    }

    return valor.toString().trim();
}