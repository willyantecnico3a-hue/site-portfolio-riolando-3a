/* =====================================================
   RELATÓRIOS E INDICADORES PAEET
   Riolando Conecta Técnico
   ARQUIVO: relatorios.js
   VERSÃO: 20260614-06
===================================================== */

const SUPABASE_URL_RELATORIO = "https://pwomyoprbvoimqmikvev.supabase.co";
const SUPABASE_KEY_RELATORIO = "sb_publishable_elGQyDU7ngaUHCLWIHLhDQ_IxiLo6kD";

const banco = window.supabase
    ? window.supabase.createClient(SUPABASE_URL_RELATORIO, SUPABASE_KEY_RELATORIO)
    : null;

let dadosRelatorio = {
    eventos: [],
    portfolios: [],
    chamados: [],
    acompanhamento: []
};

document.addEventListener("DOMContentLoaded", iniciarRelatorios);


async function iniciarRelatorios() {
    mostrarDashboardRelatorio();
    configurarAbasRelatorio();
    configurarEventosDosBotoes();
    configurarEventosAcompanhamento();

    definirPeriodoPadraoRelatorio();
    definirPeriodoPadraoAcompanhamento();

    atualizarDataEmissao();

    await gerarRelatorio();
    await gerarRelatorioAcompanhamento();
}


function mostrarDashboardRelatorio() {
    const areaDashboard = document.getElementById("areaDashboardRelatorio");
    const areaBloqueio = document.getElementById("areaBloqueioRelatorio");

    if (areaBloqueio) {
        areaBloqueio.style.display = "none";
    }

    if (areaDashboard) {
        areaDashboard.style.display = "block";
    }
}


function configurarAbasRelatorio() {
    const botoes = document.querySelectorAll(".aba-relatorio");

    botoes.forEach(function (botao) {
        botao.addEventListener("click", function () {
            const aba = botao.dataset.aba;

            document.querySelectorAll(".aba-relatorio").forEach(function (item) {
                item.classList.remove("ativa");
            });

            document.querySelectorAll(".conteudo-aba-relatorio").forEach(function (conteudo) {
                conteudo.classList.remove("ativo");
            });

            botao.classList.add("ativa");

            if (aba === "geral") {
                document.getElementById("conteudoRelatorioGeral")?.classList.add("ativo");
            }

            if (aba === "acompanhamento") {
                document.getElementById("conteudoRelatorioAcompanhamento")?.classList.add("ativo");
            }
        });
    });
}


/* =====================================================
   RELATÓRIO GERAL
===================================================== */

function configurarEventosDosBotoes() {
    const btnGerar = document.getElementById("btnGerarRelatorio");
    const btnCsv = document.getElementById("btnBaixarCsvRelatorio");
    const btnPdf = document.getElementById("btnBaixarPdfRelatorio");
    const periodo = document.getElementById("filtroPeriodoRelatorio");
    const filtroRapidoData = document.getElementById("filtroRapidoDataRelatorio");
    const btnOrdenarData = document.getElementById("btnOrdenarDataRelatorio");

    if (btnGerar) {
        btnGerar.addEventListener("click", gerarRelatorio);
    }

    if (btnCsv) {
        btnCsv.addEventListener("click", baixarCsvRelatorio);
    }

    if (btnPdf) {
        btnPdf.addEventListener("click", function () {
            window.print();
        });
    }

    if (periodo) {
        periodo.addEventListener("change", function () {
            if (periodo.value !== "personalizado") {
                aplicarPeriodoRelatorio();
            }
        });
    }

    if (filtroRapidoData) {
        filtroRapidoData.addEventListener("change", aplicarFiltroRapidoDataRelatorio);
    }

    if (btnOrdenarData) {
        btnOrdenarData.addEventListener("click", alternarOrdemDataRelatorio);
    }
}


function definirPeriodoPadraoRelatorio() {
    setValor("filtroPeriodoRelatorio", "mensal");
    aplicarPeriodoRelatorio();
}


function aplicarPeriodoRelatorio() {
    const periodo = getValor("filtroPeriodoRelatorio") || "mensal";
    const intervalo = calcularIntervaloPorPeriodo(periodo);

    setValor("dataInicioRelatorio", intervalo.inicio);
    setValor("dataFimRelatorio", intervalo.fim);
}


