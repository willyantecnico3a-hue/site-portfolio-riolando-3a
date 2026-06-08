// =====================================================
// AGENDA PEDAGÓGICA INTERATIVA
// HTML + CSS + JAVASCRIPT PURO + SUPABASE
// =====================================================
//
// Regra principal desta versão:
//
// 1. Visitantes sem login podem visualizar a agenda.
// 2. Alunos, gestão e visitantes conseguem ver eventos.
// 3. O filtro por curso fica visível para todos.
// 4. Apenas admin logado pode criar, editar e excluir eventos.
// 5. O calendário não redireciona mais para login.
// 6. O botão "+ Criar novo evento" aparece somente para admin.
// 7. Eventos aparecem resumidos no quadrante do dia, estilo Google Agenda.
// 8. Ao clicar no quadrante, abre o cronograma completo daquele dia.
//
// =====================================================


// =====================================================
// 1. CONEXÃO COM SUPABASE
// =====================================================

const SUPABASE_URL = "https://pwomyoprbvoimqmikvev.supabase.co";

// Chave pública / anon / publishable do Supabase.
// Nunca use service_role no navegador.
const SUPABASE_KEY = "sb_publishable_elGQyDU7ngaUHCLWIHLhDQ_IxiLo6kD";

const banco = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);


// =====================================================
// 2. VARIÁVEIS GLOBAIS
// =====================================================

let dataAtual = new Date();
let eventosCarregados = [];
let perfilUsuario = null;
let dataSelecionadaNoModal = null;
let eventoEmEdicaoId = null;
let eventoParaExcluirId = null;
let eventoParaExcluirObjeto = null;

// Controla quando o usuário fez swipe no calendário.
// Serve para evitar abrir o modal do dia sem querer.
let usuarioFezSwipeNoCalendario = false;


// =====================================================
// 3. ELEMENTOS DA TELA
// =====================================================

const gradeCalendario = document.getElementById("gradeCalendario");
const tituloMesAno = document.getElementById("tituloMesAno");

const btnMesAnterior = document.getElementById("btnMesAnterior");
const btnProximoMes = document.getElementById("btnProximoMes");

const modalDia = document.getElementById("modalDia");
const modalTituloData = document.getElementById("modalTituloData");
const listaEventosDia = document.getElementById("listaEventosDia");
const btnFecharModal = document.getElementById("btnFecharModal");

const btnAbrirFormEvento = document.getElementById("btnAbrirFormEvento");
const formEvento = document.getElementById("formEvento");
const tituloFormularioEvento = document.getElementById("tituloFormularioEvento");

const areaFiltroAdmin = document.getElementById("areaFiltroAdmin");
const filtroCursoAgenda = document.getElementById("filtroCursoAgenda");

const modalDetalheEvento = document.getElementById("modalDetalheEvento");
const conteudoDetalheEvento = document.getElementById("conteudoDetalheEvento");
const btnFecharDetalheEvento = document.getElementById("btnFecharDetalheEvento");

const modalConfirmarExclusao = document.getElementById("modalConfirmarExclusao");
const btnCancelarExclusao = document.getElementById("btnCancelarExclusao");


// =====================================================
// 4. INICIAR A AGENDA
// =====================================================

document.addEventListener("DOMContentLoaded", iniciarAgenda);

async function iniciarAgenda() {
    await carregarPerfilUsuario();

    configurarPermissoesDaTela();

    await carregarEventosDoMes();

    renderizarCalendario();

    configurarArrasteTrocaMesNoCalendario();

    console.log("Agenda pedagógica carregada com sucesso.");
}


// =====================================================
// 5. CARREGAR PERFIL DO USUÁRIO
// =====================================================
//
// IMPORTANTE:
// Esta função NÃO bloqueia visitantes.
// Se não houver usuário logado, cria um perfil temporário de visitante.
// Assim a agenda continua pública para visualização.
//
// =====================================================

async function carregarPerfilUsuario() {
    const { data: userData, error: userError } = await banco.auth.getUser();

    if (userError || !userData || !userData.user) {
        perfilUsuario = {
            id: null,
            nome: "Visitante",
            email: "",
            funcao: "visitante",
            curso: "todos"
        };

        console.log("Agenda aberta sem login. Perfil visitante aplicado.");
        return;
    }

    const usuario = userData.user;

    console.log("Usuário logado na agenda:", usuario.email);

    // Primeiro tenta buscar na tabela perfis.
    const { data: perfil, error: erroPerfil } = await banco
        .from("perfis")
        .select("id, nome, email, funcao, curso")
        .eq("id", usuario.id)
        .maybeSingle();

    if (erroPerfil) {
        console.log("Erro ao buscar perfil:", erroPerfil);
    }

    if (perfil) {
        perfilUsuario = perfil;
        console.log("Perfil encontrado na tabela perfis:", perfilUsuario);
        return;
    }

    // Depois tenta reconhecer como admin pela tabela admins.
    const { data: admin, error: erroAdmin } = await banco
        .from("admins")
        .select("email")
        .eq("email", usuario.email)
        .maybeSingle();

    if (erroAdmin) {
        console.log("Erro ao buscar admin:", erroAdmin);
    }

    if (admin) {
        perfilUsuario = {
            id: usuario.id,
            nome: usuario.email,
            email: usuario.email,
            funcao: "admin",
            curso: "todos"
        };

        console.log("Usuário reconhecido como admin pela tabela admins:", perfilUsuario);
        return;
    }

    // Se está logado, mas não é admin e não tem perfil cadastrado.
    perfilUsuario = {
        id: usuario.id,
        nome: usuario.email,
        email: usuario.email,
        funcao: "visitante",
        curso: "todos"
    };

    console.log("Usuário logado sem perfil específico. Tratado como visitante:", perfilUsuario);
}


// =====================================================
// 6. CONFIGURAR PERMISSÕES DA TELA
// =====================================================
//
// O filtro por curso fica visível para todos.
// Somente criar, editar e excluir ficam restritos ao admin.
//
// =====================================================

