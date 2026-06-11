/* =====================================================
   PRIMEIRO ACESSO DO ALUNO
   Riolando Conecta Técnico
   Troca obrigatória de senha temporária
===================================================== */


/* =====================================================
   1. CONEXÃO COM SUPABASE
===================================================== */

const SUPABASE_URL = "https://pwomyoprbvoimqmikvev.supabase.co";
const SUPABASE_KEY = "sb_publishable_elGQyDU7ngaUHCLWIHLhDQ_IxiLo6kD";

const banco = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);


/* =====================================================
   2. VARIÁVEIS GLOBAIS
===================================================== */

let usuarioLogado = null;
let perfilAluno = null;


/* =====================================================
   3. ELEMENTOS DA TELA
===================================================== */

const formPrimeiroAcesso = document.getElementById("formPrimeiroAcesso");

const senhaAtualAluno = document.getElementById("senhaAtualAluno");
const novaSenhaAluno = document.getElementById("novaSenhaAluno");
const confirmarNovaSenhaAluno = document.getElementById("confirmarNovaSenhaAluno");

const btnSalvarNovaSenha = document.getElementById("btnSalvarNovaSenha");
const btnSairPrimeiroAcesso = document.getElementById("btnSairPrimeiroAcesso");

const btnMostrarSenhaAtual = document.getElementById("btnMostrarSenhaAtual");
const btnMostrarNovaSenha = document.getElementById("btnMostrarNovaSenha");
const btnMostrarConfirmarSenha = document.getElementById("btnMostrarConfirmarSenha");

const mensagemPrimeiroAcesso = document.getElementById("mensagemPrimeiroAcesso");
const dadosAlunoPrimeiroAcesso = document.getElementById("dadosAlunoPrimeiroAcesso");


/* =====================================================
   4. INICIAR
===================================================== */

document.addEventListener("DOMContentLoaded", iniciarPrimeiroAcesso);

async function iniciarPrimeiroAcesso() {
    await verificarLoginPrimeiroAcesso();

    configurarEventosPrimeiroAcesso();

    renderizarDadosAluno();

    console.log("Tela de primeiro acesso carregada.");
}


/* =====================================================
   5. VERIFICAR LOGIN
===================================================== */

async function verificarLoginPrimeiroAcesso() {
    const { data, error } = await banco.auth.getUser();

    if (error || !data || !data.user) {
        window.location.href = "login-aluno.html";
        return;
    }

    usuarioLogado = data.user;

    const { data: perfil, error: erroPerfil } = await banco
        .from("perfis")
        .select("*")
        .eq("id", usuarioLogado.id)
        .maybeSingle();

    if (erroPerfil) {
        console.log("Erro ao buscar perfil:", erroPerfil);

        mostrarMensagem(
            "Erro ao buscar seus dados. Faça login novamente.",
            "erro"
        );

        setTimeout(async function () {
            await banco.auth.signOut();
            window.location.href = "login-aluno.html";
        }, 1800);

        return;
    }

    if (!perfil) {
        mostrarMensagem(
            "Seu usuário ainda não possui perfil cadastrado. Procure o professor responsável.",
            "erro"
        );

        setTimeout(async function () {
            await banco.auth.signOut();
            window.location.href = "login-aluno.html";
        }, 2200);

        return;
    }

    if (!perfil.ativo) {
        mostrarMensagem(
            "Seu acesso está desativado. Procure o professor responsável.",
            "erro"
        );

        setTimeout(async function () {
            await banco.auth.signOut();
            window.location.href = "login-aluno.html";
        }, 2200);

        return;
    }

    if (perfil.funcao !== "aluno" && !perfil.funcao.startsWith("aluno")) {
        mostrarMensagem(
            "Esta área é exclusiva para alunos.",
            "erro"
        );

        setTimeout(function () {
            window.location.href = "index.html";
        }, 1800);

        return;
    }

    perfilAluno = perfil;

    if (perfilAluno.senha_temporaria === false) {
        window.location.href = "aluno.html";
    }
}


