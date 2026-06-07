// =====================================================
// PORTAL DE AULAS E PORTFÓLIOS - PÁGINA DO ALUNO
// HTML + CSS + JAVASCRIPT PURO + SUPABASE
// =====================================================


// =====================================================
// 1. CONEXÃO COM O SUPABASE
// =====================================================

const SUPABASE_URL = "https://pwomyoprbvoimqmikvev.supabase.co";

// COLE AQUI SUA CHAVE ANON PUBLIC / PUBLISHABLE DO SUPABASE
// IMPORTANTE: mantenha a chave entre aspas.
const SUPABASE_KEY = "sb_publishable_elGQyDU7ngaUHCLWIHLhDQ_IxiLo6kD";

let banco = null;

// Verifica se a biblioteca do Supabase carregou corretamente no index.html
if (window.supabase) {
    banco = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    console.log("Supabase conectado!");
} else {
    console.log("Supabase não carregou. Verifique o script CDN no index.html.");
}


// =====================================================
// 2. BLOQUEIO BÁSICO DE LINKS PROIBIDOS
// Usado no envio de portfólio dos alunos.
// =====================================================

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


// =====================================================
// 3. BOTÃO: DESAFIO PRÁTICO ANTIGO
// Mantido para não quebrar caso ainda exista no HTML.
// =====================================================

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


// =====================================================
// 4. BOTÕES "O QUE É?"
// Mantidos caso ainda existam botões antigos no site.
// =====================================================

