/* =====================================================
   RELATÓRIOS E INDICADORES PAEET
   Professor/PAEET Willyan Vieira da Cruz
   Riolando Conecta Técnico
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

let usuarioAdminRelatorio = null;

let dadosRelatorio = {
    eventos: [],
    portfolios: [],
    chamados: [],
    indicadores: {}
};


/* =====================================================
   3. INICIAR PÁGINA
===================================================== */

document.addEventListener("DOMContentLoaded", iniciarRelatorios);

async function iniciarRelatorios() {
    preencherDataEmissao();
    configurarEventosDosBotoes();
    configurarDatasIniciais();

    await verificarAcessoAdminRelatorio();
}


/* =====================================================
   4. SEGURANÇA - SOMENTE ADMIN
===================================================== */

async function verificarAcessoAdminRelatorio() {
    const areaBloqueio = document.getElementById("areaBloqueioRelatorio");
    const areaDashboard = document.getElementById("areaDashboardRelatorio");

    const { data: userData, error: userError } = await banco.auth.getUser();

    if (userError || !userData || !userData.user) {
        mostrarBloqueioRelatorio();
        return;
    }

    const usuario = userData.user;

    const { data: admin, error: adminError } = await banco
        .from("admins")
        .select("email")
        .eq("email", usuario.email)
        .maybeSingle();

    if (adminError) {
        console.log("Erro ao verificar admin:", adminError);
        mostrarBloqueioRelatorio();
        return;
    }

    if (!admin) {
        mostrarBloqueioRelatorio();
        return;
    }

    usuarioAdminRelatorio = usuario;

    if (areaBloqueio) {
        areaBloqueio.style.display = "none";
    }

    if (areaDashboard) {
        areaDashboard.style.display = "block";
    }

    await gerarRelatorio();
}


function mostrarBloqueioRelatorio() {
    const areaBloqueio = document.getElementById("areaBloqueioRelatorio");
    const areaDashboard = document.getElementById("areaDashboardRelatorio");

    if (areaBloqueio) {
        areaBloqueio.style.display = "block";
    }

    if (areaDashboard) {
        areaDashboard.style.display = "none";
    }
}


/* =====================================================
   5. EVENTOS DOS BOTÕES
===================================================== */

function configurarEventosDosBotoes() {
    const btnGerar = document.getElementById("btnGerarRelatorio");
    const btnCsv = document.getElementById("btnBaixarCsvRelatorio");
    const btnPdf = document.getElementById("btnBaixarPdfRelatorio");
    const filtroPeriodo = document.getElementById("filtroPeriodoRelatorio");

    if (btnGerar) {
        btnGerar.addEventListener("click", gerarRelatorio);
    }

    if (btnCsv) {
        btnCsv.addEventListener("click", baixarCsvRelatorio);
    }

    if (btnPdf) {
        btnPdf.addEventListener("click", baixarPdfRelatorio);
    }

    if (filtroPeriodo) {
        filtroPeriodo.addEventListener("change", configurarDatasPorPeriodo);
    }
}


/* =====================================================
   6. DATAS E FILTROS
===================================================== */

function configurarDatasIniciais() {
    configurarDatasPorPeriodo();
}


function configurarDatasPorPeriodo() {
    const periodo = getValor("filtroPeriodoRelatorio") || "mensal";

    const hoje = new Date();
    let inicio = new Date(hoje);
    let fim = new Date(hoje);

    if (periodo === "semanal") {
        const diaSemana = hoje.getDay();
        const diferencaSegunda = diaSemana === 0 ? -6 : 1 - diaSemana;

        inicio = new Date(hoje);
        inicio.setDate(hoje.getDate() + diferencaSegunda);

        fim = new Date(inicio);
        fim.setDate(inicio.getDate() + 6);
    }

    if (periodo === "mensal") {
        inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
        fim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
    }

    if (periodo === "bimestral") {
        const mesAtual = hoje.getMonth();
        const inicioBimestre = Math.floor(mesAtual / 2) * 2;

        inicio = new Date(hoje.getFullYear(), inicioBimestre, 1);
        fim = new Date(hoje.getFullYear(), inicioBimestre + 2, 0);
    }

    if (periodo === "semestral") {
        const inicioSemestre = hoje.getMonth() < 6 ? 0 : 6;

        inicio = new Date(hoje.getFullYear(), inicioSemestre, 1);
        fim = new Date(hoje.getFullYear(), inicioSemestre + 6, 0);
    }

    if (periodo === "anual") {
        inicio = new Date(hoje.getFullYear(), 0, 1);
        fim = new Date(hoje.getFullYear(), 11, 31);
    }

    if (periodo === "personalizado") {
        return;
    }

    setValor("dataInicioRelatorio", formatarDataISO(inicio));
    setValor("dataFimRelatorio", formatarDataISO(fim));
}