function configurarPermissoesDaTela() {
    const usuarioEhAdmin =
        perfilUsuario &&
        perfilUsuario.funcao === "admin";

    // Filtro por curso fica sempre visível.
    if (areaFiltroAdmin) {
        areaFiltroAdmin.style.display = "block";
    }

    // Admin pode criar evento.
    if (usuarioEhAdmin) {
        if (btnAbrirFormEvento) {
            btnAbrirFormEvento.style.display = "block";
        }

        console.log("Agenda em modo admin: filtro, criação, edição e exclusão liberados.");
        return;
    }

    // Visitante, aluno e gestão não podem criar evento.
    if (btnAbrirFormEvento) {
        btnAbrirFormEvento.style.display = "none";
    }

    if (formEvento) {
        formEvento.style.display = "none";
    }

    console.log("Agenda em modo público: filtro visível, edição desativada.");
}


// =====================================================
// 7. BUSCAR EVENTOS DO MÊS
// =====================================================

async function carregarEventosDoMes() {
    const ano = dataAtual.getFullYear();
    const mes = dataAtual.getMonth();

    const primeiroDia = new Date(ano, mes, 1);
    const ultimoDia = new Date(ano, mes + 1, 0);

    const inicio = formatarDataISO(primeiroDia);
    const fim = formatarDataISO(ultimoDia);

    let consulta = banco
        .from("eventos")
        .select("*")
        .gte("data", inicio)
        .lte("data", fim)
        .order("data", { ascending: true })
        .order("horario_inicio", { ascending: true });

    // O filtro por curso funciona para todos, mesmo sem login.
    if (filtroCursoAgenda) {
        const filtro = filtroCursoAgenda.value;

        if (filtro && filtro !== "todos") {
            consulta = consulta.eq("curso_alvo", filtro);
        }
    }

    const { data, error } = await consulta;

    if (error) {
        console.log("Erro ao buscar eventos:", error);

        eventosCarregados = [];

        alert(
            "Não foi possível carregar os eventos da agenda. Verifique as permissões SELECT da tabela eventos no Supabase."
        );

        return;
    }

    eventosCarregados = aplicarFiltroDePermissao(data || []);

    console.log("Eventos carregados:", eventosCarregados);
}


// =====================================================
// 8. FILTRO DE PERMISSÃO
// =====================================================
//
// Visitante sem login vê a agenda pública.
// Admin vê tudo.
// Gestão vê tudo.
// Aluno, se estiver logado com perfil de aluno, vê eventos do curso dele
// e eventos gerais.
//
// =====================================================

function aplicarFiltroDePermissao(eventos) {
    if (!perfilUsuario) {
        return eventos;
    }

    const funcao = perfilUsuario.funcao;
    const curso = perfilUsuario.curso;

    if (funcao === "admin") {
        return eventos;
    }

    if (
        funcao === "coordenacao" ||
        funcao === "direcao" ||
        funcao === "vice_direcao" ||
        funcao === "gestao"
    ) {
        return eventos;
    }

    if (funcao && funcao.startsWith("aluno")) {
        return eventos.filter(function (evento) {
            return (
                evento.curso_alvo === "todos" ||
                evento.curso_alvo === curso ||
                (
                    normalizarTipo(evento.tipo) === "ot" &&
                    evento.curso_alvo === curso
                )
            );
        });
    }

    // Visitante vê eventos públicos.
    // Como sua proposta é transparência da agenda, visitante vê tudo.
    return eventos;
}


// =====================================================
// 9. RENDERIZAR CALENDÁRIO
// =====================================================
//
// Versão corrigida:
// - Garante que os dias do mês apareçam.
// - Mostra eventos resumidos dentro do quadrante.
// - Ao clicar no quadrante, abre o cronograma completo.
// - Visitantes visualizam sem login.
// - Admin continua com editar/excluir/criar.
//
// =====================================================

function renderizarCalendario() {
    if (!gradeCalendario || !tituloMesAno) {
        console.log("Erro: gradeCalendario ou tituloMesAno não encontrado no HTML.");
        return;
    }

    console.log("Renderizando calendário...");
    console.log("Eventos carregados:", eventosCarregados);

    gradeCalendario.innerHTML = "";

    const ano = dataAtual.getFullYear();
    const mes = dataAtual.getMonth();

    const primeiroDiaMes = new Date(ano, mes, 1);
    const ultimoDiaMes = new Date(ano, mes + 1, 0);

    const nomeMes = dataAtual.toLocaleDateString("pt-BR", {
        month: "long",
        year: "numeric"
    });

    tituloMesAno.textContent = primeiraLetraMaiuscula(nomeMes);

    const diaSemanaInicio = primeiroDiaMes.getDay();

    // Cria espaços vazios antes do primeiro dia do mês.
    for (let i = 0; i < diaSemanaInicio; i++) {
        const vazio = document.createElement("div");
        vazio.className = "dia-vazio";
        gradeCalendario.appendChild(vazio);
    }

    // Cria todos os dias do mês.
    for (let dia = 1; dia <= ultimoDiaMes.getDate(); dia++) {
        const dataDia = new Date(ano, mes, dia);
        const dataISO = formatarDataISO(dataDia);

        const eventosDoDia = eventosCarregados
            .filter(function (evento) {
                return evento.data === dataISO;
            })
            .sort(function (a, b) {
                return (a.horario_inicio || "").localeCompare(b.horario_inicio || "");
            });

        const cardDia = document.createElement("div");

        // Mantém a classe antiga e adiciona a nova.
        // Isso evita quebrar o CSS que já existia.
        cardDia.className = "dia-calendario dia-calendario-google";

        if (dataISO === formatarDataISO(new Date())) {
            cardDia.classList.add("dia-hoje");
        }

        const limiteEventosVisiveis = window.innerWidth <= 700 ? 5 : 4;

        const eventosVisiveis = eventosDoDia.slice(0, limiteEventosVisiveis);
        const eventosOcultos = eventosDoDia.length - eventosVisiveis.length;

        cardDia.innerHTML = `
            <div class="cabecalho-dia-google">
                <span class="numero-dia-google">${dia}</span>
            </div>

            <div class="lista-eventos-google">
                ${
                    eventosVisiveis.map(function (evento) {
                        return `
                            <div
                                class="evento-google-resumo tipo-${normalizarTipo(evento.tipo)}"
                                title="${escaparHTML(evento.titulo || "")}"
                            >
                                <span class="hora-evento-google">
                                    ${formatarHorarioCurto(evento.horario_inicio)}
                                </span>

                                <span class="titulo-evento-google">
                                    ${escaparHTML(evento.titulo || "Sem título")}
                                </span>
                            </div>
                        `;
                    }).join("")
                }

                ${
                    eventosOcultos > 0
                    ? `
                        <div class="mais-eventos-google">
                            +${eventosOcultos} evento(s)
                        </div>
                    `
                    : ""
                }
            </div>
        `;

        // Clique no quadrante abre os eventos completos do dia.
        cardDia.addEventListener("click", function () {
            if (usuarioFezSwipeNoCalendario) {
                usuarioFezSwipeNoCalendario = false;
                return;
            }

            abrirModalDoDia(dataISO, eventosDoDia);
        });

        gradeCalendario.appendChild(cardDia);
    }

    console.log("Calendário renderizado com sucesso.");
}


