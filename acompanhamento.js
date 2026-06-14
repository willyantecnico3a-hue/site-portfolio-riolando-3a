/* =====================================================
   ACOMPANHAMENTO PAEET - RIOLANDO CONECTA TÉCNICO
   ARQUIVO: acompanhamento.js
   Protegido por login administrativo
===================================================== */

const SUPABASE_URL_ACOMP = "https://pwomyoprbvoimqmikvev.supabase.co";
const SUPABASE_KEY_ACOMP = "sb_publishable_elGQyDU7ngaUHCLWIHLhDQ_IxiLo6kD";

let bancoAcompanhamento = null;
let usuarioAdminAcompanhamento = null;
let registrosAcompanhamento = [];

if (window.supabase) {
    bancoAcompanhamento = window.supabase.createClient(SUPABASE_URL_ACOMP, SUPABASE_KEY_ACOMP);
}

document.addEventListener("DOMContentLoaded", iniciarAcompanhamentoPaeet);

async function iniciarAcompanhamentoPaeet() {
    const acessoLiberado = await verificarAcessoAdministradorAcompanhamento();

    if (!acessoLiberado) {
        return;
    }

    configurarEventosAcompanhamento();
    definirDataPadraoFormulario();
    definirPeriodoPadraoFiltro();

    await carregarRegistrosAcompanhamento();
}

/* =====================================================
   PERMISSÃO ADMINISTRATIVA
===================================================== */

async function verificarAcessoAdministradorAcompanhamento() {
    try {
        if (!bancoAcompanhamento) {
            bloquearAcompanhamentoSemPermissao("Erro ao carregar conexão com o Supabase.");
            return false;
        }

        const { data: sessaoData, error: erroSessao } = await bancoAcompanhamento.auth.getSession();

        if (erroSessao || !sessaoData || !sessaoData.session) {
            bloquearAcompanhamentoSemPermissao("Você precisa estar logado como administrador para acessar o acompanhamento PAEET.");
            return false;
        }

        const usuario = sessaoData.session.user;

        if (!usuario || !usuario.email) {
            bloquearAcompanhamentoSemPermissao("Usuário administrativo não identificado.");
            return false;
        }

        const email = usuario.email.toLowerCase();

        const { data: admin, error: erroAdmin } = await bancoAcompanhamento
            .from("admins")
            .select("email")
            .ilike("email", email)
            .limit(1);

        if (erroAdmin || !admin || admin.length === 0) {
            bloquearAcompanhamentoSemPermissao("Este usuário não possui permissão administrativa.");
            return false;
        }

        usuarioAdminAcompanhamento = usuario;
        localStorage.setItem("adminEmail", email);
        setTexto("emailAdminAcompanhamento", email);

        const areaBloqueio = document.getElementById("areaBloqueioAcompanhamento");
        const areaAcompanhamento = document.getElementById("areaAcompanhamento");

        if (areaBloqueio) areaBloqueio.style.display = "none";
        if (areaAcompanhamento) areaAcompanhamento.style.display = "block";

        return true;

    } catch (erro) {
        console.error("Erro ao verificar permissão administrativa:", erro);
        bloquearAcompanhamentoSemPermissao("Erro ao validar acesso administrativo.");
        return false;
    }
}

function bloquearAcompanhamentoSemPermissao(mensagem) {
    const areaBloqueio = document.getElementById("areaBloqueioAcompanhamento");
    const areaAcompanhamento = document.getElementById("areaAcompanhamento");

    if (areaAcompanhamento) areaAcompanhamento.style.display = "none";

    if (areaBloqueio) {
        areaBloqueio.style.display = "block";
        areaBloqueio.innerHTML = `
            <h2>🔒 Acesso restrito</h2>
            <p>${escaparHtml(mensagem)}</p>
            <p>Faça login com uma conta administrativa para continuar.</p>
            <a href="admin.html">Voltar para o login administrativo</a>
        `;
    }

    setTimeout(function () {
        window.location.href = "admin.html";
    }, 2500);
}

/* =====================================================
   EVENTOS DA TELA
===================================================== */