/* =====================================================
   7. GERAR RELATÓRIO
===================================================== */

async function buscarEventosRelatorio(filtros) {
    let consulta = banco
        .from("eventos")
        .select("*")
        .gte("data", filtros.dataInicio)
        .lte("data", filtros.dataFim)
        .order("data", { ascending: true });

    if (filtros.tipoEvento && filtros.tipoEvento !== "todos") {
        consulta = consulta.eq("tipo", filtros.tipoEvento);
    }

    const { data, error } = await consulta;

    if (error) {
        console.log("Erro ao buscar eventos:", error);
        return [];
    }

    let eventos = data || [];

    // Filtro de curso feito no JavaScript para evitar erro/travamento no Supabase
    if (filtros.curso && filtros.curso !== "todos") {
        eventos = eventos.filter(function (evento) {
            const cursoEvento = normalizarTexto(evento.curso_alvo || "todos");
            const cursoFiltro = normalizarTexto(filtros.curso);

            return cursoEvento === cursoFiltro || cursoEvento === "todos" || cursoEvento === "";
        });
    }

    // Filtro de turma usando a nova coluna turma_alvo
    // Para evitar relatório equivocado, turma específica mostra somente eventos daquela turma.
    if (filtros.turma && filtros.turma !== "todas") {
        eventos = eventos.filter(function (evento) {
            const turmaEvento = normalizarTurma(evento.turma_alvo || "");
            const turmaFiltro = normalizarTurma(filtros.turma);

            return turmaEvento === turmaFiltro;
        });
    }

    return eventos;
}

function obterFiltrosRelatorio() {
    return {
        periodo: getValor("filtroPeriodoRelatorio") || "mensal",
        curso: getValor("filtroCursoRelatorio") || "todos",
        turma: getValor("filtroTurmaRelatorio") || "todas",
        tipoEvento: getValor("filtroTipoEventoRelatorio") || "todos",
        dataInicio: getValor("dataInicioRelatorio"),
        dataFim: getValor("dataFimRelatorio")
    };
}


/* =====================================================
   8. BUSCAR EVENTOS
===================================================== */

async function buscarEventosRelatorio(filtros) {
    let consulta = banco
        .from("eventos")
        .select("*")
        .gte("data", filtros.dataInicio)
        .lte("data", filtros.dataFim)
        .order("data", { ascending: true })
        .order("horario_inicio", { ascending: true });

    if (filtros.curso && filtros.curso !== "todos") {
        consulta = consulta.or(`curso_alvo.eq.${filtros.curso},curso_alvo.eq.todos,curso_alvo.is.null`);
    }

    if (filtros.tipoEvento && filtros.tipoEvento !== "todos") {
        consulta = consulta.eq("tipo", filtros.tipoEvento);
    }

    const { data, error } = await consulta;

    if (error) {
        console.log("Erro ao buscar eventos:", error);
        return [];
    }

    let eventos = data || [];

    if (filtros.turma && filtros.turma !== "todas") {
        eventos = eventos.filter(function (evento) {
            const turmaEvento = normalizarTurma(evento.turma_alvo || "todas");
            const turmaFiltro = normalizarTurma(filtros.turma);

            return turmaEvento === turmaFiltro || turmaEvento === "todas";
        });
    }

    return eventos;
}