// =====================================================
// 10. ABRIR MODAL DO DIA
// =====================================================
//
// Ao clicar no quadrante do calendário, abre uma tela com
// o cronograma completo do dia.
// Não exige login para visualizar.
// Admin continua sendo o único que pode criar, editar e excluir.
//
// =====================================================

function abrirModalDoDia(dataISO, eventosDoDia) {
    if (!modalDia || !modalTituloData || !listaEventosDia) {
        return;
    }

    dataSelecionadaNoModal = dataISO;

    modalTituloData.textContent = `Eventos de ${formatarDataBR(dataISO)}`;

    if (!eventosDoDia || eventosDoDia.length === 0) {
        listaEventosDia.innerHTML = `
            <div class="agenda-dia-vazia">
                <p>Nenhum evento cadastrado para este dia.</p>
            </div>
        `;
    } else {
        const eventosOrdenados = [...eventosDoDia].sort(function (a, b) {
            return (a.horario_inicio || "").localeCompare(b.horario_inicio || "");
        });

        listaEventosDia.innerHTML = "";

        eventosOrdenados.forEach(function (evento) {
            const usuarioPodeEditar =
                perfilUsuario &&
                perfilUsuario.funcao === "admin";

            listaEventosDia.innerHTML += `
                <div class="card-evento-dia card-evento-dia-google">

                    <div class="linha-topo-evento-dia-google">
                        <span class="tag-legenda tipo-${normalizarTipo(evento.tipo)}">
                            ${nomeBonitoTipo(evento.tipo)}
                        </span>

                        <span class="horario-destaque-evento-google">
                            ${formatarHorarioCurto(evento.horario_inicio)}
                            ${
                                evento.horario_fim
                                ? " às " + formatarHorarioCurto(evento.horario_fim)
                                : ""
                            }
                        </span>
                    </div>

                    <h3>${escaparHTML(evento.titulo || "Sem título")}</h3>

                    <p class="descricao-evento-dia-google">
                        ${escaparHTML(evento.descricao || "Sem descrição cadastrada.")}
                    </p>

                    <div class="info-evento-dia-google">
                        <p>
                            <strong>Curso alvo:</strong>
                            ${formatarCursoBonito(evento.curso_alvo || "todos")}
                        </p>

                        ${
                            evento.link_material
                            ? `
                                <p>
                                    <strong>Material:</strong>
                                    <a href="${evento.link_material}" target="_blank">
                                        📎 Abrir material
                                    </a>
                                </p>
                            `
                            : ""
                        }
                    </div>

                    <div class="acoes-evento-publico-google">
                        <button onclick="abrirDetalheEvento('${evento.id}')">
                            Ver detalhes completos
                        </button>

                        ${
                            usuarioPodeEditar
                            ? `
                                <button onclick="prepararEdicaoEvento('${evento.id}')" class="btn-editar-evento-modal">
                                    ✏️ Editar
                                </button>

                                <button onclick="excluirEvento('${evento.id}')" class="btn-excluir-evento-modal">
                                    🗑️ Excluir
                                </button>
                            `
                            : ""
                        }
                    </div>

                </div>
            `;
        });
    }

    // Botão criar evento só aparece para admin.
    if (btnAbrirFormEvento) {
        if (perfilUsuario && perfilUsuario.funcao === "admin") {
            btnAbrirFormEvento.style.display = "block";
        } else {
            btnAbrirFormEvento.style.display = "none";
        }
    }

    if (formEvento) {
        formEvento.style.display = "none";
    }

    modalDia.classList.add("aberto");
}


// =====================================================
// 11. ABRIR DETALHE DO EVENTO
// =====================================================

function abrirDetalheEvento(idEvento) {
    if (!modalDetalheEvento || !conteudoDetalheEvento) {
        return;
    }

    const evento = eventosCarregados.find(function (item) {
        return String(item.id) === String(idEvento);
    });

    if (!evento) {
        return;
    }

    const usuarioPodeEditar =
        perfilUsuario &&
        perfilUsuario.funcao === "admin";

    conteudoDetalheEvento.innerHTML = `
        <div class="detalhe-card-evento">

            <div class="topo-detalhe-evento">
                <span class="tag-legenda tipo-${normalizarTipo(evento.tipo)}">
                    ${nomeBonitoTipo(evento.tipo)}
                </span>

                ${
                    usuarioPodeEditar
                    ? `
                        <div class="acoes-evento-admin">
                            <button class="btn-editar-evento" onclick="prepararEdicaoEvento('${evento.id}')">
                                ✏️
                            </button>

                            <button class="btn-excluir-evento" onclick="excluirEvento('${evento.id}')">
                                🗑️
                            </button>
                        </div>
                    `
                    : ""
                }
            </div>

            <h2>${escaparHTML(evento.titulo || "Sem título")}</h2>

            <p><strong>Data:</strong> ${formatarDataBR(evento.data)}</p>

            <p>
                <strong>Horário:</strong>
                ${formatarHorarioCurto(evento.horario_inicio)}
                ${evento.horario_fim ? " às " + formatarHorarioCurto(evento.horario_fim) : ""}
            </p>

            <p><strong>Curso alvo:</strong> ${formatarCursoBonito(evento.curso_alvo || "todos")}</p>

            <p><strong>Descrição:</strong></p>

            <p>${escaparHTML(evento.descricao || "Sem descrição cadastrada.")}</p>

            ${
                evento.link_material
                ? `<p><a href="${evento.link_material}" target="_blank">📎 Abrir material</a></p>`
                : ""
            }
        </div>
    `;

    modalDetalheEvento.classList.add("aberto");
}