function mostrarHTML() {
    const resultado = document.getElementById("resultado");

    if (!resultado) {
        return;
    }

    resultado.innerHTML = `
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
    const resultado = document.getElementById("resultado");

    if (!resultado) {
        return;
    }

    resultado.innerHTML = `
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
    const resultado = document.getElementById("resultado");

    if (!resultado) {
        return;
    }

    resultado.innerHTML = `
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


// =====================================================
// 5. BOTÃO: VER / OCULTAR FOTO DA TURMA ANTIGA
// Mantido caso ainda exista no HTML antigo.
// =====================================================

const btnTurma = document.getElementById("btnTurma");

if (btnTurma) {
    btnTurma.addEventListener("click", function () {
        const foto = document.getElementById("fotoTurma");

        if (!foto) {
            return;
        }

        if (foto.style.display === "none" || foto.style.display === "") {
            foto.style.display = "block";
            btnTurma.textContent = "❌ Ocultar Foto da Turma";
        } else {
            foto.style.display = "none";
            btnTurma.textContent = "📸 Ver Foto da Turma";
        }
    });
}


// =====================================================
// 6. BOTÃO: VISUALIZAR / FECHAR PLANO DE AULA ANTIGO
// Mantido caso ainda exista no HTML antigo.
// =====================================================

const btnPDF = document.getElementById("btnPDF");

if (btnPDF) {
    btnPDF.addEventListener("click", function () {
        const pdf = document.getElementById("visualizadorPDF");
        const mensagemPDF = document.getElementById("mensagemPDF");

        if (!pdf || !mensagemPDF) {
            return;
        }

        const caminhoPDF = "plano-aula-front-end.pdf";

        if (caminhoPDF === "") {
            mensagemPDF.textContent = "Plano de Aula Vazio.";
            return;
        }

        if (pdf.style.display === "block") {
            pdf.style.display = "none";
            pdf.src = "";
            btnPDF.textContent = "📚 Visualizar Plano de Aula";
            mensagemPDF.textContent = "";
            return;
        }

        pdf.src = caminhoPDF;
        pdf.style.display = "block";
        btnPDF.textContent = "❌ Fechar Plano de Aula";
        mensagemPDF.textContent = "";
    });
}


// =====================================================
// 7. CARREGAR TURMAS DO SUPABASE
// Preenche o select de turmas na tela inicial.
// =====================================================

async function carregarTurmas() {
    const selectTurma = document.getElementById("selectTurma");

    if (!selectTurma) {
        return;
    }

    if (!banco) {
        console.log("Supabase não conectado para carregar turmas.");
        return;
    }

    selectTurma.innerHTML = `<option value="">Selecione uma turma</option>`;

    const { data, error } = await banco
        .from("turmas")
        .select("id, nome_turma, curso, descricao, foto_url")
        .eq("ativo", true)
        .order("nome_turma", { ascending: true });

    if (error) {
        console.log("Erro ao carregar turmas:", error.message);
        return;
    }

    data.forEach(function (turma) {
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


// =====================================================
// 8. MOSTRAR AMBIENTE DA TURMA ESCOLHIDA
// Quando o aluno escolhe uma turma:
// - mostra dados da turma;
// - carrega a aula mais recente;
// - carrega linha do tempo;
// - mostra inicialmente a seção Aula do Dia.
// =====================================================

const selectTurma = document.getElementById("selectTurma");

if (selectTurma) {
    selectTurma.addEventListener("change", function () {
        const optionSelecionada = selectTurma.options[selectTurma.selectedIndex];

        const ambienteTurma = document.getElementById("ambienteTurma");
        const nomeTurma = document.getElementById("nomeTurmaSelecionada");
        const cursoTurma = document.getElementById("cursoTurmaSelecionada");
        const descricaoTurma = document.getElementById("descricaoTurmaSelecionada");
        const fotoTurma = document.getElementById("fotoTurmaSelecionada");
        const btnFotoTurma = document.getElementById("btnFotoTurmaSelecionada");

        if (!ambienteTurma) {
            return;
        }

        if (selectTurma.value === "") {
            ambienteTurma.style.display = "none";
            return;
        }

        if (nomeTurma) {
            nomeTurma.textContent = `Turma ${optionSelecionada.dataset.nome}`;
        }

        if (cursoTurma) {
            cursoTurma.textContent = `Curso: ${optionSelecionada.dataset.curso}`;
        }

        if (descricaoTurma) {
            descricaoTurma.textContent = optionSelecionada.dataset.descricao;
        }

        const caminhoFoto = optionSelecionada.dataset.foto;

        if (fotoTurma && btnFotoTurma) {
            if (caminhoFoto) {
                fotoTurma.src = caminhoFoto;
                fotoTurma.style.display = "none";
                btnFotoTurma.style.display = "inline-block";
                btnFotoTurma.textContent = "📸 Ver Foto da Turma";
            } else {
                fotoTurma.src = "";
                fotoTurma.style.display = "none";
                btnFotoTurma.style.display = "none";
            }
        }

        ambienteTurma.style.display = "block";

        carregarAulaDaTurma(selectTurma.value);
        carregarLinhaTempoAulas(selectTurma.value);

        mostrarSecaoAluno("areaAulaDia");
    });
}


// =====================================================
// 9. BOTÃO FOTO DA TURMA SELECIONADA
// =====================================================

const btnFotoTurmaSelecionada = document.getElementById("btnFotoTurmaSelecionada");

if (btnFotoTurmaSelecionada) {
    btnFotoTurmaSelecionada.addEventListener("click", function () {
        const fotoTurma = document.getElementById("fotoTurmaSelecionada");

        if (!fotoTurma) {
            return;
        }

        if (fotoTurma.style.display === "none" || fotoTurma.style.display === "") {
            fotoTurma.style.display = "block";
            btnFotoTurmaSelecionada.textContent = "❌ Ocultar Foto da Turma";
        } else {
            fotoTurma.style.display = "none";
            btnFotoTurmaSelecionada.textContent = "📸 Ver Foto da Turma";
        }
    });
}


// =====================================================
// 10. MOSTRAR APENAS UMA SEÇÃO DO ALUNO POR VEZ
// Exemplo:
// - Aula do Dia
// - Enviar Portfólio
// - Portfólios Publicados
// - Linha do Tempo
// =====================================================

function mostrarSecaoAluno(idSecao) {
    const secoes = document.querySelectorAll(".secao-aluno-dinamica");

    secoes.forEach(function (secao) {
        secao.style.display = "none";
    });

    const secaoEscolhida = document.getElementById(idSecao);

    if (secaoEscolhida) {
        secaoEscolhida.style.display = "block";

        secaoEscolhida.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    }
}


// =====================================================
// 11. CARREGAR AULA MAIS RECENTE DA TURMA
// Esta função substitui as versões duplicadas anteriores.
// Ela já busca PDF, vídeo, atividade e material extra.
// =====================================================

async function carregarAulaDaTurma(turmaId) {
    const aulaDiaConteudo = document.getElementById("aulaDiaConteudo");

    if (!aulaDiaConteudo) {
        console.log("Elemento aulaDiaConteudo não encontrado no HTML.");
        return;
    }

    if (!banco) {
        aulaDiaConteudo.innerHTML = `<p>Supabase não conectado.</p>`;
        return;
    }

    if (!turmaId) {
        aulaDiaConteudo.innerHTML = `<p>Selecione uma turma para visualizar a aula cadastrada.</p>`;
        return;
    }

    aulaDiaConteudo.innerHTML = `<p>Carregando aula mais recente da turma...</p>`;

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
        pdf_url,
        video_url,
        atividade_url,
        material_extra_url,
        aula_do_dia,
        disciplinas (
            nome_disciplina
        )
    `)
    .eq("turma_id", turmaId)
    .eq("ativo", true)
    .eq("aula_do_dia", true)
    .order("data_aula", { ascending: false })
    .order("horario_inicio", { ascending: false })
    .limit(1)
    .maybeSingle();

    if (error) {
        aulaDiaConteudo.innerHTML = `<p>Erro ao carregar aula: ${error.message}</p>`;
        console.log("Erro ao carregar aula:", error);
        return;
    }

   if (!data) {
    aulaDiaConteudo.innerHTML = `
        <p>
            Nenhuma aula foi marcada como <strong>Aula do Dia</strong> para esta turma.
        </p>

        <p>
            O professor pode ativar uma aula no painel administrativo.
        </p>
    `;
    return;
}

    aulaDiaConteudo.innerHTML = montarCardAulaCompleta(data, true);
}


