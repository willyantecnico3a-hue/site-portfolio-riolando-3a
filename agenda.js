// =====================================================
// AGENDA PEDAGÓGICA INTERATIVA
// HTML + CSS + JS PURO + SUPABASE
// =====================================================


// =====================================================
// 1. CONEXÃO COM SUPABASE
// =====================================================



const SUPABASE_URL = "https://pwomyoprbvoimqmikvev.supabase.co";

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
// Esta função identifica se o usuário é:
// - admin/professor
// - coordenação/direção
// - aluno
//
// Primeiro ela tenta buscar na tabela "perfis".
// Se não encontrar, ela verifica também a tabela "admins",
// porque seu painel administrativo atual já usa essa tabela.
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

    // 1. Tenta buscar o usuário na tabela perfis
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

    // 2. Se não encontrou na tabela perfis, tenta buscar na tabela admins
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

    // 3. Se não encontrou em nenhuma tabela, trata como usuário sem permissão
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
// 6. CONFIGURAR PERMISSÕES NA TELA
// Define quem pode criar evento e quem só visualiza
// =====================================================

function configurarPermissoesDaTela() {
    if (!perfilUsuario) {
        console.log("Perfil do usuário não carregado.");
        return;
    }

    console.log("Função do usuário na agenda:", perfilUsuario.funcao);

    // Admin/professor pode ver filtro e criar eventos
    if (perfilUsuario.funcao === "admin") {
        if (areaFiltroAdmin) {
            areaFiltroAdmin.style.display = "block";
        }

        if (btnAbrirFormEvento) {
            btnAbrirFormEvento.style.display = "block";
        }

        return;
    }

    // Gestão vê tudo, mas não cria evento
    if (
        perfilUsuario.funcao === "coordenacao" ||
        perfilUsuario.funcao === "direcao" ||
        perfilUsuario.funcao === "vice_direcao" ||
        perfilUsuario.funcao === "gestao"
    ) {
        if (areaFiltroAdmin) {
            areaFiltroAdmin.style.display = "none";
        }

        if (btnAbrirFormEvento) {
            btnAbrirFormEvento.style.display = "none";
        }

        return;
    }

    // Aluno só visualiza eventos permitidos
    if (perfilUsuario.funcao.startsWith("aluno")) {
        if (areaFiltroAdmin) {
            areaFiltroAdmin.style.display = "none";
        }

        if (btnAbrirFormEvento) {
            btnAbrirFormEvento.style.display = "none";
        }

        return;
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
async function excluirEvento(idEvento) {

// =====================================================
// ABRIR CAIXA DE CONFIRMAÇÃO PARA EXCLUIR EVENTO
// Esta função NÃO exclui direto.
// Ela apenas abre uma caixa perguntando SIM ou NÃO.
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
// 8. FILTRO DE PERMISSÃO
// =====================================================

function aplicarFiltroDePermissao(eventos) {
    if (!perfilUsuario) {
        return [];
    }

    const funcao = perfilUsuario.funcao;
    const curso = perfilUsuario.curso;

    // Professor/admin vê tudo.
    if (funcao === "admin") {
        return eventos;
    }

    // Direção, vices e coordenação veem tudo, mas sem criar/editar.
    if (
        funcao === "coordenacao" ||
        funcao === "direcao" ||
        funcao === "vice_direcao" ||
        funcao === "gestao"
    ) {
        return eventos;
    }

    // Aluno vê:
    // 1. Eventos gerais: todos
    // 2. Eventos do próprio curso
    // 3. OT direcionada ao curso dele
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
// 9. RENDERIZAR O CALENDÁRIO
// =====================================================

function renderizarCalendario() {
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

    // Espaços vazios antes do dia 1.
    for (let i = 0; i < diaSemanaInicio; i++) {
        const vazio = document.createElement("div");
        vazio.className = "dia-vazio";
        gradeCalendario.appendChild(vazio);
    }

    // Cria os dias do mês.
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

        // Clicar no dia abre modal do dia.
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

    // Só admin pode criar evento.
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
// Mostra os dados completos do evento.
// Se o usuário for admin, mostra botão de editar e excluir.
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
// PREPARAR EDIÇÃO DO EVENTO
// Pega os dados do evento clicado e coloca no formulário.
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

    document.getElementById("eventoTipo").value = evento.tipo;
    document.getElementById("eventoTitulo").value = evento.titulo || "";
    document.getElementById("eventoHorarioInicio").value = formatarHorarioParaInput(evento.horario_inicio);
    document.getElementById("eventoHorarioFim").value = formatarHorarioParaInput(evento.horario_fim);
    document.getElementById("eventoDescricao").value = evento.descricao || "";
    document.getElementById("eventoCursoAlvo").value = evento.curso_alvo || "todos";
    document.getElementById("eventoLinkMaterial").value = evento.link_material || "";

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
// 12. FECHAR MODAIS
// =====================================================

btnFecharModal.addEventListener("click", function () {
    modalDia.classList.remove("aberto");
});

btnFecharDetalheEvento.addEventListener("click", function () {
    modalDetalheEvento.classList.remove("aberto");
});


// =====================================================
// 13. ABRIR FORMULÁRIO DE EVENTO
// =====================================================

btnAbrirFormEvento.addEventListener("click", function () {
    formEvento.style.display =
        formEvento.style.display === "none" ? "block" : "none";
});


// =====================================================
// 14. SALVAR OU ATUALIZAR EVENTO
// Se eventoEmEdicaoId estiver vazio, cria novo evento.
// Se tiver ID, atualiza o evento existente.
// =====================================================

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
    const mensagemEvento = document.getElementById("mensagemEvento");

    if (!titulo) {
        mensagemEvento.textContent = "Preencha o título do evento.";
        return;
    }

    if (!horarioInicio) {
        mensagemEvento.textContent = "Preencha o horário de início.";
        return;
    }

    const dadosEvento = {
        data: dataSelecionadaNoModal,
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
            .update(dadosEvento)
            .eq("id", eventoEmEdicaoId);
    } else {
        const { data: userData } = await banco.auth.getUser();

        dadosEvento.criado_por = userData.user.id;

        resultado = await banco
            .from("eventos")
            .insert([dadosEvento]);
    }

    if (resultado.error) {
        mensagemEvento.textContent = "Erro ao salvar evento: " + resultado.error.message;
        console.log("Erro evento:", resultado.error);
        return;
    }

    if (eventoEmEdicaoId) {
        mensagemEvento.textContent = "Evento atualizado com sucesso!";
    } else {
        mensagemEvento.textContent = "Evento salvo com sucesso!";
    }
// =====================================================
// 15. LIMPAR FORMULÁRIO
// Limpa os campos e volta o botão para "Salvar Evento".
// =====================================================

function limparFormularioEvento() {
    document.getElementById("eventoTitulo").value = "";
    document.getElementById("eventoHorarioInicio").value = "";
    document.getElementById("eventoHorarioFim").value = "";
    document.getElementById("eventoDescricao").value = "";
    document.getElementById("eventoLinkMaterial").value = "";

    eventoEmEdicaoId = null;

    const mensagemEvento = document.getElementById("mensagemEvento");

    if (mensagemEvento) {
        mensagemEvento.textContent = "";
    }

    const botaoSalvar = formEvento.querySelector("button[type='submit']");

    if (botaoSalvar) {
        botaoSalvar.textContent = "💾 Salvar Evento";
    }
}
    }

    await carregarEventosDoMes();

    renderizarCalendario();

    const eventosAtualizados = eventosCarregados.filter(function (evento) {
        return evento.data === dataSelecionadaNoModal;
    });

    abrirModalDoDia(dataSelecionadaNoModal, eventosAtualizados);
});

// =====================================================
// 16. NAVEGAÇÃO ENTRE MESES
// =====================================================

btnMesAnterior.addEventListener("click", async function () {
    dataAtual.setMonth(dataAtual.getMonth() - 1);

    await carregarEventosDoMes();

    renderizarCalendario();
});

btnProximoMes.addEventListener("click", async function () {
    dataAtual.setMonth(dataAtual.getMonth() + 1);

    await carregarEventosDoMes();

    renderizarCalendario();
});


// =====================================================
// 17. FILTRO ADMIN
// =====================================================

if (filtroCursoAgenda) {
    filtroCursoAgenda.addEventListener("change", async function () {
        await carregarEventosDoMes();

        renderizarCalendario();
    });
}


// =====================================================
// 18. FUNÇÕES AUXILIARES
// =====================================================


// =====================================================
// FORMATAR HORÁRIO PARA INPUT TYPE TIME
// O banco pode retornar 18:10:00.
// O input time usa 18:10.
// =====================================================

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

// =====================================================
// CONFIRMAR EXCLUSÃO DO EVENTO
// Só executa quando o usuário clicar em "Sim, excluir"
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

        // Fecha todos os modais relacionados
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

        alert("Evento excluído com sucesso!");

        await carregarEventosDoMes();

        renderizarCalendario();
    });
}


// =====================================================
// CANCELAR EXCLUSÃO DO EVENTO
// Fecha a caixa e mantém o evento cadastrado.
// =====================================================

if (btnCancelarExclusao) {
    btnCancelarExclusao.addEventListener("click", function () {
        eventoParaExcluirId = null;

        if (modalConfirmarExclusao) {
            modalConfirmarExclusao.classList.remove("aberto");
        }
    });
}