/* =====================================================
   9. BUSCAR PORTFÓLIOS
===================================================== */

async function buscarPortfoliosRelatorio(filtros) {
    const { data, error } = await banco
        .from("portfolio_alunos")
        .select("*");

    if (error) {
        console.log("Erro ao buscar portfólios:", error);
        return [];
    }

    let portfolios = data || [];

    portfolios = portfolios.filter(function (item) {
        const dataItem = obterDataGenerica(item);

        if (!dataItem) {
            return true;
        }

        return dataItem >= filtros.dataInicio && dataItem <= filtros.dataFim;
    });

    if (filtros.curso && filtros.curso !== "todos") {
        portfolios = portfolios.filter(function (item) {
            const curso = normalizarTexto(item.curso || item.curso_alvo || item.curso_aluno || "");

            return curso === normalizarTexto(filtros.curso) || curso === "todos" || curso === "";
        });
    }

    if (filtros.turma && filtros.turma !== "todas") {
        portfolios = portfolios.filter(function (item) {
            const turma = normalizarTurma(item.turma || item.nome_turma || item.turma_aluno || "");
            const turmaFiltro = normalizarTurma(filtros.turma);

            return turma.includes(turmaFiltro);
        });
    }

    return portfolios;
}


/* =====================================================
   10. BUSCAR CHAMADOS
===================================================== */

async function buscarChamadosRelatorio(filtros) {
    const { data, error } = await banco
        .from("solicitacoes_ajuda")
        .select("*");

    if (error) {
        console.log("Erro ao buscar chamados:", error);
        return [];
    }

    let chamados = data || [];

    chamados = chamados.filter(function (item) {
        const dataItem = obterDataGenerica(item);

        if (!dataItem) {
            return true;
        }

        return dataItem >= filtros.dataInicio && dataItem <= filtros.dataFim;
    });

    if (filtros.curso && filtros.curso !== "todos") {
        chamados = chamados.filter(function (item) {
            const curso = normalizarTexto(item.curso || item.curso_aluno || item.curso_alvo || "");

            return curso === normalizarTexto(filtros.curso) || curso === "";
        });
    }

    if (filtros.turma && filtros.turma !== "todas") {
        chamados = chamados.filter(function (item) {
            const turma = normalizarTurma(item.turma || item.turma_aluno || item.aluno_turma || "");
            const turmaFiltro = normalizarTurma(filtros.turma);

            return turma.includes(turmaFiltro);
        });
    }

    return chamados;
}


/* =====================================================
   11. CALCULAR INDICADORES
===================================================== */

function calcularIndicadoresRelatorio(eventos, portfolios, chamados) {
    const aulas = eventos.filter(function (evento) {
        return normalizarTexto(evento.tipo) === "aula";
    });

    const intercorrencias = eventos.filter(function (evento) {
        return eventoEhIntercorrencia(evento);
    });

    const chamadosEnviados = chamados.filter(function (item) {
        return normalizarTexto(item.status) === "enviado";
    });

    const chamadosAnalise = chamados.filter(function (item) {
        return normalizarTexto(item.status) === "em_analise";
    });

    const chamadosRespondidos = chamados.filter(function (item) {
        return normalizarTexto(item.status) === "respondido";
    });

    const chamadosResolvidos = chamados.filter(function (item) {
        return normalizarTexto(item.status) === "resolvido";
    });

    const chamadosArquivados = chamados.filter(function (item) {
        return normalizarTexto(item.status) === "arquivado";
    });

    return {
        aulasLecionadas: aulas.length,
        totalEventos: eventos.length,
        cargaHorariaMinutos: somarCargaHorariaEventos(eventos),
        portfoliosEnviados: portfolios.length,
        chamadosEnviados: chamadosEnviados.length,
        chamadosAnalise: chamadosAnalise.length,
        chamadosRespondidos: chamadosRespondidos.length,
        chamadosResolvidos: chamadosResolvidos.length,
        chamadosArquivados: chamadosArquivados.length,
        intercorrencias: intercorrencias.length
    };
}