// =====================================================
// 12. MONTAR HTML COMPLETO DA AULA
// Usado tanto na Aula do Dia quanto na Linha do Tempo.
// =====================================================

function montarCardAulaCompleta(aula, mostrarSeloAtual) {
    return `
        <div class="card-aula-dia">

            ${
                mostrarSeloAtual
                ? `<span class="badge-aula-atual">Aula mais recente</span>`
                : ""
            }

            <h3>${aula.titulo_aula}</h3>

            <p>
                <strong>Disciplina:</strong>
                ${aula.disciplinas ? aula.disciplinas.nome_disciplina : "Não informada"}
            </p>

            <p>
                <strong>Subtítulo:</strong>
                ${aula.subtitulo || "Não informado"}
            </p>

            <p>
                <strong>Descrição:</strong>
                ${aula.descricao || "Não informada"}
            </p>

            <p>
                <strong>Data:</strong>
                ${formatarDataBRAluno(aula.data_aula)}
            </p>

            <p>
                <strong>Horário:</strong>
                ${formatarHorarioAluno(aula.horario_inicio)} às ${formatarHorarioAluno(aula.horario_fim)}
            </p>

            <p>
                <strong>Local:</strong>
                ${aula.local_aula || "Não informado"}
            </p>

            <div class="desafio-aula">
                <h4>Desafio Prático</h4>

                <p>
                    ${aula.desafio_pratico || "Nenhum desafio cadastrado."}
                </p>
            </div>

            <hr>

            <h3>📎 Materiais da Aula</h3>

            ${montarMateriaisDaAula(aula)}

        </div>
    `;
}


// =====================================================
// 13. MONTAR MATERIAIS DA AULA
// Cria botões de Exibir/Ocultar para PDF, vídeo e atividade.
// =====================================================