async function gerarRelatorio() {
    const mensagem = document.getElementById("mensagemRelatorio");

    try {
        if (!banco) {
            throw new Error("Supabase não carregou.");
        }

        if (mensagem) {
            mensagem.textContent = "Carregando dados reais do Supabase...";
        }

        const filtros = obterFiltrosRelatorio();

        atualizarCabecalhoDocumento(filtros);

        const eventos = await buscarEventosRelatorio(filtros);
        const portfolios = await buscarPortfoliosRelatorio();
        const chamados = await buscarChamadosRelatorio(filtros);

        dadosRelatorio.eventos = eventos;
        dadosRelatorio.portfolios = portfolios;
        dadosRelatorio.chamados = chamados;

        renderizarIndicadoresRelatorio(eventos, portfolios, chamados);
        renderizarGraficosRelatorio(eventos, chamados);
        renderizarTabelaEventos(eventos);

        if (mensagem) {
            mensagem.textContent = `Relatório gerado com ${eventos.length} eventos encontrados.`;
        }

    } catch (erro) {
        console.error("Erro ao gerar relatório:", erro);

        if (mensagem) {
            mensagem.textContent = "Erro ao gerar relatório. Verifique o console, tabelas do Supabase e permissões.";
        }
    }
}


function obterFiltrosRelatorio() {
    let dataInicio = getValor("dataInicioRelatorio");
    let dataFim = getValor("dataFimRelatorio");

    if (!dataInicio || !dataFim) {
        aplicarPeriodoRelatorio();
        dataInicio = getValor("dataInicioRelatorio");
        dataFim = getValor("dataFimRelatorio");
    }

    return {
        periodo: getValor("filtroPeriodoRelatorio") || "mensal",
        curso: getValor("filtroCursoRelatorio") || "todos",
        turma: getValor("filtroTurmaRelatorio") || "todas",
        tipoEvento: getValor("filtroTipoEventoRelatorio") || "todos",
        dataInicio: dataInicio,
        dataFim: dataFim
    };
}


async function buscarEventosRelatorio(filtros) {
    let consulta = banco
        .from("eventos")
        .select("*")
        .gte("data", filtros.dataInicio)
        .lte("data", filtros.dataFim);

    if (filtros.tipoEvento && filtros.tipoEvento !== "todos") {
        consulta = consulta.eq("tipo", filtros.tipoEvento);
    }

    const { data, error } = await consulta;

    if (error) {
        console.log("Erro ao buscar eventos:", error);
        return [];
    }

    let eventos = data || [];

    if (filtros.curso && filtros.curso !== "todos") {
        eventos = eventos.filter(function (evento) {
            const cursoEvento = normalizarTexto(evento.curso_alvo || evento.curso || "todos");
            const cursoFiltro = normalizarTexto(filtros.curso);

            return cursoEvento === cursoFiltro || cursoEvento === "todos" || cursoEvento === "";
        });
    }

    if (filtros.turma && filtros.turma !== "todas") {
        eventos = eventos.filter(function (evento) {
            const turmaEvento = normalizarTurma(evento.turma_alvo || evento.turma || "");
            const turmaFiltro = normalizarTurma(filtros.turma);

            return turmaEvento === turmaFiltro;
        });
    }

    eventos = ordenarEventosPorDataRelatorio(eventos);

    return eventos;
}


async function buscarPortfoliosRelatorio() {
    const { data, error } = await banco
        .from("portfolio_alunos")
        .select("*");

    if (error) {
        console.warn("Erro ao buscar portfólios:", error);
        return [];
    }

    return data || [];
}


async function buscarChamadosRelatorio(filtros) {
    const { data, error } = await banco
        .from("solicitacoes_ajuda")
        .select("*");

    if (error) {
        console.warn("Erro ao buscar chamados:", error);
        return [];
    }

    return data || [];
}


