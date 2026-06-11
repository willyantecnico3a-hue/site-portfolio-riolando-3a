/* =====================================================
   ÁREA DO ALUNO
   Riolando Conecta Técnico
   Supabase Auth + tabela perfis + solicitacoes_ajuda
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
let chamadosAluno = [];
let filtroStatusAtual = "todos";


/* =====================================================
   3. ELEMENTOS DA TELA
===================================================== */

const tituloBoasVindasAluno = document.getElementById("tituloBoasVindasAluno");
const subtituloPerfilAluno = document.getElementById("subtituloPerfilAluno");

const totalChamadosAluno = document.getElementById("totalChamadosAluno");
const totalEmAnaliseAluno = document.getElementById("totalEmAnaliseAluno");
const totalRespondidosAluno = document.getElementById("totalRespondidosAluno");

const btnSairAluno = document.getElementById("btnSairAluno");
const btnMostrarFormularioChamado = document.getElementById("btnMostrarFormularioChamado");
const btnAtualizarChamadosAluno = document.getElementById("btnAtualizarChamadosAluno");

const formNovoChamado = document.getElementById("formNovoChamado");
const tipoAjudaAluno = document.getElementById("tipoAjudaAluno");
const mensagemAjudaAluno = document.getElementById("mensagemAjudaAluno");
const mensagemNovoChamado = document.getElementById("mensagemNovoChamado");

const listaChamadosAluno = document.getElementById("listaChamadosAluno");


/* =====================================================
   4. INICIAR ÁREA DO ALUNO
===================================================== */

document.addEventListener("DOMContentLoaded", iniciarAreaAluno);

async function iniciarAreaAluno() {
    await verificarLoginAluno();

    configurarEventosAluno();

    renderizarPerfilAluno();

    await carregarChamadosAluno();

    verificarAcaoInicialDaAreaAluno();

    console.log("Área do aluno carregada com sucesso.");
}


/* =====================================================
   5. VERIFICAR LOGIN
===================================================== */

async function verificarLoginAluno() {
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
        console.log("Erro ao buscar perfil do aluno:", erroPerfil);
        alert("Erro ao buscar seu perfil. Tente novamente.");
        window.location.href = "login-aluno.html";
        return;
    }

    if (!perfil) {
        await banco.auth.signOut();
        alert("Seu usuário ainda não possui perfil cadastrado. Procure o professor responsável.");
        window.location.href = "login-aluno.html";
        return;
    }

    if (!perfil.ativo) {
        await banco.auth.signOut();
        alert("Seu acesso está desativado. Procure o professor responsável.");
        window.location.href = "login-aluno.html";
        return;
    }

    if (perfil.funcao !== "aluno" && !perfil.funcao.startsWith("aluno")) {
        alert("Esta área é exclusiva para alunos.");
        window.location.href = "index.html";
        return;
    }

    if (perfil.senha_temporaria === true) {
        window.location.href = "primeiro-acesso.html";
        return;
    }

    perfilAluno = perfil;
}


/* =====================================================
   6. CONFIGURAR EVENTOS
===================================================== */

function configurarEventosAluno() {
    if (btnSairAluno) {
        btnSairAluno.addEventListener("click", sairAreaAluno);
    }

    if (btnMostrarFormularioChamado) {
        btnMostrarFormularioChamado.addEventListener("click", alternarFormularioChamado);
    }

    if (btnAtualizarChamadosAluno) {
        btnAtualizarChamadosAluno.addEventListener("click", carregarChamadosAluno);
    }

    if (formNovoChamado) {
        formNovoChamado.addEventListener("submit", enviarNovoChamado);
    }

    const botoesFiltro = document.querySelectorAll(".btn-filtro-chamado");

    botoesFiltro.forEach(function (botao) {
        botao.addEventListener("click", function () {
            botoesFiltro.forEach(function (item) {
                item.classList.remove("ativo");
            });

            botao.classList.add("ativo");

            filtroStatusAtual = botao.dataset.status || "todos";

            renderizarChamadosAluno();
        });
    });
}


/* =====================================================
   7. RENDERIZAR PERFIL DO ALUNO
===================================================== */

function renderizarPerfilAluno() {
    if (!perfilAluno) {
        return;
    }

    const nome = perfilAluno.nome || "Aluno";
    const turma = perfilAluno.turma || "Turma não informada";
    const curso = formatarCursoBonito(perfilAluno.curso || "desenvolvimento_sistemas");

    if (tituloBoasVindasAluno) {
        tituloBoasVindasAluno.textContent = `Olá, ${nome}`;
    }

    if (subtituloPerfilAluno) {
        subtituloPerfilAluno.textContent = `${turma} • ${curso}`;
    }
}


