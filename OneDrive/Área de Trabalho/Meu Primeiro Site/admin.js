// =============================
// CONEXÃO COM O SUPABASE
// =============================

const SUPABASE_URL = "https://pwomyoprbvoimqmikvev.supabase.co";

const SUPABASE_KEY = "sb_publishable_elGQyDU7ngaUHCLWIHLhDQ_IxiLo6kD";

const banco = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

console.log("Painel admin conectado ao Supabase");


// =============================
// LOGIN SIMPLES DO ADMIN
// =============================

// IMPORTANTE:
// Essa primeira versão usa uma senha simples no próprio JavaScript.
// Depois podemos evoluir para Supabase Auth.
// Para teste inicial, é suficiente.

const EMAIL_ADMIN = "willyancruz@prof.educacao.sp.gov.br";



const btnLoginAdmin = document.getElementById("btnLoginAdmin");

btnLoginAdmin.addEventListener("click", function() {

    const email = document.getElementById("emailAdmin").value;

    const senha = document.getElementById("senhaAdmin").value;

    const mensagem = document.getElementById("mensagemLogin");

    if (email === EMAIL_ADMIN && senha === SENHA_ADMIN) {

        mensagem.textContent = "Login realizado com sucesso!";

        document.getElementById("areaAdmin").style.display = "block";

    } else {

        mensagem.textContent = "E-mail ou senha incorretos.";

    }

});


// =============================
// CARREGAR PORTFÓLIOS NO ADMIN
// =============================

const btnCarregarAdmin = document.getElementById("btnCarregarAdmin");

btnCarregarAdmin.addEventListener("click", carregarPortfoliosAdmin);

async function carregarPortfoliosAdmin() {

    const lista = document.getElementById("listaAdminPortfolios");

    lista.innerHTML = "<p>Carregando portfólios...</p>";

    const { data, error } = await banco
        .from("portfolio_alunos")
        .select("id, nome_aluno, telefone, email, link_site, link_video, autorizado, aprovado, criado_em")
        .order("criado_em", { ascending: false });

    if (error) {

        lista.innerHTML = `<p>Erro ao carregar: ${error.message}</p>`;

        return;

    }

    if (data.length === 0) {

        lista.innerHTML = "<p>Nenhum portfólio enviado ainda.</p>";

        return;

    }

    lista.innerHTML = "";

    data.forEach(function(aluno) {

        lista.innerHTML += `
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

    } else {

        alert("Portfólio aprovado!");

        carregarPortfoliosAdmin();

    }

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

    } else {

        alert("Portfólio ocultado!");

        carregarPortfoliosAdmin();

    }

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

    } else {

        alert("Portfólio excluído!");

        carregarPortfoliosAdmin();

    }

}

const btnSairAdmin = document.getElementById("btnSairAdmin");

btnSairAdmin.addEventListener("click", async function() {

    await banco.auth.signOut();

    document.getElementById("areaAdmin").style.display = "none";

    document.getElementById("mensagemLogin").textContent =
        "Você saiu do painel administrativo.";

});