function configurarEventosAcompanhamento() {
    document.getElementById("btnSalvarAcompanhamento")?.addEventListener("click", salvarAcompanhamento);
    document.getElementById("btnLimparAcompanhamento")?.addEventListener("click", limparFormularioAcompanhamento);
    document.getElementById("btnCancelarEdicaoAcompanhamento")?.addEventListener("click", cancelarEdicaoAcompanhamento);

    document.getElementById("btnFiltrarAcompanhamento")?.addEventListener("click", carregarRegistrosAcompanhamento);
    document.getElementById("btnRecarregarAcompanhamento")?.addEventListener("click", carregarRegistrosAcompanhamento);
    document.getElementById("btnCsvAcompanhamento")?.addEventListener("click", baixarCsvAcompanhamento);
    document.getElementById("btnPdfAcompanhamento")?.addEventListener("click", function () { window.print(); });

    document.getElementById("buscaAcompanhamento")?.addEventListener("input", renderizarTabelaAcompanhamento);
    document.getElementById("filtroTurmaAcompanhamento")?.addEventListener("change", carregarRegistrosAcompanhamento);
    document.getElementById("filtroStatusAcompanhamento")?.addEventListener("change", carregarRegistrosAcompanhamento);
    document.getElementById("filtroPrioridadeAcompanhamento")?.addEventListener("change", carregarRegistrosAcompanhamento);
}

function definirDataPadraoFormulario() {
    setValor("dataRegistroAcompanhamento", formatarDataISO(new Date()));
}

function definirPeriodoPadraoFiltro() {
    const hoje = new Date();
    const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const fim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);

    setValor("dataInicioFiltroAcompanhamento", formatarDataISO(inicio));
    setValor("dataFimFiltroAcompanhamento", formatarDataISO(fim));
}

/* =====================================================
   CRUD
===================================================== */

async function salvarAcompanhamento() {
    const mensagem = document.getElementById("mensagemFormularioAcompanhamento");

    try {
        const dados = obterDadosFormularioAcompanhamento();

        if (!dados.nome_aluno || !dados.turma || !dados.curso || !dados.data_registro) {
            if (mensagem) mensagem.textContent = "Preencha pelo menos nome do aluno, turma, curso e data do registro.";
            return;
        }

        if (!bancoAcompanhamento) throw new Error("Supabase não carregou.");

        const id = getValor("registroIdAcompanhamento");

        if (mensagem) mensagem.textContent = id ? "Atualizando acompanhamento..." : "Salvando acompanhamento...";

        if (id) {
            dados.atualizado_por_email = usuarioAdminAcompanhamento?.email || localStorage.getItem("adminEmail") || null;

            const { error } = await bancoAcompanhamento
                .from("acompanhamento_alunos")
                .update(dados)
                .eq("id", id);

            if (error) throw error;
            if (mensagem) mensagem.textContent = "Acompanhamento atualizado com sucesso.";
        } else {
            dados.criado_por_email = usuarioAdminAcompanhamento?.email || localStorage.getItem("adminEmail") || null;
            dados.atualizado_por_email = dados.criado_por_email;

            const { error } = await bancoAcompanhamento
                .from("acompanhamento_alunos")
                .insert(dados);

            if (error) throw error;
            if (mensagem) mensagem.textContent = "Acompanhamento salvo com sucesso.";
        }

        limparFormularioAcompanhamento();
        await carregarRegistrosAcompanhamento();

    } catch (erro) {
        console.error("Erro ao salvar acompanhamento:", erro);
        if (mensagem) mensagem.textContent = "Erro ao salvar. Verifique se a tabela acompanhamento_alunos existe e se há permissão administrativa.";
    }
}

function obterDadosFormularioAcompanhamento() {
    return {
        nome_aluno: getValor("nomeAlunoAcompanhamento").trim(),
        ra: getValor("raAlunoAcompanhamento").trim(),
        turma: getValor("turmaAlunoAcompanhamento"),
        curso: getValor("cursoAlunoAcompanhamento"),
        data_registro: getValor("dataRegistroAcompanhamento"),
        tipo_acompanhamento: getValor("tipoAcompanhamento") || "atendimento_paeet",
        origem_registro: "manual",
        componente_curricular: getValor("componenteAcompanhamento").trim(),
        dificuldade_identificada: getValor("dificuldadeAcompanhamento").trim(),
        evidencia: getValor("evidenciaAcompanhamento").trim(),
        intervencao_realizada: getValor("intervencaoAcompanhamento").trim(),
        encaminhamento: getValor("encaminhamentoAcompanhamento").trim(),
        responsavel: "Willyan Vieira da Cruz",
        prazo: getValor("prazoAcompanhamento") || null,
        prioridade: getValor("prioridadeAcompanhamento") || "media",
        status: getValor("statusAcompanhamento") || "aberto",
        resultado_observado: getValor("resultadoAcompanhamento").trim(),
        observacoes: getValor("observacoesAcompanhamento").trim()
    };
}