function renderizarIndicadoresRelatorio(eventos, portfolios, chamados) {
    const aulas = eventos.filter(function (evento) {
        return normalizarTexto(evento.tipo) === "aula";
    }).length;

    const cargaMinutos = eventos.reduce(function (total, evento) {
        return total + calcularDuracaoMinutos(evento.horario_inicio, evento.horario_fim);
    }, 0);

    const enviados = contarChamadosPorStatus(chamados, "enviado");
    const analise = contarChamadosPorStatus(chamados, "em_analise");
    const respondidos = contarChamadosPorStatus(chamados, "respondido");
    const resolvidos = contarChamadosPorStatus(chamados, "resolvido");
    const arquivados = contarChamadosPorStatus(chamados, "arquivado");

    const intercorrencias = eventos.filter(function (evento) {
        const tipo = normalizarTexto(evento.tipo);
        return ["atestado_medico", "tre", "ferias", "feriado_prolongado", "ot"].includes(tipo);
    }).length;

    setTexto("indicadorAulasLecionadas", aulas);
    setTexto("indicadorTotalEventos", eventos.length);
    setTexto("indicadorCargaHoraria", formatarMinutos(cargaMinutos));
    setTexto("indicadorPortfolios", portfolios.length);
    setTexto("indicadorChamadosEnviados", enviados);
    setTexto("indicadorChamadosAnalise", analise);
    setTexto("indicadorChamadosRespondidos", respondidos);
    setTexto("indicadorChamadosResolvidos", resolvidos);
    setTexto("indicadorChamadosArquivados", arquivados);
    setTexto("indicadorIntercorrencias", intercorrencias);
}


function contarChamadosPorStatus(chamados, status) {
    return chamados.filter(function (chamado) {
        return normalizarTexto(chamado.status || "") === normalizarTexto(status);
    }).length;
}


function renderizarGraficosRelatorio(eventos, chamados) {
    renderizarGraficoBarras("graficoEventosPorTipo", contarPorCampo(eventos, "tipo"));
    renderizarGraficoBarras("graficoChamadosStatus", contarPorCampo(chamados, "status"));
}


function renderizarTabelaEventos(eventos) {
    const corpo = document.getElementById("corpoTabelaEventosRelatorio");

    if (!corpo) {
        return;
    }

    if (!eventos || eventos.length === 0) {
        corpo.innerHTML = `<tr><td colspan="9">Nenhum evento encontrado para o período selecionado.</td></tr>`;
        return;
    }

    corpo.innerHTML = eventos.map(function (evento) {
        return `
            <tr>
                <td>${formatarDataBR(evento.data)}</td>
                <td>${escaparHtml(formatarTipo(evento.tipo))}</td>
                <td>${escaparHtml(evento.titulo || "-")}</td>
                <td>${escaparHtml(evento.descricao || "-")}</td>
                <td>${escaparHtml(evento.horario_inicio || "-")}</td>
                <td>${escaparHtml(evento.horario_fim || "-")}</td>
                <td>${formatarMinutos(calcularDuracaoMinutos(evento.horario_inicio, evento.horario_fim))}</td>
                <td>${escaparHtml(evento.curso_alvo || evento.curso || "Todos")}</td>
                <td>${escaparHtml(evento.turma_alvo || evento.turma || "Todas")}</td>
            </tr>
        `;
    }).join("");
}


/* =====================================================
   ORGANIZADOR DO RELATÓRIO GERAL
===================================================== */

function aplicarFiltroRapidoDataRelatorio() {
    const filtroRapido = getValor("filtroRapidoDataRelatorio");

    if (!filtroRapido) {
        return;
    }

    const intervalo = calcularIntervaloRapido(filtroRapido);

    setValor("filtroPeriodoRelatorio", "personalizado");
    setValor("dataInicioRelatorio", intervalo.inicio);
    setValor("dataFimRelatorio", intervalo.fim);

    gerarRelatorio();
}


function alternarOrdemDataRelatorio() {
    const botao = document.getElementById("btnOrdenarDataRelatorio");

    if (!botao) {
        return;
    }

    const ordemAtual = botao.dataset.ordem || "desc";
    const novaOrdem = ordemAtual === "desc" ? "asc" : "desc";

    botao.dataset.ordem = novaOrdem;

    botao.textContent = novaOrdem === "desc"
        ? "📅 Data do evento ↓ Mais recentes"
        : "📅 Data do evento ↑ Mais antigas";

    dadosRelatorio.eventos = ordenarEventosPorDataRelatorio(dadosRelatorio.eventos || []);
    renderizarTabelaEventos(dadosRelatorio.eventos);
}