// =====================================================
// 12. PREPARAR EDIÇÃO
// =====================================================

function prepararEdicaoEvento(idEvento) {
    const evento = eventosCarregados.find(function (item) {
        return String(item.id) === String(idEvento);
    });

    if (!evento) {
        alert("Evento não encontrado para edição.");
        return;
    }

    if (!perfilUsuario || perfilUsuario.funcao !== "admin") {
        alert("Apenas o administrador pode editar eventos.");
        return;
    }

    eventoEmEdicaoId = evento.id;
    dataSelecionadaNoModal = evento.data;

    if (modalDetalheEvento) {
        modalDetalheEvento.classList.remove("aberto");
    }

    const eventosDoDia = eventosCarregados.filter(function (item) {
        return item.data === evento.data;
    });

    abrirModalDoDia(evento.data, eventosDoDia);

    if (formEvento) {
        formEvento.style.display = "block";
    }

    if (tituloFormularioEvento) {
        tituloFormularioEvento.textContent = "Editar Evento";
    }

    setValorCampo("eventoTipo", evento.tipo);
    setValorCampo("eventoTitulo", evento.titulo || "");
    setValorCampo("eventoHorarioInicio", formatarHorarioParaInput(evento.horario_inicio));
    setValorCampo("eventoHorarioFim", formatarHorarioParaInput(evento.horario_fim));
    setValorCampo("eventoDescricao", evento.descricao || "");
    setValorCampo("eventoCursoAlvo", evento.curso_alvo || "todos");
    setValorCampo("eventoLinkMaterial", evento.link_material || "");
    setValorCampo("eventoLembreteMinutos", evento.lembrete_minutos || 10);
    setValorCampo("eventoRepeticao", "nao_repete");
    setValorCampo("eventoRepetirAte", "");

    const mensagemEvento = document.getElementById("mensagemEvento");

    if (mensagemEvento) {
        mensagemEvento.textContent = "Editando evento selecionado.";
    }

    const botaoSalvar = formEvento ? formEvento.querySelector("button[type='submit']") : null;

    if (botaoSalvar) {
        botaoSalvar.textContent = "💾 Atualizar Evento";
    }
}


// =====================================================
// 13. EXCLUIR EVENTO - ABRE MODAL COM OPÇÕES
// =====================================================

function excluirEvento(idEvento) {
    if (!perfilUsuario || perfilUsuario.funcao !== "admin") {
        alert("Apenas o administrador pode excluir eventos.");
        return;
    }

    const evento = eventosCarregados.find(function (item) {
        return String(item.id) === String(idEvento);
    });

    if (!evento) {
        alert("Evento não encontrado para exclusão.");
        return;
    }

    eventoParaExcluirId = idEvento;
    eventoParaExcluirObjeto = evento;

    if (modalConfirmarExclusao) {
        modalConfirmarExclusao.classList.add("aberto");
    }
}


// =====================================================
// 14. FECHAR MODAIS
// =====================================================

if (btnFecharModal) {
    btnFecharModal.addEventListener("click", function () {
        if (modalDia) {
            modalDia.classList.remove("aberto");
        }
    });
}

if (btnFecharDetalheEvento) {
    btnFecharDetalheEvento.addEventListener("click", function () {
        if (modalDetalheEvento) {
            modalDetalheEvento.classList.remove("aberto");
        }
    });
}


// =====================================================
// 15. ABRIR FORMULÁRIO
// =====================================================

if (btnAbrirFormEvento) {
    btnAbrirFormEvento.addEventListener("click", function () {
        if (!perfilUsuario || perfilUsuario.funcao !== "admin") {
            alert("Apenas o administrador pode criar eventos.");
            return;
        }

        eventoEmEdicaoId = null;

        limparFormularioEvento();

        if (tituloFormularioEvento) {
            tituloFormularioEvento.textContent = "Novo Evento";
        }

        if (formEvento) {
            formEvento.style.display =
                formEvento.style.display === "none" || formEvento.style.display === ""
                    ? "block"
                    : "none";
        }
    });
}


// =====================================================
// 16. SALVAR OU ATUALIZAR EVENTO
// =====================================================

if (formEvento) {
    formEvento.addEventListener("submit", async function (event) {
        event.preventDefault();

        if (!perfilUsuario || perfilUsuario.funcao !== "admin") {
            alert("Apenas o administrador pode criar ou editar eventos.");
            return;
        }

        const tipo = getValorCampo("eventoTipo");
        const titulo = getValorCampo("eventoTitulo").trim();
        const horarioInicio = getValorCampo("eventoHorarioInicio");
        const horarioFim = getValorCampo("eventoHorarioFim");
        const descricao = getValorCampo("eventoDescricao").trim();
        const cursoAlvo = getValorCampo("eventoCursoAlvo");
        const linkMaterial = getValorCampo("eventoLinkMaterial").trim();
        const repeticao = getValorCampo("eventoRepeticao") || "nao_repete";
        const repetirAte = getValorCampo("eventoRepetirAte");
        const lembreteMinutos = Number(getValorCampo("eventoLembreteMinutos") || 10);
        const mensagemEvento = document.getElementById("mensagemEvento");

        if (!titulo) {
            if (mensagemEvento) {
                mensagemEvento.textContent = "Preencha o título do evento.";
            }
            return;
        }

        if (!horarioInicio) {
            if (mensagemEvento) {
                mensagemEvento.textContent = "Preencha o horário de início.";
            }
            return;
        }

        const dadosBase = {
    tipo: tipo,
    titulo: titulo,
    horario_inicio: horarioInicio,
    horario_fim: horarioFim || null,
    descricao: descricao,
    curso_alvo: cursoAlvo,
    link_material: linkMaterial,
    lembrete_minutos: lembreteMinutos
};

        let resultado;

        if (eventoEmEdicaoId) {
            resultado = await banco
                .from("eventos")
                .update({
                    ...dadosBase,
                    data: dataSelecionadaNoModal
                })
                .eq("id", eventoEmEdicaoId);
        } else {
            const { data: userData } = await banco.auth.getUser();

            if (!userData || !userData.user) {
                if (mensagemEvento) {
                    mensagemEvento.textContent = "Usuário não autenticado.";
                }
                return;
            }

            const eventosParaSalvar = gerarEventosComRepeticao({
                ...dadosBase,
                data: dataSelecionadaNoModal,
                criado_por: userData.user.id
            }, repeticao, repetirAte);

            if (eventosParaSalvar.length === 0) {
                if (mensagemEvento) {
                    mensagemEvento.textContent = "Nenhuma data válida encontrada para salvar.";
                }
                return;
            }

            resultado = await banco
                .from("eventos")
                .insert(eventosParaSalvar);
        }

        if (resultado.error) {
            if (mensagemEvento) {
                mensagemEvento.textContent = "Erro ao salvar evento: " + resultado.error.message;
            }

            console.log("Erro evento:", resultado.error);
            return;
        }

        if (mensagemEvento) {
            mensagemEvento.textContent = eventoEmEdicaoId
                ? "Evento atualizado com sucesso!"
                : "Evento salvo com sucesso!";
        }

        limparFormularioEvento();

        await carregarEventosDoMes();

        renderizarCalendario();

        const eventosAtualizados = eventosCarregados.filter(function (evento) {
            return evento.data === dataSelecionadaNoModal;
        });

        abrirModalDoDia(dataSelecionadaNoModal, eventosAtualizados);
    });
}


