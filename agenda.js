/* =====================================================
   AGENDA PEDAGÓGICA INTERATIVA
   HTML + CSS + JAVASCRIPT PURO + SUPABASE

   VERSÃO CORRIGIDA COM PERFIS:
   - Admin pode criar, editar e excluir eventos.
   - Professor e coordenação podem visualizar a agenda sem editar.
   - Remove todas as tentativas de modal flutuante/sobreposto.
   - Mantém o formulário dentro do modal do dia.
   - Botão EDITAR volta a funcionar.
   - Botão + CRIAR EVENTO NESTE DIA volta a funcionar.
   - Ao clicar em editar/criar, a tela desce automaticamente até o formulário.
   - Trava o cadastro de eventos no mesmo dia e horário/período.
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

let dataAtual = new Date();
let eventosCarregados = [];
let perfilUsuario = null;
let dataSelecionadaNoModal = null;
let eventoEmEdicaoId = null;
let eventoParaExcluirId = null;
let eventoParaExcluirObjeto = null;
let usuarioFezSwipeNoCalendario = false;
let perfilAcessoAgenda = null;
let agendaSomenteLeitura = false;


/* =====================================================
   3. ELEMENTOS DA TELA
===================================================== */

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


/* =====================================================
   4. INICIAR A AGENDA
===================================================== */

document.addEventListener("DOMContentLoaded", iniciarAgenda);

async function iniciarAgenda() {
    await carregarPerfilUsuario();

    configurarPermissoesDaTela();

    await carregarConfiguracaoExpedientePaeet();

    configurarDisponibilidadePaeet();

    await carregarEventosDoMes();

    renderizarCalendario();

    preencherDataHojeDisponibilidadePaeet();

    await carregarDisponibilidadePaeet();

    configurarArrasteTrocaMesNoCalendario();

    configurarCliqueDosBotoesDinamicos();

    console.log("Agenda pedagógica carregada com sucesso.");
}


/* =====================================================
   5. CARREGAR PERFIL DO USUÁRIO
===================================================== */

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

        perfilAcessoAgenda = null;
        agendaSomenteLeitura = true;

        console.log("Agenda aberta sem login. Perfil visitante aplicado em modo visualização.");
        return;
    }

    const usuario = userData.user;
    const emailUsuario = usuario.email ? usuario.email.toLowerCase() : "";

    console.log("Usuário logado na agenda:", emailUsuario);

    // 1º - Admin tem prioridade para liberar edição total
    const { data: admin, error: erroAdmin } = await banco
        .from("admins")
        .select("email")
        .ilike("email", emailUsuario)
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

        perfilAcessoAgenda = {
            user_id: usuario.id,
            nome: usuario.email,
            email: usuario.email,
            perfil: "admin",
            ativo: true
        };

        agendaSomenteLeitura = false;

        console.log("Usuário reconhecido como admin pela tabela admins:", perfilUsuario);
        return;
    }

    // 2º - Perfil limitado de professor/coordenação
    const { data: perfilAcesso, error: erroPerfilAcesso } = await banco
        .from("perfis_acesso")
        .select("*")
        .ilike("email", emailUsuario)
        .eq("ativo", true)
        .maybeSingle();

    if (erroPerfilAcesso) {
        console.log("Erro ao buscar perfil em perfis_acesso:", erroPerfilAcesso);
    }

    if (perfilAcesso) {
        perfilAcessoAgenda = perfilAcesso;

        perfilUsuario = {
            id: usuario.id,
            nome: perfilAcesso.nome || usuario.email,
            email: usuario.email,
            funcao: perfilAcesso.perfil,
            curso: perfilAcesso.curso || "todos"
        };

        agendaSomenteLeitura =
            perfilAcesso.perfil === "professor" ||
            perfilAcesso.perfil === "coordenacao";

        console.log("Perfil encontrado em perfis_acesso:", perfilUsuario);
        return;
    }

    // 3º - Compatibilidade com tabela antiga perfis
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
        agendaSomenteLeitura = perfil.funcao !== "admin";

        console.log("Perfil encontrado na tabela perfis:", perfilUsuario);
        return;
    }

    // 4º - Usuário autenticado, mas sem permissão administrativa
    perfilUsuario = {
        id: usuario.id,
        nome: usuario.email,
        email: usuario.email,
        funcao: "visitante",
        curso: "todos"
    };

    perfilAcessoAgenda = null;
    agendaSomenteLeitura = true;

    console.log("Usuário logado sem perfil específico. Tratado como visitante:", perfilUsuario);
}


/* =====================================================
   6. CONFIGURAR PERMISSÕES DA TELA
===================================================== */

function configurarPermissoesDaTela() {
    const usuarioEhAdmin = usuarioPodeEditarAgenda();

    if (areaFiltroAdmin) {
        areaFiltroAdmin.style.display = "block";
    }

    if (btnAbrirFormEvento) {
        btnAbrirFormEvento.style.display = usuarioEhAdmin ? "block" : "none";
    }

    if (!usuarioEhAdmin && formEvento) {
        formEvento.style.display = "none";
    }

    const areaConfiguracaoExpedientePaeet = document.getElementById("areaConfiguracaoExpedientePaeet");

    if (areaConfiguracaoExpedientePaeet) {
        areaConfiguracaoExpedientePaeet.style.display = usuarioEhAdmin ? "block" : "none";
    }

    if (!usuarioEhAdmin) {
        agendaSomenteLeitura = true;
        aplicarModoSomenteLeituraAgenda();
    } else {
        agendaSomenteLeitura = false;
        document.body.classList.remove("modo-somente-leitura-agenda");

        const aviso = document.getElementById("avisoAgendaSomenteLeitura");

        if (aviso) {
            aviso.style.display = "none";
        }
    }

    console.log(
        usuarioEhAdmin
            ? "Agenda em modo admin: criação, edição e exclusão liberados."
            : "Agenda em modo visualização: criação, edição e exclusão bloqueadas."
    );
}

function usuarioPodeEditarAgenda() {
    return Boolean(
        perfilUsuario &&
        perfilUsuario.funcao === "admin"
    );
}

function usuarioPodeVisualizarAgenda() {
    return Boolean(
        perfilUsuario &&
        ["admin", "professor", "coordenacao", "visitante"].includes(perfilUsuario.funcao)
    );
}

function aplicarModoSomenteLeituraAgenda() {
    document.body.classList.add("modo-somente-leitura-agenda");

    const aviso = document.getElementById("avisoAgendaSomenteLeitura");

    if (aviso) {
        aviso.style.display = "block";

        if (perfilUsuario && (perfilUsuario.funcao === "professor" || perfilUsuario.funcao === "coordenacao")) {
            aviso.innerHTML = `
                <strong>Modo visualização:</strong>
                professores e coordenação podem consultar a agenda, mas não podem criar,
                editar ou excluir eventos.
            `;
        } else {
            aviso.innerHTML = `
                <strong>Modo visualização:</strong>
                para criar, editar ou excluir eventos, entre com uma conta administradora.
            `;
        }
    }

    const seletores = [
        "#btnAbrirFormEvento",
        "#formEvento",
        "#btnExcluirSomenteEste",
        "#btnExcluirEsteEProximos",
        "#btnExcluirTodaSerie",
        "#areaConfiguracaoExpedientePaeet",
        ".btn-editar-evento",
        ".btn-editar-evento-modal",
        ".btn-excluir-evento",
        ".btn-excluir-evento-modal",
        ".acoes-evento-admin"
    ];

    seletores.forEach(function (seletor) {
        document.querySelectorAll(seletor).forEach(function (elemento) {
            elemento.style.display = "none";
        });
    });
}