function ordenarEventosPorDataRelatorio(eventos) {
    const botao = document.getElementById("btnOrdenarDataRelatorio");
    const ordem = botao ? botao.dataset.ordem || "desc" : "desc";

    return [...eventos].sort(function (a, b) {
        const dataA = montarDataHoraEvento(a);
        const dataB = montarDataHoraEvento(b);

        if (ordem === "asc") {
            return dataA - dataB;
        }

        return dataB - dataA;
    });
}


function montarDataHoraEvento(evento) {
    const data = evento.data || "1900-01-01";
    const horario = evento.horario_inicio || "00:00";

    return new Date(`${data}T${horario}`);
}


/* =====================================================
   ACOMPANHAMENTO PAEET
===================================================== */

function configurarEventosAcompanhamento() {
    const btnGerar = document.getElementById("btnGerarAcompanhamento");
    const btnCsv = document.getElementById("btnBaixarCsvAcompanhamento");
    const btnPdf = document.getElementById("btnBaixarPdfAcompanhamento");
    const periodo = document.getElementById("filtroPeriodoAcompanhamento");
    const filtroRapido = document.getElementById("filtroRapidoAcompanhamento");
    const btnOrdenar = document.getElementById("btnOrdenarAcompanhamento");

    if (btnGerar) {
        btnGerar.addEventListener("click", gerarRelatorioAcompanhamento);
    }

    if (btnCsv) {
        btnCsv.addEventListener("click", baixarCsvAcompanhamento);
    }

    if (btnPdf) {
        btnPdf.addEventListener("click", function () {
            ativarAbaParaImpressao("acompanhamento");
            window.print();
        });
    }

    if (periodo) {
        periodo.addEventListener("change", function () {
            if (periodo.value !== "personalizado") {
                aplicarPeriodoAcompanhamento();
            }
        });
    }

    if (filtroRapido) {
        filtroRapido.addEventListener("change", aplicarFiltroRapidoAcompanhamento);
    }

    if (btnOrdenar) {
        btnOrdenar.addEventListener("click", alternarOrdemAcompanhamento);
    }
}


function definirPeriodoPadraoAcompanhamento() {
    setValor("filtroPeriodoAcompanhamento", "mensal");
    aplicarPeriodoAcompanhamento();
}


function aplicarPeriodoAcompanhamento() {
    const periodo = getValor("filtroPeriodoAcompanhamento") || "mensal";
    const intervalo = calcularIntervaloPorPeriodo(periodo);

    setValor("dataInicioAcompanhamento", intervalo.inicio);
    setValor("dataFimAcompanhamento", intervalo.fim);
}


function aplicarFiltroRapidoAcompanhamento() {
    const filtroRapido = getValor("filtroRapidoAcompanhamento");

    if (!filtroRapido) {
        return;
    }

    const intervalo = calcularIntervaloRapido(filtroRapido);

    setValor("filtroPeriodoAcompanhamento", "personalizado");
    setValor("dataInicioAcompanhamento", intervalo.inicio);
    setValor("dataFimAcompanhamento", intervalo.fim);

    gerarRelatorioAcompanhamento();
}


async function gerarRelatorioAcompanhamento() {
    const mensagem = document.getElementById("mensagemAcompanhamento");

    try {
        if (!banco) {
            throw new Error("Supabase não carregou.");
        }

        if (mensagem) {
            mensagem.textContent = "Carregando registros de acompanhamento PAEET...";
        }

        const filtros = obterFiltrosAcompanhamento();
        const registros = await buscarAcompanhamentoPaeet(filtros);

        dadosRelatorio.acompanhamento = ordenarAcompanhamentoPorData(registros);

        renderizarIndicadoresAcompanhamento(dadosRelatorio.acompanhamento);
        renderizarGraficosAcompanhamento(dadosRelatorio.acompanhamento);
        renderizarTabelaAcompanhamento(dadosRelatorio.acompanhamento);

        if (mensagem) {
            mensagem.textContent = `Relatório de acompanhamento gerado com ${dadosRelatorio.acompanhamento.length} registros.`;
        }

    } catch (erro) {
        console.error("Erro ao gerar acompanhamento:", erro);

        if (mensagem) {
            mensagem.textContent = "Erro ao gerar acompanhamento. Verifique se a tabela acoes_checklist_paeet foi criada e se há permissão de leitura.";
        }
    }
}


