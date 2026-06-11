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

        const { error: erroPerfil } = await supabaseAdmin
            .from("perfis")
            .update({
                senha_temporaria: true,
                atualizado_em: new Date().toISOString()
            })
            .eq("id", alunoId);

        if (erroPerfil) {
            return responder(500, {
                sucesso: false,
                mensagem: "Senha resetada, mas houve erro ao atualizar perfil: " + erroPerfil.message
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