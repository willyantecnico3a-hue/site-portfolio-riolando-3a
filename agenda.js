
// =====================================================
// AGENDA PEDAGÓGICA INTERATIVA
// HTML + CSS + JAVASCRIPT PURO + SUPABASE
// =====================================================


// =====================================================
// 1. CONEXÃO COM SUPABASE
// =====================================================

const SUPABASE_URL = "https://pwomyoprbvoimqmikvev.supabase.co";

// COLE AQUI SUA CHAVE PUBLIC / ANON / PUBLISHABLE DO SUPABASE
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
const btnConfirmarExclusao = document.getElementById("btnConfirmarExclusao");


// =====================================================
// 4. INICIAR A AGENDA
// =====================================================

iniciarAgenda();

async function iniciarAgenda() {
    await carregarPerfilUsuario();

    configurarPermissoesDaTela();

    await carregarEventosDoMes();

    renderizarCalendario();
}


// =====================================================
// 5. CARREGAR PERFIL DO USUÁRIO LOGADO
// =====================================================

async function carregarPerfilUsuario() {
    const { data: userData, error: userError } = await banco.auth.getUser();

    if (userError || !userData.user) {
        alert("Você precisa estar logado para acessar a agenda.");
        console.log("Usuário não logado na agenda.");
        return;
    }

    const usuario = userData.user;

    console.log("Usuário logado na agenda:", usuario.email);

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

    perfilUsuario = {
        id: usuario.id,
        nome: usuario.email,
        email: usuario.email,
        funcao: "visitante",
        curso: "nenhum"
    };

    console.log("Usuário sem perfil administrativo:", perfilUsuario);
}


// =====================================================
// 6. CONFIGURAR PERMISSÕES DA TELA
// =====================================================

function configurarPermissoesDaTela() {
    if (!perfilUsuario) {
        return;
    }

    if (perfilUsuario.funcao === "admin") {
        if (areaFiltroAdmin) {
            areaFiltroAdmin.style.display = "block";
        }

        return;
    }

    if (areaFiltroAdmin) {
        areaFiltroAdmin.style.display = "none";
    }
}


// =====================================================
// 7. BUSCAR EVENTOS DO MÊS
// =====================================================

async function carregarEventosDoMes() {
    if (!perfilUsuario) {
        return;
    }

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

    if (perfilUsuario.funcao === "admin" && filtroCursoAgenda) {
        const filtro = filtroCursoAgenda.value;

        if (filtro && filtro !== "todos") {
            consulta = consulta.eq("curso_alvo", filtro);
        }
    }

    const { data, error } = await consulta;

    if (error) {
        console.log("Erro ao buscar eventos:", error);
        return;
    }

    eventosCarregados = aplicarFiltroDePermissao(data || []);
}


// =====================================================
// 8. FILTRO DE PERMISSÃO
// =====================================================