function montarMateriaisDaAula(aula) {
    let html = "";

    if (aula.pdf_url) {
        html += `
            <div class="material-aula-card">
                <button onclick="alternarMaterial('pdfAulaBox-${aula.id}')">
                    📄 Exibir / Ocultar PDF
                </button>

                <div id="pdfAulaBox-${aula.id}" class="conteudo-material-aula" style="display:none;">
                    <iframe
                        src="${aula.pdf_url}"
                        width="100%"
                        height="500"
                        title="PDF da aula">
                    </iframe>
                </div>
            </div>
        `;
    }

    if (aula.video_url) {
        html += `
            <div class="material-aula-card">
                <button onclick="alternarMaterial('videoAulaBox-${aula.id}')">
                    🎥 Exibir / Ocultar Vídeo
                </button>

                <div id="videoAulaBox-${aula.id}" class="conteudo-material-aula" style="display:none;">
                    ${montarVideoAula(aula.video_url)}
                </div>
            </div>
        `;
    }

    if (aula.atividade_url) {
        html += `
            <div class="material-aula-card">
                <button onclick="alternarMaterial('atividadeAulaBox-${aula.id}')">
                    📝 Exibir / Ocultar Atividade
                </button>

                <div id="atividadeAulaBox-${aula.id}" class="conteudo-material-aula" style="display:none;">
                    <iframe
                        src="${aula.atividade_url}"
                        width="100%"
                        height="500"
                        title="Atividade da aula">
                    </iframe>
                </div>
            </div>
        `;
    }

    if (aula.material_extra_url) {
        html += `
            <div class="material-aula-card">
                <a href="${aula.material_extra_url}" target="_blank">
                    🔗 Abrir Material Complementar
                </a>
            </div>
        `;
    }

    if (!html) {
        html = `<p>Nenhum material complementar cadastrado para esta aula.</p>`;
    }

    return html;
}


// =====================================================
// 14. EXIBIR / OCULTAR MATERIAL
// =====================================================

function alternarMaterial(idElemento) {
    const elemento = document.getElementById(idElemento);

    if (!elemento) {
        return;
    }

    if (elemento.style.display === "none") {
        elemento.style.display = "block";
    } else {
        elemento.style.display = "none";
    }
}


// =====================================================
// 15. MONTAR VÍDEO DENTRO DO SITE
// Converte link do YouTube em formato incorporado.
// =====================================================

function montarVideoAula(url) {
    if (!url) {
        return `<p>Nenhum vídeo informado.</p>`;
    }

    let urlVideo = url;

    try {
        if (url.includes("youtube.com/watch")) {
            const endereco = new URL(url);
            const idVideo = endereco.searchParams.get("v");

            if (idVideo) {
                urlVideo = `https://www.youtube.com/embed/${idVideo}`;
            }
        }

        if (url.includes("youtu.be/")) {
            const idVideo = url.split("youtu.be/")[1].split("?")[0];

            if (idVideo) {
                urlVideo = `https://www.youtube.com/embed/${idVideo}`;
            }
        }
    } catch (erro) {
        console.log("Erro ao converter vídeo:", erro);
    }

    return `
        <iframe
            width="100%"
            height="400"
            src="${urlVideo}"
            title="Vídeo da aula"
            frameborder="0"
            allowfullscreen>
        </iframe>
    `;
}


// =====================================================
// 16. CARREGAR LINHA DO TEMPO DAS AULAS
// Mostra todas as aulas da turma em ordem da mais recente
// para a mais antiga.
// =====================================================