function renderizarIndicadores(indicadores) {
    setTexto("indicadorAulasLecionadas", indicadores.aulasLecionadas);
    setTexto("indicadorTotalEventos", indicadores.totalEventos);
    setTexto("indicadorCargaHoraria", formatarMinutosEmHoras(indicadores.cargaHorariaMinutos));
    setTexto("indicadorPortfolios", indicadores.portfoliosEnviados);
    setTexto("indicadorChamadosEnviados", indicadores.chamadosEnviados);
    setTexto("indicadorChamadosAnalise", indicadores.chamadosAnalise);
    setTexto("indicadorChamadosRespondidos", indicadores.chamadosRespondidos);
    setTexto("indicadorChamadosResolvidos", indicadores.chamadosResolvidos);
    setTexto("indicadorChamadosArquivados", indicadores.chamadosArquivados);
    setTexto("indicadorIntercorrencias", indicadores.intercorrencias);
}


/* =====================================================
   12. GRÁFICOS SIMPLES
===================================================== */

function renderizarGraficos(eventos, chamados) {
    renderizarGraficoEventosPorTipo(eventos);
    renderizarGraficoChamadosStatus(chamados);
}


function renderizarGraficoEventosPorTipo(eventos) {
    const container = document.getElementById("graficoEventosPorTipo");

    if (!container) {
        return;
    }

    const contagem = {};

    eventos.forEach(function (evento) {
        const tipo = normalizarTexto(evento.tipo || "outro");
        const nome = nomeBonitoTipo(tipo);

        contagem[nome] = (contagem[nome] || 0) + 1;
    });

    renderizarGraficoBarras(container, contagem);
}


function renderizarGraficoChamadosStatus(chamados) {
    const container = document.getElementById("graficoChamadosStatus");

    if (!container) {
        return;
    }

    const contagem = {
        "Enviados": 0,
        "Em análise": 0,
        "Respondidos": 0,
        "Resolvidos": 0,
        "Arquivados": 0
    };

    chamados.forEach(function (chamado) {
        const status = normalizarTexto(chamado.status);

        if (status === "enviado") {
            contagem["Enviados"]++;
        }

        if (status === "em_analise") {
            contagem["Em análise"]++;
        }

        if (status === "respondido") {
            contagem["Respondidos"]++;
        }

        if (status === "resolvido") {
            contagem["Resolvidos"]++;
        }

        if (status === "arquivado") {
            contagem["Arquivados"]++;
        }
    });

    renderizarGraficoBarras(container, contagem);
}


function renderizarGraficoBarras(container, contagem) {
    container.innerHTML = "";

    const valores = Object.values(contagem);
    const maximo = Math.max(...valores, 1);

    const entradas = Object.entries(contagem)
        .filter(function ([_, valor]) {
            return valor > 0;
        })
        .sort(function (a, b) {
            return b[1] - a[1];
        });

    if (entradas.length === 0) {
        container.innerHTML = "<p>Nenhum dado encontrado para gerar gráfico.</p>";
        return;
    }

    entradas.forEach(function ([rotulo, valor]) {
        const largura = Math.max((valor / maximo) * 100, 6);

        container.innerHTML += `
            <div class="linha-grafico-relatorio">
                <span class="rotulo-grafico-relatorio">${escaparHTML(rotulo)}</span>

                <div class="barra-grafico-relatorio">
                    <div class="preenchimento-grafico-relatorio" style="width:${largura}%"></div>
                </div>

                <span class="valor-grafico-relatorio">${valor}</span>
            </div>
        `;
    });
}


/* =====================================================
   13. TABELA DETALHADA
===================================================== */