// =====================================================
// 17. GERAR EVENTOS COM REPETIÇÃO
// =====================================================
//
// Todos os eventos repetidos recebem o mesmo serie_id.
// Isso permite excluir:
// - somente este;
// - este e os próximos;
// - toda a série.
//
// =====================================================

function gerarEventosComRepeticao(eventoBase, repeticao, repetirAte) {
    const serieId = gerarSerieIdEvento();

    if (repeticao === "nao_repete" || !repetirAte) {
        return [
            {
                ...eventoBase,
                data: eventoBase.data,
                repeticao: "nao_repete",
                serie_id: serieId
            }
        ];
    }

    const eventos = [];

    let dataCursor = criarDataLocal(eventoBase.data);
    const dataLimite = criarDataLocal(repetirAte);

    if (dataLimite < dataCursor) {
        return [];
    }

    while (dataCursor <= dataLimite) {
        if (dataEhDiaLetivo(dataCursor)) {
            eventos.push({
                ...eventoBase,
                data: formatarDataISO(dataCursor),
                repeticao: repeticao,
                serie_id: serieId
            });
        }

        if (repeticao === "diariamente") {
            dataCursor.setDate(dataCursor.getDate() + 1);
        } else if (repeticao === "semanalmente") {
            dataCursor.setDate(dataCursor.getDate() + 7);
        } else if (repeticao === "mensalmente") {
            dataCursor.setMonth(dataCursor.getMonth() + 1);
        } else if (repeticao === "anualmente") {
            dataCursor.setFullYear(dataCursor.getFullYear() + 1);
        } else {
            break;
        }
    }

    return eventos;
}


// =====================================================
// GERAR ID DA SÉRIE DO EVENTO
// =====================================================

function gerarSerieIdEvento() {
    return "serie_" + Date.now() + "_" + Math.random().toString(36).substring(2, 10);
}


// =====================================================
// 18. VERIFICAR DIAS LETIVOS
// =====================================================

const feriadosFixos = [
    "01-01",
    "04-21",
    "05-01",
    "09-07",
    "10-12",
    "11-02",
    "11-15",
    "12-25"
];

function dataEhDiaLetivo(data) {
    const diaSemana = data.getDay();

    if (diaSemana === 0 || diaSemana === 6) {
        return false;
    }

    const mes = String(data.getMonth() + 1).padStart(2, "0");
    const dia = String(data.getDate()).padStart(2, "0");
    const mesDia = `${mes}-${dia}`;

    if (feriadosFixos.includes(mesDia)) {
        return false;
    }

    return true;
}


// =====================================================
// 19. LIMPAR FORMULÁRIO
// =====================================================

function limparFormularioEvento() {
    setValorCampo("eventoTitulo", "");
    setValorCampo("eventoHorarioInicio", "");
    setValorCampo("eventoHorarioFim", "");
    setValorCampo("eventoDescricao", "");
    setValorCampo("eventoLinkMaterial", "");
    setValorCampo("eventoRepeticao", "nao_repete");
    setValorCampo("eventoRepetirAte", "");
    setValorCampo("eventoLembreteMinutos", "10");

    eventoEmEdicaoId = null;

    const mensagemEvento = document.getElementById("mensagemEvento");

    if (mensagemEvento) {
        mensagemEvento.textContent = "";
    }

    const botaoSalvar = formEvento ? formEvento.querySelector("button[type='submit']") : null;

    if (botaoSalvar) {
        botaoSalvar.textContent = "💾 Salvar Evento";
    }

    if (tituloFormularioEvento) {
        tituloFormularioEvento.textContent = "Novo Evento";
    }
}


// =====================================================
// 20. CONFIRMAR EXCLUSÃO COM OPÇÕES TIPO GOOGLE AGENDA
// =====================================================

const btnExcluirSomenteEste = document.getElementById("btnExcluirSomenteEste");
const btnExcluirEsteEProximos = document.getElementById("btnExcluirEsteEProximos");
const btnExcluirTodaSerie = document.getElementById("btnExcluirTodaSerie");

if (btnExcluirSomenteEste) {
    btnExcluirSomenteEste.addEventListener("click", async function () {
        await excluirSomenteEsteEvento();
    });
}

if (btnExcluirEsteEProximos) {
    btnExcluirEsteEProximos.addEventListener("click", async function () {
        await excluirEsteEProximosEventos();
    });
}

if (btnExcluirTodaSerie) {
    btnExcluirTodaSerie.addEventListener("click", async function () {
        await excluirTodaSerieEventos();
    });
}


// =====================================================
// EXCLUIR SOMENTE ESTE EVENTO
// =====================================================