async function carregarLinhaTempoAulas(turmaId) {
    const linhaTempo = document.getElementById("linhaTempoAulas");

    if (!linhaTempo) {
        return;
    }

    if (!banco) {
        linhaTempo.innerHTML = `<p>Supabase não conectado.</p>`;
        return;
    }

    if (!turmaId) {
        linhaTempo.innerHTML = `<p>Selecione uma turma para visualizar a linha do tempo.</p>`;
        return;
    }

    linhaTempo.innerHTML = `<p>Carregando histórico de aulas...</p>`;

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
            pdf_url,
            video_url,
            atividade_url,
            material_extra_url,
            disciplinas (
                nome_disciplina
            )
        `)
        .eq("turma_id", turmaId)
        .eq("ativo", true)
        .order("data_aula", { ascending: false })
        .order("horario_inicio", { ascending: false });

    if (error) {
        linhaTempo.innerHTML = `<p>Erro ao carregar linha do tempo: ${error.message}</p>`;
        console.log("Erro linha do tempo:", error);
        return;
    }

    if (!data || data.length === 0) {
        linhaTempo.innerHTML = `<p>Nenhuma aula anterior encontrada.</p>`;
        return;
    }

    window.aulasLinhaTempo = data;

    linhaTempo.innerHTML = data.map(function (aula) {
        return `
            <div class="card-linha-tempo-aula">

                <div class="marcador-tempo"></div>

                <div class="conteudo-linha-tempo-aula">

                    <p class="data-linha-tempo">
                        ${formatarDataBRAluno(aula.data_aula)}
                        — ${formatarHorarioAluno(aula.horario_inicio)} às ${formatarHorarioAluno(aula.horario_fim)}
                    </p>

                    <h3>${aula.titulo_aula}</h3>

                    <p>
                        <strong>Disciplina:</strong>
                        ${aula.disciplinas ? aula.disciplinas.nome_disciplina : "Não informada"}
                    </p>

                    <p>
                        ${aula.descricao || ""}
                    </p>

                    <button onclick="abrirResumoAulaLinhaTempo('${aula.id}')">
                        Ver detalhes da aula
                    </button>

                </div>

            </div>
        `;
    }).join("");
}


// =====================================================
// 17. ABRIR AULA DA LINHA DO TEMPO
// Quando o aluno clica em uma aula antiga,
// ela aparece na seção Aula do Dia.
// =====================================================

function abrirResumoAulaLinhaTempo(idAula) {
    if (!window.aulasLinhaTempo) {
        return;
    }

    const aula = window.aulasLinhaTempo.find(function (item) {
        return String(item.id) === String(idAula);
    });

    if (!aula) {
        return;
    }

    const aulaDiaConteudo = document.getElementById("aulaDiaConteudo");

    if (!aulaDiaConteudo) {
        return;
    }

    mostrarSecaoAluno("areaAulaDia");

    aulaDiaConteudo.innerHTML = montarCardAulaCompleta(aula, false);
}


// =====================================================
// 18. BOTÃO: CADASTRAR PORTFÓLIO
// A seção pode ficar oculta no HTML e só abrir pelo card.
// =====================================================

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

        mostrarSecaoAluno("areaAulaDia");
    });
}


// =====================================================
// 19. BOTÃO: CARREGAR PORTFÓLIOS PUBLICADOS
// =====================================================

const btnCarregarPortfolios = document.getElementById("btnCarregarPortfolios");

if (btnCarregarPortfolios) {
    btnCarregarPortfolios.addEventListener("click", carregarPortfoliosPublicados);
}

async function carregarPortfoliosPublicados() {
    if (!banco) {
        alert("Supabase não está conectado.");
        return;
    }

    const areaPortfolios = document.getElementById("portfoliosPublicados");

    if (!areaPortfolios) {
        return;
    }

    areaPortfolios.innerHTML = `<p>Carregando portfólios...</p>`;

    const { data, error } = await banco
        .from("portfolio_alunos")
        .select("nome_aluno, telefone, email, link_site, link_video, criado_em")
        .eq("autorizado", true)
        .eq("aprovado", true)
        .order("criado_em", { ascending: false });

    if (error) {
        areaPortfolios.innerHTML = `<p>Erro ao carregar portfólios: ${error.message}</p>`;
        return;
    }

    if (!data || data.length === 0) {
        areaPortfolios.innerHTML = `<p>Nenhum portfólio aprovado ainda.</p>`;
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

                ${
                    aluno.link_video
                    ? `
                        <p>
                            <strong>Vídeo:</strong>
                            <a href="${aluno.link_video}" target="_blank">
                                Assistir apresentação
                            </a>
                        </p>
                    `
                    : ""
                }
            </div>
        `;
    });
}


// =====================================================
// 20. FORMATAÇÃO DE DATA E HORÁRIO
// =====================================================

function formatarDataBRAluno(dataTexto) {
    if (!dataTexto) {
        return "Não informada";
    }

    const partes = dataTexto.split("-");

    if (partes.length !== 3) {
        return dataTexto;
    }

    return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function formatarHorarioAluno(horario) {
    if (!horario) {
        return "--:--";
    }

    return horario.substring(0, 5);
}