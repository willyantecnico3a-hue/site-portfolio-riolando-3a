const SUPABASE_URL = "https://pwomyoprbvoimqmikvev.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB3b215b3ByYnZvaW1xbWlrdmV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2MDUyODAsImV4cCI6MjA5NjE4MTI4MH0.FGA69_VBr2xXfEO_ybTAnZMmAQm2XEqkVvqLc-spesA";

const banco = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

console.log("Supabase conectado!");




const botao = document.getElementById("meuBotao");

botao.addEventListener("click", function() {
    alert(`Cada aluno criará uma página simples de apresentação pessoal/profissional.

• Título com nome e turma.
• Parágrafo contando o que está aprendendo.
• Lista com 3 habilidades ou interesses.
• Botão que troca uma mensagem usando JavaScript.
• Visual com cores, card, espaçamento e botão estilizado.
• Publicação no Netlify com link compartilhável.

Tempo sugerido: 50 a 80 minutos, dependendo do ritmo da turma.`);
});

function mostrarHTML() {
    document.getElementById("resultado").innerHTML = `
        <h3>HTML</h3>
        <p>HTML é a linguagem responsável pela estrutura do site.</p>
        <p>Exemplo: se o site fosse uma casa, o HTML seria as paredes, portas, janelas e telhado.</p>
    `;
}

function mostrarCSS() {
    document.getElementById("resultado").innerHTML = `
        <h3>CSS</h3>
        <p>CSS é responsável pela aparência do site.</p>
        <p>Exemplo: se o site fosse uma casa, o CSS seria a pintura, decoração, cores e móveis.</p>
    `;
}

function mostrarJS() {
    document.getElementById("resultado").innerHTML = `
        <h3>JavaScript</h3>
        <p>JavaScript adiciona interação ao site.</p>
        <p>Exemplo: se o site fosse uma casa, o JavaScript seria a energia elétrica, controle remoto e portão automático.</p>
    `;
}

const btnPDF = document.getElementById("btnPDF");

btnPDF.addEventListener("click", function() {

    const pdf = document.getElementById("visualizadorPDF");

    pdf.src = "plano-aula-front-end.pdf";

    pdf.style.display = "block";

});

const btnTurma = document.getElementById("btnTurma");

btnTurma.addEventListener("click", function() {

    const foto =
        document.getElementById("fotoTurma");

    if (foto.style.display === "none") {

        foto.style.display = "block";

        btnTurma.textContent =
            "❌ Ocultar Foto da Turma";

    } else {

        foto.style.display = "none";

        btnTurma.textContent =
            "📸 Ver Foto da Turma";

    }

});

const btnCadastrarPortfolio = document.getElementById("btnCadastrarPortfolio");

btnCadastrarPortfolio.addEventListener("click", async function() {
    const nome = document.getElementById("nomeAluno").value;
    const telefone = document.getElementById("telefoneAluno").value;
    const email = document.getElementById("emailAluno").value;
    const site = document.getElementById("linkSiteAluno").value;
    const video = document.getElementById("linkVideoAluno").value;
    const autorizado = document.getElementById("autorizacaoAluno").checked;

    if (!nome || !email || !site || !autorizado) {
        alert("Preencha nome, e-mail, link do site e marque a autorização.");
        return;
    }

    const { error } = await banco
        .from("portfolio_alunos")
        .insert([{
            nome_aluno: nome,
            telefone: telefone,
            email: email,
            link_site: site,
            link_video: video,
            autorizado: autorizado
        }]);

    if (error) {
        alert("Erro ao salvar: " + error.message);
    } else {
        alert("Portfólio salvo com sucesso no Supabase!");
    

    document.getElementById("listaPortfolio").innerHTML += `
            <div class="card-portfolio">
                <h3>${nome}</h3>
                <p><strong>Telefone:</strong> ${telefone}</p>
                <p><strong>E-mail:</strong> ${email}</p>
                <p><strong>Site:</strong> <a href="${site}" target="_blank">Acessar site</a></p>
                <p><strong>Vídeo:</strong> <a href="${video}" target="_blank">Assistir vídeo</a></p>
            </div>
        `;

        document.getElementById("nomeAluno").value = "";
        document.getElementById("telefoneAluno").value = "";
        document.getElementById("emailAluno").value = "";
        document.getElementById("linkSiteAluno").value = "";
        document.getElementById("linkVideoAluno").value = "";
        document.getElementById("autorizacaoAluno").checked = false;
    }
});

const btnCarregarPortfolios = document.getElementById("btnCarregarPortfolios");

btnCarregarPortfolios.addEventListener("click", async function() {

    const areaPortfolios = document.getElementById("portfoliosPublicados");

    areaPortfolios.innerHTML = "<p>Carregando portfólios...</p>";

    const { data, error } = await banco
        .from("portfolio_alunos")
        .select("nome_aluno, telefone, email, link_site, link_video, criado_em")
        .eq("autorizado", true)
        .order("criado_em", { ascending: false });

    if (error) {
        areaPortfolios.innerHTML = `
            <p>Erro ao carregar portfólios: ${error.message}</p>
        `;
        return;
    }

    if (data.length === 0) {
        areaPortfolios.innerHTML = `
            <p>Nenhum portfólio publicado ainda.</p>
        `;
        return;
    }

    areaPortfolios.innerHTML = "";

    data.forEach(function(aluno) {

        areaPortfolios.innerHTML += `
            <div class="card-publicado">
                <h3>${aluno.nome_aluno}</h3>

                <p><strong>Telefone:</strong> ${aluno.telefone || "Não informado"}</p>

                <p><strong>E-mail:</strong> ${aluno.email || "Não informado"}</p>

                <p>
                    <strong>Site:</strong>
                    <a href="${aluno.link_site}" target="_blank">
                        Acessar projeto do aluno
                    </a>
                </p>

                <p>
                    <strong>Vídeo:</strong>
                    <a href="${aluno.link_video}" target="_blank">
                        Assistir apresentação
                    </a>
                </p>
            </div>
        `;

    });

});