/* =====================================================
   8. ABRIR / FECHAR FORMULÁRIO DE CHAMADO
===================================================== */

function alternarFormularioChamado() {
    if (!formNovoChamado) {
        return;
    }

    const estaVisivel = formNovoChamado.style.display === "block";

    formNovoChamado.style.display = estaVisivel ? "none" : "block";

    if (!estaVisivel && mensagemAjudaAluno) {
        setTimeout(function () {
            mensagemAjudaAluno.focus();
        }, 200);
    }

    if (btnMostrarFormularioChamado) {
        btnMostrarFormularioChamado.textContent = estaVisivel
            ? "+ Abrir chamado"
            : "Fechar formulário";
    }
}


/* =====================================================
   9. ENVIAR NOVO CHAMADO
===================================================== */

async function enviarNovoChamado(event) {
    event.preventDefault();

    if (!usuarioLogado || !perfilAluno) {
        mostrarMensagemChamado("Faça login novamente para enviar um chamado.", "erro");
        return;
    }

    const tipoAjuda = tipoAjudaAluno.value;
    const mensagem = mensagemAjudaAluno.value.trim();

    if (!tipoAjuda) {
        mostrarMensagemChamado("Selecione o tipo de ajuda.", "erro");
        return;
    }

    if (!mensagem || mensagem.length < 10) {
        mostrarMensagemChamado("Descreva melhor sua solicitação. Escreva pelo menos 10 caracteres.", "erro");
        return;
    }

    mostrarMensagemChamado("Enviando seu chamado...", "info");

    const dadosChamado = {
        aluno_id: usuarioLogado.id,
        nome_aluno: perfilAluno.nome || usuarioLogado.email,
        email_aluno: perfilAluno.email || usuarioLogado.email,
        turma: perfilAluno.turma || null,
        curso: perfilAluno.curso || "desenvolvimento_sistemas",
        tipo_ajuda: tipoAjuda,
        mensagem: mensagem,
        status: "enviado"
    };

    const { error } = await banco
        .from("solicitacoes_ajuda")
        .insert([dadosChamado]);

    if (error) {
        console.log("Erro ao enviar chamado:", error);

        mostrarMensagemChamado(
            "Não foi possível enviar seu chamado. Tente novamente ou procure o professor.",
            "erro"
        );

        return;
    }

    mostrarMensagemChamado("Chamado enviado com sucesso! Acompanhe abaixo o andamento.", "sucesso");

    formNovoChamado.reset();

    setTimeout(function () {
        formNovoChamado.style.display = "none";

        if (btnMostrarFormularioChamado) {
            btnMostrarFormularioChamado.textContent = "+ Abrir chamado";
        }
    }, 1200);

    await carregarChamadosAluno();
}


/* =====================================================
   10. CARREGAR CHAMADOS DO ALUNO
===================================================== */

async function carregarChamadosAluno() {
    if (!usuarioLogado) {
        return;
    }

    if (listaChamadosAluno) {
        listaChamadosAluno.innerHTML = `
            <p class="texto-carregando">
                Carregando seus chamados...
            </p>
        `;
    }

    const { data, error } = await banco
        .from("solicitacoes_ajuda")
        .select("*")
        .eq("aluno_id", usuarioLogado.id)
        .order("criado_em", { ascending: false });

    if (error) {
        console.log("Erro ao carregar chamados:", error);

        if (listaChamadosAluno) {
            listaChamadosAluno.innerHTML = `
                <p class="texto-erro">
                    Não foi possível carregar seus chamados.
                </p>
            `;
        }

        return;
    }

    chamadosAluno = data || [];

    atualizarResumoChamados();

    renderizarChamadosAluno();
}


/* =====================================================
   11. ATUALIZAR RESUMO
===================================================== */

function atualizarResumoChamados() {
    const total = chamadosAluno.length;

    const emAnalise = chamadosAluno.filter(function (chamado) {
        return chamado.status === "em_analise";
    }).length;

    const respondidos = chamadosAluno.filter(function (chamado) {
        return chamado.status === "respondido" || chamado.status === "resolvido";
    }).length;

    if (totalChamadosAluno) {
        totalChamadosAluno.textContent = `${total} chamado(s) aberto(s)`;
    }

    if (totalEmAnaliseAluno) {
        totalEmAnaliseAluno.textContent = `${emAnalise} em acompanhamento`;
    }

    if (totalRespondidosAluno) {
        totalRespondidosAluno.textContent = `${respondidos} com devolutiva`;
    }
}


/* =====================================================
   12. RENDERIZAR CHAMADOS
===================================================== */

