/* =====================================================
   ACOMPANHAMENTO PAEET - RIOLANDO CONECTA TÉCNICO
   ARQUIVO: acompanhamento.js
   Protegido por login com perfil: admin, professor e coordenacao
===================================================== */

const SUPABASE_URL_ACOMP = "https://pwomyoprbvoimqmikvev.supabase.co";
const SUPABASE_KEY_ACOMP = "sb_publishable_elGQyDU7ngaUHCLWIHLhDQ_IxiLo6kD";

let bancoAcompanhamento = null;
let usuarioAdminAcompanhamento = null;
let perfilAcessoAcompanhamento = null;
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
            bloquearAcompanhamentoSemPermissao("Você precisa estar logado para acessar o acompanhamento PAEET.");
            return false;
        }

        const usuario = sessaoData.session.user;

        if (!usuario || !usuario.email) {
            bloquearAcompanhamentoSemPermissao("Usuário não identificado.");
            return false;
        }

        const email = usuario.email.toLowerCase();

        const { data: admin, error: erroAdmin } = await bancoAcompanhamento
            .from("admins")
            .select("email")
            .ilike("email", email)
            .maybeSingle();

        if (erroAdmin) {
            console.log("Erro ao verificar admin:", erroAdmin);
        }

        if (admin) {
            usuarioAdminAcompanhamento = usuario;

            perfilAcessoAcompanhamento = {
                user_id: usuario.id,
                nome: usuario.email,
                email: usuario.email,
                perfil: "admin",
                ativo: true
            };

            localStorage.setItem("adminEmail", email);
            localStorage.setItem("perfilAcesso", JSON.stringify(perfilAcessoAcompanhamento));

            setTexto("emailAdminAcompanhamento", `${email} — Administrador`);

            liberarAreaAcompanhamento();
            return true;
        }

        const { data: perfil, error: erroPerfil } = await bancoAcompanhamento
            .from("perfis_acesso")
            .select("id, user_id, nome, email, perfil, trocar_senha_obrigatorio, ativo")
            .ilike("email", email)
            .eq("ativo", true)
            .maybeSingle();

        if (erroPerfil) {
            console.log("Erro ao verificar perfil em perfis_acesso:", erroPerfil);
        }

        if (!perfil || !["professor", "coordenacao"].includes(perfil.perfil)) {
            bloquearAcompanhamentoSemPermissao("Este usuário não possui permissão ativa para acessar o Acompanhamento PAEET.");
            return false;
        }

        if (perfil.trocar_senha_obrigatorio === true) {
            console.warn(
                "Perfil ainda marcado com trocar_senha_obrigatorio=true. " +
                "O acesso ao Acompanhamento PAEET será liberado porque o usuário já está autenticado."
            );

            // Tenta corrigir automaticamente a marcação no Supabase.
            // Se a RLS bloquear este update, o acesso continua liberado.
            await bancoAcompanhamento
                .from("perfis_acesso")
                .update({ trocar_senha_obrigatorio: false })
                .ilike("email", email);
        }

        usuarioAdminAcompanhamento = usuario;

        perfilAcessoAcompanhamento = {
            ...perfil,
            user_id: perfil.user_id || usuario.id,
            email: perfil.email || usuario.email
        };

        localStorage.setItem("adminEmail", email);
        localStorage.setItem("perfilAcesso", JSON.stringify(perfilAcessoAcompanhamento));

        const nomePerfil = perfil.nome || usuario.email;
        const tipoPerfil = perfil.perfil === "coordenacao" ? "Coordenação" : "Professor";

        setTexto("emailAdminAcompanhamento", `${nomePerfil} — ${tipoPerfil} — ${email}`);

        liberarAreaAcompanhamento();
        return true;

    } catch (erro) {
        console.error("Erro ao verificar permissão do acompanhamento:", erro);
        bloquearAcompanhamentoSemPermissao("Erro ao validar acesso ao Acompanhamento PAEET.");
        return false;
    }
}

