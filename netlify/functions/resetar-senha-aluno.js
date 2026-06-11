const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.SUPABASE_URL || "https://pwomyoprbvoimqmikvev.supabase.co";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "sb_publishable_elGQyDU7ngaUHCLWIHLhDQ_IxiLo6kD";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseAdmin = createClient(
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
    {
        auth: {
            persistSession: false,
            autoRefreshToken: false
        }
    }
);

const supabasePublico = createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    {
        auth: {
            persistSession: false,
            autoRefreshToken: false
        }
    }
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
        const autorizado = await verificarAdminAutorizado(event);

        if (!autorizado.sucesso) {
            return responder(401, {
                sucesso: false,
                mensagem: autorizado.mensagem
            });
        }

        const corpo = JSON.parse(event.body || "{}");

        const alunoId = limparTexto(corpo.alunoId);
        const novaSenhaTemporaria = limparTexto(corpo.novaSenhaTemporaria);

        if (!alunoId || !novaSenhaTemporaria) {
            return responder(400, {
                sucesso: false,
                mensagem: "ID do aluno e nova senha temporária são obrigatórios."
            });
        }

        if (novaSenhaTemporaria.length < 6) {
            return responder(400, {
                sucesso: false,
                mensagem: "A nova senha temporária precisa ter pelo menos 6 caracteres."
            });
        }

        const { data: perfilAluno, error: erroPerfilAluno } = await supabaseAdmin
            .from("perfis")
            .select("id, email, funcao")
            .eq("id", alunoId)
            .maybeSingle();

        if (erroPerfilAluno) {
            return responder(500, {
                sucesso: false,
                mensagem: "Erro ao buscar aluno: " + erroPerfilAluno.message
            });
        }

        if (!perfilAluno) {
            return responder(404, {
                sucesso: false,
                mensagem: "Aluno não encontrado na tabela de perfis."
            });
        }

        if (perfilAluno.funcao !== "aluno") {
            return responder(400, {
                sucesso: false,
                mensagem: "Este usuário não é um aluno."
            });
        }

        const { error: erroSenha } = await supabaseAdmin.auth.admin.updateUserById(
            alunoId,
            {
                password: novaSenhaTemporaria
            }
        );

        if (erroSenha) {
            return responder(400, {
                sucesso: false,
                mensagem: "Erro ao resetar senha: " + erroSenha.message
            });
        }

        const { error: erroAtualizarPerfil } = await supabaseAdmin
            .from("perfis")
            .update({
                senha_temporaria: true,
                atualizado_em: new Date().toISOString()
            })
            .eq("id", alunoId);

        if (erroAtualizarPerfil) {
            return responder(500, {
                sucesso: false,
                mensagem: "Senha resetada, mas houve erro ao atualizar perfil: " + erroAtualizarPerfil.message
            });
        }

        return responder(200, {
            sucesso: true,
            mensagem: "Senha temporária resetada com sucesso."
        });

    } catch (erro) {
        return responder(500, {
            sucesso: false,
            mensagem: "Erro interno ao resetar senha: " + erro.message
        });
    }
};

async function verificarAdminAutorizado(event) {
    const authorization = event.headers.authorization || event.headers.Authorization || "";

    if (!authorization.startsWith("Bearer ")) {
        return {
            sucesso: false,
            mensagem: "Token administrativo não enviado."
        };
    }

    const token = authorization.replace("Bearer ", "").trim();

    if (!token) {
        return {
            sucesso: false,
            mensagem: "Token administrativo vazio."
        };
    }

    const { data: userData, error: erroUsuario } = await supabasePublico.auth.getUser(token);

    if (erroUsuario || !userData || !userData.user) {
        return {
            sucesso: false,
            mensagem: "Sessão administrativa inválida ou expirada."
        };
    }

    const emailAdmin = userData.user.email;

    const { data: admin, error: erroAdmin } = await supabaseAdmin
        .from("admins")
        .select("email")
        .eq("email", emailAdmin)
        .maybeSingle();

    if (erroAdmin) {
        return {
            sucesso: false,
            mensagem: "Erro ao verificar permissão administrativa: " + erroAdmin.message
        };
    }

    if (!admin) {
        return {
            sucesso: false,
            mensagem: "Usuário logado não tem permissão de administrador."
        };
    }

    return {
        sucesso: true,
        email: emailAdmin
    };
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

function limparTexto(valor) {
    if (valor === null || valor === undefined) {
        return "";
    }

    return valor.toString().trim();
}