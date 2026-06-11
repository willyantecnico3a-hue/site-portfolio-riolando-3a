/* =====================================================
   LOGIN DO ALUNO
   Riolando Conecta Técnico
   Supabase Auth + tabela perfis
===================================================== */


/* =====================================================
   1. CONEXÃO COM SUPABASE
===================================================== */

const SUPABASE_URL = "https://pwomyoprbvoimqmikvev.supabase.co";
const SUPABASE_KEY = "sb_publishable_elGQyDU7ngaUHCLWIHLhDQ_IxiLo6kD";

const banco = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);


/* =====================================================
   2. ELEMENTOS DA TELA
===================================================== */

const formLoginAluno = document.getElementById("formLoginAluno");
const emailAluno = document.getElementById("emailAluno");
const senhaAluno = document.getElementById("senhaAluno");
const btnEntrarAluno = document.getElementById("btnEntrarAluno");
const mensagemLoginAluno = document.getElementById("mensagemLoginAluno");
const btnMostrarSenhaAluno = document.getElementById("btnMostrarSenhaAluno");
const btnEsqueciSenhaAluno = document.getElementById("btnEsqueciSenhaAluno");


/* =====================================================
   3. INICIAR
===================================================== */

document.addEventListener("DOMContentLoaded", iniciarLoginAluno);

async function iniciarLoginAluno() {
    await verificarSeAlunoJaEstaLogado();

    configurarEventosLogin();

    console.log("Tela de login do aluno carregada.");
}


/* =====================================================
   4. VERIFICAR SE JÁ EXISTE LOGIN ATIVO
===================================================== */

async function verificarSeAlunoJaEstaLogado() {
    const { data, error } = await banco.auth.getUser();

    if (error || !data || !data.user) {
        return;
    }

    const usuario = data.user;

    const perfil = await buscarPerfilAluno(usuario.id);

    if (!perfil) {
        await banco.auth.signOut();
        return;
    }

    redirecionarAlunoConformePerfil(perfil);
}


/* =====================================================
   5. CONFIGURAR EVENTOS
===================================================== */

function configurarEventosLogin() {
    if (formLoginAluno) {
        formLoginAluno.addEventListener("submit", fazerLoginAluno);
    }

    if (btnMostrarSenhaAluno) {
        btnMostrarSenhaAluno.addEventListener("click", alternarVisibilidadeSenha);
    }

    if (btnEsqueciSenhaAluno) {
        btnEsqueciSenhaAluno.addEventListener("click", enviarEmailRecuperacaoSenha);
    }
}


/* =====================================================
   6. FAZER LOGIN
===================================================== */

async function fazerLoginAluno(event) {
    event.preventDefault();

    const email = emailAluno.value.trim().toLowerCase();
    const senha = senhaAluno.value.trim();

    limparMensagem();

    if (!email) {
        mostrarMensagem("Digite seu e-mail institucional.", "erro");
        return;
    }

    if (!senha) {
        mostrarMensagem("Digite sua senha.", "erro");
        return;
    }

    bloquearBotaoEntrar(true);

    mostrarMensagem("Verificando seus dados, aguarde...", "info");

    const { data, error } = await banco.auth.signInWithPassword({
        email: email,
        password: senha
    });

    if (error) {
        console.log("Erro no login:", error);

        bloquearBotaoEntrar(false);

        mostrarMensagem(
            "Não foi possível entrar. Verifique seu e-mail e senha.",
            "erro"
        );

        return;
    }

    if (!data || !data.user) {
        bloquearBotaoEntrar(false);

        mostrarMensagem(
            "Login não concluído. Tente novamente.",
            "erro"
        );

        return;
    }

    const usuario = data.user;

    const perfil = await buscarPerfilAluno(usuario.id);

    if (!perfil) {
        bloquearBotaoEntrar(false);

        await banco.auth.signOut();

        mostrarMensagem(
            "Seu usuário existe, mas ainda não possui perfil cadastrado. Procure o professor responsável.",
            "erro"
        );

        return;
    }

    if (!perfil.ativo) {
        bloquearBotaoEntrar(false);

        await banco.auth.signOut();

        mostrarMensagem(
            "Seu acesso está desativado. Procure o professor responsável.",
            "erro"
        );

        return;
    }

    if (perfil.funcao !== "aluno" && !perfil.funcao.startsWith("aluno")) {
        bloquearBotaoEntrar(false);

        mostrarMensagem(
            "Este acesso é exclusivo para alunos. Use o painel correto do sistema.",
            "erro"
        );

        return;
    }

    mostrarMensagem("Login realizado com sucesso. Redirecionando...", "sucesso");

    redirecionarAlunoConformePerfil(perfil);
}