async function carregarRegistrosAcompanhamento() {
    const mensagem = document.getElementById("mensagemListaAcompanhamento");

    try {
        if (!bancoAcompanhamento) throw new Error("Supabase não carregou.");
        if (mensagem) mensagem.textContent = "Carregando acompanhamentos...";

        const filtros = obterFiltrosListaAcompanhamento();

        let consulta = bancoAcompanhamento
            .from("acompanhamento_alunos")
            .select("*")
            .gte("data_registro", filtros.dataInicio)
            .lte("data_registro", filtros.dataFim)
            .order("data_registro", { ascending: false })
            .order("created_at", { ascending: false });

        if (filtros.turma !== "todas") consulta = consulta.eq("turma", filtros.turma);
        if (filtros.status !== "todos") consulta = consulta.eq("status", filtros.status);
        if (filtros.prioridade !== "todas") consulta = consulta.eq("prioridade", filtros.prioridade);

        const { data, error } = await consulta;
        if (error) throw error;

        registrosAcompanhamento = data || [];
        renderizarIndicadoresAcompanhamento(registrosAcompanhamento);
        renderizarTabelaAcompanhamento();

        if (mensagem) mensagem.textContent = `${registrosAcompanhamento.length} registro(s) encontrado(s).`;

    } catch (erro) {
        console.error("Erro ao carregar acompanhamentos:", erro);
        if (mensagem) mensagem.textContent = "Erro ao carregar registros. Verifique tabela, permissões e conexão.";
        const corpo = document.getElementById("corpoTabelaAcompanhamento");
        if (corpo) corpo.innerHTML = `<tr><td colspan="8">Erro ao carregar registros.</td></tr>`;
    }
}

function obterFiltrosListaAcompanhamento() {
    let dataInicio = getValor("dataInicioFiltroAcompanhamento");
    let dataFim = getValor("dataFimFiltroAcompanhamento");

    if (!dataInicio || !dataFim) {
        definirPeriodoPadraoFiltro();
        dataInicio = getValor("dataInicioFiltroAcompanhamento");
        dataFim = getValor("dataFimFiltroAcompanhamento");
    }

    return {
        busca: normalizarTexto(getValor("buscaAcompanhamento")),
        turma: getValor("filtroTurmaAcompanhamento") || "todas",
        status: getValor("filtroStatusAcompanhamento") || "todos",
        prioridade: getValor("filtroPrioridadeAcompanhamento") || "todas",
        dataInicio,
        dataFim
    };
}

function renderizarTabelaAcompanhamento() {
    const corpo = document.getElementById("corpoTabelaAcompanhamento");
    if (!corpo) return;

    const filtros = obterFiltrosListaAcompanhamento();
    let lista = [...registrosAcompanhamento];

    if (filtros.busca) {
        lista = lista.filter(function (registro) {
            const texto = normalizarTexto(`${registro.nome_aluno || ""} ${registro.ra || ""} ${registro.turma || ""} ${registro.tipo_acompanhamento || ""} ${registro.dificuldade_identificada || ""} ${registro.evidencia || ""} ${registro.intervencao_realizada || ""} ${registro.encaminhamento || ""}`);
            return texto.includes(filtros.busca);
        });
    }

    renderizarIndicadoresAcompanhamento(lista);

    if (!lista.length) {
        corpo.innerHTML = `<tr><td colspan="8">Nenhum acompanhamento encontrado.</td></tr>`;
        return;
    }

    corpo.innerHTML = lista.map(function (registro) {
        return `
            <tr>
                <td>${formatarDataBR(registro.data_registro)}</td>
                <td><strong>${escaparHtml(registro.nome_aluno || "-")}</strong><br><small>RA: ${escaparHtml(registro.ra || "-")}</small></td>
                <td>${escaparHtml(registro.turma || "-")}</td>
                <td>${escaparHtml(formatarTipoAcompanhamento(registro.tipo_acompanhamento))}</td>
                <td><span class="badge-acompanhamento badge-prioridade-${escaparHtml(registro.prioridade || "media")}">${escaparHtml(formatarPrioridade(registro.prioridade))}</span></td>
                <td><span class="badge-acompanhamento badge-status-${escaparHtml(registro.status || "aberto")}">${escaparHtml(formatarStatus(registro.status))}</span></td>
                <td>${escaparHtml(resumirTexto(registro.dificuldade_identificada || registro.observacoes || "-", 120))}</td>
                <td><div class="botoes-tabela-acompanhamento"><button type="button" class="btn-editar-registro" onclick="editarRegistroAcompanhamento('${registro.id}')">Editar</button><button type="button" class="btn-excluir-registro" onclick="excluirRegistroAcompanhamento('${registro.id}')">Excluir</button></div></td>
            </tr>
        `;
    }).join("");
}