/* =====================================================
   7. BUSCAR EVENTOS DO MÊS
===================================================== */

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


/* =====================================================
   8. FILTRO DE PERMISSÃO
===================================================== */

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

    return eventos;
}


/* =====================================================
   9. RENDERIZAR CALENDÁRIO
===================================================== */

function renderizarCalendario() {
    if (!gradeCalendario || !tituloMesAno) {
        console.log("Erro: gradeCalendario ou tituloMesAno não encontrado no HTML.");
        return;
    }

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

    for (let i = 0; i < diaSemanaInicio; i++) {
        const vazio = document.createElement("div");
        vazio.className = "dia-vazio";
        gradeCalendario.appendChild(vazio);
    }

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

        const eventosEspeciaisDoDia = eventosDoDia.filter(eventoEspecialDeAlertaPaeet);

        const cardDia = document.createElement("div");

        cardDia.className = "dia-calendario dia-calendario-google";

        if (eventosEspeciaisDoDia.length > 0) {
            cardDia.classList.add("dia-alerta-paeet");
        }

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

            ${
                eventosEspeciaisDoDia.length > 0
                ? `
                    <div class="alerta-dia-paeet">
                        ⚠️ PAEET em alerta
                    </div>
                `
                : ""
            }

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

        cardDia.addEventListener("click", function () {
            if (usuarioFezSwipeNoCalendario) {
                usuarioFezSwipeNoCalendario = false;
                return;
            }

            abrirModalDoDia(dataISO, eventosDoDia);
        });

        gradeCalendario.appendChild(cardDia);
    }

    if (!usuarioPodeEditarAgenda()) {
        aplicarModoSomenteLeituraAgenda();
    }

    console.log("Calendário renderizado com sucesso.");
}


/* =====================================================
   10. ABRIR MODAL DO DIA
===================================================== */

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
            const usuarioPodeEditar = usuarioPodeEditarAgenda();

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

                    <div class="descricao-evento-formatada">
                        ${formatarTextoEvento(evento.descricao || "Sem descrição cadastrada.")}
                    </div>

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
                                    <a href="${escaparAtributo(evento.link_material)}" target="_blank">
                                        📎 Abrir material
                                    </a>
                                </p>
                            `
                            : ""
                        }
                    </div>

                    <div class="acoes-evento-publico-google">
                        <button type="button" class="btn-ver-detalhes-evento" data-evento-id="${evento.id}">
                            Ver detalhes completos
                        </button>

                        ${
                            usuarioPodeEditar
                            ? `
                                <button type="button" class="btn-editar-evento-modal" data-evento-id="${evento.id}">
                                    ✏️ Editar
                                </button>

                                <button type="button" class="btn-excluir-evento-modal" data-evento-id="${evento.id}">
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

    if (btnAbrirFormEvento) {
        btnAbrirFormEvento.style.display =
            perfilUsuario && perfilUsuario.funcao === "admin"
                ? "block"
                : "none";
    }

    recolocarFormularioNoModalDoDia();

    if (formEvento) {
        formEvento.style.display = "none";
    }

    if (!usuarioPodeEditarAgenda()) {
        aplicarModoSomenteLeituraAgenda();
    }

    modalDia.classList.add("aberto");
}


/* =====================================================
   11. CLIQUES DOS BOTÕES CRIADOS PELO JAVASCRIPT
===================================================== */

let cliqueDinamicoConfigurado = false;

function configurarCliqueDosBotoesDinamicos() {
    if (cliqueDinamicoConfigurado) {
        return;
    }

    cliqueDinamicoConfigurado = true;

    document.addEventListener("click", function (event) {
        const botao = event.target.closest("button");

        if (!botao) {
            return;
        }

        if (botao.classList.contains("btn-ver-detalhes-evento")) {
            event.preventDefault();
            event.stopPropagation();

            const idEvento = botao.dataset.eventoId;

            abrirDetalheEvento(idEvento);
            return;
        }

        if (
            botao.classList.contains("btn-editar-evento-modal") ||
            botao.classList.contains("btn-editar-evento")
        ) {
            event.preventDefault();
            event.stopPropagation();

            if (!usuarioPodeEditarAgenda()) {
                alert("Este acesso permite apenas visualizar a agenda.");
                return;
            }

            const idEvento = botao.dataset.eventoId;

            console.log("Botão editar clicado. ID:", idEvento);

            prepararEdicaoEvento(idEvento);
        

            return;
        }

        if (
            botao.classList.contains("btn-excluir-evento-modal") ||
            botao.classList.contains("btn-excluir-evento")
        ) {
            event.preventDefault();
            event.stopPropagation();

            if (!usuarioPodeEditarAgenda()) {
                alert("Este acesso permite apenas visualizar a agenda.");
                return;
            }

            const idEvento = botao.dataset.eventoId;

            excluirEvento(idEvento);
        }
    });
}


/* =====================================================
   12. ABRIR DETALHE DO EVENTO
===================================================== */