function liberarAreaAcompanhamento() {
    const areaBloqueio = document.getElementById("areaBloqueioAcompanhamento");
    const areaAcompanhamento = document.getElementById("areaAcompanhamento");

    if (areaBloqueio) areaBloqueio.style.display = "none";
    if (areaAcompanhamento) areaAcompanhamento.style.display = "block";

    aplicarPermissoesVisuaisAcompanhamento();
}

function usuarioPodeExcluirAcompanhamento() {
    return Boolean(
        perfilAcessoAcompanhamento &&
        perfilAcessoAcompanhamento.perfil === "admin"
    );
}

function usuarioPodeEditarAcompanhamento() {
    return Boolean(
        perfilAcessoAcompanhamento &&
        ["admin", "professor", "coordenacao"].includes(perfilAcessoAcompanhamento.perfil)
    );
}

function aplicarPermissoesVisuaisAcompanhamento() {
    const avisoId = "avisoPermissaoAcompanhamento";
    let aviso = document.getElementById(avisoId);

    if (!aviso) {
        aviso = document.createElement("div");
        aviso.id = avisoId;
        aviso.style.margin = "14px 0";
        aviso.style.padding = "14px 16px";
        aviso.style.borderRadius = "14px";
        aviso.style.background = "#eff6ff";
        aviso.style.borderLeft = "6px solid #1e40af";
        aviso.style.color = "#1e3a8a";
        aviso.style.fontWeight = "800";

        const areaAcompanhamento = document.getElementById("areaAcompanhamento");

        if (areaAcompanhamento) {
            areaAcompanhamento.prepend(aviso);
        }
    }

    if (!perfilAcessoAcompanhamento) {
        aviso.textContent = "";
        aviso.style.display = "none";
        return;
    }

    aviso.style.display = "block";

    if (perfilAcessoAcompanhamento.perfil === "admin") {
        aviso.textContent = "Acesso administrativo: você pode cadastrar, editar e excluir acompanhamentos.";
    } else if (perfilAcessoAcompanhamento.perfil === "coordenacao") {
        aviso.textContent = "Acesso da coordenação: você pode cadastrar e editar acompanhamentos. A exclusão é restrita ao administrador.";
    } else {
        aviso.textContent = "Acesso do professor: você pode cadastrar e editar acompanhamentos. A exclusão é restrita ao administrador.";
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
            <p>Faça login com uma conta autorizada: administrador, professor ou coordenação.</p>
            <a href="admin.html">Voltar para o login administrativo</a>
        `;
    }

    setTimeout(function () {
        window.location.href = "admin.html";
    }, 3500);
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
    document.getElementById("btnFeedbackDetalhadoAcompanhamento")?.addEventListener("click", imprimirRelatorioDetalhadoAcompanhamentos);

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
        if (!usuarioPodeEditarAcompanhamento()) {
            if (mensagem) mensagem.textContent = "Seu perfil não possui permissão para salvar acompanhamentos.";
            return;
        }

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
        if (mensagem) mensagem.textContent = "Erro ao salvar. Verifique se as policies da tabela acompanhamento_alunos permitem professor/coordenacao.";
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
                <td>
                    <div class="botoes-tabela-acompanhamento">
                        <button type="button" class="btn-feedback-individual" onclick="imprimirFeedbackAcompanhamento('${registro.id}')">Feedback</button>
                        <button type="button" class="btn-editar-registro" onclick="editarRegistroAcompanhamento('${registro.id}')">Editar</button>
                        ${
                            usuarioPodeExcluirAcompanhamento()
                            ? `<button type="button" class="btn-excluir-registro" onclick="excluirRegistroAcompanhamento('${registro.id}')">Excluir</button>`
                            : ""
                        }
                    </div>
                </td>
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
    if (!usuarioPodeEditarAcompanhamento()) {
        alert("Seu perfil não possui permissão para editar acompanhamentos.");
        return;
    }

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
    if (!usuarioPodeExcluirAcompanhamento()) {
        alert("Somente o administrador pode excluir acompanhamentos.");
        return;
    }

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


/* =====================================================
   IMPRESSÃO DE FEEDBACK COMPLETO DO ACOMPANHAMENTO
===================================================== */

function obterRegistrosFiltradosAcompanhamento() {
    const filtros = obterFiltrosListaAcompanhamento();
    let lista = [...registrosAcompanhamento];

    if (filtros.busca) {
        lista = lista.filter(function (registro) {
            const texto = normalizarTexto(`
                ${registro.nome_aluno || ""}
                ${registro.ra || ""}
                ${registro.turma || ""}
                ${registro.curso || ""}
                ${registro.tipo_acompanhamento || ""}
                ${registro.componente_curricular || ""}
                ${registro.dificuldade_identificada || ""}
                ${registro.evidencia || ""}
                ${registro.intervencao_realizada || ""}
                ${registro.encaminhamento || ""}
                ${registro.resultado_observado || ""}
                ${registro.observacoes || ""}
            `);

            return texto.includes(filtros.busca);
        });
    }

    return lista;
}

async function imprimirFeedbackAcompanhamento(id) {
    let registro = registrosAcompanhamento.find(function (item) {
        return String(item.id) === String(id);
    });

    if (!registro && bancoAcompanhamento) {
        const { data, error } = await bancoAcompanhamento
            .from("acompanhamento_alunos")
            .select("*")
            .eq("id", id)
            .maybeSingle();

        if (error) {
            console.error("Erro ao carregar feedback individual:", error);
        }

        registro = data || null;
    }

    if (!registro) {
        alert("Registro de acompanhamento não encontrado.");
        return;
    }

    imprimirDocumentoFeedbackAcompanhamento([registro], {
        titulo: "Feedback Individual do Acompanhamento PAEET",
        subtitulo: "Relatório pedagógico individual com dificuldade, evidência, intervenção, encaminhamento, resultado e observações."
    });
}

function imprimirRelatorioDetalhadoAcompanhamentos() {
    const lista = obterRegistrosFiltradosAcompanhamento();

    if (!lista.length) {
        alert("Nenhum acompanhamento encontrado para imprimir com os filtros atuais.");
        return;
    }

    imprimirDocumentoFeedbackAcompanhamento(lista, {
        titulo: "Relatório Detalhado de Acompanhamento PAEET",
        subtitulo: "Feedback completo dos acompanhamentos filtrados, com status e campos pedagógicos preenchidos."
    });
}

function imprimirDocumentoFeedbackAcompanhamento(lista, config) {
    const filtros = obterFiltrosListaAcompanhamento();
    const dataVigente = new Date().toLocaleDateString("pt-BR");
    const dataCriacaoDocumento = new Date().toLocaleString("pt-BR");

    const turmaCabecalho = obterTurmaCabecalhoFeedback(lista, filtros);
    const cursoCabecalho = obterCursoCabecalhoFeedback(lista);
    const professor = "Willyan Vieira da Cruz";
    const escola = "PEI Professor Riolando Canno";
    const periodo = `${formatarDataBR(filtros.dataInicio)} a ${formatarDataBR(filtros.dataFim)}`;

    const total = lista.length;
    const abertos = lista.filter(item => item.status === "aberto").length;
    const andamento = lista.filter(item => item.status === "em_andamento").length;
    const aguardando = lista.filter(item => item.status === "aguardando_retorno").length;
    const resolvidos = lista.filter(item => item.status === "resolvido").length;
    const arquivados = lista.filter(item => item.status === "arquivado").length;

    const cardsAlunos = lista.map(function (registro, index) {
        return montarCardFeedbackAluno(registro, index + 1);
    }).join("");

    const htmlRelatorio = `
        <!DOCTYPE html>
        <html lang="pt-br">
        <head>
            <meta charset="UTF-8">
            <title>${escaparHtml(config.titulo || "Feedback Acompanhamento PAEET")}</title>

            <style>
                * { box-sizing: border-box; }

                body {
                    margin: 0;
                    padding: 28px;
                    font-family: Arial, Helvetica, sans-serif;
                    color: #111827;
                    background: #f8fafc;
                    line-height: 1.5;
                }

                .documento {
                    max-width: 980px;
                    margin: 0 auto;
                    background: #ffffff;
                    padding: 30px;
                    border-radius: 18px;
                    box-shadow: 0 12px 34px rgba(15, 23, 42, 0.12);
                    border-top: 10px solid #0f766e;
                }

                .cabecalho {
                    border-bottom: 3px solid #0f766e;
                    padding-bottom: 18px;
                    margin-bottom: 22px;
                }

                .selo {
                    display: inline-block;
                    padding: 7px 12px;
                    border-radius: 999px;
                    background: #ecfeff;
                    color: #0f766e;
                    font-weight: 900;
                    font-size: 12px;
                    border: 1px solid #99f6e4;
                    margin-bottom: 10px;
                }

                h1 {
                    margin: 0;
                    font-size: 25px;
                    color: #0f4c81;
                }

                h2 {
                    margin: 6px 0 0;
                    font-size: 17px;
                    color: #0f766e;
                }

                .subtitulo {
                    margin: 10px 0 0;
                    color: #475569;
                }

                .grid-info {
                    display: grid;
                    grid-template-columns: repeat(2, minmax(0, 1fr));
                    gap: 8px 18px;
                    margin-top: 18px;
                    font-size: 13px;
                }

                .info {
                    padding: 9px 10px;
                    border-radius: 10px;
                    background: #f8fafc;
                    border: 1px solid #e2e8f0;
                }

                .resumo-status {
                    display: grid;
                    grid-template-columns: repeat(6, minmax(0, 1fr));
                    gap: 8px;
                    margin: 18px 0 24px;
                }

                .status-card {
                    padding: 10px;
                    border-radius: 12px;
                    background: #f8fafc;
                    border: 1px solid #cbd5e1;
                    text-align: center;
                }

                .status-card strong {
                    display: block;
                    font-size: 21px;
                    color: #0f766e;
                }

                .status-card span {
                    font-size: 11px;
                    color: #475569;
                    font-weight: 700;
                }

                .aluno-card {
                    border: 1px solid #cbd5e1;
                    border-left: 7px solid #1e40af;
                    border-radius: 14px;
                    padding: 16px;
                    margin: 0 0 18px;
                    break-inside: avoid;
                    page-break-inside: avoid;
                    background: #ffffff;
                }

                .aluno-topo {
                    display: flex;
                    justify-content: space-between;
                    gap: 14px;
                    align-items: flex-start;
                    border-bottom: 1px solid #e2e8f0;
                    padding-bottom: 12px;
                    margin-bottom: 14px;
                }

                .aluno-topo h3 {
                    margin: 0;
                    color: #1e40af;
                    font-size: 18px;
                }

                .badges {
                    display: flex;
                    gap: 6px;
                    flex-wrap: wrap;
                    justify-content: flex-end;
                }

                .badge {
                    display: inline-block;
                    padding: 6px 9px;
                    border-radius: 999px;
                    font-weight: 900;
                    font-size: 11px;
                    background: #dbeafe;
                    color: #1e40af;
                }

                .badge-prioridade {
                    background: #fef3c7;
                    color: #92400e;
                }

                .grid-aluno {
                    display: grid;
                    grid-template-columns: repeat(2, minmax(0, 1fr));
                    gap: 8px 14px;
                    margin-bottom: 14px;
                    font-size: 13px;
                }

                .campo {
                    margin: 10px 0;
                    padding: 12px;
                    border-radius: 12px;
                    background: #f8fafc;
                    border: 1px solid #e2e8f0;
                }

                .campo h4 {
                    margin: 0 0 6px;
                    color: #0f766e;
                    font-size: 14px;
                }

                .campo p {
                    margin: 0;
                    white-space: pre-wrap;
                }

                .assinaturas {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 44px;
                    margin-top: 48px;
                    break-inside: avoid;
                }

                .assinatura {
                    border-top: 1px solid #111827;
                    text-align: center;
                    padding-top: 8px;
                    font-size: 12px;
                }

                .rodape {
                    margin-top: 24px;
                    padding-top: 12px;
                    border-top: 1px solid #cbd5e1;
                    font-size: 11px;
                    color: #475569;
                    text-align: center;
                }

                .acoes-impressao {
                    max-width: 980px;
                    margin: 0 auto 16px;
                    display: flex;
                    justify-content: flex-end;
                    gap: 10px;
                }

                .acoes-impressao button {
                    border: none;
                    border-radius: 12px;
                    padding: 11px 14px;
                    background: #0f766e;
                    color: white;
                    font-weight: 900;
                    cursor: pointer;
                }

                @media print {
                    body { background: #ffffff; padding: 0; }
                    .acoes-impressao { display: none; }
                    .documento {
                        max-width: 100%;
                        box-shadow: none;
                        border-radius: 0;
                        padding: 18mm;
                    }
                    .aluno-card {
                        break-inside: avoid;
                        page-break-inside: avoid;
                    }
                }
            </style>
        </head>

        <body>
            <div class="acoes-impressao">
                <button type="button" onclick="window.print()">🖨️ Imprimir / Salvar em PDF</button>
                <button type="button" onclick="window.close()">Fechar</button>
            </div>

            <main class="documento">
                <header class="cabecalho">
                    <span class="selo">Documento pedagógico PAEET</span>
                    <h1>${escaparHtml(escola)}</h1>
                    <h2>${escaparHtml(config.titulo || "Relatório de Acompanhamento PAEET")}</h2>
                    <p class="subtitulo">${escaparHtml(config.subtitulo || "")}</p>

                    <section class="grid-info">
                        <div class="info"><strong>Professor/PAEET:</strong> ${escaparHtml(professor)}</div>
                        <div class="info"><strong>Escola:</strong> ${escaparHtml(escola)}</div>
                        <div class="info"><strong>Turma:</strong> ${escaparHtml(turmaCabecalho)}</div>
                        <div class="info"><strong>Curso:</strong> ${escaparHtml(formatarCursoAcompanhamento(cursoCabecalho))}</div>
                        <div class="info"><strong>Período do relatório:</strong> ${escaparHtml(periodo)}</div>
                        <div class="info"><strong>Data vigente:</strong> ${escaparHtml(dataVigente)}</div>
                        <div class="info"><strong>Data de criação do documento:</strong> ${escaparHtml(dataCriacaoDocumento)}</div>
                        <div class="info"><strong>Total de registros:</strong> ${total}</div>
                    </section>
                </header>

                <section class="resumo-status">
                    <div class="status-card"><strong>${total}</strong><span>Total</span></div>
                    <div class="status-card"><strong>${abertos}</strong><span>Abertos</span></div>
                    <div class="status-card"><strong>${andamento}</strong><span>Em andamento</span></div>
                    <div class="status-card"><strong>${aguardando}</strong><span>Aguardando</span></div>
                    <div class="status-card"><strong>${resolvidos}</strong><span>Resolvidos</span></div>
                    <div class="status-card"><strong>${arquivados}</strong><span>Arquivados</span></div>
                </section>

                ${cardsAlunos}

                <section class="assinaturas">
                    <div class="assinatura">Professor/PAEET<br>${escaparHtml(professor)}</div>
                    <div class="assinatura">Gestão/Coordenação</div>
                </section>

                <footer class="rodape">
                    Documento gerado pelo sistema Riolando Conecta Técnico em ${escaparHtml(dataCriacaoDocumento)}.
                    Este relatório possui finalidade pedagógica para acompanhamento, intervenção, busca ativa, tutoria e registro educacional.
                </footer>
            </main>

            <script>
                window.onload = function () {
                    setTimeout(function () {
                        window.print();
                    }, 500);
                };
            </script>
        </body>
        </html>
    `;

    const janela = window.open("", "_blank");

    if (!janela) {
        alert("O navegador bloqueou a janela de impressão. Permita pop-ups para gerar o PDF.");
        return;
    }

    janela.document.open();
    janela.document.write(htmlRelatorio);
    janela.document.close();
}

function montarCardFeedbackAluno(registro, numero) {
    return `
        <article class="aluno-card">
            <div class="aluno-topo">
                <div>
                    <h3>${numero}. ${escaparHtml(registro.nome_aluno || "Aluno não informado")}</h3>
                    <small>RA: ${escaparHtml(registro.ra || "Não informado")}</small>
                </div>

                <div class="badges">
                    <span class="badge">${escaparHtml(formatarStatus(registro.status))}</span>
                    <span class="badge badge-prioridade">${escaparHtml(formatarPrioridade(registro.prioridade))}</span>
                </div>
            </div>

            <section class="grid-aluno">
                <div><strong>Turma:</strong> ${escaparHtml(registro.turma || "Não informada")}</div>
                <div><strong>Curso:</strong> ${escaparHtml(formatarCursoAcompanhamento(registro.curso))}</div>
                <div><strong>Data do registro:</strong> ${escaparHtml(formatarDataBR(registro.data_registro))}</div>
                <div><strong>Data de criação:</strong> ${escaparHtml(formatarDataHoraAcompanhamento(registro.created_at || registro.data_registro))}</div>
                <div><strong>Tipo:</strong> ${escaparHtml(formatarTipoAcompanhamento(registro.tipo_acompanhamento))}</div>
                <div><strong>Componente curricular:</strong> ${escaparHtml(registro.componente_curricular || "Não informado")}</div>
                <div><strong>Prazo/retorno:</strong> ${escaparHtml(formatarDataBR(registro.prazo))}</div>
                <div><strong>Responsável:</strong> ${escaparHtml(registro.responsavel || "Willyan Vieira da Cruz")}</div>
            </section>

            ${montarCampoFeedback("Dificuldade identificada", registro.dificuldade_identificada)}
            ${montarCampoFeedback("Evidência observada", registro.evidencia)}
            ${montarCampoFeedback("Intervenção realizada", registro.intervencao_realizada)}
            ${montarCampoFeedback("Encaminhamento", registro.encaminhamento)}
            ${montarCampoFeedback("Resultado observado", registro.resultado_observado)}
            ${montarCampoFeedback("Observações gerais", registro.observacoes)}
        </article>
    `;
}

function montarCampoFeedback(titulo, valor) {
    return `
        <section class="campo">
            <h4>${escaparHtml(titulo)}</h4>
            <p>${escaparHtml(valor || "Não informado")}</p>
        </section>
    `;
}

function obterTurmaCabecalhoFeedback(lista, filtros) {
    if (filtros && filtros.turma && filtros.turma !== "todas") {
        return filtros.turma;
    }

    const turmas = [...new Set(lista.map(item => item.turma).filter(Boolean))];

    if (turmas.length === 1) {
        return turmas[0];
    }

    if (turmas.length > 1) {
        return "Todas / múltiplas turmas";
    }

    return "Não informada";
}

function obterCursoCabecalhoFeedback(lista) {
    const cursos = [...new Set(lista.map(item => item.curso).filter(Boolean))];

    if (cursos.length === 1) {
        return cursos[0];
    }

    if (cursos.length > 1) {
        return "multiplos";
    }

    return "desenvolvimento_sistemas";
}

function formatarCursoAcompanhamento(curso) {
    const mapa = {
        desenvolvimento_sistemas: "Desenvolvimento de Sistemas",
        vendas: "Vendas",
        substituicoes: "Substituições",
        multiplos: "Cursos múltiplos"
    };

    return mapa[curso] || curso || "Desenvolvimento de Sistemas";
}

function formatarDataHoraAcompanhamento(dataTexto) {
    if (!dataTexto) {
        return "Não informada";
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


// Funções usadas nos botões inline da tabela
window.editarRegistroAcompanhamento = editarRegistroAcompanhamento;
window.excluirRegistroAcompanhamento = excluirRegistroAcompanhamento;
window.imprimirFeedbackAcompanhamento = imprimirFeedbackAcompanhamento;


// Funções auxiliares de permissão expostas para depuração
window.usuarioPodeExcluirAcompanhamento = usuarioPodeExcluirAcompanhamento;
window.usuarioPodeEditarAcompanhamento = usuarioPodeEditarAcompanhamento;
window.aplicarPermissoesVisuaisAcompanhamento = aplicarPermissoesVisuaisAcompanhamento;