function renderizarTabelaEventos(eventos) {
    const corpo = document.getElementById("corpoTabelaEventosRelatorio");

    if (!corpo) {
        return;
    }

    if (!eventos || eventos.length === 0) {
        corpo.innerHTML = `
            <tr>
                <td colspan="8">Nenhum evento encontrado para o período selecionado.</td>
            </tr>
        `;
        return;
    }

    corpo.innerHTML = "";

    eventos.forEach(function (evento) {
        const duracao = calcularDuracaoEvento(evento.horario_inicio, evento.horario_fim);

        corpo.innerHTML += `
            <tr>
                <td>${formatarDataBR(evento.data)}</td>
                <td>${escaparHTML(nomeBonitoTipo(evento.tipo))}</td>
                <td>${escaparHTML(evento.titulo || "Sem título")}</td>
                <td>${escaparHTML(limitarTexto(evento.descricao || "Sem descrição", 180))}</td>
                <td>${formatarHorarioCurto(evento.horario_inicio)}</td>
                <td>${formatarHorarioCurto(evento.horario_fim)}</td>
                <td>${duracao}</td>
                <td>${formatarCursoBonito(evento.curso_alvo || "todos")}</td>
            </tr>
        `;
    });
}


/* =====================================================
   14. CSV
===================================================== */