function obterFiltrosAcompanhamento() {
    let dataInicio = getValor("dataInicioAcompanhamento");
    let dataFim = getValor("dataFimAcompanhamento");

    if (!dataInicio || !dataFim) {
        aplicarPeriodoAcompanhamento();
        dataInicio = getValor("dataInicioAcompanhamento");
        dataFim = getValor("dataFimAcompanhamento");
    }

    return {
        periodo: getValor("filtroPeriodoAcompanhamento") || "mensal",
        status: getValor("filtroStatusAcompanhamento") || "todos",
        item: getValor("filtroItemAcompanhamento") || "todos",
        dataInicio: dataInicio,
        dataFim: dataFim
    };
}


async function buscarAcompanhamentoPaeet(filtros) {
    let consulta = banco
        .from("acoes_checklist_paeet")
        .select("*")
        .gte("data_acao", filtros.dataInicio)
        .lte("data_acao", filtros.dataFim);

    if (filtros.status !== "todos") {
        consulta = consulta.eq("status", filtros.status);
    }

    if (filtros.item !== "todos") {
        consulta = consulta.eq("item_codigo", filtros.item);
    }

    const { data, error } = await consulta;

    if (error) {
        console.warn("Erro ao buscar acompanhamento PAEET:", error);
        return [];
    }

    return data || [];
}


function renderizarIndicadoresAcompanhamento(registros) {
    const total = registros.length;
    const concluidas = registros.filter(function (item) {
        return normalizarTexto(item.status) === "concluido";
    }).length;

    const pendentes = registros.filter(function (item) {
        return normalizarTexto(item.status) === "pendente";
    }).length;

    const dias = new Set(registros.map(function (item) {
        return item.data_acao;
    })).size;

    const itemMais = obterItemMaisRegistrado(registros);

    setTexto("indicadorAcoesTotal", total);
    setTexto("indicadorAcoesConcluidas", concluidas);
    setTexto("indicadorAcoesPendentes", pendentes);
    setTexto("indicadorDiasAcompanhamento", dias);
    setTexto("indicadorItemMaisRealizado", itemMais);
}


function obterItemMaisRegistrado(registros) {
    if (!registros.length) {
        return "-";
    }

    const contagem = contarPorCampo(registros, "item_codigo");
    let maiorNome = "-";
    let maiorValor = 0;

    Object.entries(contagem).forEach(function ([nome, valor]) {
        if (valor > maiorValor) {
            maiorValor = valor;
            maiorNome = formatarItemChecklist(nome);
        }
    });

    return maiorNome;
}


function renderizarGraficosAcompanhamento(registros) {
    renderizarGraficoBarras("graficoAcoesPorStatus", contarPorCampo(registros, "status"));
    renderizarGraficoBarras("graficoAcoesPorItem", contarPorCampo(registros, "item_codigo"), formatarItemChecklist);
}


function renderizarTabelaAcompanhamento(registros) {
    const corpo = document.getElementById("corpoTabelaAcompanhamentoPaeet");

    if (!corpo) {
        return;
    }

    if (!registros || registros.length === 0) {
        corpo.innerHTML = `<tr><td colspan="8">Nenhum registro de acompanhamento encontrado para o período selecionado.</td></tr>`;
        return;
    }

    corpo.innerHTML = registros.map(function (registro) {
        const status = normalizarTexto(registro.status || "pendente");

        return `
            <tr>
                <td>${formatarDataBR(registro.data_acao)}</td>
                <td>${escaparHtml(cortarHora(registro.hora_acao))}</td>
                <td>${escaparHtml(registro.item_descricao || formatarItemChecklist(registro.item_codigo))}</td>
                <td><span class="badge-status-relatorio ${status}">${formatarStatus(status)}</span></td>
                <td>${escaparHtml(registro.professor_nome || "-")}</td>
                <td>${escaparHtml(registro.professor_email || "-")}</td>
                <td>${escaparHtml(registro.origem || "-")}</td>
                <td>${escaparHtml(registro.observacao || "-")}</td>
            </tr>
        `;
    }).join("");
}