/* =====================================================
   6. CONFIGURAR EVENTOS
===================================================== */

function configurarEventosPrimeiroAcesso() {
    if (formPrimeiroAcesso) {
        formPrimeiroAcesso.addEventListener("submit", salvarNovaSenhaAluno);
    }

    if (btnSairPrimeiroAcesso) {
        btnSairPrimeiroAcesso.addEventListener("click", sairPrimeiroAcesso);
    }

    if (btnMostrarSenhaAtual) {
        btnMostrarSenhaAtual.addEventListener("click", function () {
            alternarSenha(senhaAtualAluno, btnMostrarSenhaAtual);
        });
    }

    if (btnMostrarNovaSenha) {
        btnMostrarNovaSenha.addEventListener("click", function () {
            alternarSenha(novaSenhaAluno, btnMostrarNovaSenha);
        });
    }

    if (btnMostrarConfirmarSenha) {
        btnMostrarConfirmarSenha.addEventListener("click", function () {
            alternarSenha(confirmarNovaSenhaAluno, btnMostrarConfirmarSenha);
        });
    }
}


/* =====================================================
   7. RENDERIZAR DADOS DO ALUNO
===================================================== */

function renderizarDadosAluno() {
    if (!perfilAluno || !dadosAlunoPrimeiroAcesso) {
        return;
    }

    const nome = perfilAluno.nome || "Aluno";
    const email = perfilAluno.email || usuarioLogado.email || "E-mail não informado";
    const turma = perfilAluno.turma || "Turma não informada";
    const curso = formatarCursoBonito(perfilAluno.curso || "desenvolvimento_sistemas");

    dadosAlunoPrimeiroAcesso.innerHTML = `
        <strong>${escaparHTML(nome)}</strong><br>
        ${escaparHTML(email)}<br>
        ${escaparHTML(turma)} • ${escaparHTML(curso)}
    `;
}


/* =====================================================
   8. SALVAR NOVA SENHA
===================================================== */

async function salvarNovaSenhaAluno(event) {
    event.preventDefault();

    limparMensagem();

    const { data: sessaoAtual, error: erroSessao } = await banco.auth.getSession();

    if (erroSessao || !sessaoAtual || !sessaoAtual.session) {
        console.log("Sessão ausente ao tentar trocar senha:", erroSessao);

        mostrarMensagem(
            "Sua sessão expirou. Faça login novamente com a senha temporária.",
            "erro"
        );

        setTimeout(function () {
            window.location.href = "login-aluno.html";
        }, 2000);

        return;
    }

    if (!usuarioLogado || !perfilAluno) {
        mostrarMensagem("Faça login novamente para alterar sua senha.", "erro");
        return;
    }

    const senhaAtual = senhaAtualAluno.value.trim();
    const novaSenha = novaSenhaAluno.value.trim();
    const confirmarSenha = confirmarNovaSenhaAluno.value.trim();

    if (!senhaAtual) {
        mostrarMensagem("Digite a senha temporária atual usada no login.", "erro");
        return;
    }

    if (!novaSenha || !confirmarSenha) {
        mostrarMensagem("Preencha a nova senha e a confirmação.", "erro");
        return;
    }

    if (novaSenha.length < 6) {
        mostrarMensagem("A nova senha precisa ter pelo menos 6 caracteres.", "erro");
        return;
    }

    if (novaSenha !== confirmarSenha) {
        mostrarMensagem("As senhas digitadas não são iguais.", "erro");
        return;
    }

    if (senhaAtual === novaSenha) {
        mostrarMensagem("A nova senha precisa ser diferente da senha temporária.", "erro");
        return;
    }

    if (senhaMuitoFraca(novaSenha)) {
        mostrarMensagem(
            "Essa senha é muito simples. Escolha uma senha mais segura.",
            "erro"
        );
        return;
    }

    bloquearBotaoSalvar(true);

    mostrarMensagem("Atualizando sua senha, aguarde...", "info");

    const { data: dadosAtualizacao, error: erroSenha } = await banco.auth.updateUser({
        current_password: senhaAtual,
        password: novaSenha
    });

    if (erroSenha) {
        console.log("Erro real ao atualizar senha:", erroSenha);
        console.log("Dados retornados:", dadosAtualizacao);

        bloquearBotaoSalvar(false);

        if (
            erroSenha.message.includes("Current password") ||
            erroSenha.message.includes("current password") ||
            erroSenha.message.includes("invalid")
        ) {
            mostrarMensagem(
                "A senha atual temporária está incorreta. Digite a mesma senha usada no login.",
                "erro"
            );
            return;
        }

        mostrarMensagem(
            "Erro ao atualizar senha: " + erroSenha.message,
            "erro"
        );

        return;
    }

    const { error: erroPerfil } = await banco
        .from("perfis")
        .update({
            senha_temporaria: false
        })
        .eq("id", usuarioLogado.id);

    if (erroPerfil) {
        console.log("Erro ao atualizar perfil:", erroPerfil);

        bloquearBotaoSalvar(false);

        mostrarMensagem(
            "Sua senha foi alterada, mas houve erro ao liberar o acesso: " + erroPerfil.message,
            "erro"
        );

        return;
    }

    mostrarMensagem(
        "Senha alterada com sucesso! Redirecionando para sua área...",
        "sucesso"
    );

    setTimeout(function () {
        window.location.href = "aluno.html";
    }, 1500);
}