async function excluirSomenteEsteEvento() {
    if (!eventoParaExcluirId) {
        return;
    }

    const { error } = await banco
        .from("eventos")
        .delete()
        .eq("id", eventoParaExcluirId);

    if (error) {
        alert("Erro ao excluir evento: " + error.message);
        console.log("Erro ao excluir evento:", error);
        return;
    }

    finalizarExclusaoEvento("Evento excluído com sucesso!");
}


// =====================================================
// EXCLUIR ESTE E OS PRÓXIMOS EVENTOS DA SÉRIE
// =====================================================

async function excluirEsteEProximosEventos() {
    if (!eventoParaExcluirObjeto) {
        return;
    }

    const serieId = eventoParaExcluirObjeto.serie_id;
    const dataEvento = eventoParaExcluirObjeto.data;

    if (!serieId) {
        const confirmar = confirm(
            "Este evento não possui série de repetição. Deseja excluir somente este evento?"
        );

        if (confirmar) {
            await excluirSomenteEsteEvento();
        }

        return;
    }

    const { error } = await banco
        .from("eventos")
        .delete()
        .eq("serie_id", serieId)
        .gte("data", dataEvento);

    if (error) {
        alert("Erro ao excluir este e os próximos eventos: " + error.message);
        console.log("Erro ao excluir próximos:", error);
        return;
    }

    finalizarExclusaoEvento("Este evento e os próximos foram excluídos com sucesso!");
}


// =====================================================
// EXCLUIR TODOS OS EVENTOS DA SÉRIE
// =====================================================

async function excluirTodaSerieEventos() {
    if (!eventoParaExcluirObjeto) {
        return;
    }

    const serieId = eventoParaExcluirObjeto.serie_id;

    if (!serieId) {
        const confirmar = confirm(
            "Este evento não possui série de repetição. Deseja excluir somente este evento?"
        );

        if (confirmar) {
            await excluirSomenteEsteEvento();
        }

        return;
    }

    const { error } = await banco
        .from("eventos")
        .delete()
        .eq("serie_id", serieId);

    if (error) {
        alert("Erro ao excluir todos os eventos da série: " + error.message);
        console.log("Erro ao excluir série:", error);
        return;
    }

    finalizarExclusaoEvento("Todos os eventos da série foram excluídos com sucesso!");
}


// =====================================================
// FINALIZAR EXCLUSÃO
// =====================================================

async function finalizarExclusaoEvento(mensagem) {
    if (modalConfirmarExclusao) {
        modalConfirmarExclusao.classList.remove("aberto");
    }

    if (modalDetalheEvento) {
        modalDetalheEvento.classList.remove("aberto");
    }

    if (modalDia) {
        modalDia.classList.remove("aberto");
    }

    eventoParaExcluirId = null;
    eventoParaExcluirObjeto = null;

    alert(mensagem);

    await carregarEventosDoMes();

    renderizarCalendario();
}


// =====================================================
// 21. CANCELAR EXCLUSÃO
// =====================================================

if (btnCancelarExclusao) {
    btnCancelarExclusao.addEventListener("click", function () {
        eventoParaExcluirId = null;
        eventoParaExcluirObjeto = null;

        if (modalConfirmarExclusao) {
            modalConfirmarExclusao.classList.remove("aberto");
        }
    });
}


// =====================================================
// 22. NAVEGAÇÃO ENTRE MESES PELOS BOTÕES
// =====================================================

if (btnMesAnterior) {
    btnMesAnterior.addEventListener("click", async function () {
        await mudarMes(-1);
    });
}

if (btnProximoMes) {
    btnProximoMes.addEventListener("click", async function () {
        await mudarMes(1);
    });
}

async function mudarMes(direcao) {
    dataAtual.setMonth(dataAtual.getMonth() + direcao);

    await carregarEventosDoMes();

    renderizarCalendario();
}


// =====================================================
// 23. TROCAR MÊS ARRASTANDO NO PRÓPRIO CALENDÁRIO
// =====================================================
//
// Arrastar para direita: mês anterior.
// Arrastar para esquerda: próximo mês.
//
// =====================================================

let toqueInicioX = 0;
let toqueFimX = 0;
let toqueInicioY = 0;
let toqueFimY = 0;
let gestoAtivo = false;
let swipeConfigurado = false;

function configurarArrasteTrocaMesNoCalendario() {
    if (swipeConfigurado) {
        return;
    }

    const areaSwipe = document.querySelector(".calendario");

    if (!areaSwipe) {
        console.log("Área do calendário para swipe não encontrada.");
        return;
    }

    swipeConfigurado = true;

    console.log("Swipe de meses configurado no calendário.");

    areaSwipe.style.touchAction = "pan-y";
    areaSwipe.style.userSelect = "none";
    areaSwipe.style.overscrollBehaviorX = "contain";

    areaSwipe.addEventListener("touchstart", function (event) {
        if (!event.touches || event.touches.length === 0) {
            return;
        }

        const toque = event.touches[0];
        const larguraTela = window.innerWidth;

        // Evita conflito com gesto de voltar/avançar página nas bordas do navegador.
        if (toque.clientX < 20 || toque.clientX > larguraTela - 20) {
            return;
        }

        toqueInicioX = toque.clientX;
        toqueFimX = toque.clientX;

        toqueInicioY = toque.clientY;
        toqueFimY = toque.clientY;

        gestoAtivo = true;
        usuarioFezSwipeNoCalendario = false;
    }, { passive: true });

    areaSwipe.addEventListener("touchmove", function (event) {
        if (!gestoAtivo) {
            return;
        }

        if (!event.touches || event.touches.length === 0) {
            return;
        }

        const toque = event.touches[0];

        toqueFimX = toque.clientX;
        toqueFimY = toque.clientY;

        const distanciaX = toqueFimX - toqueInicioX;
        const distanciaY = toqueFimY - toqueInicioY;

        if (Math.abs(distanciaX) > Math.abs(distanciaY) && Math.abs(distanciaX) > 15) {
            usuarioFezSwipeNoCalendario = true;

            if (event.cancelable) {
                event.preventDefault();
            }
        }
    }, { passive: false });

    areaSwipe.addEventListener("touchend", async function () {
        if (!gestoAtivo) {
            return;
        }

        gestoAtivo = false;

        await interpretarArrasteDoCalendario();
    }, { passive: true });

    areaSwipe.addEventListener("touchcancel", function () {
        gestoAtivo = false;
    });

    // Mouse para teste no computador.
    areaSwipe.addEventListener("mousedown", function (event) {
        toqueInicioX = event.clientX;
        toqueFimX = event.clientX;

        toqueInicioY = event.clientY;
        toqueFimY = event.clientY;

        gestoAtivo = true;
        usuarioFezSwipeNoCalendario = false;
    });

    areaSwipe.addEventListener("mousemove", function (event) {
        if (!gestoAtivo) {
            return;
        }

        toqueFimX = event.clientX;
        toqueFimY = event.clientY;

        const distanciaX = toqueFimX - toqueInicioX;
        const distanciaY = toqueFimY - toqueInicioY;

        if (Math.abs(distanciaX) > Math.abs(distanciaY) && Math.abs(distanciaX) > 15) {
            usuarioFezSwipeNoCalendario = true;
        }
    });

    areaSwipe.addEventListener("mouseup", async function () {
        if (!gestoAtivo) {
            return;
        }

        gestoAtivo = false;

        await interpretarArrasteDoCalendario();
    });

    areaSwipe.addEventListener("mouseleave", function () {
        gestoAtivo = false;
    });
}