function alternarOrdemAcompanhamento() {
    const botao = document.getElementById("btnOrdenarAcompanhamento");

    if (!botao) {
        return;
    }

    const ordemAtual = botao.dataset.ordem || "desc";
    const novaOrdem = ordemAtual === "desc" ? "asc" : "desc";

    botao.dataset.ordem = novaOrdem;

    botao.textContent = novaOrdem === "desc"
        ? "📅 Data da ação ↓ Mais recentes"
        : "📅 Data da ação ↑ Mais antigas";

    dadosRelatorio.acompanhamento = ordenarAcompanhamentoPorData(dadosRelatorio.acompanhamento || []);
    renderizarTabelaAcompanhamento(dadosRelatorio.acompanhamento);
}


function ordenarAcompanhamentoPorData(registros) {
    const botao = document.getElementById("btnOrdenarAcompanhamento");
    const ordem = botao ? botao.dataset.ordem || "desc" : "desc";

    return [...registros].sort(function (a, b) {
        const dataA = new Date(`${a.data_acao || "1900-01-01"}T${a.hora_acao || "00:00"}`);
        const dataB = new Date(`${b.data_acao || "1900-01-01"}T${b.hora_acao || "00:00"}`);

        if (ordem === "asc") {
            return dataA - dataB;
        }

        return dataB - dataA;
    });
}


/* =====================================================
   CSV / PDF
===================================================== */

function baixarCsvRelatorio() {
    const eventos = dadosRelatorio.eventos || [];

    const linhas = [
        ["Data", "Tipo", "Título", "Descrição", "Início", "Fim", "Duração", "Curso", "Turma"]
    ];

    eventos.forEach(function (evento) {
        linhas.push([
            formatarDataBR(evento.data),
            formatarTipo(evento.tipo),
            evento.titulo || "",
            evento.descricao || "",
            evento.horario_inicio || "",
            evento.horario_fim || "",
            formatarMinutos(calcularDuracaoMinutos(evento.horario_inicio, evento.horario_fim)),
            evento.curso_alvo || evento.curso || "Todos",
            evento.turma_alvo || evento.turma || "Todas"
        ]);
    });

    baixarArquivoCsv("relatorio_geral_paeet.csv", linhas);
}


function baixarCsvAcompanhamento() {
    const registros = dadosRelatorio.acompanhamento || [];

    const linhas = [
        ["Data", "Hora", "Item", "Status", "Professor", "Email", "Origem", "Observação"]
    ];

    registros.forEach(function (registro) {
        linhas.push([
            formatarDataBR(registro.data_acao),
            cortarHora(registro.hora_acao),
            registro.item_descricao || formatarItemChecklist(registro.item_codigo),
            formatarStatus(registro.status),
            registro.professor_nome || "",
            registro.professor_email || "",
            registro.origem || "",
            registro.observacao || ""
        ]);
    });

    baixarArquivoCsv("relatorio_acompanhamento_paeet.csv", linhas);
}


