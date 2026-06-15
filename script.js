// =====================================================
// PORTAL DE AULAS E PORTFÓLIOS - PÁGINA DO ALUNO
// HTML + CSS + JAVASCRIPT PURO + SUPABASE
// VERSÃO CORRIGIDA: portfólio vinculado à turma, telefone, e-mail, RA e logs
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
                ? `<span class="badge-aula-atual">Aula do Dia</span>`
                : ""
            }

            <h3>${escaparHTML(aula.titulo_aula || "Aula sem título")}</h3>

            <p>
                <strong>Disciplina:</strong>
                ${aula.disciplinas ? escaparHTML(aula.disciplinas.nome_disciplina) : "Não informada"}
            </p>

            <p>
                <strong>Subtítulo:</strong>
                ${escaparHTML(aula.subtitulo || "Não informado")}
            </p>

            <p><strong>Descrição:</strong></p>

            <div class="texto-formatado-aula">
                ${formatarTextoAula(aula.descricao || "Sem descrição cadastrada.")}
            </div>

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
                ${escaparHTML(aula.local_aula || "Não informado")}
            </p>

            <div class="desafio-aula">
                <h4>Desafio Prático</h4>

                <div class="texto-formatado-aula">
                    ${formatarTextoAula(aula.desafio_pratico || "Nenhum desafio cadastrado.")}
                </div>
            </div>

            <hr>

            <h3>📎 Materiais da Aula</h3>

            ${montarMateriaisDaAula(aula)}

        </div>
    `;
}


// =====================================================
// 13. MONTAR MATERIAIS DA AULA
// PDF e vídeo podem ser exibidos dentro do site.
// Atividade/quiz/desafio abre em nova aba, para não travar login externo.
// =====================================================

function montarMateriaisDaAula(aula) {
    let html = "";

    if (aula.pdf_url) {
        html += `
            <div class="material-aula-card">
                <button type="button" onclick="alternarMaterial('pdfAulaBox-${aula.id}')">
                    📄 Exibir / Ocultar PDF
                </button>

                <a
                    href="${escaparAtributo(aula.pdf_url)}"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="btn-link-material"
                >
                    🔗 Abrir PDF em nova aba
                </a>

                <div id="pdfAulaBox-${aula.id}" class="conteudo-material-aula" style="display:none;">
                    <iframe
                        src="${escaparAtributo(aula.pdf_url)}"
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
                <button type="button" onclick="alternarMaterial('videoAulaBox-${aula.id}')">
                    🎥 Exibir / Ocultar Vídeo
                </button>

                <a
                    href="${escaparAtributo(aula.video_url)}"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="btn-link-material"
                >
                    🔗 Abrir vídeo em nova aba
                </a>

                <div id="videoAulaBox-${aula.id}" class="conteudo-material-aula" style="display:none;">
                    ${montarVideoAula(aula.video_url)}
                </div>
            </div>
        `;
    }

    if (aula.atividade_url) {
        html += `
            <div class="material-aula-card">
                <a
                    href="${escaparAtributo(aula.atividade_url)}"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="btn-material-aula btn-atividade-externa"
                >
                    📝 Abrir atividade / quiz / desafio em nova aba
                </a>

                <p class="aviso-link-externo">
                    A atividade será aberta fora deste site para permitir login e uso completo da plataforma original.
                </p>
            </div>
        `;
    }

    if (aula.material_extra_url) {
        html += `
            <div class="material-aula-card">
                <a
                    href="${escaparAtributo(aula.material_extra_url)}"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="btn-material-aula"
                >
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

    if (elemento.style.display === "none" || elemento.style.display === "") {
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
            src="${escaparAtributo(urlVideo)}"
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

                    <h3>${escaparHTML(aula.titulo_aula || "Aula sem título")}</h3>

                    <p>
                        <strong>Disciplina:</strong>
                        ${aula.disciplinas ? escaparHTML(aula.disciplinas.nome_disciplina) : "Não informada"}
                    </p>

                    <div class="texto-formatado-aula resumo-linha-tempo">
                        ${formatarTextoAula(resumirTexto(aula.descricao || "", 450))}
                    </div>

                    <button type="button" onclick="abrirResumoAulaLinhaTempo('${aula.id}')">
                        Ver detalhes da aula
                    </button>

                </div>

            </div>
        `;
    }).join("");
}


// =====================================================
// 17. ABRIR AULA DA LINHA DO TEMPO
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
// Agora salva também turma, RA, e-mail e telefone do aluno.
// Campos aceitos no HTML:
// - nomeAluno
// - telefoneAluno
// - emailAluno
// - turmaAluno OU portfolioTurmaAluno
// - raAluno OU portfolioRaAluno
// - linkSiteAluno
// - linkVideoAluno
// - autorizacaoAluno
// =====================================================

const btnCadastrarPortfolio = document.getElementById("btnCadastrarPortfolio");

if (btnCadastrarPortfolio) {
    btnCadastrarPortfolio.addEventListener("click", cadastrarPortfolioAluno);
}

async function cadastrarPortfolioAluno() {
    if (!banco) {
        alert("Supabase não está conectado. Verifique a chave e o script CDN.");
        return;
    }

    const nome = obterValorCampoPublico("nomeAluno").trim();
    const telefone = obterValorCampoPublico("telefoneAluno").trim();
    const email = obterValorCampoPublico("emailAluno").trim();
    const turma = obterTurmaPortfolioAluno();
    const ra = obterRaPortfolioAluno();
    const site = obterValorCampoPublico("linkSiteAluno").trim();
    const video = obterValorCampoPublico("linkVideoAluno").trim();

    const autorizacao = document.getElementById("autorizacaoAluno");
    const autorizado = autorizacao ? autorizacao.checked : false;

    if (!nome || !email || !site || !autorizado) {
        alert("Preencha nome, e-mail, link do site e marque a autorização.");
        return;
    }

    if (!turma) {
        alert("Selecione ou informe a turma do aluno antes de enviar o portfólio.");
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

    let usuarioLogado = null;

    try {
        const { data: userData } = await banco.auth.getUser();
        usuarioLogado = userData && userData.user ? userData.user : null;
    } catch (erroUsuario) {
        console.log("Não foi possível identificar usuário logado:", erroUsuario);
    }

    const dadosPortfolio = {
        nome_aluno: nome,

        // Campos antigos, mantidos para compatibilidade
        telefone: telefone,
        email: email,

        // Campos novos para relatórios por turma/aluno
        aluno_id: usuarioLogado ? usuarioLogado.id : null,
        aluno_email: email,
        aluno_telefone: telefone,
        aluno_turma: turma,
        aluno_ra: ra,

        link_site: site,
        link_video: video || null,
        autorizado: true,
        aprovado: false
    };

    const { data, error } = await banco
        .from("portfolio_alunos")
        .insert([dadosPortfolio])
        .select()
        .single();

    if (error) {
        alert("Erro ao salvar: " + error.message);
        console.log("Erro Supabase:", error);
        return;
    }

    await registrarLogSeguroSistema({
        modulo: "portfolio",
        acao: "criar_portfolio",
        tipo_evento: "aluno_postou_portfolio",
        tabela_afetada: "portfolio_alunos",
        registro_id: data && data.id ? String(data.id) : null,
        descricao: `Aluno ${nome} postou um novo portfólio no site.`,
        dados_novos: dadosPortfolio
    });

    alert("Portfólio enviado com sucesso! Aguarde aprovação do professor.");

    limparCampoPublico("nomeAluno");
    limparCampoPublico("telefoneAluno");
    limparCampoPublico("emailAluno");
    limparCampoPublico("turmaAluno");
    limparCampoPublico("portfolioTurmaAluno");
    limparCampoPublico("raAluno");
    limparCampoPublico("portfolioRaAluno");
    limparCampoPublico("linkSiteAluno");
    limparCampoPublico("linkVideoAluno");

    if (autorizacao) {
        autorizacao.checked = false;
    }

    mostrarSecaoAluno("areaAulaDia");
}


function obterTurmaPortfolioAluno() {
    const campoTurmaDireto = document.getElementById("turmaAluno") || document.getElementById("portfolioTurmaAluno");

    if (campoTurmaDireto && campoTurmaDireto.value) {
        return campoTurmaDireto.value.trim();
    }

    const selectTurmaPagina = document.getElementById("selectTurma");

    if (selectTurmaPagina && selectTurmaPagina.value) {
        const optionSelecionada = selectTurmaPagina.options[selectTurmaPagina.selectedIndex];

        if (optionSelecionada && optionSelecionada.dataset.nome) {
            return optionSelecionada.dataset.nome.trim();
        }

        if (optionSelecionada && optionSelecionada.textContent) {
            return optionSelecionada.textContent.split("-")[0].trim();
        }
    }

    return "";
}


function obterRaPortfolioAluno() {
    const campoRa = document.getElementById("raAluno") || document.getElementById("portfolioRaAluno");

    if (campoRa && campoRa.value) {
        return campoRa.value.trim();
    }

    return "";
}


function obterValorCampoPublico(idCampo) {
    const campo = document.getElementById(idCampo);

    if (!campo) {
        return "";
    }

    return campo.value || "";
}


async function registrarLogSeguroSistema(config) {
    try {
        if (typeof registrarLogSistema === "function") {
            await registrarLogSistema(config);
        }
    } catch (erro) {
        console.warn("Não foi possível registrar log do sistema:", erro);
    }
}


// =====================================================
// 19. BOTÃO: CARREGAR PORTFÓLIOS PUBLICADOS
// Agora exibe telefone, e-mail, turma e RA quando disponíveis.
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
        .select(`
            id,
            nome_aluno,
            telefone,
            email,
            aluno_telefone,
            aluno_email,
            aluno_turma,
            aluno_ra,
            link_site,
            link_video,
            autorizado,
            aprovado,
            criado_em
        `)
        .eq("autorizado", true)
        .eq("aprovado", true)
        .order("criado_em", { ascending: false });

    if (error) {
        areaPortfolios.innerHTML = `<p>Erro ao carregar portfólios: ${error.message}</p>`;
        console.log("Erro ao carregar portfólios:", error);
        return;
    }

    if (!data || data.length === 0) {
        areaPortfolios.innerHTML = `<p>Nenhum portfólio aprovado ainda.</p>`;
        return;
    }

    areaPortfolios.innerHTML = "";

    data.forEach(function (aluno) {
        const telefoneAluno = aluno.aluno_telefone || aluno.telefone || "Não informado";
        const emailAluno = aluno.aluno_email || aluno.email || "Não informado";
        const turmaAluno = aluno.aluno_turma || "Não informada";
        const raAluno = aluno.aluno_ra || "Não informado";
        const dataEnvio = aluno.criado_em ? formatarDataHoraPortfolio(aluno.criado_em) : "Data não informada";

        areaPortfolios.innerHTML += `
            <div class="card-publicado">
                <h3>${escaparHTML(aluno.nome_aluno || "Aluno sem nome")}</h3>

                <p><strong>Turma:</strong> ${escaparHTML(turmaAluno)}</p>

                <p><strong>RA:</strong> ${escaparHTML(raAluno)}</p>

                <p><strong>Telefone:</strong> ${escaparHTML(telefoneAluno)}</p>

                <p><strong>E-mail:</strong> ${escaparHTML(emailAluno)}</p>

                <p><strong>Enviado em:</strong> ${escaparHTML(dataEnvio)}</p>

                <p>
                    <strong>Site:</strong>
                    <a href="${escaparAtributo(aluno.link_site)}" target="_blank" rel="noopener noreferrer">
                        Acessar projeto do aluno
                    </a>
                </p>

                ${
                    aluno.link_video
                    ? `
                        <p>
                            <strong>Vídeo:</strong>
                            <a href="${escaparAtributo(aluno.link_video)}" target="_blank" rel="noopener noreferrer">
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


function formatarDataHoraPortfolio(dataTexto) {
    if (!dataTexto) {
        return "Data não informada";
    }

    try {
        return new Date(dataTexto).toLocaleString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    } catch (erro) {
        return dataTexto;
    }
}


// =====================================================
// 21. CARREGAR FRASE MOTIVACIONAL PÚBLICA NA TELA INICIAL
// Essa frase vem da tabela site_settings do Supabase.
// =====================================================

async function carregarFraseMotivacionalPublica() {
    const elementoFrase = document.getElementById("fraseMotivacionalPublica");

    if (!elementoFrase) {
        return;
    }

    if (!banco) {
        return;
    }

    try {
        const { data, error } = await banco
            .from("site_settings")
            .select("valor")
            .eq("chave", "frase_motivacional")
            .maybeSingle();

        if (error) {
            console.log("Erro ao carregar frase motivacional:", error);
            return;
        }

        if (data && data.valor) {
            elementoFrase.textContent = data.valor;
        }

    } catch (erro) {
        console.log("Erro inesperado ao carregar frase pública:", erro);
    }
}

document.addEventListener("DOMContentLoaded", function () {
    carregarFraseMotivacionalPublica();
});


// =====================================================
// 22. FORMATAR TEXTO DA AULA
// Mantém identação, quebras de linha, blocos de código e negrito.
// Para código, use:
// ```python
// print("Olá mundo")
// ```
//
// Para negrito, use:
// **texto em negrito**
// =====================================================

function formatarTextoAula(texto) {
    if (!texto) {
        return "";
    }

    let textoSeguro = texto
        .toString()
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

    // Converte blocos marcados com ``` código ```
    textoSeguro = textoSeguro.replace(/```([\s\S]*?)```/g, function (_, codigo) {
        return `<pre class="bloco-codigo-aula"><code>${codigo}</code></pre>`;
    });

    // Converte **negrito**
    textoSeguro = textoSeguro.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

    return textoSeguro;
}


// =====================================================
// 23. FUNÇÕES AUXILIARES DE SEGURANÇA E TEXTO
// =====================================================

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

function escaparAtributo(texto) {
    if (!texto) {
        return "";
    }

    return texto
        .toString()
        .replaceAll("&", "&amp;")
        .replaceAll('"', "&quot;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;");
}

function resumirTexto(texto, limite) {
    if (!texto) {
        return "";
    }

    const textoLimpo = texto.toString();

    if (textoLimpo.length <= limite) {
        return textoLimpo;
    }

    return textoLimpo.substring(0, limite) + "...";
}

// =====================================================
// ÁREA PÚBLICA - PRECISO DE AJUDA
// =====================================================

const btnAbrirAjudaAluno = document.getElementById("btnAbrirAjudaAluno");
const formAjudaAluno = document.getElementById("formAjudaAluno");
const btnEnviarAjudaAluno = document.getElementById("btnEnviarAjudaAluno");

if (btnAbrirAjudaAluno) {
    btnAbrirAjudaAluno.addEventListener("click", function () {
        if (!formAjudaAluno) {
            return;
        }

        if (formAjudaAluno.style.display === "none" || formAjudaAluno.style.display === "") {
            formAjudaAluno.style.display = "block";
            btnAbrirAjudaAluno.textContent = "❌ Fechar formulário de ajuda";
        } else {
            formAjudaAluno.style.display = "none";
            btnAbrirAjudaAluno.textContent = "🙋 Abrir formulário de ajuda";
        }
    });
}

if (btnEnviarAjudaAluno) {
    btnEnviarAjudaAluno.addEventListener("click", enviarSolicitacaoAjudaAluno);
}

async function enviarSolicitacaoAjudaAluno() {
    const mensagem = document.getElementById("mensagemAjudaAluno");

    if (!banco) {
        if (mensagem) {
            mensagem.textContent = "Erro: conexão com o banco de dados não encontrada.";
        }
        return;
    }

    const nome = document.getElementById("ajudaNomeAluno")
        ? document.getElementById("ajudaNomeAluno").value.trim()
        : "";

    const turma = document.getElementById("ajudaTurmaAluno")
        ? document.getElementById("ajudaTurmaAluno").value.trim()
        : "";

    const curso = document.getElementById("ajudaCursoAluno")
        ? document.getElementById("ajudaCursoAluno").value.trim()
        : "";

    const disciplina = document.getElementById("ajudaDisciplinaAluno")
        ? document.getElementById("ajudaDisciplinaAluno").value.trim()
        : "";

    const dificuldade = document.getElementById("ajudaDificuldadeAluno")
        ? document.getElementById("ajudaDificuldadeAluno").value.trim()
        : "";

    const mensagemAluno = document.getElementById("ajudaMensagemAluno")
        ? document.getElementById("ajudaMensagemAluno").value.trim()
        : "";

    const contato = document.getElementById("ajudaContatoAluno")
        ? document.getElementById("ajudaContatoAluno").value.trim()
        : "";

    if (!nome || !turma || !dificuldade || !mensagemAluno) {
        if (mensagem) {
            mensagem.textContent = "Preencha pelo menos nome, turma, dificuldade e mensagem.";
        }
        return;
    }

    if (mensagem) {
        mensagem.textContent = "Enviando sua solicitação...";
    }

    const dadosChamado = {
        nome_aluno: nome,
        turma: turma,
        curso: curso,
        disciplina: disciplina,
        dificuldade: dificuldade,
        mensagem: mensagemAluno,
        contato: contato,
        status: "aguardando"
    };

    const { data, error } = await banco
        .from("solicitacoes_ajuda")
        .insert([dadosChamado])
        .select()
        .single();

    if (error) {
        if (mensagem) {
            mensagem.textContent = "Erro ao enviar solicitação: " + error.message;
        }

        console.log("Erro ao enviar solicitação de ajuda:", error);
        return;
    }

    await registrarLogSeguroSistema({
        modulo: "chamados",
        acao: "enviar_chamado",
        tipo_evento: "aluno_enviou_chamado",
        tabela_afetada: "solicitacoes_ajuda",
        registro_id: data && data.id ? String(data.id) : null,
        descricao: `Aluno ${nome} enviou uma solicitação de ajuda.`,
        dados_novos: dadosChamado
    });

    if (mensagem) {
        mensagem.textContent = "Pedido de ajuda enviado com sucesso! O professor irá analisar sua solicitação.";
    }

    limparFormularioAjudaAluno();
}

function limparFormularioAjudaAluno() {
    limparCampoPublico("ajudaNomeAluno");
    limparCampoPublico("ajudaTurmaAluno");
    limparCampoPublico("ajudaCursoAluno");
    limparCampoPublico("ajudaDisciplinaAluno");
    limparCampoPublico("ajudaDificuldadeAluno");
    limparCampoPublico("ajudaMensagemAluno");
    limparCampoPublico("ajudaContatoAluno");
}

function limparCampoPublico(idCampo) {
    const campo = document.getElementById(idCampo);

    if (campo) {
        campo.value = "";
    }
}

/* =====================================================
   ÁREA DO ALUNO - BOTÕES DA SEÇÃO PRECISO DE AJUDA
===================================================== */

(function configurarBotoesAreaAlunoNaHome() {
    const SUPABASE_URL_ALUNO_HOME = "https://pwomyoprbvoimqmikvev.supabase.co";
    const SUPABASE_KEY_ALUNO_HOME = "sb_publishable_elGQyDU7ngaUHCLWIHLhDQ_IxiLo6kD";

    let bancoAlunoHome = null;

    if (typeof supabase !== "undefined") {
        bancoAlunoHome = supabase.createClient(
            SUPABASE_URL_ALUNO_HOME,
            SUPABASE_KEY_ALUNO_HOME
        );
    }

    const btnAbrirAjudaAlunoHome = document.getElementById("btnAbrirAjudaAluno");
    const btnAcompanharChamadosAluno = document.getElementById("btnAcompanharChamadosAluno");
    const btnAreaAluno = document.getElementById("btnAreaAluno");
    const formAjudaPublico = document.getElementById("formAjudaAluno");

    // Evita conflito:
    // Se existir formulário público na home, o botão só abre/fecha o formulário.
    // Se não existir formulário, o botão redireciona para a área do aluno.
    if (btnAbrirAjudaAlunoHome && !formAjudaPublico) {
        btnAbrirAjudaAlunoHome.addEventListener("click", function () {
            irParaAreaAluno("abrirChamado");
        });
    }

    if (btnAcompanharChamadosAluno) {
        btnAcompanharChamadosAluno.addEventListener("click", function () {
            irParaAreaAluno("chamados");
        });
    }

    if (btnAreaAluno) {
        btnAreaAluno.addEventListener("click", function () {
            irParaAreaAluno("home");
        });
    }

    async function irParaAreaAluno(acao) {
        if (!bancoAlunoHome) {
            window.location.href = "login-aluno.html";
            return;
        }

        const { data, error } = await bancoAlunoHome.auth.getUser();

        if (error || !data || !data.user) {
            if (acao === "abrirChamado") {
                window.location.href = "login-aluno.html?acao=abrirChamado";
                return;
            }

            window.location.href = "login-aluno.html";
            return;
        }

        if (acao === "abrirChamado") {
            window.location.href = "aluno.html?abrirChamado=1";
            return;
        }

        window.location.href = "aluno.html";
    }
})();


// =====================================================
// 24. EXPOR FUNÇÕES PARA USO NO HTML
// =====================================================

window.mostrarHTML = mostrarHTML;
window.mostrarCSS = mostrarCSS;
window.mostrarJS = mostrarJS;
window.alternarMaterial = alternarMaterial;
window.abrirResumoAulaLinhaTempo = abrirResumoAulaLinhaTempo;