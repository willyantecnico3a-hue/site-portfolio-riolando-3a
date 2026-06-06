// =============================
// CONEXÃO COM O SUPABASE
// =============================

const SUPABASE_URL = "https://pwomyoprbvoimqmikvev.supabase.co";

// Coloque aqui sua chave ANON PUBLIC do Supabase.
// Nunca use sb_secret ou service_role no site.
const SUPABASE_KEY = "sb_publishable_elGQyDU7ngaUHCLWIHLhDQ_IxiLo6kD";

let banco = null;

// Verifica se a biblioteca do Supabase carregou corretamente
if (window.supabase) {
    banco = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    console.log("Supabase conectado!");
} else {
    console.log("Supabase não carregou. Verifique o script CDN no index.html.");
}


// =============================
// BOTÃO: DESAFIO PRÁTICO
// =============================

const botao = document.getElementById("meuBotao");

if (botao) {
    botao.addEventListener("click", function () {
        alert(`Cada aluno criará uma página simples de apresentação pessoal/profissional.

• Título com nome e turma.
• Parágrafo contando o que está aprendendo.
• Lista com 3 habilidades ou interesses.
• Botão que troca uma mensagem usando JavaScript.
• Visual com cores, card, espaçamento e botão estilizado.
• Publicação no Netlify com link compartilhável.

Tempo sugerido: 50 a 80 minutos, dependendo do ritmo da turma.`);
    });
}


// =============================
// BOTÕES "O QUE É?"
// =============================

function mostrarHTML() {
    document.getElementById("resultado").innerHTML = `
        <h3>HTML</h3>

        <p>
            HTML é a linguagem responsável pela estrutura do site.
        </p>

        <p>
            Exemplo: se o site fosse uma casa, o HTML seria as paredes,
            portas, janelas e telhado.
        </p>
    `;
}

function mostrarCSS() {
    document.getElementById("resultado").innerHTML = `
        <h3>CSS</h3>

        <p>
            CSS é responsável pela aparência do site.
        </p>

        <p>
            Exemplo: se o site fosse uma casa, o CSS seria a pintura,
            decoração, cores, móveis e iluminação.
        </p>
    `;
}

function mostrarJS() {
    document.getElementById("resultado").innerHTML = `
        <h3>JavaScript</h3>

        <p>
            JavaScript adiciona interação ao site.
        </p>

        <p>
            Exemplo: se o site fosse uma casa, o JavaScript seria a energia elétrica,
            o controle remoto, o portão automático e a automação.
        </p>
    `;
}


// =============================
// BOTÃO: VER / OCULTAR FOTO DA TURMA
// =============================

const btnTurma = document.getElementById("btnTurma");

if (btnTurma) {
    btnTurma.addEventListener("click", function () {
        const foto = document.getElementById("fotoTurma");

        if (foto.style.display === "none" || foto.style.display === "") {
            foto.style.display = "block";
            btnTurma.textContent = "❌ Ocultar Foto da Turma";
        } else {
            foto.style.display = "none";
            btnTurma.textContent = "📸 Ver Foto da Turma";
        }
    });
}


// =============================
// BOTÃO: VISUALIZAR / FECHAR PLANO DE AULA
// =============================

const btnPDF = document.getElementById("btnPDF");

if (btnPDF) {
    btnPDF.addEventListener("click", function () {
        const pdf = document.getElementById("visualizadorPDF");
        const mensagemPDF = document.getElementById("mensagemPDF");

        const caminhoPDF = "plano-aula-front-end.pdf";

        // Se não tiver nome de arquivo, mostra mensagem
        if (caminhoPDF === "") {
            mensagemPDF.textContent = "Plano de Aula Vazio.";
            return;
        }

        // Se o PDF já estiver aberto, fecha
        if (pdf.style.display === "block") {
            pdf.style.display = "none";
            pdf.src = "";
            btnPDF.textContent = "📚 Visualizar Plano de Aula";
            mensagemPDF.textContent = "";
            return;
        }

        // Abre o PDF dentro do site
        pdf.src = caminhoPDF;
        pdf.style.display = "block";
        btnPDF.textContent = "❌ Fechar Plano de Aula";
        mensagemPDF.textContent = "";
    });
}


// =============================
// BLOQUEIO BÁSICO DE LINKS PROIBIDOS
// =============================

const palavrasProibidas = [
    "porn",
    "porno",
    "xxx",
    "sex",
    "sexo",
    "nude",
    "nudes",
    "bet",
    "cassino",
    "casino",
    "aposta",
    "drogas",
    "violencia",
    "violência"
];

function linkPareceSeguro(link) {
    if (!link) {
        return false;
    }

    const linkMinusculo = link.toLowerCase();

    if (!linkMinusculo.startsWith("https://")) {
        return false;
    }

    for (let palavra of palavrasProibidas) {
        if (linkMinusculo.includes(palavra)) {
            return false;
        }
    }

    return true;
}