function baixarArquivoCsv(nomeArquivo, linhas) {
    const conteudo = linhas.map(function (linha) {
        return linha.map(function (campo) {
            const valor = String(campo ?? "").replace(/"/g, '""');
            return `"${valor}"`;
        }).join(";");
    }).join("\n");

    const blob = new Blob(["\ufeff" + conteudo], {
        type: "text/csv;charset=utf-8;"
    });

    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = nomeArquivo;
    link.click();

    URL.revokeObjectURL(link.href);
}


function ativarAbaParaImpressao(nomeAba) {
    document.querySelectorAll(".aba-relatorio").forEach(function (botao) {
        botao.classList.toggle("ativa", botao.dataset.aba === nomeAba);
    });

    document.querySelectorAll(".conteudo-aba-relatorio").forEach(function (conteudo) {
        conteudo.classList.remove("ativo");
    });

    if (nomeAba === "geral") {
        document.getElementById("conteudoRelatorioGeral")?.classList.add("ativo");
    }

    if (nomeAba === "acompanhamento") {
        document.getElementById("conteudoRelatorioAcompanhamento")?.classList.add("ativo");
    }
}


/* =====================================================
   FUNÇÕES AUXILIARES
===================================================== */

function calcularIntervaloPorPeriodo(periodo) {
    const hoje = new Date();
    let inicio = new Date(hoje);
    let fim = new Date(hoje);

    if (periodo === "diario") {
        inicio = new Date(hoje);
        fim = new Date(hoje);
    } else if (periodo === "semanal") {
        const diaSemana = hoje.getDay();
        const diferencaSegunda = diaSemana === 0 ? -6 : 1 - diaSemana;
        inicio = new Date(hoje);
        inicio.setDate(hoje.getDate() + diferencaSegunda);
        fim = new Date(inicio);
        fim.setDate(inicio.getDate() + 6);
    } else if (periodo === "bimestral") {
        inicio = new Date(hoje);
        inicio.setMonth(hoje.getMonth() - 1);
        inicio.setDate(1);
    } else if (periodo === "trimestral") {
        inicio = new Date(hoje);
        inicio.setMonth(hoje.getMonth() - 2);
        inicio.setDate(1);
    } else if (periodo === "semestral") {
        inicio = new Date(hoje);
        inicio.setMonth(hoje.getMonth() - 5);
        inicio.setDate(1);
    } else if (periodo === "anual") {
        inicio = new Date(hoje.getFullYear(), 0, 1);
        fim = new Date(hoje.getFullYear(), 11, 31);
    } else {
        inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
        fim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
    }

    return {
        inicio: formatarDataISO(inicio),
        fim: formatarDataISO(fim)
    };
}


function calcularIntervaloRapido(filtroRapido) {
    const hoje = new Date();
    let inicio = new Date(hoje);
    let fim = new Date(hoje);

    if (filtroRapido === "hoje") {
        inicio = new Date(hoje);
        fim = new Date(hoje);
    }

    if (filtroRapido === "ontem") {
        inicio = new Date(hoje);
        inicio.setDate(hoje.getDate() - 1);
        fim = new Date(inicio);
    }

    if (filtroRapido === "semana_passada") {
        const diaSemana = hoje.getDay();
        const diferencaSegundaAtual = diaSemana === 0 ? -6 : 1 - diaSemana;
        const segundaAtual = new Date(hoje);
        segundaAtual.setDate(hoje.getDate() + diferencaSegundaAtual);

        inicio = new Date(segundaAtual);
        inicio.setDate(segundaAtual.getDate() - 7);

        fim = new Date(inicio);
        fim.setDate(inicio.getDate() + 6);
    }

    if (filtroRapido === "anteriores_neste_mes") {
        inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
        fim = new Date(hoje);
        fim.setDate(hoje.getDate() - 1);

        if (fim < inicio) {
            fim = new Date(hoje);
        }
    }

    if (filtroRapido === "ultimo_mes") {
        inicio = new Date(hoje);
        inicio.setDate(hoje.getDate() - 29);
        fim = new Date(hoje);
    }

    return {
        inicio: formatarDataISO(inicio),
        fim: formatarDataISO(fim)
    };
}


function atualizarCabecalhoDocumento(filtros) {
    setTexto("cursoDocumentoRelatorio", formatarCurso(filtros.curso));
    setTexto("turmaDocumentoRelatorio", filtros.turma === "todas" ? "Todas" : filtros.turma);
    setTexto("periodoDocumentoRelatorio", `${formatarDataBR(filtros.dataInicio)} a ${formatarDataBR(filtros.dataFim)}`);
}


function atualizarDataEmissao() {
    setTexto("dataEmissaoRelatorio", new Date().toLocaleDateString("pt-BR"));
}


function renderizarGraficoBarras(idElemento, contagem, formatadorRotulo = formatarTipo) {
    const elemento = document.getElementById(idElemento);

    if (!elemento) {
        return;
    }

    const entradas = Object.entries(contagem || {}).sort(function (a, b) {
        return b[1] - a[1];
    });

    if (entradas.length === 0) {
        elemento.innerHTML = `<p class="mensagem-relatorio">Nenhum dado encontrado.</p>`;
        return;
    }

    const maior = Math.max(...entradas.map(function (item) {
        return item[1];
    }), 1);

    elemento.innerHTML = entradas.map(function ([rotulo, valor]) {
        const largura = Math.max((valor / maior) * 100, 5);

        return `
            <div class="linha-grafico-relatorio">
                <span class="rotulo-grafico-relatorio">${escaparHtml(formatadorRotulo(rotulo))}</span>
                <div class="barra-grafico-relatorio">
                    <div class="preenchimento-grafico-relatorio" style="width:${largura}%"></div>
                </div>
                <span class="valor-grafico-relatorio">${valor}</span>
            </div>
        `;
    }).join("");
}


function contarPorCampo(lista, campo) {
    return (lista || []).reduce(function (acc, item) {
        const valor = item[campo] || "não informado";
        acc[valor] = (acc[valor] || 0) + 1;
        return acc;
    }, {});
}


function calcularDuracaoMinutos(inicio, fim) {
    if (!inicio || !fim) {
        return 0;
    }

    const [hi, mi] = inicio.split(":").map(Number);
    const [hf, mf] = fim.split(":").map(Number);

    if (Number.isNaN(hi) || Number.isNaN(hf)) {
        return 0;
    }

    const totalInicio = hi * 60 + (mi || 0);
    const totalFim = hf * 60 + (mf || 0);

    if (totalFim < totalInicio) {
        return 0;
    }

    return totalFim - totalInicio;
}


function formatarMinutos(minutos) {
    const h = Math.floor(minutos / 60);
    const m = minutos % 60;

    if (h === 0) {
        return `${m}min`;
    }

    if (m === 0) {
        return `${h}h`;
    }

    return `${h}h${String(m).padStart(2, "0")}min`;
}


function formatarDataISO(data) {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, "0");
    const dia = String(data.getDate()).padStart(2, "0");

    return `${ano}-${mes}-${dia}`;
}