function renderizarIndicadoresAcompanhamento(lista) {
    setTexto("indicadorTotalRegistros", lista.length);
    setTexto("indicadorAbertos", lista.filter(item => item.status === "aberto").length);
    setTexto("indicadorAndamento", lista.filter(item => item.status === "em_andamento").length);
    setTexto("indicadorResolvidos", lista.filter(item => item.status === "resolvido").length);
    setTexto("indicadorUrgentes", lista.filter(item => item.prioridade === "alta" || item.prioridade === "urgente").length);
}

function editarRegistroAcompanhamento(id) {
    const registro = registrosAcompanhamento.find(item => item.id === id);
    if (!registro) return alert("Registro não encontrado.");

    setValor("registroIdAcompanhamento", registro.id);
    setValor("nomeAlunoAcompanhamento", registro.nome_aluno || "");
    setValor("raAlunoAcompanhamento", registro.ra || "");
    setValor("turmaAlunoAcompanhamento", registro.turma || "");
    setValor("cursoAlunoAcompanhamento", registro.curso || "desenvolvimento_sistemas");
    setValor("dataRegistroAcompanhamento", registro.data_registro || formatarDataISO(new Date()));
    setValor("tipoAcompanhamento", registro.tipo_acompanhamento || "atendimento_paeet");
    setValor("componenteAcompanhamento", registro.componente_curricular || "");
    setValor("prioridadeAcompanhamento", registro.prioridade || "media");
    setValor("statusAcompanhamento", registro.status || "aberto");
    setValor("prazoAcompanhamento", registro.prazo || "");
    setValor("dificuldadeAcompanhamento", registro.dificuldade_identificada || "");
    setValor("evidenciaAcompanhamento", registro.evidencia || "");
    setValor("intervencaoAcompanhamento", registro.intervencao_realizada || "");
    setValor("encaminhamentoAcompanhamento", registro.encaminhamento || "");
    setValor("resultadoAcompanhamento", registro.resultado_observado || "");
    setValor("observacoesAcompanhamento", registro.observacoes || "");

    setTexto("tituloFormularioAcompanhamento", "✏️ Editar acompanhamento");
    const btnCancelar = document.getElementById("btnCancelarEdicaoAcompanhamento");
    if (btnCancelar) btnCancelar.style.display = "inline-flex";
    window.scrollTo({ top: 0, behavior: "smooth" });
}

async function excluirRegistroAcompanhamento(id) {
    if (!confirm("Deseja realmente excluir este acompanhamento? Essa ação não poderá ser desfeita.")) return;
    const mensagem = document.getElementById("mensagemListaAcompanhamento");

    try {
        const { error } = await bancoAcompanhamento.from("acompanhamento_alunos").delete().eq("id", id);
        if (error) throw error;
        if (mensagem) mensagem.textContent = "Registro excluído com sucesso.";
        await carregarRegistrosAcompanhamento();
    } catch (erro) {
        console.error("Erro ao excluir registro:", erro);
        if (mensagem) mensagem.textContent = "Erro ao excluir registro.";
    }
}

function limparFormularioAcompanhamento() {
    setValor("registroIdAcompanhamento", "");
    setValor("nomeAlunoAcompanhamento", "");
    setValor("raAlunoAcompanhamento", "");
    setValor("turmaAlunoAcompanhamento", "");
    setValor("cursoAlunoAcompanhamento", "desenvolvimento_sistemas");
    setValor("dataRegistroAcompanhamento", formatarDataISO(new Date()));
    setValor("tipoAcompanhamento", "atendimento_paeet");
    setValor("componenteAcompanhamento", "");
    setValor("prioridadeAcompanhamento", "media");
    setValor("statusAcompanhamento", "aberto");
    setValor("prazoAcompanhamento", "");
    setValor("dificuldadeAcompanhamento", "");
    setValor("evidenciaAcompanhamento", "");
    setValor("intervencaoAcompanhamento", "");
    setValor("encaminhamentoAcompanhamento", "");
    setValor("resultadoAcompanhamento", "");
    setValor("observacoesAcompanhamento", "");
    setTexto("tituloFormularioAcompanhamento", "➕ Novo acompanhamento");
    const btnCancelar = document.getElementById("btnCancelarEdicaoAcompanhamento");
    if (btnCancelar) btnCancelar.style.display = "none";
}

