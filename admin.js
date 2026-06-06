// =============================
// CONEXÃO COM O SUPABASE
// =============================

const SUPABASE_URL = "https://pwomyoprbvoimqmikvev.supabase.co";

// Use aqui somente a chave ANON PUBLIC ou PUBLISHABLE.
// Nunca use sb_secret ou service_role no navegador.
const SUPABASE_KEY = "sb_publishable_elGQyDU7ngaUHCLWIHLhDQ_IxiLo6kD";

const banco = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

console.log("Painel admin conectado ao Supabase");


// =============================
// ELEMENTOS DA TELA
// =============================

const btnLoginAdmin = document.getElementById("btnLoginAdmin");
const btnSairAdmin = document.getElementById("btnSairAdmin");
const btnCarregarAdmin = document.getElementById("btnCarregarAdmin");

const areaAdmin = document.getElementById("areaAdmin");
const mensagemLogin = document.getElementById("mensagemLogin");
const listaAdminPortfolios = document.getElementById("listaAdminPortfolios");


// =============================
// LOGIN REAL COM SUPABASE AUTH
// =============================

btnLoginAdmin.addEventListener("click", async function () {
    const email = document.getElementById("emailAdmin").value.trim();
    const senha = document.getElementById("senhaAdmin").value.trim();

    if (!email || !senha) {
        mensagemLogin.textContent = "Digite o e-mail e a senha.";
        return;
    }

    mensagemLogin.textContent = "Verificando login...";

    const { data, error } = await banco.auth.signInWithPassword({
        email: email,
        password: senha
    });

    if (error) {
        mensagemLogin.textContent = "Erro no login: e-mail ou senha incorretos.";
        console.log("Erro Auth:", error);
        return;
    }

    const usuario = data.user;

    if (!usuario) {
        mensagemLogin.textContent = "Não foi possível identificar o usuário.";
        return;
    }

    const adminAutorizado = await verificarSeUsuarioEAdmin(usuario.email);

    if (!adminAutorizado) {
        mensagemLogin.textContent = "Este usuário não tem permissão de administrador.";

        await banco.auth.signOut();

        return;
    }

    mensagemLogin.textContent = "Login administrativo realizado com sucesso!";

    areaAdmin.style.display = "block";

    carregarPortfoliosAdmin();
});


// =============================
// VERIFICAR SE O E-MAIL LOGADO É ADMIN
// =============================

async function verificarSeUsuarioEAdmin(emailUsuario) {
    const { data, error } = await banco
        .from("admins")
        .select("email")
        .eq("email", emailUsuario)
        .maybeSingle();

    if (error) {
        console.log("Erro ao verificar admin:", error);
        return false;
    }

    if (!data) {
        return false;
    }

    return true;
}


// =============================
// MANTER LOGIN SE JÁ HOUVER SESSÃO
// =============================

async function verificarSessaoAtual() {
    const { data, error } = await banco.auth.getUser();

    if (error || !data.user) {
        areaAdmin.style.display = "none";
        return;
    }

    const adminAutorizado = await verificarSeUsuarioEAdmin(data.user.email);

    if (adminAutorizado) {
        mensagemLogin.textContent = "Sessão administrativa ativa.";
        areaAdmin.style.display = "block";
        carregarPortfoliosAdmin();
    } else {
        await banco.auth.signOut();
        areaAdmin.style.display = "none";
    }
}

verificarSessaoAtual();


// =============================
// SAIR DO PAINEL ADMIN
// =============================

btnSairAdmin.addEventListener("click", async function () {
    await banco.auth.signOut();

    areaAdmin.style.display = "none";

    mensagemLogin.textContent = "Você saiu do painel administrativo.";

    listaAdminPortfolios.innerHTML = "";
});


// =============================
// CARREGAR PORTFÓLIOS ENVIADOS
// =============================
 
btnCarregarAdmin.addEventListener("click", carregarPortfoliosAdmin);

async function carregarPortfoliosAdmin() {
    listaAdminPortfolios.innerHTML = "<p>Carregando portfólios...</p>";

    const { data, error } = await banco
        .from("portfolio_alunos")
        .select("id, nome_aluno, telefone, email, link_site, link_video, autorizado, aprovado, criado_em")
        .order("criado_em", { ascending: false });

    if (error) {
        listaAdminPortfolios.innerHTML = `
            <p>Erro ao carregar: ${error.message}</p>
        `;

        console.log("Erro ao carregar portfólios:", error);

        return;
    }

    if (!data || data.length === 0) {
        listaAdminPortfolios.innerHTML = "<p>Nenhum portfólio enviado ainda.</p>";
        return;
    }

    listaAdminPortfolios.innerHTML = "";

    data.forEach(function (aluno) {
        listaAdminPortfolios.innerHTML += `
            <div class="card-publicado">
                <h3>${aluno.nome_aluno}</h3>

                <p><strong>Telefone:</strong> ${aluno.telefone || "Não informado"}</p>

                <p><strong>E-mail:</strong> ${aluno.email || "Não informado"}</p>

                <p>
                    <strong>Site:</strong>
                    <a href="${aluno.link_site}" target="_blank">
                        Acessar site
                    </a>
                </p>

                <p>
                    <strong>Vídeo:</strong>
                    <a href="${aluno.link_video}" target="_blank">
                        Assistir vídeo
                    </a>
                </p>

                <p><strong>Autorizado:</strong> ${aluno.autorizado ? "Sim" : "Não"}</p>

                <p><strong>Aprovado:</strong> ${aluno.aprovado ? "Sim" : "Não"}</p>

                <button onclick="aprovarPortfolio(${aluno.id})">
                    ✅ Aprovar
                </button>

                <button onclick="ocultarPortfolio(${aluno.id})">
                    🚫 Ocultar
                </button>

                <button onclick="excluirPortfolio(${aluno.id})">
                    🗑️ Excluir
                </button>
            </div>
        `;
    });
}


// =============================
// APROVAR PORTFÓLIO
// =============================

async function aprovarPortfolio(id) {
    const { error } = await banco
        .from("portfolio_alunos")
        .update({ aprovado: true })
        .eq("id", id);

    if (error) {
        alert("Erro ao aprovar: " + error.message);
        console.log("Erro ao aprovar:", error);
        return;
    }

    alert("Portfólio aprovado!");

    carregarPortfoliosAdmin();
}


// =============================
// OCULTAR PORTFÓLIO
// =============================

async function ocultarPortfolio(id) {
    const { error } = await banco
        .from("portfolio_alunos")
        .update({ aprovado: false })
        .eq("id", id);

    if (error) {
        alert("Erro ao ocultar: " + error.message);
        console.log("Erro ao ocultar:", error);
        return;
    }

    alert("Portfólio ocultado!");

    carregarPortfoliosAdmin();
}


// =============================
// EXCLUIR PORTFÓLIO
// =============================

async function excluirPortfolio(id) {
    const confirmar = confirm("Tem certeza que deseja excluir este portfólio?");

    if (!confirmar) {
        return;
    }

    const { error } = await banco
        .from("portfolio_alunos")
        .delete()
        .eq("id", id);

    if (error) {
        alert("Erro ao excluir: " + error.message);
        console.log("Erro ao excluir:", error);
        return;
    }

    alert("Portfólio excluído!");

    carregarPortfoliosAdmin();
}