function formatarDataBR(data) {
    if (!data) {
        return "-";
    }

    const partes = data.split("-");

    if (partes.length !== 3) {
        return data;
    }

    return `${partes[2]}/${partes[1]}/${partes[0]}`;
}


function formatarTipo(tipo) {
    const mapa = {
        aula: "Aula",
        atendimento_aluno: "Atendimento ao aluno",
        reuniao_gestao: "Reunião com gestão",
        apoio_pedagogico: "Apoio pedagógico",
        ot: "OT",
        atestado_medico: "Atestado médico",
        tre: "TRE",
        ferias: "Férias",
        feriado_prolongado: "Feriado prolongado",
        outro: "Outro",
        enviado: "Enviado",
        em_analise: "Em análise",
        respondido: "Respondido",
        resolvido: "Resolvido",
        arquivado: "Arquivado",
        concluido: "Concluído",
        pendente: "Pendente",
        cancelado: "Cancelado"
    };

    return mapa[tipo] || tipo || "Não informado";
}


function formatarStatus(status) {
    return formatarTipo(status);
}


function formatarItemChecklist(codigo) {
    const mapa = {
        frequencia: "Frequência/presença",
        diario: "Diário e fechamento",
        busca_ativa: "Busca ativa/acompanhamento",
        intervencao: "Ações pedagógicas",
        relatorio: "Relatório PAEET",
        teste_checklist: "Teste do checklist"
    };

    return mapa[codigo] || codigo || "Não informado";
}


function formatarCurso(curso) {
    const mapa = {
        todos: "Todos",
        desenvolvimento_sistemas: "Desenvolvimento de Sistemas",
        vendas: "Vendas",
        substituicoes: "Substituições"
    };

    return mapa[curso] || curso || "Todos";
}


function cortarHora(hora) {
    if (!hora) {
        return "-";
    }

    return hora.toString().slice(0, 5);
}


function normalizarTexto(texto) {
    return (texto || "")
        .toString()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();
}


function normalizarTurma(turma) {
    return normalizarTexto(turma)
        .replace("º", "")
        .replace("°", "")
        .replace(/\s/g, "");
}


function escaparHtml(texto) {
    return String(texto ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


function setTexto(id, valor) {
    const elemento = document.getElementById(id);

    if (elemento) {
        elemento.textContent = valor;
    }
}


function getValor(id) {
    const elemento = document.getElementById(id);
    return elemento ? elemento.value : "";
}


function setValor(id, valor) {
    const elemento = document.getElementById(id);

    if (elemento) {
        elemento.value = valor;
    }
}