function abrirDetalheEvento(idEvento) {
    if (!modalDetalheEvento || !conteudoDetalheEvento) {
        return;
    }

    const evento = eventosCarregados.find(function (item) {
        return String(item.id) === String(idEvento);
    });

    if (!evento) {
        alert("Evento não encontrado.");
        return;
    }

    const usuarioPodeEditar = usuarioPodeEditarAgenda();

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
                            <button type="button" class="btn-editar-evento" data-evento-id="${evento.id}">
                                ✏️
                            </button>

                            <button type="button" class="btn-excluir-evento" data-evento-id="${evento.id}">
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

            <p><strong>Descrição:</strong></p>

            <div class="descricao-evento-formatada">
                ${formatarTextoEvento(evento.descricao || "Sem descrição cadastrada.")}
            </div>

            ${
                evento.link_material
                ? `<p><a href="${escaparAtributo(evento.link_material)}" target="_blank">📎 Abrir material</a></p>`
                : ""
            }
        </div>
    `;

    if (!usuarioPodeEditarAgenda()) {
        aplicarModoSomenteLeituraAgenda();
    }

    modalDetalheEvento.classList.add("aberto");
}


/* =====================================================
   13. PREPARAR EDIÇÃO
===================================================== */

function prepararEdicaoEvento(idEvento) {
    console.log("Clicou em editar evento:", idEvento);

    const evento = eventosCarregados.find(function (item) {
        return String(item.id) === String(idEvento);
    });

    if (!evento) {
        alert("Evento não encontrado para edição.");
        console.log("Evento não encontrado:", idEvento);
        return;
    }

    if (!usuarioPodeEditarAgenda()) {
        alert("Este acesso permite apenas visualizar a agenda. Somente o administrador pode editar eventos.");
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

    recolocarFormularioNoModalDoDia();

    if (formEvento) {
        formEvento.style.display = "block";
    }

    if (tituloFormularioEvento) {
        tituloFormularioEvento.textContent = "Editar Evento";
    }

    setValorCampo("eventoTipo", evento.tipo || "aula");
    setValorCampo("eventoTitulo", evento.titulo || "");
    setValorCampo("eventoHorarioInicio", formatarHorarioParaInput(evento.horario_inicio));
    setValorCampo("eventoHorarioFim", formatarHorarioParaInput(evento.horario_fim));
    setValorCampo("eventoDescricao", evento.descricao || "");
    setValorCampo("eventoCursoAlvo", evento.curso_alvo || "todos");
    setValorCampo("eventoLinkMaterial", evento.link_material || "");
    setValorCampo("eventoLembreteMinutos", evento.lembrete_minutos || 10);
    setValorCampo("eventoRepeticao", "nao_repete");
    setValorCampo("eventoRepetirAte", "");
    setValorCampo("eventoTurmaAlvo", evento.turma_alvo || "todas");

    const mensagemEvento = document.getElementById("mensagemEvento");

    if (mensagemEvento) {
        mensagemEvento.textContent = "Editando evento selecionado.";
    }

    const botaoSalvar = formEvento ? formEvento.querySelector("button[type='submit']") : null;

    if (botaoSalvar) {
        botaoSalvar.textContent = "💾 Atualizar Evento";
    }

    rolarAteFormularioEvento();
}


/* =====================================================
   14. EXCLUIR EVENTO
===================================================== */

function excluirEvento(idEvento) {
    if (!usuarioPodeEditarAgenda()) {
        alert("Este acesso permite apenas visualizar a agenda. Somente o administrador pode excluir eventos.");
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


/* =====================================================
   15. FECHAR MODAIS
===================================================== */

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


/* =====================================================
   16. BOTÃO + CRIAR EVENTO NESTE DIA
===================================================== */

if (btnAbrirFormEvento) {
    btnAbrirFormEvento.addEventListener("click", function (event) {
        event.preventDefault();
        event.stopPropagation();

        abrirFormularioNovoEvento();
    });
}

function abrirFormularioNovoEvento() {
    if (!perfilUsuario || perfilUsuario.funcao !== "admin") {
        alert("Apenas o administrador pode criar eventos.");
        return;
    }

    if (!dataSelecionadaNoModal) {
        alert("Selecione um dia no calendário antes de criar o evento.");
        return;
    }

    eventoEmEdicaoId = null;

    recolocarFormularioNoModalDoDia();

    limparFormularioEvento();

    if (tituloFormularioEvento) {
        tituloFormularioEvento.textContent = "Novo Evento";
    }

    if (formEvento) {
        formEvento.style.display = "block";
    }

    const botaoSalvar = formEvento ? formEvento.querySelector("button[type='submit']") : null;

    if (botaoSalvar) {
        botaoSalvar.textContent = "💾 Salvar Evento";
    }

    rolarAteFormularioEvento();
}


/* =====================================================
   17. SALVAR OU ATUALIZAR EVENTO
===================================================== */

if (formEvento) {
    formEvento.addEventListener("submit", async function (event) {
        event.preventDefault();

        if (!usuarioPodeEditarAgenda()) {
            alert("Este acesso permite apenas visualizar a agenda. Somente o administrador pode criar ou editar eventos.");
            return;
        }

        const tipo = getValorCampo("eventoTipo");
        const titulo = getValorCampo("eventoTitulo").trim();
        const horarioInicio = getValorCampo("eventoHorarioInicio");
        const horarioFim = getValorCampo("eventoHorarioFim");
        const descricao = getValorCampo("eventoDescricao").trim();
        const cursoAlvo = getValorCampo("eventoCursoAlvo");
        const turmaAlvo = getValorCampo("eventoTurmaAlvo") || "todas";
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

        if (!dataSelecionadaNoModal) {
            if (mensagemEvento) {
                mensagemEvento.textContent = "Selecione uma data no calendário.";
            }
            return;
        }

        const estavaEditando = Boolean(eventoEmEdicaoId);

        const dadosBase = {
            tipo: tipo,
            titulo: titulo,
            horario_inicio: horarioInicio,
            horario_fim: horarioFim || null,
            descricao: descricao,
            curso_alvo: cursoAlvo,
            turma_alvo: turmaAlvo,
            link_material: linkMaterial || null,
            lembrete_minutos: lembreteMinutos
            
        };

        let resultado;

        if (eventoEmEdicaoId) {
            const conflitoHorario = await verificarConflitoHorarioEvento({
                id: eventoEmEdicaoId,
                data: dataSelecionadaNoModal,
                horario_inicio: horarioInicio,
                horario_fim: horarioFim || null
            });

            if (conflitoHorario.temConflito) {
                mostrarMensagemConflitoAgenda(conflitoHorario.mensagem);
                return;
            }

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

            const conflitoHorario = await verificarConflitosEmListaDeEventos(eventosParaSalvar);

            if (conflitoHorario.temConflito) {
                mostrarMensagemConflitoAgenda(conflitoHorario.mensagem);
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

        await registrarLogAgenda({
    acao: estavaEditando ? "editar_evento" : "criar_evento",
    tipo_evento: estavaEditando
        ? "admin_alterou_evento_calendario"
        : "admin_criou_evento_calendario",
    tabela_afetada: "eventos",
    registro_id: eventoEmEdicaoId ? String(eventoEmEdicaoId) : null,
    descricao: estavaEditando
        ? "Administrador alterou um evento no calendário."
        : "Administrador criou um novo evento no calendário.",
    dados_novos: {
        ...dadosBase,
        data: dataSelecionadaNoModal,
        repeticao: repeticao,
        repetir_ate: repetirAte || null
    }
});

        const dataParaReabrir = dataSelecionadaNoModal;

        limparFormularioEvento();


        await carregarEventosDoMes();

        renderizarCalendario();

        await carregarDisponibilidadePaeet();

        const eventosAtualizados = eventosCarregados.filter(function (evento) {
            return evento.data === dataParaReabrir;
        });

        abrirModalDoDia(dataParaReabrir, eventosAtualizados);

        alert(
            estavaEditando
                ? "Evento atualizado com sucesso!"
                : "Evento salvo com sucesso!"
        );
    });
}


/* =====================================================
   18. REPOSICIONAR FORMULÁRIO NO MODAL DO DIA
===================================================== */

function recolocarFormularioNoModalDoDia() {
    if (!formEvento || !btnAbrirFormEvento) {
        return;
    }

    const areaCorreta = btnAbrirFormEvento.parentElement;

    if (areaCorreta && formEvento.parentElement !== areaCorreta) {
        btnAbrirFormEvento.insertAdjacentElement("afterend", formEvento);
    }

    const modalFlutuanteAntigo = document.getElementById("modalEventoFlutuante");

    if (modalFlutuanteAntigo) {
        modalFlutuanteAntigo.remove();
    }

    const modalEventoAgendaAntigo = document.getElementById("modalEventoAgenda");

    if (modalEventoAgendaAntigo) {
        modalEventoAgendaAntigo.style.display = "none";
    }
}


/* =====================================================
   19. ROLAR AUTOMATICAMENTE ATÉ O FORMULÁRIO
===================================================== */

function rolarAteFormularioEvento() {
    if (!formEvento) {
        console.log("Formulário de evento não encontrado para rolagem.");
        return;
    }

    formEvento.style.display = "block";

    setTimeout(function () {
        formEvento.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });

        formEvento.classList.add("form-evento-destaque");

        setTimeout(function () {
            formEvento.classList.remove("form-evento-destaque");
        }, 2500);

        const campoTitulo = document.getElementById("eventoTitulo");

        if (campoTitulo) {
            campoTitulo.focus();
        }
    }, 300);
}


/* =====================================================
   20. GERAR EVENTOS COM REPETIÇÃO
===================================================== */

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

function gerarSerieIdEvento() {
    return "serie_" + Date.now() + "_" + Math.random().toString(36).substring(2, 10);
}


/* =====================================================
   21. VERIFICAR DIAS LETIVOS
===================================================== */

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


/* =====================================================
   22. LIMPAR FORMULÁRIO
===================================================== */

function limparFormularioEvento() {
    setValorCampo("eventoTipo", "aula");
    setValorCampo("eventoTitulo", "");
    setValorCampo("eventoHorarioInicio", "");
    setValorCampo("eventoHorarioFim", "");
    setValorCampo("eventoDescricao", "");
    setValorCampo("eventoCursoAlvo", "todos");
    setValorCampo("eventoTurmaAlvo", "todas");
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


/* =====================================================
   23. EXCLUSÃO COM OPÇÕES
===================================================== */

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

async function excluirSomenteEsteEvento() {
    if (!usuarioPodeEditarAgenda()) {
        alert("Este acesso permite apenas visualizar a agenda. Somente o administrador pode excluir eventos.");
        return;
    }

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

    await registrarLogAgenda({
    acao: "excluir_evento",
    tipo_evento: "admin_excluiu_evento_calendario",
    tabela_afetada: "eventos",
    registro_id: String(eventoParaExcluirId),
    descricao: "Administrador excluiu um evento individual do calendário.",
    dados_anteriores: eventoParaExcluirObjeto || null
});

    finalizarExclusaoEvento("Evento excluído com sucesso!");
}

async function excluirEsteEProximosEventos() {
    if (!usuarioPodeEditarAgenda()) {
        alert("Este acesso permite apenas visualizar a agenda. Somente o administrador pode excluir eventos.");
        return;
    }

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

    await registrarLogAgenda({
    acao: "excluir_eventos_futuros",
    tipo_evento: "admin_excluiu_evento_e_proximos",
    tabela_afetada: "eventos",
    registro_id: String(eventoParaExcluirObjeto.id),
    descricao: "Administrador excluiu este evento e os próximos eventos da série.",
    dados_anteriores: eventoParaExcluirObjeto || null,
    detalhes: {
        serie_id: eventoParaExcluirObjeto.serie_id || null,
        data_inicio_exclusao: eventoParaExcluirObjeto.data || null
    }
});

    finalizarExclusaoEvento("Este evento e os próximos foram excluídos com sucesso!");
}

async function excluirTodaSerieEventos() {
    if (!usuarioPodeEditarAgenda()) {
        alert("Este acesso permite apenas visualizar a agenda. Somente o administrador pode excluir eventos.");
        return;
    }

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

    await registrarLogAgenda({
    acao: "excluir_serie_eventos",
    tipo_evento: "admin_excluiu_toda_serie_eventos",
    tabela_afetada: "eventos",
    registro_id: String(eventoParaExcluirObjeto.id),
    descricao: "Administrador excluiu todos os eventos de uma série do calendário.",
    dados_anteriores: eventoParaExcluirObjeto || null,
    detalhes: {
        serie_id: eventoParaExcluirObjeto.serie_id || null
    }
});

    finalizarExclusaoEvento("Todos os eventos da série foram excluídos com sucesso!");
}

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

    await carregarDisponibilidadePaeet();
}

if (btnCancelarExclusao) {
    btnCancelarExclusao.addEventListener("click", function () {
        eventoParaExcluirId = null;
        eventoParaExcluirObjeto = null;

        if (modalConfirmarExclusao) {
            modalConfirmarExclusao.classList.remove("aberto");
        }
    });
}


/* =====================================================
   24. NAVEGAÇÃO ENTRE MESES
===================================================== */

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

    await carregarDisponibilidadePaeet();
}


/* =====================================================
   25. SWIPE / ARRASTAR CALENDÁRIO
===================================================== */

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

    areaSwipe.style.touchAction = "pan-y";
    areaSwipe.style.userSelect = "none";
    areaSwipe.style.overscrollBehaviorX = "contain";

    areaSwipe.addEventListener("touchstart", function (event) {
        if (!event.touches || event.touches.length === 0) {
            return;
        }

        const toque = event.touches[0];
        const larguraTela = window.innerWidth;

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

    if (distanciaX > 0) {
        await mudarMes(-1);
        return;
    }

    if (distanciaX < 0) {
        await mudarMes(1);
    }
}


/* =====================================================
   26. FILTRO POR CURSO
===================================================== */

if (filtroCursoAgenda) {
    filtroCursoAgenda.addEventListener("change", async function () {
        await carregarEventosDoMes();

        renderizarCalendario();
    });
}


/* =====================================================
   27. FUNÇÕES AUXILIARES
===================================================== */

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

        atendimento_aluno: "Atendimento ao aluno",
        reuniao_gestao: "Reunião com gestão",
        planejamento_paeet: "Planejamento PAEET",

        ot: "OT - Orientação Técnica",
        formacao_externa: "Formação externa",
        reuniao_externa: "Reunião externa",
        atestado_medico: "Atestado médico",
        tre: "TRE / convocação eleitoral",
        ferias: "Férias",
        feriado_prolongado: "Feriado prolongado",
        recesso_escolar: "Recesso escolar",
        ponto_facultativo: "Ponto facultativo",
        licenca_afastamento: "Licença / afastamento",
        abono: "Abono",
        convocacao_oficial: "Convocação oficial",
        conselho_classe: "Conselho de classe",
        atpc_htpc: "ATPC / HTPC",
        evento_escolar: "Evento escolar",
        ausencia: "Ausência / fora da escola",

        outro: "Outro"
    };

    return nomes[normalizarTipo(tipo)] || tipo || "Outro";
}

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

function escaparAtributo(texto) {
    return escaparHTML(texto || "");
}

function formatarTextoEvento(texto) {
    if (!texto) {
        return "Sem descrição cadastrada.";
    }

    let textoSeguro = texto
        .toString()
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

    textoSeguro = textoSeguro.replace(/```([\s\S]*?)```/g, function (_, codigo) {
        return `<pre class="bloco-codigo-evento"><code>${codigo}</code></pre>`;
    });

    textoSeguro = textoSeguro.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

    return textoSeguro;
}


/* =====================================================
   28. LEMBRETES SONOROS
===================================================== */

let lembretesAtivos = false;
let audioLembreteLiberado = false;
let lembretesJaDisparados = new Set();
let intervaloLembretesAgenda = null;

const btnAtivarLembretesAgenda = document.getElementById("btnAtivarLembretesAgenda");
const mensagemLembretesAgenda = document.getElementById("mensagemLembretesAgenda");

let audioContextoAgenda = null;

if (btnAtivarLembretesAgenda) {
    btnAtivarLembretesAgenda.addEventListener("click", async function () {
        await ativarLembretesDaAgenda();
    });
}

async function ativarLembretesDaAgenda() {
    if (!perfilUsuario || perfilUsuario.funcao !== "admin") {
        alert("Os lembretes sonoros estão disponíveis apenas para o administrador logado.");
        return;
    }

    if ("Notification" in window && Notification.permission === "default") {
        await Notification.requestPermission();
    }

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
        intervaloLembretesAgenda = setInterval(verificarLembretesDaAgenda, 30000);
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
        return;
    }

    if (Notification.permission !== "granted") {
        return;
    }

    new Notification("🔔 Lembrete da Agenda Pedagógica", {
        body: mensagem,
        icon: "/assets/icons/icon-192.png",
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
        tocarBipAgenda(880, 0);
        tocarBipAgenda(660, 0.22);
        tocarBipAgenda(880, 0.44);
    } catch (erro) {
        console.log("Erro ao tocar som do lembrete:", erro);
    }
}

function tocarBipAgenda(frequencia, atraso) {
    const oscilador = audioContextoAgenda.createOscillator();
    const ganho = audioContextoAgenda.createGain();

    oscilador.type = "sine";

    oscilador.frequency.setValueAtTime(
        frequencia,
        audioContextoAgenda.currentTime + atraso
    );

    ganho.gain.setValueAtTime(
        0.001,
        audioContextoAgenda.currentTime + atraso
    );

    ganho.gain.exponentialRampToValueAtTime(
        0.25,
        audioContextoAgenda.currentTime + atraso + 0.02
    );

    ganho.gain.exponentialRampToValueAtTime(
        0.001,
        audioContextoAgenda.currentTime + atraso + 0.18
    );

    oscilador.connect(ganho);
    ganho.connect(audioContextoAgenda.destination);

    oscilador.start(audioContextoAgenda.currentTime + atraso);
    oscilador.stop(audioContextoAgenda.currentTime + atraso + 0.2);
}


/* =====================================================
   29. PUSH NOTIFICATION - PWA
===================================================== */

const VAPID_PUBLIC_KEY = "BCRsdEr9PGw8gNfgmka1NZIovnJNQQBCls7u4t7jAjcovzqqUiJIiEk4el6X4myFDVo3smR-mtGubNb5w0Nyb7U";

const btnAtivarPushAgenda = document.getElementById("btnAtivarPushAgenda");
const mensagemPushAgenda = document.getElementById("mensagemPushAgenda");

if (btnAtivarPushAgenda) {
    btnAtivarPushAgenda.addEventListener("click", ativarPushAgenda);
}

async function ativarPushAgenda() {
    if (!("serviceWorker" in navigator)) {
        if (mensagemPushAgenda) {
            mensagemPushAgenda.textContent = "Este navegador não suporta Service Worker.";
        }
        return;
    }

    if (!("PushManager" in window)) {
        if (mensagemPushAgenda) {
            mensagemPushAgenda.textContent = "Este navegador não suporta Push Notification.";
        }
        return;
    }

    if (!("Notification" in window)) {
        if (mensagemPushAgenda) {
            mensagemPushAgenda.textContent = "Este navegador não suporta notificações.";
        }
        return;
    }

    try {
        if (mensagemPushAgenda) {
            mensagemPushAgenda.textContent = "Solicitando permissão de notificação...";
        }

        const permissao = await Notification.requestPermission();

        if (permissao !== "granted") {
            if (mensagemPushAgenda) {
                mensagemPushAgenda.textContent = "Permissão de notificação não foi concedida.";
            }
            return;
        }

        const registro = await navigator.serviceWorker.ready;

        let inscricao = await registro.pushManager.getSubscription();

        if (!inscricao) {
            inscricao = await registro.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: converterBase64ParaUint8Array(VAPID_PUBLIC_KEY)
            });
        }

        await salvarInscricaoPushNoSupabase(inscricao);

        if (mensagemPushAgenda) {
            mensagemPushAgenda.textContent = "✅ Notificações ativadas neste aparelho.";
        }

        if (btnAtivarPushAgenda) {
            btnAtivarPushAgenda.textContent = "✅ Notificações ativadas";
            btnAtivarPushAgenda.disabled = true;
        }

    } catch (erro) {
        console.log("Erro ao ativar Push:", erro);

        if (mensagemPushAgenda) {
            mensagemPushAgenda.textContent = "Erro ao ativar notificações: " + erro.message;
        }
    }
}

async function salvarInscricaoPushNoSupabase(inscricao) {
    const dados = inscricao.toJSON();

    const endpoint = dados.endpoint;
    const p256dh = dados.keys.p256dh;
    const auth = dados.keys.auth;

    const { error } = await banco
        .from("push_subscriptions")
        .upsert(
            [
                {
                    endpoint: endpoint,
                    p256dh: p256dh,
                    auth: auth,
                    user_agent: navigator.userAgent,
                    ativo: true,
                    atualizado_em: new Date().toISOString()
                }
            ],
            {
                onConflict: "endpoint"
            }
        );

    if (error) {
        console.log("Erro ao salvar inscrição push:", error);
        throw new Error(error.message);
    }
}

function converterBase64ParaUint8Array(base64String) {
    const padding = "=".repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/-/g, "+")
        .replace(/_/g, "/");

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }

    return outputArray;
}




/* =====================================================
   DISPONIBILIDADE DO PROFESSOR PAEET
   Expediente padrão: 12:30 às 21:30
===================================================== */

let expedientePaeet = {
    inicio: "12:30",
    fim: "21:30"
};

const tiposEventoAlertaPaeet = [
    "ot",
    "formacao_externa",
    "reuniao_externa",
    "atestado_medico",
    "tre",
    "ferias",
    "feriado_prolongado",
    "recesso_escolar",
    "ponto_facultativo",
    "licenca_afastamento",
    "abono",
    "convocacao_oficial",
    "conselho_classe",
    "atpc_htpc",
    "evento_escolar",
    "ausencia"
];

const tiposEventoDiaInteiroPaeet = [
    "ferias",
    "feriado_prolongado",
    "recesso_escolar",
    "ponto_facultativo",
    "licenca_afastamento"
];

function configurarDisponibilidadePaeet() {
    const btnAtualizar = document.getElementById("btnAtualizarDisponibilidadePaeet");
    const btnSalvarExpediente = document.getElementById("btnSalvarExpedientePaeet");
    const campoData = document.getElementById("dataDisponibilidadePaeet");
    const campoInicio = document.getElementById("inicioExpedientePaeet");
    const campoFim = document.getElementById("fimExpedientePaeet");
    const campoTipoEvento = document.getElementById("eventoTipo");

    if (btnAtualizar) {
        btnAtualizar.addEventListener("click", carregarDisponibilidadePaeet);
    }

    if (btnSalvarExpediente) {
        btnSalvarExpediente.addEventListener("click", salvarConfiguracaoExpedientePaeet);
    }

    if (campoData) {
        campoData.addEventListener("change", carregarDisponibilidadePaeet);
    }

    if (campoInicio) {
        campoInicio.addEventListener("change", function () {
            expedientePaeet.inicio = campoInicio.value || "12:30";
            carregarDisponibilidadePaeet();
        });
    }

    if (campoFim) {
        campoFim.addEventListener("change", function () {
            expedientePaeet.fim = campoFim.value || "21:30";
            carregarDisponibilidadePaeet();
        });
    }

    if (campoTipoEvento) {
        campoTipoEvento.addEventListener("change", preencherHorarioEspecialSeNecessarioPaeet);
    }
}

async function carregarConfiguracaoExpedientePaeet() {
    const campoInicio = document.getElementById("inicioExpedientePaeet");
    const campoFim = document.getElementById("fimExpedientePaeet");

    expedientePaeet = {
        inicio: "12:30",
        fim: "21:30"
    };

    try {
        const { data, error } = await banco
            .from("site_settings")
            .select("chave, valor")
            .in("chave", ["paeet_expediente_inicio", "paeet_expediente_fim"]);

        if (error) {
            console.log("Não foi possível carregar expediente do Supabase. Usando padrão:", error);
        }

        (data || []).forEach(function (item) {
            if (item.chave === "paeet_expediente_inicio" && item.valor) {
                expedientePaeet.inicio = item.valor;
            }

            if (item.chave === "paeet_expediente_fim" && item.valor) {
                expedientePaeet.fim = item.valor;
            }
        });
    } catch (erro) {
        console.log("Erro ao carregar expediente PAEET:", erro);
    }

    if (campoInicio) {
        campoInicio.value = expedientePaeet.inicio;
    }

    if (campoFim) {
        campoFim.value = expedientePaeet.fim;
    }
}

async function salvarConfiguracaoExpedientePaeet() {
    const mensagem = document.getElementById("mensagemExpedientePaeet");
    const campoInicio = document.getElementById("inicioExpedientePaeet");
    const campoFim = document.getElementById("fimExpedientePaeet");

    if (!usuarioPodeEditarAgenda()) {
        alert("Este acesso permite apenas visualizar a agenda. Somente o administrador pode alterar o expediente.");
        return;
    }

    const inicio = campoInicio ? campoInicio.value : "12:30";
    const fim = campoFim ? campoFim.value : "21:30";

    if (!inicio || !fim) {
        if (mensagem) {
            mensagem.textContent = "Informe o início e o fim do expediente.";
        }
        return;
    }

    if (converterHorarioParaMinutosPaeet(fim) <= converterHorarioParaMinutosPaeet(inicio)) {
        if (mensagem) {
            mensagem.textContent = "O fim do expediente precisa ser maior que o início.";
        }
        return;
    }

    expedientePaeet.inicio = inicio;
    expedientePaeet.fim = fim;

    if (mensagem) {
        mensagem.textContent = "Salvando expediente...";
    }

    try {
        const { error } = await banco
            .from("site_settings")
            .upsert(
                [
                    {
                        chave: "paeet_expediente_inicio",
                        valor: inicio,
                        atualizado_em: new Date().toISOString()
                    },
                    {
                        chave: "paeet_expediente_fim",
                        valor: fim,
                        atualizado_em: new Date().toISOString()
                    }
                ],
                {
                    onConflict: "chave"
                }
            );

        if (error) {
            console.log("Erro ao salvar expediente:", error);

            if (mensagem) {
                mensagem.textContent = "Erro ao salvar no Supabase. O horário foi aplicado apenas nesta tela.";
            }
        } else {
            if (mensagem) {
                mensagem.textContent = "Expediente PAEET salvo com sucesso!";
            }
        }
    } catch (erro) {
        console.log("Erro inesperado ao salvar expediente:", erro);

        if (mensagem) {
            mensagem.textContent = "Erro ao salvar expediente. O horário foi aplicado apenas nesta tela.";
        }
    }

    await carregarDisponibilidadePaeet();
}

function preencherDataHojeDisponibilidadePaeet() {
    const campoData = document.getElementById("dataDisponibilidadePaeet");

    if (!campoData || campoData.value) {
        return;
    }

    campoData.value = formatarDataISO(new Date());
}

async function carregarDisponibilidadePaeet() {
    const campoData = document.getElementById("dataDisponibilidadePaeet");
    const status = document.getElementById("statusDisponibilidadePaeet");
    const lista = document.getElementById("listaDisponibilidadePaeet");
    const alertas = document.getElementById("alertasDisponibilidadePaeet");
    const resumoRapido = document.getElementById("resumoStatusRapidoPaeet");

    if (!campoData || !status || !lista) {
        return;
    }

    preencherDataHojeDisponibilidadePaeet();

    const dataSelecionada = campoData.value;

    if (!dataSelecionada) {
        status.innerHTML = "<p>Selecione uma data para consultar a disponibilidade.</p>";
        lista.innerHTML = "";
        return;
    }

    status.innerHTML = "<p>Consultando agenda do professor...</p>";
    lista.innerHTML = "<p>Calculando horários livres...</p>";

    if (alertas) {
        alertas.innerHTML = "";
    }

    const eventosDoDia = await buscarEventosDoDiaParaDisponibilidadePaeet(dataSelecionada);

    const intervalosDisponiveis = calcularIntervalosDisponiveisPaeet({
        inicioExpediente: expedientePaeet.inicio,
        fimExpediente: expedientePaeet.fim,
        eventos: eventosDoDia
    });

    const eventosEspeciais = eventosDoDia.filter(eventoEspecialDeAlertaPaeet);

    montarStatusDisponibilidadePaeet({
        dataSelecionada,
        eventosDoDia,
        eventosEspeciais,
        intervalosDisponiveis,
        inicioExpediente: expedientePaeet.inicio,
        fimExpediente: expedientePaeet.fim
    });

    if (resumoRapido) {
        resumoRapido.textContent = eventosEspeciais.length > 0
            ? "⚠️ Atenção: há intercorrência especial nesta data."
            : "🟢 Consulta atualizada.";
    }
}

async function buscarEventosDoDiaParaDisponibilidadePaeet(dataSelecionada) {
    const { data, error } = await banco
        .from("eventos")
        .select("*")
        .eq("data", dataSelecionada)
        .order("horario_inicio", { ascending: true });

    if (error) {
        console.log("Erro ao buscar eventos para disponibilidade:", error);
        return [];
    }

    return data || [];
}

function calcularIntervalosDisponiveisPaeet(config) {
    const inicioExpediente = config.inicioExpediente || "12:30";
    const fimExpediente = config.fimExpediente || "21:30";
    const eventos = config.eventos || [];

    let intervalosLivres = [
        {
            inicio: inicioExpediente,
            fim: fimExpediente
        }
    ];

    const eventosValidos = eventos
        .map(function (evento) {
            return normalizarEventoParaBloqueioPaeet(evento, inicioExpediente, fimExpediente);
        })
        .filter(function (evento) {
            return evento && evento.inicio && evento.fim;
        })
        .sort(function (a, b) {
            return converterHorarioParaMinutosPaeet(a.inicio) - converterHorarioParaMinutosPaeet(b.inicio);
        });

    eventosValidos.forEach(function (evento) {
        intervalosLivres = removerCompromissoDosIntervalosPaeet(intervalosLivres, evento);
    });

    return intervalosLivres.filter(function (intervalo) {
        return converterHorarioParaMinutosPaeet(intervalo.fim) > converterHorarioParaMinutosPaeet(intervalo.inicio);
    });
}

function normalizarEventoParaBloqueioPaeet(evento, inicioExpediente, fimExpediente) {
    if (!evento) {
        return null;
    }

    const tipoNormalizado = normalizarTipo(evento.tipo);
    const especial = eventoEspecialDeAlertaPaeet(evento);

    let inicio = evento.horario_inicio ? formatarHorarioCurto(evento.horario_inicio) : "";
    let fim = evento.horario_fim ? formatarHorarioCurto(evento.horario_fim) : "";

    if (tiposEventoDiaInteiroPaeet.includes(tipoNormalizado)) {
        inicio = inicioExpediente;
        fim = fimExpediente;
    }

    if (especial && !inicio) {
        inicio = inicioExpediente;
    }

    if (especial && !fim) {
        fim = fimExpediente;
    }

    if (!inicio || !fim) {
        return null;
    }

    return {
        inicio: inicio,
        fim: fim,
        titulo: evento.titulo || "Compromisso",
        tipo: tipoNormalizado,
        especial: especial
    };
}

function removerCompromissoDosIntervalosPaeet(intervalos, evento) {
    const resultado = [];

    const inicioEvento = converterHorarioParaMinutosPaeet(evento.inicio);
    const fimEvento = converterHorarioParaMinutosPaeet(evento.fim);

    intervalos.forEach(function (intervalo) {
        const inicioIntervalo = converterHorarioParaMinutosPaeet(intervalo.inicio);
        const fimIntervalo = converterHorarioParaMinutosPaeet(intervalo.fim);

        if (fimEvento <= inicioIntervalo || inicioEvento >= fimIntervalo) {
            resultado.push(intervalo);
            return;
        }

        if (inicioEvento > inicioIntervalo) {
            resultado.push({
                inicio: intervalo.inicio,
                fim: evento.inicio
            });
        }

        if (fimEvento < fimIntervalo) {
            resultado.push({
                inicio: evento.fim,
                fim: intervalo.fim
            });
        }
    });

    return resultado;
}

function montarStatusDisponibilidadePaeet(dados) {
    const status = document.getElementById("statusDisponibilidadePaeet");
    const lista = document.getElementById("listaDisponibilidadePaeet");
    const alertas = document.getElementById("alertasDisponibilidadePaeet");

    if (!status || !lista) {
        return;
    }

    const dataFormatada = formatarDataBR(dados.dataSelecionada);
    const totalEventos = dados.eventosDoDia.length;
    const totalIntervalos = dados.intervalosDisponiveis.length;

    if (alertas) {
        alertas.innerHTML = montarAlertasEventosEspeciaisPaeet(dados.eventosEspeciais);
    }

    if (totalIntervalos === 0) {
        status.innerHTML = `
            <div class="status-card-paeet status-indisponivel">
                <h3>🔴 Professor indisponível</h3>
                <p>
                    Em ${dataFormatada}, não há intervalos livres entre
                    ${dados.inicioExpediente} e ${dados.fimExpediente}.
                </p>
                <small>${totalEventos} compromisso(s) registrado(s) na agenda.</small>
            </div>
        `;

        lista.innerHTML = `
            <div class="card-sem-disponibilidade">
                <p>
                    Todos os horários do período informado estão ocupados.
                    Para atendimento, reunião ou solicitação, escolha outra data ou aguarde nova disponibilidade.
                </p>
            </div>
        `;

        return;
    }

    status.innerHTML = `
        <div class="status-card-paeet ${dados.eventosEspeciais.length > 0 ? "status-alerta-parcial" : "status-disponivel"}">
            <h3>${dados.eventosEspeciais.length > 0 ? "⚠️ Disponibilidade com alerta" : "🟢 Professor com disponibilidade"}</h3>
            <p>
                Em ${dataFormatada}, foram encontrados
                <strong>${totalIntervalos}</strong> intervalo(s) livre(s)
                entre ${dados.inicioExpediente} e ${dados.fimExpediente}.
            </p>
            <small>${totalEventos} compromisso(s) registrado(s) na agenda.</small>
        </div>
    `;

    lista.innerHTML = "";

    dados.intervalosDisponiveis.forEach(function (intervalo) {
        const duracao = calcularDuracaoIntervaloPaeet(intervalo.inicio, intervalo.fim);

        lista.innerHTML += `
            <div class="card-horario-disponivel">
                <div>
                    <span class="selo-horario-livre">Horário livre</span>
                    <h3>${intervalo.inicio} às ${intervalo.fim}</h3>
                    <p>Duração disponível: <strong>${duracao}</strong></p>
                </div>

                ${
                    perfilUsuario && perfilUsuario.funcao === "admin"
                    ? `
                        <button type="button" onclick="preencherNovoEventoComDisponibilidade('${dados.dataSelecionada}', '${intervalo.inicio}', '${intervalo.fim}')">
                            ➕ Usar este horário
                        </button>
                    `
                    : ""
                }
            </div>
        `;
    });
}

function montarAlertasEventosEspeciaisPaeet(eventosEspeciais) {
    if (!eventosEspeciais || eventosEspeciais.length === 0) {
        return "";
    }

    let html = `
        <div class="bloco-alertas-paeet">
            <h3>⚠️ Intercorrências especiais nesta data</h3>
            <p>
                Estes registros podem indicar ausência, indisponibilidade ou atendimento comprometido do Professor PAEET.
            </p>
    `;

    eventosEspeciais.forEach(function (evento) {
        html += `
            <div class="card-alerta-especial-paeet">
                <strong>${escaparHTML(nomeBonitoTipo(evento.tipo))}</strong>

                <h4>${escaparHTML(evento.titulo || "Evento especial")}</h4>

                <p>
                    <strong>Horário:</strong>
                    ${formatarHorarioCurto(evento.horario_inicio)}
                    ${
                        evento.horario_fim
                        ? " às " + formatarHorarioCurto(evento.horario_fim)
                        : ""
                    }
                </p>

                <p>
                    <strong>Justificativa / descrição:</strong>
                </p>

                <div class="descricao-alerta-paeet">
                    ${formatarTextoEvento(evento.descricao || "Sem descrição informada.")}
                </div>
            </div>
        `;
    });

    html += `</div>`;

    return html;
}

function preencherNovoEventoComDisponibilidade(data, inicio, fim) {
    dataSelecionadaNoModal = data;

    const eventosDoDia = eventosCarregados.filter(function (evento) {
        return evento.data === data;
    });

    abrirModalDoDia(data, eventosDoDia);

    recolocarFormularioNoModalDoDia();

    if (formEvento) {
        formEvento.style.display = "block";
    }

    limparFormularioEvento();

    setValorCampo("eventoHorarioInicio", inicio);
    setValorCampo("eventoHorarioFim", fim);

    if (tituloFormularioEvento) {
        tituloFormularioEvento.textContent = "Novo Evento";
    }

    rolarAteFormularioEvento();
}

function preencherHorarioEspecialSeNecessarioPaeet() {
    const campoTipo = document.getElementById("eventoTipo");
    const campoInicio = document.getElementById("eventoHorarioInicio");
    const campoFim = document.getElementById("eventoHorarioFim");

    if (!campoTipo || !campoInicio || !campoFim) {
        return;
    }

    const tipo = normalizarTipo(campoTipo.value);

    if (!tiposEventoAlertaPaeet.includes(tipo)) {
        return;
    }

    if (!campoInicio.value) {
        campoInicio.value = expedientePaeet.inicio || "12:30";
    }

    if (!campoFim.value && tiposEventoDiaInteiroPaeet.includes(tipo)) {
        campoFim.value = expedientePaeet.fim || "21:30";
    }
}

function eventoEspecialDeAlertaPaeet(evento) {
    if (!evento) {
        return false;
    }

    const tipo = normalizarTipo(evento.tipo);
    const titulo = (evento.titulo || "").toLowerCase();
    const descricao = (evento.descricao || "").toLowerCase();

    if (tiposEventoAlertaPaeet.includes(tipo)) {
        return true;
    }

    const texto = `${titulo} ${descricao}`;

    const palavrasAlerta = [
        "ot",
        "orientação técnica",
        "orientacao tecnica",
        "atestado",
        "atestado médico",
        "atestado medico",
        "tre",
        "férias",
        "ferias",
        "feriado prolongado",
        "recesso",
        "recesso escolar",
        "ponto facultativo",
        "licença",
        "licenca",
        "afastamento",
        "abono",
        "convocação",
        "convocacao",
        "formação externa",
        "formacao externa",
        "reunião externa",
        "reuniao externa",
        "conselho de classe",
        "atpc",
        "htpc",
        "evento escolar",
        "fora da escola",
        "ausência",
        "ausencia"
    ];

    return palavrasAlerta.some(function (palavra) {
        return texto.includes(palavra);
    });
}

function converterHorarioParaMinutosPaeet(horario) {
    if (!horario) {
        return 0;
    }

    const partes = horario.toString().substring(0, 5).split(":");
    const horas = Number(partes[0]) || 0;
    const minutos = Number(partes[1]) || 0;

    return horas * 60 + minutos;
}

function calcularDuracaoIntervaloPaeet(inicio, fim) {
    const minutosInicio = converterHorarioParaMinutosPaeet(inicio);
    const minutosFim = converterHorarioParaMinutosPaeet(fim);

    const diferenca = minutosFim - minutosInicio;

    if (diferenca <= 0) {
        return "0 min";
    }

    const horas = Math.floor(diferenca / 60);
    const minutos = diferenca % 60;

    if (horas > 0 && minutos > 0) {
        return `${horas}h ${minutos}min`;
    }

    if (horas > 0) {
        return `${horas}h`;
    }

    return `${minutos}min`;
}

/* =====================================================
   TRAVA DE CONFLITO DE HORÁRIO
   Impede cadastrar ou editar dois eventos no mesmo dia
   e no mesmo horário/período.

   Regra aplicada:
   - Bloqueia horário final menor ou igual ao horário inicial.
   - Bloqueia evento com mesmo horário de início.
   - Bloqueia sobreposição de período.
   - Bloqueia também eventos repetidos que caiam em data/horário já ocupado.
===================================================== */

async function verificarConflitosEmListaDeEventos(eventosParaSalvar) {
    for (const evento of eventosParaSalvar) {
        const conflito = await verificarConflitoHorarioEvento({
            id: evento.id || null,
            data: evento.data,
            horario_inicio: evento.horario_inicio,
            horario_fim: evento.horario_fim || null
        });

        if (conflito.temConflito) {
            return {
                temConflito: true,
                tipo: conflito.tipo,
                evento: conflito.evento,
                mensagem: conflito.mensagem
            };
        }
    }

    return {
        temConflito: false,
        evento: null
    };
}


async function verificarConflitoHorarioEvento(dadosEvento) {
    try {
        if (!dadosEvento || !dadosEvento.data || !dadosEvento.horario_inicio) {
            return {
                temConflito: false,
                evento: null
            };
        }

        const inicioNovo = converterHorarioParaMinutos(dadosEvento.horario_inicio);
        const fimNovo = dadosEvento.horario_fim
            ? converterHorarioParaMinutos(dadosEvento.horario_fim)
            : null;

        if (dadosEvento.horario_fim && fimNovo <= inicioNovo) {
            return {
                temConflito: true,
                tipo: "horario_invalido",
                mensagem: "O horário final precisa ser maior que o horário inicial."
            };
        }

        const { data, error } = await banco
            .from("eventos")
            .select("id, titulo, data, horario_inicio, horario_fim, tipo, turma_alvo, curso_alvo")
            .eq("data", dadosEvento.data);

        if (error) {
            console.error("Erro ao verificar conflito de horário:", error);

            return {
                temConflito: false,
                evento: null
            };
        }

        const eventosDoDia = data || [];

        const conflito = eventosDoDia.find(function (evento) {
            if (!evento.horario_inicio) {
                return false;
            }

            if (dadosEvento.id && String(evento.id) === String(dadosEvento.id)) {
                return false;
            }

            const inicioExistente = converterHorarioParaMinutos(evento.horario_inicio);
            const fimExistente = evento.horario_fim
                ? converterHorarioParaMinutos(evento.horario_fim)
                : null;

            // Caso 1: evento novo sem horário final.
            // Bloqueia se o horário inicial cair dentro de outro evento
            // ou se existir outro evento sem fim no mesmo horário.
            if (fimNovo === null) {
                if (fimExistente === null) {
                    return inicioExistente === inicioNovo;
                }

                return inicioNovo >= inicioExistente && inicioNovo < fimExistente;
            }

            // Caso 2: evento existente sem horário final.
            // Bloqueia se o horário de início existente cair dentro do novo período.
            if (fimExistente === null) {
                return inicioExistente >= inicioNovo && inicioExistente < fimNovo;
            }

            // Caso 3: ambos possuem início e fim.
            // Bloqueia qualquer sobreposição de horário.
            return inicioExistente < fimNovo && inicioNovo < fimExistente;
        });

        if (conflito) {
            const horarioConflito = conflito.horario_fim
                ? `${formatarHorarioCurto(conflito.horario_inicio)} às ${formatarHorarioCurto(conflito.horario_fim)}`
                : `às ${formatarHorarioCurto(conflito.horario_inicio)}`;

            return {
                temConflito: true,
                tipo: "conflito",
                evento: conflito,
                mensagem: `Já possui um evento para esse dia e horário: "${conflito.titulo || "Evento sem título"}", ${horarioConflito}, em ${formatarDataBR(conflito.data)}. Tente outro dia ou outro horário.`
            };
        }

        return {
            temConflito: false,
            evento: null
        };

    } catch (erro) {
        console.error("Erro inesperado ao verificar conflito:", erro);

        return {
            temConflito: false,
            evento: null
        };
    }
}


function converterHorarioParaMinutos(horario) {
    if (!horario) {
        return 0;
    }

    const partes = horario.toString().split(":");
    const horas = Number(partes[0]);
    const minutos = Number(partes[1]);

    if (Number.isNaN(horas) || Number.isNaN(minutos)) {
        return 0;
    }

    return horas * 60 + minutos;
}


function mostrarMensagemConflitoAgenda(mensagem) {
    const possiveisMensagens = [
        "mensagemEvento",
        "mensagemAgenda",
        "mensagemFormularioEvento",
        "mensagemCalendario",
        "mensagemDisponibilidade"
    ];

    let elementoMensagem = null;

    for (const id of possiveisMensagens) {
        const elemento = document.getElementById(id);

        if (elemento) {
            elementoMensagem = elemento;
            break;
        }
    }

    if (elementoMensagem) {
        elementoMensagem.textContent = mensagem;
        elementoMensagem.style.color = "#dc2626";
        elementoMensagem.style.fontWeight = "900";
        elementoMensagem.style.background = "#fee2e2";
        elementoMensagem.style.border = "1px solid #fecaca";
        elementoMensagem.style.borderRadius = "12px";
        elementoMensagem.style.padding = "10px";
        elementoMensagem.scrollIntoView({
            behavior: "smooth",
            block: "center"
        });
    } else {
        alert(mensagem);
    }
}

async function registrarLogAgenda(config) {
    try {
        if (typeof registrarLogSistema !== "function") {
            console.warn("Função registrarLogSistema não encontrada.");
            return;
        }

        await registrarLogSistema({
            modulo: "agenda",
            usuario_nome: perfilUsuario?.nome || null,
            usuario_funcao: perfilUsuario?.funcao || null,
            origem_pagina: "agenda.html",
            ...config
        });

    } catch (erro) {
        console.warn("Erro ao registrar log da agenda:", erro);
    }
}




/* =====================================================
   30. EXPOR FUNÇÕES PARA O HTML
===================================================== */

window.abrirDetalheEvento = abrirDetalheEvento;
window.prepararEdicaoEvento = prepararEdicaoEvento;
window.excluirEvento = excluirEvento;
window.fecharAlertaVisualAgenda = fecharAlertaVisualAgenda;
window.preencherNovoEventoComDisponibilidade = preencherNovoEventoComDisponibilidade;

// Funções auxiliares expostas para depuração e botões inline
window.usuarioPodeEditarAgenda = usuarioPodeEditarAgenda;
window.aplicarModoSomenteLeituraAgenda = aplicarModoSomenteLeituraAgenda;