function cancelarEdicaoAcompanhamento() {
    limparFormularioAcompanhamento();
    setTexto("mensagemFormularioAcompanhamento", "Edição cancelada.");
}

function baixarCsvAcompanhamento() {
    const filtros = obterFiltrosListaAcompanhamento();
    let lista = [...registrosAcompanhamento];

    if (filtros.busca) lista = lista.filter(registro => normalizarTexto(JSON.stringify(registro)).includes(filtros.busca));

    const linhas = [["Data", "Aluno", "RA", "Turma", "Curso", "Tipo", "Componente", "Prioridade", "Status", "Dificuldade", "Evidência", "Intervenção", "Encaminhamento", "Resultado", "Observações"]];

    lista.forEach(function (registro) {
        linhas.push([
            formatarDataBR(registro.data_registro), registro.nome_aluno || "", registro.ra || "", registro.turma || "", registro.curso || "",
            formatarTipoAcompanhamento(registro.tipo_acompanhamento), registro.componente_curricular || "", formatarPrioridade(registro.prioridade), formatarStatus(registro.status),
            registro.dificuldade_identificada || "", registro.evidencia || "", registro.intervencao_realizada || "", registro.encaminhamento || "", registro.resultado_observado || "", registro.observacoes || ""
        ]);
    });

    const conteudo = linhas.map(linha => linha.map(campo => `"${String(campo ?? "").replace(/"/g, '""')}"`).join(";")).join("\n");
    const blob = new Blob(["\ufeff" + conteudo], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "acompanhamento_alunos_paeet.csv";
    link.click();
    URL.revokeObjectURL(link.href);
}

function formatarDataISO(data) {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, "0");
    const dia = String(data.getDate()).padStart(2, "0");
    return `${ano}-${mes}-${dia}`;
}

function formatarDataBR(data) {
    if (!data) return "-";
    const partes = data.split("-");
    return partes.length === 3 ? `${partes[2]}/${partes[1]}/${partes[0]}` : data;
}

function normalizarTexto(texto) {
    return (texto || "").toString().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

function formatarTipoAcompanhamento(tipo) {
    const mapa = { atendimento_paeet: "Atendimento PAEET", dificuldade_aprendizagem: "Dificuldade de aprendizagem", baixo_rendimento: "Baixo rendimento", baixa_frequencia: "Baixa frequência", risco_evasao: "Risco de evasão", orientacao_estudo: "Orientação de estudo", intervencao_pedagogica: "Intervenção pedagógica", recuperacao: "Recuperação", encaminhamento_gestao: "Encaminhamento à gestão", encaminhamento_familia: "Encaminhamento à família", acompanhamento_estagio: "Acompanhamento de estágio", outro: "Outro" };
    return mapa[tipo] || tipo || "Não informado";
}

function formatarPrioridade(prioridade) {
    const mapa = { baixa: "Baixa", media: "Média", alta: "Alta", urgente: "Urgente" };
    return mapa[prioridade] || prioridade || "Média";
}

function formatarStatus(status) {
    const mapa = { aberto: "Aberto", em_andamento: "Em andamento", aguardando_retorno: "Aguardando retorno", resolvido: "Resolvido", arquivado: "Arquivado" };
    return mapa[status] || status || "Aberto";
}

function resumirTexto(texto, limite) {
    const valor = String(texto || "");
    return valor.length <= limite ? valor : valor.slice(0, limite) + "...";
}

function escaparHtml(texto) {
    return String(texto ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function getValor(id) {
    const elemento = document.getElementById(id);
    return elemento ? elemento.value : "";
}

function setValor(id, valor) {
    const elemento = document.getElementById(id);
    if (elemento) elemento.value = valor;
}

function setTexto(id, valor) {
    const elemento = document.getElementById(id);
    if (elemento) elemento.textContent = valor;
}