function aplicarFiltroDePermissao(eventos) {
    if (!perfilUsuario) {
        return [];
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

    if (funcao.startsWith("aluno")) {
        return eventos.filter(function (evento) {
            return (
                evento.curso_alvo === "todos" ||
                evento.curso_alvo === curso ||
                (
                    evento.tipo === "ot" &&
                    evento.curso_alvo === curso
                )
            );
        });
    }

    return [];
}


// =====================================================
// 9. RENDERIZAR CALENDÁRIO
// =====================================================

function renderizarCalendario() {
    if (!gradeCalendario || !tituloMesAno) {
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

        const eventosDoDia = eventosCarregados.filter(function (evento) {
            return evento.data === dataISO;
        });

        const cardDia = document.createElement("div");
        cardDia.className = "dia-calendario";

        if (dataISO === formatarDataISO(new Date())) {
            cardDia.classList.add("dia-hoje");
        }

        cardDia.innerHTML = `
            <div class="cabecalho-dia">
                <span class="numero-dia">${dia}</span>
                <span class="quantidade-eventos">${eventosDoDia.length} evento(s)</span>
            </div>

            <div class="eventos-mini-dia">
                ${eventosDoDia.map(function (evento) {
                    return `
                        <div
                            class="evento-mini tipo-${normalizarTipo(evento.tipo)}"
                            title="${evento.descricao || evento.titulo}"
                            onclick="event.stopPropagation(); abrirDetalheEvento('${evento.id}')"
                        >
                            <span>${formatarHorarioCurto(evento.horario_inicio)}</span>
                            ${evento.titulo}
                        </div>
                    `;
                }).join("")}
            </div>
        `;

        cardDia.addEventListener("click", function () {
            abrirModalDoDia(dataISO, eventosDoDia);
        });

        gradeCalendario.appendChild(cardDia);
    }
}


// =====================================================
// 10. ABRIR MODAL DO DIA
// =====================================================

function abrirModalDoDia(dataISO, eventosDoDia) {
    dataSelecionadaNoModal = dataISO;

    modalTituloData.textContent = `Eventos de ${formatarDataBR(dataISO)}`;

    if (!eventosDoDia || eventosDoDia.length === 0) {
        listaEventosDia.innerHTML = "<p>Nenhum evento cadastrado para este dia.</p>";
    } else {
        listaEventosDia.innerHTML = "";

        eventosDoDia.forEach(function (evento) {
            listaEventosDia.innerHTML += `
                <div class="card-evento-dia">
                    <span class="tag-legenda tipo-${normalizarTipo(evento.tipo)}">
                        ${nomeBonitoTipo(evento.tipo)}
                    </span>

                    <h3>${evento.titulo}</h3>

                    <p>
                        <strong>Horário:</strong>
                        ${formatarHorarioCurto(evento.horario_inicio)}
                        ${evento.horario_fim ? " às " + formatarHorarioCurto(evento.horario_fim) : ""}
                    </p>

                    <p>${evento.descricao || "Sem descrição."}</p>

                    <p><strong>Curso alvo:</strong> ${evento.curso_alvo}</p>

                    ${
                        evento.link_material
                        ? `<p><a href="${evento.link_material}" target="_blank">📎 Acessar material</a></p>`
                        : ""
                    }

                    <button onclick="abrirDetalheEvento('${evento.id}')">
                        Ver detalhes
                    </button>
                </div>
            `;
        });
    }

    if (perfilUsuario && perfilUsuario.funcao === "admin") {
        btnAbrirFormEvento.style.display = "block";
    } else {
        btnAbrirFormEvento.style.display = "none";
    }

    formEvento.style.display = "none";
    modalDia.classList.add("aberto");
}


// =====================================================
// 11. ABRIR DETALHE DO EVENTO
// =====================================================

function abrirDetalheEvento(idEvento) {
    const evento = eventosCarregados.find(function (item) {
        return item.id === idEvento;
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

            <h2>${evento.titulo}</h2>

            <p><strong>Data:</strong> ${formatarDataBR(evento.data)}</p>

            <p>
                <strong>Horário:</strong>
                ${formatarHorarioCurto(evento.horario_inicio)}
                ${evento.horario_fim ? " às " + formatarHorarioCurto(evento.horario_fim) : ""}
            </p>

            <p><strong>Curso alvo:</strong> ${evento.curso_alvo}</p>

            <p><strong>Descrição:</strong></p>

            <p>${evento.descricao || "Sem descrição cadastrada."}</p>

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
        return item.id === idEvento;
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

    modalDetalheEvento.classList.remove("aberto");

    const eventosDoDia = eventosCarregados.filter(function (item) {
        return item.data === evento.data;
    });

    abrirModalDoDia(evento.data, eventosDoDia);

    formEvento.style.display = "block";

    if (tituloFormularioEvento) {
        tituloFormularioEvento.textContent = "Editar Evento";
    }

    document.getElementById("eventoTipo").value = evento.tipo;
    document.getElementById("eventoTitulo").value = evento.titulo || "";
    document.getElementById("eventoHorarioInicio").value = formatarHorarioParaInput(evento.horario_inicio);
    document.getElementById("eventoHorarioFim").value = formatarHorarioParaInput(evento.horario_fim);
    document.getElementById("eventoDescricao").value = evento.descricao || "";
    document.getElementById("eventoCursoAlvo").value = evento.curso_alvo || "todos";
    document.getElementById("eventoLinkMaterial").value = evento.link_material || "";

    document.getElementById("eventoRepeticao").value = "nao_repete";
    document.getElementById("eventoRepetirAte").value = "";

    const mensagemEvento = document.getElementById("mensagemEvento");

    if (mensagemEvento) {
        mensagemEvento.textContent = "Editando evento selecionado.";
    }

    const botaoSalvar = formEvento.querySelector("button[type='submit']");

    if (botaoSalvar) {
        botaoSalvar.textContent = "💾 Atualizar Evento";
    }
}


// =====================================================
// 13. EXCLUIR EVENTO - ABRE CONFIRMAÇÃO
// =====================================================

function excluirEvento(idEvento) {
    if (!perfilUsuario || perfilUsuario.funcao !== "admin") {
        alert("Apenas o administrador pode excluir eventos.");
        return;
    }

    eventoParaExcluirId = idEvento;

    if (modalConfirmarExclusao) {
        modalConfirmarExclusao.classList.add("aberto");
    }
}


// =====================================================
// 14. FECHAR MODAIS
// =====================================================

if (btnFecharModal) {
    btnFecharModal.addEventListener("click", function () {
        modalDia.classList.remove("aberto");
    });
}

if (btnFecharDetalheEvento) {
    btnFecharDetalheEvento.addEventListener("click", function () {
        modalDetalheEvento.classList.remove("aberto");
    });
}


// =====================================================
// 15. ABRIR FORMULÁRIO
// =====================================================

if (btnAbrirFormEvento) {
    btnAbrirFormEvento.addEventListener("click", function () {
        eventoEmEdicaoId = null;

        limparFormularioEvento();

        if (tituloFormularioEvento) {
            tituloFormularioEvento.textContent = "Novo Evento";
        }

        formEvento.style.display =
            formEvento.style.display === "none" ? "block" : "none";
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

        const tipo = document.getElementById("eventoTipo").value;
        const titulo = document.getElementById("eventoTitulo").value.trim();
        const horarioInicio = document.getElementById("eventoHorarioInicio").value;
        const horarioFim = document.getElementById("eventoHorarioFim").value;
        const descricao = document.getElementById("eventoDescricao").value.trim();
        const cursoAlvo = document.getElementById("eventoCursoAlvo").value;
        const linkMaterial = document.getElementById("eventoLinkMaterial").value.trim();
        const repeticao = document.getElementById("eventoRepeticao").value;
        const repetirAte = document.getElementById("eventoRepetirAte").value;
        const mensagemEvento = document.getElementById("mensagemEvento");

        if (!titulo) {
            mensagemEvento.textContent = "Preencha o título do evento.";
            return;
        }

        if (!horarioInicio) {
            mensagemEvento.textContent = "Preencha o horário de início.";
            return;
        }

        const dadosBase = {
            tipo: tipo,
            titulo: titulo,
            horario_inicio: horarioInicio,
            horario_fim: horarioFim || null,
            descricao: descricao,
            curso_alvo: cursoAlvo,
            link_material: linkMaterial
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

            const eventosParaSalvar = gerarEventosComRepeticao({
                ...dadosBase,
                data: dataSelecionadaNoModal,
                criado_por: userData.user.id
            }, repeticao, repetirAte);

            if (eventosParaSalvar.length === 0) {
                mensagemEvento.textContent = "Nenhuma data válida encontrada para salvar.";
                return;
            }

            resultado = await banco
                .from("eventos")
                .insert(eventosParaSalvar);
        }

        if (resultado.error) {
            mensagemEvento.textContent = "Erro ao salvar evento: " + resultado.error.message;
            console.log("Erro evento:", resultado.error);
            return;
        }

        mensagemEvento.textContent = eventoEmEdicaoId
            ? "Evento atualizado com sucesso!"
            : "Evento salvo com sucesso!";

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

function gerarEventosComRepeticao(eventoBase, repeticao, repetirAte) {
    if (repeticao === "nao_repete" || !repetirAte) {
        return [
            {
                ...eventoBase,
                data: eventoBase.data
            }
        ];
    }

    const eventos = [];

    let dataCursor = criarDataLocal(eventoBase.data);
    const dataLimite = criarDataLocal(repetirAte);

    while (dataCursor <= dataLimite) {
        if (dataEhDiaLetivo(dataCursor)) {
            eventos.push({
                ...eventoBase,
                data: formatarDataISO(dataCursor)
            });
        }

        if (repeticao === "diariamente") {
            dataCursor.setDate(dataCursor.getDate() + 1);
        }

        if (repeticao === "semanalmente") {
            dataCursor.setDate(dataCursor.getDate() + 7);
        }

        if (repeticao === "mensalmente") {
            dataCursor.setMonth(dataCursor.getMonth() + 1);
        }

        if (repeticao === "anualmente") {
            dataCursor.setFullYear(dataCursor.getFullYear() + 1);
        }
    }

    return eventos;
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
    document.getElementById("eventoTitulo").value = "";
    document.getElementById("eventoHorarioInicio").value = "";
    document.getElementById("eventoHorarioFim").value = "";
    document.getElementById("eventoDescricao").value = "";
    document.getElementById("eventoLinkMaterial").value = "";
    document.getElementById("eventoRepeticao").value = "nao_repete";
    document.getElementById("eventoRepetirAte").value = "";

    eventoEmEdicaoId = null;

    const mensagemEvento = document.getElementById("mensagemEvento");

    if (mensagemEvento) {
        mensagemEvento.textContent = "";
    }

    const botaoSalvar = formEvento.querySelector("button[type='submit']");

    if (botaoSalvar) {
        botaoSalvar.textContent = "💾 Salvar Evento";
    }

    if (tituloFormularioEvento) {
        tituloFormularioEvento.textContent = "Novo Evento";
    }
}


// =====================================================
// 20. CONFIRMAR EXCLUSÃO
// =====================================================

if (btnConfirmarExclusao) {
    btnConfirmarExclusao.addEventListener("click", async function () {
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

        modalConfirmarExclusao.classList.remove("aberto");
        modalDetalheEvento.classList.remove("aberto");
        modalDia.classList.remove("aberto");

        eventoParaExcluirId = null;

        alert("Evento excluído com sucesso!");

        await carregarEventosDoMes();

        renderizarCalendario();
    });
}


// =====================================================
// 21. CANCELAR EXCLUSÃO
// =====================================================

if (btnCancelarExclusao) {
    btnCancelarExclusao.addEventListener("click", function () {
        eventoParaExcluirId = null;

        if (modalConfirmarExclusao) {
            modalConfirmarExclusao.classList.remove("aberto");
        }
    });
}


// =====================================================
// 22. NAVEGAÇÃO ENTRE MESES
// =====================================================

if (btnMesAnterior) {
    btnMesAnterior.addEventListener("click", async function () {
        dataAtual.setMonth(dataAtual.getMonth() - 1);

        await carregarEventosDoMes();

        renderizarCalendario();
    });
}

if (btnProximoMes) {
    btnProximoMes.addEventListener("click", async function () {
        dataAtual.setMonth(dataAtual.getMonth() + 1);

        await carregarEventosDoMes();

        renderizarCalendario();
    });
}


// =====================================================
// 23. FILTRO ADMIN
// =====================================================

if (filtroCursoAgenda) {
    filtroCursoAgenda.addEventListener("change", async function () {
        await carregarEventosDoMes();

        renderizarCalendario();
    });
}


// =====================================================
// 24. FUNÇÕES AUXILIARES
// =====================================================

function criarDataLocal(dataISO) {
    const partes = dataISO.split("-");
    return new Date(Number(partes[0]), Number(partes[1]) - 1, Number(partes[2]));
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

    return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function primeiraLetraMaiuscula(texto) {
    return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function normalizarTipo(tipo) {
    return tipo
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

    return nomes[tipo] || tipo;
}