async function interpretarArrasteDoCalendario() {
    const distanciaX = toqueFimX - toqueInicioX;
    const distanciaY = toqueFimY - toqueInicioY;

    if (Math.abs(distanciaY) > Math.abs(distanciaX)) {
        usuarioFezSwipeNoCalendario = false;
        return;
    }

    if (Math.abs(distanciaX) < 55) {
        usuarioFezSwipeNoCalendario = false;
        return;
    }

    usuarioFezSwipeNoCalendario = true;

    // Arrastou para direita: mês anterior.
    if (distanciaX > 0) {
        console.log("Arrastou para direita: mês anterior.");
        await mudarMes(-1);
        return;
    }

    // Arrastou para esquerda: próximo mês.
    if (distanciaX < 0) {
        console.log("Arrastou para esquerda: próximo mês.");
        await mudarMes(1);
        return;
    }
}


// =====================================================
// 24. FILTRO POR CURSO
// =====================================================
//
// Agora o filtro funciona para todos, não apenas admin.
//
// =====================================================

if (filtroCursoAgenda) {
    filtroCursoAgenda.addEventListener("change", async function () {
        await carregarEventosDoMes();

        renderizarCalendario();
    });
}


// =====================================================
// 25. FUNÇÕES AUXILIARES
// =====================================================

function criarDataLocal(dataISO) {
    if (!dataISO) {
        return new Date();
    }

    const partes = dataISO.split("-");

    return new Date(
        Number(partes[0]),
        Number(partes[1]) - 1,
        Number(partes[2])
    );
}

function formatarHorarioParaInput(horario) {
    if (!horario) {
        return "";
    }

    return horario.substring(0, 5);
}

function formatarDataISO(data) {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, "0");
    const dia = String(data.getDate()).padStart(2, "0");

    return `${ano}-${mes}-${dia}`;
}