/* =====================================================
   7. BUSCAR PERFIL DO ALUNO
===================================================== */

async function buscarPerfilAluno(idUsuario) {
    const { data, error } = await banco
        .from("perfis")
        .select("*")
        .eq("id", idUsuario)
        .maybeSingle();

    if (error) {
        console.log("Erro ao buscar perfil do aluno:", error);
        return null;
    }

    return data;
}


/* =====================================================
   8. REDIRECIONAR CONFORME PERFIL
===================================================== */

function redirecionarAlunoConformePerfil(perfil) {
    if (perfil.senha_temporaria === true) {
        window.location.href = "primeiro-acesso.html";
        return;
    }

    window.location.href = "aluno.html";
}


/* =====================================================
   9. MOSTRAR / OCULTAR SENHA
===================================================== */

function alternarVisibilidadeSenha() {
    if (!senhaAluno) {
        return;
    }

    if (senhaAluno.type === "password") {
        senhaAluno.type = "text";
        btnMostrarSenhaAluno.textContent = "🙈";
        return;
    }

    senhaAluno.type = "password";
    btnMostrarSenhaAluno.textContent = "👁️";
}


/* =====================================================
   10. ESQUECI MINHA SENHA
===================================================== */

async function enviarEmailRecuperacaoSenha() {
    const email = emailAluno.value.trim().toLowerCase();

    limparMensagem();

    if (!email) {
        mostrarMensagem(
            "Digite seu e-mail no campo acima para receber a recuperação de senha.",
            "erro"
        );

        return;
    }

    mostrarMensagem("Enviando solicitação de recuperação de senha...", "info");

    const urlRedirecionamento = window.location.origin + "/primeiro-acesso.html";

    const { error } = await banco.auth.resetPasswordForEmail(email, {
        redirectTo: urlRedirecionamento
    });

    if (error) {
        console.log("Erro ao enviar recuperação:", error);

        mostrarMensagem(
            "Não foi possível enviar a recuperação de senha. Procure o professor responsável.",
            "erro"
        );

        return;
    }

    mostrarMensagem(
        "Se este e-mail estiver cadastrado, você receberá um link de recuperação de senha.",
        "sucesso"
    );
}


/* =====================================================
   11. MENSAGENS E BOTÕES
===================================================== */

function mostrarMensagem(texto, tipo) {
    if (!mensagemLoginAluno) {
        return;
    }

    mensagemLoginAluno.textContent = texto;

    mensagemLoginAluno.className = "mensagem-login-aluno";

    if (tipo) {
        mensagemLoginAluno.classList.add(tipo);
    }
}

function limparMensagem() {
    if (!mensagemLoginAluno) {
        return;
    }

    mensagemLoginAluno.textContent = "";
    mensagemLoginAluno.className = "mensagem-login-aluno";
}

function bloquearBotaoEntrar(bloquear) {
    if (!btnEntrarAluno) {
        return;
    }

    btnEntrarAluno.disabled = bloquear;

    btnEntrarAluno.textContent = bloquear
        ? "Entrando..."
        : "Entrar na Área do Aluno";
}