// =============================
// BOTÃO: CADASTRAR PORTFÓLIO
// =============================

const btnCadastrarPortfolio = document.getElementById("btnCadastrarPortfolio");

if (btnCadastrarPortfolio) {
    btnCadastrarPortfolio.addEventListener("click", async function () {
        if (!banco) {
            alert("Supabase não está conectado. Verifique a chave e o script CDN.");
            return;
        }

        const nome = document.getElementById("nomeAluno").value.trim();
        const telefone = document.getElementById("telefoneAluno").value.trim();
        const email = document.getElementById("emailAluno").value.trim();
        const site = document.getElementById("linkSiteAluno").value.trim();
        const video = document.getElementById("linkVideoAluno").value.trim();
        const autorizado = document.getElementById("autorizacaoAluno").checked;

        if (!nome || !email || !site || !autorizado) {
            alert("Preencha nome, e-mail, link do site e marque a autorização.");
            return;
        }

        if (!linkPareceSeguro(site)) {
            alert("O link do site precisa começar com https:// e não pode conter conteúdo proibido.");
            return;
        }

        if (video && !linkPareceSeguro(video)) {
            alert("O link do vídeo precisa começar com https:// e não pode conter conteúdo proibido.");
            return;
        }

        const { error } = await banco
            .from("portfolio_alunos")
            .insert([
                {
                    nome_aluno: nome,
                    telefone: telefone,
                    email: email,
                    link_site: site,
                    link_video: video,
                    autorizado: true,
                    aprovado: false
                }
            ]);

        if (error) {
            alert("Erro ao salvar: " + error.message);
            console.log("Erro Supabase:", error);
            return;
        }

        alert("Portfólio enviado com sucesso! Aguarde aprovação do professor.");

        document.getElementById("nomeAluno").value = "";
        document.getElementById("telefoneAluno").value = "";
        document.getElementById("emailAluno").value = "";
        document.getElementById("linkSiteAluno").value = "";
        document.getElementById("linkVideoAluno").value = "";
        document.getElementById("autorizacaoAluno").checked = false;
    });
}


// =============================
// BOTÃO: CARREGAR PORTFÓLIOS PUBLICADOS
// =============================

const btnCarregarPortfolios = document.getElementById("btnCarregarPortfolios");

