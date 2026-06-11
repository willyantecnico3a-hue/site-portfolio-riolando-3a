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

        const { data: perfilExistente, error: erroBuscaPerfil } = await supabaseAdmin
            .from("perfis")
            .select("id, email")
            .eq("email", email)
            .maybeSingle();

        if (erroBuscaPerfil) {
            return responder(500, {
                sucesso: false,
                mensagem: "Erro ao verificar perfil existente: " + erroBuscaPerfil.message
            });
        }

        if (perfilExistente) {
            return responder(409, {
                sucesso: false,
                mensagem: "Já existe um aluno cadastrado com este e-mail."
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