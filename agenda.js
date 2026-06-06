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
// 2. VARIÁVEIS GLOBAIS DA AGENDA
// =====================================================

let dataAtual = new Date();

let eventosCarregados = [];

let perfilUsuario = null;

let dataSelecionadaNoModal = null;


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


// =====================================================
// 4. INICIALIZAÇÃO
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
        return;
    }

    const { data, error } = await banco
        .from("perfis")
        .select("id, nome, email, funcao, curso")
        .eq("id", userData.user.id)
        .maybeSingle();

    if (error) {
        console.log("Erro ao carregar perfil:", error);
        return;
    }

    perfilUsuario = data;
}


// =====================================================
// 6. CONFIGURAR PERMISSÕES DA TELA
// =====================================================

function configurarPermissoesDaTela() {
    if (!perfilUsuario) {
        return;
    }

    const funcao = perfilUsuario.funcao;

    if (funcao === "admin") {
        areaFiltroAdmin.style.display = "block";
        btnAbrirFormEvento.style.display = "block";
    }

    if (funcao === "coordenacao") {
        areaFiltroAdmin.style.display = "none";
        btnAbrirFormEvento.style.display = "none";
    }

    if (funcao.startsWith("aluno")) {
        areaFiltroAdmin.style.display = "none";
        btnAbrirFormEvento.style.display = "none";
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
        .order("data", { ascending: true });

    // Filtro visual do admin.
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
// 8. FILTRO DE PERMISSÃO EM JAVASCRIPT
// =====================================================

function aplicarFiltroDePermissao(eventos) {
    if (!perfilUsuario) {
        return [];
    }

    const funcao = perfilUsuario.funcao;
    const curso = perfilUsuario.curso;

    // Admin vê tudo.
    if (funcao === "admin") {
        return eventos;
    }

    // Coordenação vê tudo, mas só leitura.
    if (funcao === "coordenacao") {
        return eventos;
    }

    // Aluno vê apenas eventos do seu curso ou eventos para todos.
    if (funcao.startsWith("aluno")) {
        return eventos.filter(function (evento) {
            return (
                evento.curso_alvo === curso ||
                evento.curso_alvo === "todos"
            );
        });
    }

    return [];
}


// =====================================================
// 9. RENDERIZAR CALENDÁRIO
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
            <div class="numero-dia">${dia}</div>
            <div class="eventos-mini-dia">
                ${eventosDoDia.slice(0, 3).map(function (evento) {
                    return `
                        <span class="evento-mini tipo-${normalizarTipo(evento.tipo)}">
                            ${evento.titulo}
                        </span>
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
                        ${evento.tipo}
                    </span>

                    <h3>${evento.titulo}</h3>

                    <p>${evento.descricao || "Sem descrição."}</p>

                    <p><strong>Curso alvo:</strong> ${evento.curso_alvo}</p>

                    ${
                        evento.link_material
                        ? `<p><a href="${evento.link_material}" target="_blank">📎 Acessar material</a></p>`
                        : ""
                    }
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
// 11. FECHAR MODAL
// =====================================================

btnFecharModal.addEventListener("click", function () {
    modalDia.classList.remove("aberto");
});


// =====================================================
// 12. ABRIR FORMULÁRIO DE NOVO EVENTO
// =====================================================

btnAbrirFormEvento.addEventListener("click", function () {
    formEvento.style.display =
        formEvento.style.display === "none" ? "block" : "none";
});


// =====================================================
// 13. SALVAR EVENTO NOVO
// =====================================================

formEvento.addEventListener("submit", async function (event) {
    event.preventDefault();

    if (!perfilUsuario || perfilUsuario.funcao !== "admin") {
        alert("Apenas admin pode criar eventos.");
        return;
    }

    const tipo = document.getElementById("eventoTipo").value;
    const titulo = document.getElementById("eventoTitulo").value.trim();
    const descricao = document.getElementById("eventoDescricao").value.trim();
    const cursoAlvo = document.getElementById("eventoCursoAlvo").value;
    const linkMaterial = document.getElementById("eventoLinkMaterial").value.trim();
    const mensagemEvento = document.getElementById("mensagemEvento");

    if (!titulo) {
        mensagemEvento.textContent = "Preencha o título do evento.";
        return;
    }

    const { data: userData } = await banco.auth.getUser();

    const { error } = await banco
        .from("eventos")
        .insert([
            {
                data: dataSelecionadaNoModal,
                tipo: tipo,
                titulo: titulo,
                descricao: descricao,
                curso_alvo: cursoAlvo,
                link_material: linkMaterial,
                criado_por: userData.user.id
            }
        ]);

    if (error) {
        mensagemEvento.textContent = "Erro ao salvar evento: " + error.message;
        console.log("Erro evento:", error);
        return;
    }

    mensagemEvento.textContent = "Evento salvo com sucesso!";

    document.getElementById("eventoTitulo").value = "";
    document.getElementById("eventoDescricao").value = "";
    document.getElementById("eventoLinkMaterial").value = "";

    await carregarEventosDoMes();

    renderizarCalendario();

    const eventosDoDiaAtualizado = eventosCarregados.filter(function (evento) {
        return evento.data === dataSelecionadaNoModal;
    });

    abrirModalDoDia(dataSelecionadaNoModal, eventosDoDiaAtualizado);
});


// =====================================================
// 14. NAVEGAÇÃO ENTRE MESES
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
// 15. FILTRO DO ADMIN
// =====================================================

if (filtroCursoAgenda) {
    filtroCursoAgenda.addEventListener("change", async function () {
        await carregarEventosDoMes();

        renderizarCalendario();
    });
}


// =====================================================
// 16. FUNÇÕES AUXILIARES
// =====================================================

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
        .replace("ç", "c")
        .replace("ã", "a")
        .replace("á", "a")
        .replace("é", "e")
        .replace(/\s+/g, "_");
}