if (btnCarregarPortfolios) {
    btnCarregarPortfolios.addEventListener("click", async function () {
        if (!banco) {
            alert("Supabase não está conectado.");
            return;
        }

        const areaPortfolios = document.getElementById("portfoliosPublicados");

        areaPortfolios.innerHTML = "<p>Carregando portfólios...</p>";

        const { data, error } = await banco
            .from("portfolio_alunos")
            .select("nome_aluno, telefone, email, link_site, link_video, criado_em")
            .eq("autorizado", true)
            .eq("aprovado", true)
            .order("criado_em", { ascending: false });

        if (error) {
            areaPortfolios.innerHTML = `
                <p>Erro ao carregar portfólios: ${error.message}</p>
            `;
            return;
        }

        if (data.length === 0) {
            areaPortfolios.innerHTML = `
                <p>Nenhum portfólio aprovado ainda.</p>
            `;
            return;
        }

        areaPortfolios.innerHTML = "";

        data.forEach(function (aluno) {
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
}

// =============================
// CARREGAR TURMAS DO SUPABASE
// =============================

async function carregarTurmas() {
    const selectTurma = document.getElementById("selectTurma");

    if (!selectTurma) {
        return;
    }

    if (!banco) {
        console.log("Supabase não conectado para carregar turmas.");
        return;
    }

    const { data, error } = await banco
        .from("turmas")
        .select("id, nome_turma, curso, descricao, foto_url")
        .eq("ativo", true)
        .order("nome_turma", { ascending: true });

    if (error) {
        console.log("Erro ao carregar turmas:", error.message);
        return;
    }

    data.forEach(function(turma) {
        const option = document.createElement("option");

        option.value = turma.id;

        option.textContent = `${turma.nome_turma} - ${turma.curso}`;

        option.dataset.nome = turma.nome_turma;
        option.dataset.curso = turma.curso;
        option.dataset.descricao = turma.descricao || "";
        option.dataset.foto = turma.foto_url || "";

        selectTurma.appendChild(option);
    });
}

carregarTurmas();


// =============================
// MOSTRAR AMBIENTE DA TURMA ESCOLHIDA
// =============================

const selectTurma = document.getElementById("selectTurma");

if (selectTurma) {
    selectTurma.addEventListener("change", function() {
        
        const optionSelecionada =
            selectTurma.options[selectTurma.selectedIndex];

        const ambienteTurma =
            document.getElementById("ambienteTurma");

        const nomeTurma =
            document.getElementById("nomeTurmaSelecionada");

        const cursoTurma =
            document.getElementById("cursoTurmaSelecionada");

        const descricaoTurma =
            document.getElementById("descricaoTurmaSelecionada");

        const fotoTurma =
            document.getElementById("fotoTurmaSelecionada");

        const btnFotoTurma =
            document.getElementById("btnFotoTurmaSelecionada");

        if (selectTurma.value === "") {
            ambienteTurma.style.display = "none";
            carregarAulaDaTurma(selectTurma.value);
            return;
        }

        nomeTurma.textContent =
            `Turma ${optionSelecionada.dataset.nome}`;

        cursoTurma.textContent =
            `Curso: ${optionSelecionada.dataset.curso}`;

        descricaoTurma.textContent =
            optionSelecionada.dataset.descricao;

        const caminhoFoto =
            optionSelecionada.dataset.foto;

        if (caminhoFoto) {
            fotoTurma.src = caminhoFoto;
            btnFotoTurma.style.display = "inline-block";
        } else {
            fotoTurma.src = "";
            fotoTurma.style.display = "none";
            btnFotoTurma.style.display = "none";
        }

        ambienteTurma.style.display = "block";
        carregarAulaDaTurma(selectTurma.value);

        btnFotoTurma.textContent =
            "📸 Ver Foto da Turma";
            
    });
}


// =============================
// BOTÃO FOTO DA TURMA SELECIONADA
// =============================

const btnFotoTurmaSelecionada =
    document.getElementById("btnFotoTurmaSelecionada");

if (btnFotoTurmaSelecionada) {
    btnFotoTurmaSelecionada.addEventListener("click", function() {
        const fotoTurma =
            document.getElementById("fotoTurmaSelecionada");

        if (fotoTurma.style.display === "none" || fotoTurma.style.display === "") {
            fotoTurma.style.display = "block";

            btnFotoTurmaSelecionada.textContent =
                "❌ Ocultar Foto da Turma";
        } else {
            fotoTurma.style.display = "none";

            btnFotoTurmaSelecionada.textContent =
                "📸 Ver Foto da Turma";
        }
    });
}

// =============================
// CARREGAR AULAS DA TURMA SELECIONADA
// =============================

async function carregarAulasDaTurma(turmaId) {
    const areaAulas = document.getElementById("areaAulasTurma");
    const listaAulas = document.getElementById("listaAulasTurma");

    if (!areaAulas || !listaAulas) {
        return;
    }

    if (!banco) {
        listaAulas.innerHTML = "<p>Supabase não conectado.</p>";
        areaAulas.style.display = "block";
        return;
    }

    listaAulas.innerHTML = "<p>Carregando aulas da turma...</p>";
    areaAulas.style.display = "block";

    const { data, error } = await banco
        .from("aulas")
        .select(`
            id,
            titulo_aula,
            subtitulo,
            descricao,
            data_aula,
            horario_inicio,
            horario_fim,
            local_aula,
            desafio_pratico,
            disciplinas (
                nome_disciplina
            )
        `)
        .eq("turma_id", turmaId)
        .eq("ativo", true)
        .order("data_aula", { ascending: true });

    if (error) {
        listaAulas.innerHTML = `
            <p>Erro ao carregar aulas: ${error.message}</p>
        `;
        console.log("Erro ao carregar aulas:", error);
        return;
    }

    if (!data || data.length === 0) {
        listaAulas.innerHTML = `
            <p>Nenhuma aula cadastrada para esta turma ainda.</p>
        `;
        return;
    }

    listaAulas.innerHTML = "";

    data.forEach(function(aula) {
        const nomeDisciplina = aula.disciplinas
            ? aula.disciplinas.nome_disciplina
            : "Disciplina não informada";

        listaAulas.innerHTML += `
            <div class="card-aula">
                <span class="badge-disciplina">${nomeDisciplina}</span>

                <h3>${aula.titulo_aula}</h3>

                <p><strong>Subtítulo:</strong> ${aula.subtitulo || "Não informado"}</p>

                <p><strong>Descrição:</strong> ${aula.descricao || "Não informada"}</p>

                <p><strong>Data:</strong> ${aula.data_aula || "Não informada"}</p>

                <p>
                    <strong>Horário:</strong>
                    ${aula.horario_inicio || "--:--"} às ${aula.horario_fim || "--:--"}
                </p>

                <p><strong>Local:</strong> ${aula.local_aula || "Não informado"}</p>

                <p><strong>Desafio prático:</strong> ${aula.desafio_pratico || "Não informado"}</p>
            </div>
        `;
    });
}

// =============================
// CARREGAR AULA DA TURMA SELECIONADA
// =============================

async function carregarAulaDaTurma(turmaId) {
    const aulaDiaConteudo = document.getElementById("aulaDiaConteudo");

    if (!aulaDiaConteudo) {
        return;
    }

    if (!banco) {
        aulaDiaConteudo.innerHTML = `
            <p>Supabase não conectado.</p>
        `;
        return;
    }

    aulaDiaConteudo.innerHTML = `
        <p>Carregando aula da turma...</p>
    `;

    const { data, error } = await banco
        .from("aulas")
        .select(`
            id,
            titulo_aula,
            subtitulo,
            descricao,
            data_aula,
            horario_inicio,
            horario_fim,
            local_aula,
            desafio_pratico,
            disciplinas (
                nome_disciplina
            )
        `)
        .eq("turma_id", turmaId)
        .eq("ativo", true)
        .order("data_aula", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (error) {
        aulaDiaConteudo.innerHTML = `
            <p>Erro ao carregar aula: ${error.message}</p>
        `;
        console.log("Erro ao carregar aula:", error);
        return;
    }

    if (!data) {
        aulaDiaConteudo.innerHTML = `
            <p>Nenhuma aula cadastrada para esta turma ainda.</p>
        `;
        return;
    }

    aulaDiaConteudo.innerHTML = `
        <div class="card-aula-dia">
            <h3>${data.titulo_aula}</h3>

            <p>
                <strong>Disciplina:</strong>
                ${data.disciplinas ? data.disciplinas.nome_disciplina : "Não informada"}
            </p>

            <p>
                <strong>Subtítulo:</strong>
                ${data.subtitulo || "Não informado"}
            </p>

            <p>
                <strong>Descrição:</strong>
                ${data.descricao || "Não informada"}
            </p>

            <p>
                <strong>Data:</strong>
                ${data.data_aula || "Não informada"}
            </p>

            <p>
                <strong>Horário:</strong>
                ${data.horario_inicio || "--"} às ${data.horario_fim || "--"}
            </p>

            <p>
                <strong>Local:</strong>
                ${data.local_aula || "Não informado"}
            </p>

            <div class="desafio-aula">
                <h4>Desafio Prático</h4>

                <p>
                    ${data.desafio_pratico || "Nenhum desafio cadastrado."}
                </p>
            </div>
        </div>
    `;
}

// =============================
// CARREGAR AULA DA TURMA SELECIONADA
// =============================

async function carregarAulaDaTurma(turmaId) {
    const aulaDiaConteudo = document.getElementById("aulaDiaConteudo");

    if (!aulaDiaConteudo) {
        console.log("Elemento aulaDiaConteudo não encontrado no HTML.");
        return;
    }

    if (!banco) {
        aulaDiaConteudo.innerHTML = `
            <p>Supabase não conectado.</p>
        `;
        return;
    }

    aulaDiaConteudo.innerHTML = `
        <p>Carregando aula da turma...</p>
    `;

    const { data, error } = await banco
        .from("aulas")
        .select(`
            id,
            titulo_aula,
            subtitulo,
            descricao,
            data_aula,
            horario_inicio,
            horario_fim,
            local_aula,
            desafio_pratico,
            disciplinas (
                nome_disciplina
            )
        `)
        .eq("turma_id", turmaId)
        .eq("ativo", true)
        .order("data_aula", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (error) {
        aulaDiaConteudo.innerHTML = `
            <p>Erro ao carregar aula: ${error.message}</p>
        `;

        console.log("Erro ao carregar aula:", error);
        return;
    }

    if (!data) {
        aulaDiaConteudo.innerHTML = `
            <p>Nenhuma aula cadastrada para esta turma ainda.</p>
        `;

        return;
    }

    aulaDiaConteudo.innerHTML = `
        <div class="card-aula-dia">
            <h3>${data.titulo_aula}</h3>

            <p>
                <strong>Disciplina:</strong>
                ${data.disciplinas ? data.disciplinas.nome_disciplina : "Não informada"}
            </p>

            <p>
                <strong>Subtítulo:</strong>
                ${data.subtitulo || "Não informado"}
            </p>

            <p>
                <strong>Descrição:</strong>
                ${data.descricao || "Não informada"}
            </p>

            <p>
                <strong>Data:</strong>
                ${data.data_aula || "Não informada"}
            </p>

            <p>
                <strong>Horário:</strong>
                ${data.horario_inicio || "--"} às ${data.horario_fim || "--"}
            </p>

            <p>
                <strong>Local:</strong>
                ${data.local_aula || "Não informado"}
            </p>

            <div class="desafio-aula">
                <h4>Desafio Prático</h4>

                <p>
                    ${data.desafio_pratico || "Nenhum desafio cadastrado."}
                </p>
            </div>
        </div>
    `;
}