function baixarCsvRelatorio() {
    const eventos = dadosRelatorio.eventos || [];

    if (eventos.length === 0) {
        alert("Gere um relatório com eventos antes de baixar o CSV.");
        return;
    }

    const filtros = obterFiltrosRelatorio();

    const linhas = [];

    linhas.push([
        "data",
        "tipo",
        "titulo",
        "descricao",
        "horario_inicio",
        "horario_fim",
        "duracao",
        "curso",
        "turma_filtro",
        "professor_paeet",
        "data_emissao"
    ]);

    eventos.forEach(function (evento) {
        linhas.push([
            formatarDataBR(evento.data),
            nomeBonitoTipo(evento.tipo),
            evento.titulo || "",
            limparTextoCsv(evento.descricao || ""),
            formatarHorarioCurto(evento.horario_inicio),
            formatarHorarioCurto(evento.horario_fim),
            calcularDuracaoEvento(evento.horario_inicio, evento.horario_fim),
            formatarCursoBonito(evento.curso_alvo || "todos"),
            filtros.turma,
            "Willyan Vieira da Cruz",
            formatarDataBR(formatarDataISO(new Date()))
        ]);
    });

    const conteudoCsv = linhas
        .map(function (linha) {
            return linha.map(formatarCampoCsv).join(",");
        })
        .join("\n");

    const blob = new Blob(["\uFEFF" + conteudoCsv], {
        type: "text/csv;charset=utf-8;"
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = criarNomeArquivoRelatorio("csv");

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
}


function formatarCampoCsv(valor) {
    const texto = String(valor ?? "");

    return `"${texto.replaceAll('"', '""')}"`;
}


function limparTextoCsv(texto) {
    return String(texto || "")
        .replaceAll("\n", " ")
        .replaceAll("\r", " ")
        .trim();
}


/* =====================================================
   15. PDF
===================================================== */

function baixarPdfRelatorio() {
    window.print();
}


/* =====================================================
   16. CABEÇALHO DO DOCUMENTO
===================================================== */

function preencherDataEmissao() {
    setTexto("dataEmissaoRelatorio", formatarDataBR(formatarDataISO(new Date())));
}


function atualizarCabecalhoDocumento(filtros) {
    setTexto("cursoDocumentoRelatorio", formatarCursoBonito(filtros.curso));
    setTexto("turmaDocumentoRelatorio", filtros.turma === "todas" ? "Todas" : filtros.turma);

    const periodoTexto = `${formatarDataBR(filtros.dataInicio)} até ${formatarDataBR(filtros.dataFim)}`;

    setTexto("periodoDocumentoRelatorio", periodoTexto);
}


/* =====================================================
   17. FUNÇÕES AUXILIARES
===================================================== */

function getValor(id) {
    const elemento = document.getElementById(id);

    if (!elemento) {
        return "";
    }

    return elemento.value;
}


function setValor(id, valor) {
    const elemento = document.getElementById(id);

    if (!elemento) {
        return;
    }

    elemento.value = valor;
}


function setTexto(id, texto) {
    const elemento = document.getElementById(id);

    if (!elemento) {
        return;
    }

    elemento.textContent = texto;
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


function formatarHorarioCurto(horario) {
    if (!horario) {
        return "--:--";
    }

    return horario.toString().substring(0, 5);
}


function converterHorarioParaMinutos(horario) {
    if (!horario) {
        return 0;
    }

    const partes = horario.toString().substring(0, 5).split(":");
    const horas = Number(partes[0]) || 0;
    const minutos = Number(partes[1]) || 0;

    return horas * 60 + minutos;
}


function calcularDuracaoEvento(inicio, fim) {
    if (!inicio || !fim) {
        return "Não informado";
    }

    const minutos = converterHorarioParaMinutos(fim) - converterHorarioParaMinutos(inicio);

    if (minutos <= 0) {
        return "Não informado";
    }

    return formatarMinutosEmHoras(minutos);
}


function somarCargaHorariaEventos(eventos) {
    return eventos.reduce(function (total, evento) {
        if (!evento.horario_inicio || !evento.horario_fim) {
            return total;
        }

        const minutos = converterHorarioParaMinutos(evento.horario_fim) -
            converterHorarioParaMinutos(evento.horario_inicio);

        if (minutos > 0) {
            return total + minutos;
        }

        return total;
    }, 0);
}


function formatarMinutosEmHoras(minutos) {
    if (!minutos || minutos <= 0) {
        return "0h";
    }

    const horas = Math.floor(minutos / 60);
    const resto = minutos % 60;

    if (horas > 0 && resto > 0) {
        return `${horas}h ${resto}min`;
    }

    if (horas > 0) {
        return `${horas}h`;
    }

    return `${resto}min`;
}


function obterDataGenerica(item) {
    const possiveisCampos = [
        "data",
        "data_envio",
        "data_criacao",
        "criado_em",
        "created_at",
        "inserted_at",
        "atualizado_em"
    ];

    for (const campo of possiveisCampos) {
        if (item[campo]) {
            return item[campo].toString().substring(0, 10);
        }
    }

    return "";
}


function normalizarTexto(texto) {
    if (!texto) {
        return "";
    }

    return texto
        .toString()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, "_")
        .trim();
}


function eventoEhIntercorrencia(evento) {
    const tipo = normalizarTexto(evento.tipo);
    const titulo = normalizarTexto(evento.titulo || "");
    const descricao = normalizarTexto(evento.descricao || "");

    const tipos = [
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

    if (tipos.includes(tipo)) {
        return true;
    }

    const texto = `${titulo} ${descricao}`;

    return (
        texto.includes("ot") ||
        texto.includes("atestado") ||
        texto.includes("tre") ||
        texto.includes("ferias") ||
        texto.includes("feriado") ||
        texto.includes("recesso") ||
        texto.includes("ausencia") ||
        texto.includes("afastamento")
    );
}


function nomeBonitoTipo(tipo) {
    const tipoNormalizado = normalizarTexto(tipo);

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

    return nomes[tipoNormalizado] || tipo || "Outro";
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


function limitarTexto(texto, limite) {
    if (!texto) {
        return "";
    }

    const textoLimpo = texto.toString();

    if (textoLimpo.length <= limite) {
        return textoLimpo;
    }

    return textoLimpo.substring(0, limite) + "...";
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


function criarNomeArquivoRelatorio(extensao) {
    const filtros = obterFiltrosRelatorio();

    const turma = filtros.turma === "todas" ? "todas_turmas" : filtros.turma.replaceAll("º", "").replaceAll(" ", "");
    const dataHoje = formatarDataISO(new Date());

    return `relatorio_paeet_${turma}_${dataHoje}.${extensao}`;
}

function normalizarTurma(turma) {
    if (!turma) {
        return "";
    }

    return turma
        .toString()
        .toLowerCase()
        .replaceAll("º", "")
        .replaceAll("ª", "")
        .replace(/\s+/g, "")
        .trim();
}