function formatarDataBR(dataISO) {
    if (!dataISO) {
        return "Não informada";
    }

    const partes = dataISO.split("-");

    if (partes.length !== 3) {
        return dataISO;
    }

    return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function primeiraLetraMaiuscula(texto) {
    if (!texto) {
        return "";
    }

    return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function normalizarTipo(tipo) {
    if (!tipo) {
        return "outro";
    }

    return tipo
        .toString()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, "_");
}

function formatarHorarioCurto(horario) {
    if (!horario) {
        return "--:--";
    }

    return horario.substring(0, 5);
}

function nomeBonitoTipo(tipo) {
    const nomes = {
        aula: "Aula",
        atpcs: "ATPCS",
        atpcg: "ATPCG",
        apd: "APD",
        efape: "EFAPE",
        multiplica: "Multiplica",
        visita_tecnica: "Visita Técnica",
        apoio_pedagogico: "Apoio Pedagógico",
        ot: "OT",
        outro: "Outro"
    };

    return nomes[normalizarTipo(tipo)] || tipo || "Outro";
}


// =====================================================
// FORMATAR CURSO PARA APARECER BONITO NA AGENDA
// =====================================================

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

function getValorCampo(idCampo) {
    const campo = document.getElementById(idCampo);

    if (!campo) {
        return "";
    }

    return campo.value;
}

function setValorCampo(idCampo, valor) {
    const campo = document.getElementById(idCampo);

    if (!campo) {
        return;
    }

    campo.value = valor;
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

// =====================================================
// 27. LEMBRETES SONOROS E NOTIFICAÇÕES DA AGENDA
// =====================================================
//
// Funciona quando a agenda estiver aberta no navegador.
// Se o navegador estiver minimizado, a notificação do sistema
// pode aparecer normalmente, desde que o usuário tenha permitido.
//
// Para tocar som, o professor precisa clicar antes no botão:
// "🔔 Ativar lembretes sonoros".
//
// =====================================================

let lembretesAtivos = false;
let audioLembreteLiberado = false;
let lembretesJaDisparados = new Set();
let intervaloLembretesAgenda = null;

const btnAtivarLembretesAgenda = document.getElementById("btnAtivarLembretesAgenda");
const mensagemLembretesAgenda = document.getElementById("mensagemLembretesAgenda");

// Som simples criado pelo próprio navegador.
// Não precisa de arquivo MP3.
let audioContextoAgenda = null;

if (btnAtivarLembretesAgenda) {
    btnAtivarLembretesAgenda.addEventListener("click", async function () {
        await ativarLembretesDaAgenda();
    });
}

async function ativarLembretesDaAgenda() {
    // Apenas admin recebe alerta nessa primeira versão.
    if (!perfilUsuario || perfilUsuario.funcao !== "admin") {
        alert("Os lembretes sonoros estão disponíveis apenas para o administrador logado.");
        return;
    }

    // Pede permissão para notificação do navegador.
    if ("Notification" in window) {
        if (Notification.permission === "default") {
            await Notification.requestPermission();
        }
    }

    // Libera áudio após clique do usuário.
    try {
        audioContextoAgenda = new (window.AudioContext || window.webkitAudioContext)();

        if (audioContextoAgenda.state === "suspended") {
            await audioContextoAgenda.resume();
        }

        tocarSomLembreteAgenda();
        audioLembreteLiberado = true;
    } catch (erro) {
        console.log("Não foi possível liberar áudio:", erro);
        audioLembreteLiberado = false;
    }

    lembretesAtivos = true;

    if (mensagemLembretesAgenda) {
        mensagemLembretesAgenda.textContent =
            "Lembretes ativados. Você será avisado antes dos eventos cadastrados.";
    }

    if (btnAtivarLembretesAgenda) {
        btnAtivarLembretesAgenda.textContent = "🔔 Lembretes ativados";
        btnAtivarLembretesAgenda.disabled = true;
    }

    verificarLembretesDaAgenda();

    if (!intervaloLembretesAgenda) {
        intervaloLembretesAgenda = setInterval(function () {
            verificarLembretesDaAgenda();
        }, 60000);
    }
}

function verificarLembretesDaAgenda() {
    if (!lembretesAtivos) {
        return;
    }

    if (!perfilUsuario || perfilUsuario.funcao !== "admin") {
        return;
    }

    const agora = new Date();

    eventosCarregados.forEach(function (evento) {
        if (!evento.data || !evento.horario_inicio) {
            return;
        }

        const minutosAntes = Number(evento.lembrete_minutos || 0);

        if (minutosAntes <= 0) {
            return;
        }

        const dataHoraEvento = criarDataHoraEvento(evento.data, evento.horario_inicio);

        if (!dataHoraEvento) {
            return;
        }

        const diferencaMs = dataHoraEvento.getTime() - agora.getTime();
        const diferencaMinutos = Math.round(diferencaMs / 60000);

        const chaveLembrete = `${evento.id}_${evento.data}_${evento.horario_inicio}_${minutosAntes}`;

        if (
            diferencaMinutos <= minutosAntes &&
            diferencaMinutos >= 0 &&
            !lembretesJaDisparados.has(chaveLembrete)
        ) {
            lembretesJaDisparados.add(chaveLembrete);

            dispararLembreteEvento(evento, diferencaMinutos);
        }
    });
}

function criarDataHoraEvento(dataISO, horario) {
    try {
        const horarioLimpo = horario.substring(0, 5);
        const dataHora = new Date(`${dataISO}T${horarioLimpo}:00`);

        if (isNaN(dataHora.getTime())) {
            return null;
        }

        return dataHora;
    } catch (erro) {
        console.log("Erro ao criar data/hora do evento:", erro);
        return null;
    }
}

function dispararLembreteEvento(evento, diferencaMinutos) {
    const tituloEvento = evento.titulo || "Compromisso da agenda";
    const horarioEvento = formatarHorarioCurto(evento.horario_inicio);

    const mensagem = `${tituloEvento} começa em ${diferencaMinutos} minuto(s). Horário: ${horarioEvento}.`;

    tocarSomLembreteAgenda();

    mostrarNotificacaoNavegadorAgenda(tituloEvento, mensagem);

    mostrarAlertaVisualAgenda(tituloEvento, mensagem);
}

function mostrarNotificacaoNavegadorAgenda(tituloEvento, mensagem) {
    if (!("Notification" in window)) {
        console.log("Navegador não suporta notificações.");
        return;
    }

    if (Notification.permission !== "granted") {
        console.log("Permissão de notificação não concedida.");
        return;
    }

    new Notification("🔔 Lembrete da Agenda Pedagógica", {
        body: mensagem,
        icon: "favicon.ico",
        tag: "lembrete-agenda-" + tituloEvento
    });
}

function mostrarAlertaVisualAgenda(tituloEvento, mensagem) {
    const alertaExistente = document.getElementById("alertaVisualAgenda");

    if (alertaExistente) {
        alertaExistente.remove();
    }

    const alerta = document.createElement("div");
    alerta.id = "alertaVisualAgenda";
    alerta.className = "alerta-visual-agenda";

    alerta.innerHTML = `
        <div class="alerta-visual-agenda-card">
            <strong>🔔 Lembrete da Agenda</strong>
            <p>${escaparHTML(mensagem)}</p>
            <button type="button" onclick="fecharAlertaVisualAgenda()">
                OK
            </button>
        </div>
    `;

    document.body.appendChild(alerta);

    // Também mostra alert tradicional como reforço.
    // Se preferir algo menos invasivo, pode remover essa linha.
    alert("🔔 Lembrete da Agenda\n\n" + mensagem);
}

function fecharAlertaVisualAgenda() {
    const alerta = document.getElementById("alertaVisualAgenda");

    if (alerta) {
        alerta.remove();
    }
}

function tocarSomLembreteAgenda() {
    if (!audioContextoAgenda) {
        return;
    }

    try {
        const oscilador = audioContextoAgenda.createOscillator();
        const ganho = audioContextoAgenda.createGain();

        oscilador.type = "sine";
        oscilador.frequency.setValueAtTime(880, audioContextoAgenda.currentTime);

        ganho.gain.setValueAtTime(0.001, audioContextoAgenda.currentTime);
        ganho.gain.exponentialRampToValueAtTime(0.3, audioContextoAgenda.currentTime + 0.02);
        ganho.gain.exponentialRampToValueAtTime(0.001, audioContextoAgenda.currentTime + 0.6);

        oscilador.connect(ganho);
        ganho.connect(audioContextoAgenda.destination);

        oscilador.start();
        oscilador.stop(audioContextoAgenda.currentTime + 0.65);
    } catch (erro) {
        console.log("Erro ao tocar som do lembrete:", erro);
    }
}

window.fecharAlertaVisualAgenda = fecharAlertaVisualAgenda;


// =====================================================
// 26. EXPOR FUNÇÕES PARA O HTML
// =====================================================

window.abrirDetalheEvento = abrirDetalheEvento;
window.prepararEdicaoEvento = prepararEdicaoEvento;
window.excluirEvento = excluirEvento;