function renderizarChamadosAluno() {
    if (!listaChamadosAluno) {
        return;
    }

    let lista = chamadosAluno;

    if (filtroStatusAtual !== "todos") {
        lista = chamadosAluno.filter(function (chamado) {
            return chamado.status === filtroStatusAtual;
        });
    }

    if (lista.length === 0) {
        listaChamadosAluno.innerHTML = `
            <div class="estado-vazio-aluno">
                <h3>📭 Nenhum chamado encontrado</h3>
                <p>
                    Quando você enviar uma solicitação de ajuda, ela aparecerá aqui para acompanhamento.
                </p>
            </div>
        `;

        return;
    }

    listaChamadosAluno.innerHTML = lista.map(function (chamado) {
        return `
            <article class="card-chamado-aluno">

                <div class="topo-chamado-aluno">

                    <span class="status-chamado status-${escaparHTML(chamado.status || "enviado")}">
                        ${formatarStatusChamado(chamado.status)}
                    </span>

                    <span class="data-chamado-aluno">
                        ${formatarDataHoraBR(chamado.criado_em)}
                    </span>

                </div>

                <h3>
                    ${formatarTipoAjuda(chamado.tipo_ajuda)}
                </h3>

                <div class="bloco-mensagem-chamado">

                    <strong>Sua solicitação:</strong>

                    <p>
                        ${escaparHTML(chamado.mensagem || "")}
                    </p>

                </div>

                <div class="bloco-resposta-chamado">

                    <strong>Resposta do professor:</strong>

                    ${
                        chamado.resposta_professor
                            ? `
                                <p class="resposta-professor-preenchida">
                                    ${escaparHTML(chamado.resposta_professor)}
                                </p>
                            `
                            : `
                                <p class="resposta-professor-vazia">
                                    Ainda não há resposta. Aguarde o acompanhamento do professor.
                                </p>
                            `
                    }

                </div>

                ${
                    chamado.respondido_em
                        ? `
                            <p class="respondido-em">
                                Respondido em ${formatarDataHoraBR(chamado.respondido_em)}
                            </p>
                        `
                        : ""
                }

            </article>
        `;
    }).join("");
}


/* =====================================================
   13. SAIR
===================================================== */

async function sairAreaAluno() {
    await banco.auth.signOut();

    window.location.href = "login-aluno.html";
}


/* =====================================================
   14. MENSAGENS
===================================================== */

function mostrarMensagemChamado(texto, tipo) {
    if (!mensagemNovoChamado) {
        return;
    }

    mensagemNovoChamado.textContent = texto;

    mensagemNovoChamado.className = "mensagem-login-aluno";

    if (tipo) {
        mensagemNovoChamado.classList.add(tipo);
    }
}


/* =====================================================
   15. FUNÇÕES AUXILIARES
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

function formatarTipoAjuda(tipo) {
    const nomes = {
        duvida_atividade: "Dúvida em atividade",
        dificuldade_projeto: "Dificuldade em projeto",
        organizacao_estudos: "Organização dos estudos",
        apoio_paeet: "Apoio PAEET",
        problema_acesso: "Problema de acesso ao sistema",
        outro: "Outro assunto"
    };

    return nomes[tipo] || tipo || "Solicitação de ajuda";
}

function formatarStatusChamado(status) {
    const nomes = {
        enviado: "🟡 Enviado",
        em_analise: "🔵 Em análise",
        respondido: "🟢 Respondido",
        resolvido: "✅ Resolvido",
        arquivado: "⚪ Arquivado"
    };

    return nomes[status] || "🟡 Enviado";
}

function formatarDataHoraBR(dataISO) {
    if (!dataISO) {
        return "";
    }

    const data = new Date(dataISO);

    if (isNaN(data.getTime())) {
        return "";
    }

    return data.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
    }) + " às " + data.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit"
    });
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

/* =====================================================
   ABRIR FORMULÁRIO AUTOMATICAMENTE QUANDO VIER DA HOME
===================================================== */

function verificarAcaoInicialDaAreaAluno() {
    const parametros = new URLSearchParams(window.location.search);

    const abrirChamado = parametros.get("abrirChamado");

    if (abrirChamado !== "1") {
        return;
    }

    if (formNovoChamado) {
        formNovoChamado.style.display = "block";
    }

    if (btnMostrarFormularioChamado) {
        btnMostrarFormularioChamado.textContent = "Fechar formulário";
    }

    setTimeout(function () {
        const areaNovoChamado = document.querySelector(".area-novo-chamado");

        if (areaNovoChamado) {
            areaNovoChamado.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });
        }

        if (mensagemAjudaAluno) {
            mensagemAjudaAluno.focus();
        }
    }, 400);
}