/* =====================================================
   9. SAIR
===================================================== */

async function sairPrimeiroAcesso() {
    await banco.auth.signOut();

    window.location.href = "login-aluno.html";
}


/* =====================================================
   10. MOSTRAR / OCULTAR SENHA
===================================================== */

function alternarSenha(campo, botao) {
    if (!campo || !botao) {
        return;
    }

    if (campo.type === "password") {
        campo.type = "text";
        botao.textContent = "🙈";
        return;
    }

    campo.type = "password";
    botao.textContent = "👁️";
}


/* =====================================================
   11. VALIDAÇÃO SIMPLES DE SENHA FRACA
===================================================== */

function senhaMuitoFraca(senha) {
    const senhasFracas = [
        "123456",
        "1234567",
        "12345678",
        "abcdef",
        "qwerty",
        "senha",
        "senhatemporaria",
        "riolandocanno",
        "riolandoconecta"
    ];

    return senhasFracas.includes(senha.toLowerCase());
}


/* =====================================================
   12. MENSAGENS E BOTÕES
===================================================== */

function mostrarMensagem(texto, tipo) {
    if (!mensagemPrimeiroAcesso) {
        return;
    }

    mensagemPrimeiroAcesso.textContent = texto;
    mensagemPrimeiroAcesso.className = "mensagem-login-aluno";

    if (tipo) {
        mensagemPrimeiroAcesso.classList.add(tipo);
    }
}

function limparMensagem() {
    if (!mensagemPrimeiroAcesso) {
        return;
    }

    mensagemPrimeiroAcesso.textContent = "";
    mensagemPrimeiroAcesso.className = "mensagem-login-aluno";
}

function bloquearBotaoSalvar(bloquear) {
    if (!btnSalvarNovaSenha) {
        return;
    }

    btnSalvarNovaSenha.disabled = bloquear;

    btnSalvarNovaSenha.textContent = bloquear
        ? "Salvando..."
        : "Salvar nova senha";
}


/* =====================================================
   13. AUXILIARES
===================================================== */

function formatarCursoBonito(curso) {
    const nomes = {
        todos: "Todos",
        desenvolvimento_sistemas: "Desenvolvimento de Sistemas",
        vendas: "Vendas",
        substituicoes: "Substituições",
        apoio_pedagogico: "Apoio Pedagógico",
        outro: "Outro"
    };

    return nomes[curso] || curso || "Não informado";
}

function escaparHTML(texto) {
    if (!texto) {
        return "";
    }

    return texto
        .toString()
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}