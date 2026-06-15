/* =====================================================
   LOGS DO SISTEMA - RIOLANDO CONECTA TÉCNICO
   ARQUIVO: logs.js
   Versão formatada e indentada
   Função: consultar logs_sistema com filtros, indicadores,
   gráficos, CSV, PDF e modal de detalhes.
===================================================== */

const SUPABASE_URL_LOGS="https://pwomyoprbvoimqmikvev.supabase.co";
const SUPABASE_KEY_LOGS="sb_publishable_elGQyDU7ngaUHCLWIHLhDQ_IxiLo6kD";
let bancoLogs=null, usuarioAdminLogs=null, logsCarregados=[];
if(window.supabase) {
    bancoLogs=window.supabase.createClient(SUPABASE_URL_LOGS, SUPABASE_KEY_LOGS)
}document.addEventListener("DOMContentLoaded", iniciarLogsSistema);
async function iniciarLogsSistema() {
    const ok=await verificarAcessoAdministradorLogs();
    if(!ok)return;
    configurarEventosLogs();
    definirPeriodoPadraoLogs();
    await carregarLogsSistema()
}async function verificarAcessoAdministradorLogs() {
    try {
        if(!bancoLogs) {
            bloquearLogsSemPermissao("Erro ao carregar conexão com o Supabase.");
            return false
        }const {
            data:sessaoData, error:erroSessao
        }=await bancoLogs.auth.getSession();
        if(erroSessao||!sessaoData||!sessaoData.session) {
            bloquearLogsSemPermissao("Você precisa estar logado como administrador para acessar os logs do sistema.");
            return false
        }const usuario=sessaoData.session.user;
        if(!usuario||!usuario.email) {
            bloquearLogsSemPermissao("Usuário administrativo não identificado.");
            return false
        }const email=usuario.email.toLowerCase();
        const {
            data:admin, error:erroAdmin
        }=await bancoLogs.from("admins").select("email").ilike("email", email).limit(1);
        if(erroAdmin||!admin||admin.length===0) {
            bloquearLogsSemPermissao("Este usuário não possui permissão administrativa.");
            return false
        }usuarioAdminLogs=usuario;
        localStorage.setItem("adminEmail", email);
        setTexto("emailAdminLogs", email);
        const areaBloqueio=document.getElementById("areaBloqueioLogs");
        const areaLogs=document.getElementById("areaLogsSistema");
        if(areaBloqueio)areaBloqueio.style.display="none";
        if(areaLogs)areaLogs.style.display="block";
        return true
    }catch(erro) {
        console.error("Erro ao verificar permissão administrativa:", erro);
        bloquearLogsSemPermissao("Erro ao validar acesso administrativo.");
        return false
    }
}function bloquearLogsSemPermissao(mensagem) {
    const areaBloqueio=document.getElementById("areaBloqueioLogs");
    const areaLogs=document.getElementById("areaLogsSistema");
    if(areaLogs)areaLogs.style.display="none";
    if(areaBloqueio) {
        areaBloqueio.style.display="block";
        areaBloqueio.innerHTML=`<h2>🔒 Acesso restrito</h2><p>${escaparHtml(mensagem)}</p><p>Faça login com uma conta administrativa para continuar.</p><a href="admin.html">Voltar para o login administrativo</a>`
    }setTimeout(()=> {
        window.location.href="admin.html"
    }, 2500)
}function configurarEventosLogs() {
    document.getElementById("btnGerarLogs")?.addEventListener("click", carregarLogsSistema);
    document.getElementById("btnLimparFiltrosLogs")?.addEventListener("click", limparFiltrosLogs);
    document.getElementById("btnBaixarCsvLogs")?.addEventListener("click", baixarCsvLogs);
    document.getElementById("btnBaixarPdfLogs")?.addEventListener("click", ()=>window.print());
    document.getElementById("filtroPeriodoLogs")?.addEventListener("change", ()=> {
        if(getValor("filtroPeriodoLogs")!=="personalizado")aplicarPeriodoLogs()
    });
    document.getElementById("filtroRapidoLogs")?.addEventListener("change", aplicarFiltroRapidoLogs);
    document.getElementById("btnOrdenarLogs")?.addEventListener("click", alternarOrdemLogs);
    document.getElementById("buscaLogs")?.addEventListener("input", renderizarTabelaLogs);
    document.getElementById("filtroUsuarioLogs")?.addEventListener("input", renderizarTabelaLogs);
    document.getElementById("btnFecharModalLog")?.addEventListener("click", fecharModalDetalhesLog);
    const modal=document.getElementById("modalDetalhesLog");
    if(modal) {
        modal.addEventListener("click", e=> {
            if(e.target===modal)fecharModalDetalhesLog()
        })
    }
}function definirPeriodoPadraoLogs() {
    setValor("filtroPeriodoLogs", "mensal");
    aplicarPeriodoLogs()
}function aplicarPeriodoLogs() {
    const periodo=getValor("filtroPeriodoLogs")||"mensal";
    const intervalo=calcularIntervaloPorPeriodo(periodo);
    setValor("dataInicioLogs", intervalo.inicio);
    setValor("dataFimLogs", intervalo.fim)
}function aplicarFiltroRapidoLogs() {
    const filtroRapido=getValor("filtroRapidoLogs");
    if(!filtroRapido)return;
    const intervalo=calcularIntervaloRapido(filtroRapido);
    setValor("filtroPeriodoLogs", "personalizado");
    setValor("dataInicioLogs", intervalo.inicio);
    setValor("dataFimLogs", intervalo.fim);
    carregarLogsSistema()
}function limparFiltrosLogs() {
    setValor("filtroRapidoLogs", "");
    setValor("filtroPeriodoLogs", "mensal");
    setValor("filtroModuloLogs", "todos");
    setValor("filtroStatusLogs", "todos");
    setValor("filtroTabelaLogs", "todos");
    setValor("filtroUsuarioLogs", "");
    setValor("buscaLogs", "");
    aplicarPeriodoLogs();
    carregarLogsSistema()
}function obterFiltrosLogs() {
    let dataInicio=getValor("dataInicioLogs"), dataFim=getValor("dataFimLogs");
    if(!dataInicio||!dataFim) {
        aplicarPeriodoLogs();
        dataInicio=getValor("dataInicioLogs");
        dataFim=getValor("dataFimLogs")
    }return {
        dataInicio, dataFim, modulo:getValor("filtroModuloLogs")||"todos", status:getValor("filtroStatusLogs")||"todos", tabela:getValor("filtroTabelaLogs")||"todos", usuario:normalizarTexto(getValor("filtroUsuarioLogs")), busca:normalizarTexto(getValor("buscaLogs"))
    }
}async function carregarLogsSistema() {
    const mensagem=document.getElementById("mensagemLogs");
    try {
        if(!bancoLogs)throw new Error("Supabase não carregou.");
        const filtros=obterFiltrosLogs();
        if(mensagem)mensagem.textContent="Carregando logs do sistema...";
        const inicioISO=`${filtros.dataInicio}T00:00:00`;
        const fimISO=`${filtros.dataFim}T23:59:59`;
        let consulta=bancoLogs.from("logs_sistema").select("*").gte("created_at", inicioISO).lte("created_at", fimISO).order("created_at",  {
            ascending:false
        }).limit(1000);
        if(filtros.modulo!=="todos")consulta=consulta.eq("modulo", filtros.modulo);
        if(filtros.status!=="todos")consulta=consulta.eq("status", filtros.status);
        if(filtros.tabela!=="todos")consulta=consulta.eq("tabela_afetada", filtros.tabela);
        const {
            data, error
        }=await consulta;
        if(error)throw error;
        logsCarregados=ordenarLogs(data||[]);
        renderizarIndicadoresLogs(logsCarregados);
        renderizarGraficosLogs(logsCarregados);
        renderizarTabelaLogs();
        if(mensagem)mensagem.textContent=`${logsCarregados.length} log(s) carregado(s).`
    }catch(erro) {
        console.error("Erro ao carregar logs:", erro);
        if(mensagem)mensagem.textContent="Erro ao carregar logs. Verifique se a tabela logs_sistema existe e se há permissão administrativa.";
        const corpo=document.getElementById("corpoTabelaLogs");
        if(corpo)corpo.innerHTML=`<tr><td colspan="9">Erro ao carregar logs.</td></tr>`
    }
}function renderizarTabelaLogs() {
    const corpo=document.getElementById("corpoTabelaLogs");
    if(!corpo)return;
    const filtros=obterFiltrosLogs();
    let lista=[...logsCarregados];
    if(filtros.usuario) {
        lista=lista.filter(log=>normalizarTexto(`${log.usuario_email||""} ${log.usuario_nome||""} ${log.usuario_funcao||""}`).includes(filtros.usuario))
    }if(filtros.busca) {
        lista=lista.filter(log=>normalizarTexto(`${log.descricao||""} ${log.acao||""} ${log.tipo_evento||""} ${log.modulo||""} ${log.origem_pagina||""} ${log.tabela_afetada||""} ${log.registro_id||""} ${JSON.stringify(log.detalhes||{})}`).includes(filtros.busca))
    }renderizarIndicadoresLogs(lista);
    renderizarGraficosLogs(lista);
    if(!lista.length) {
        corpo.innerHTML=`<tr><td colspan="9">Nenhum log encontrado para os filtros selecionados.</td></tr>`;
        return
    }corpo.innerHTML=lista.map(log=>`<tr><td><strong>${formatarDataHoraBR(log.created_at)}</strong><br><small>${escaparHtml(log.data_log||"")} ${cortarHora(log.hora_log||"")}</small></td><td><strong>${escaparHtml(log.usuario_email||"Não identificado")}</strong><br><small>${escaparHtml(log.usuario_nome||"-")} • ${escaparHtml(log.usuario_funcao||"-")}</small></td><td>${escaparHtml(formatarModulo(log.modulo))}</td><td><strong>${escaparHtml(formatarAcao(log.acao))}</strong><br><small>${escaparHtml(log.tipo_evento||"-")}</small></td><td>${escaparHtml(log.tabela_afetada||"-")}</td><td>${escaparHtml(log.registro_id||"-")}</td><td><span class="badge-log badge-${escaparHtml(log.status||"sucesso")}">${escaparHtml(formatarStatus(log.status))}</span></td><td>${escaparHtml(resumirTexto(log.descricao||"-",160))}</td><td><button type="button" class="btn-detalhes-log" onclick="abrirDetalhesLog('${log.id}')">Ver</button></td></tr>`).join("")
}function renderizarIndicadoresLogs(lista) {
    const hoje=formatarDataISO(new Date());
    const total=lista.length;
    const logsHoje=lista.filter(log=>log.data_log===hoje).length;
    const sucesso=lista.filter(log=>log.status==="sucesso").length;
    const alertaErro=lista.filter(log=>log.status==="alerta"||log.status==="erro").length;
    const usuarios=new Set(lista.map(log=>log.usuario_email||log.usuario_nome).filter(Boolean)).size;
    setTexto("indicadorTotalLogs", total);
    setTexto("indicadorLogsHoje", logsHoje);
    setTexto("indicadorLogsSucesso", sucesso);
    setTexto("indicadorLogsAlertaErro", alertaErro);
    setTexto("indicadorUsuariosLogs", usuarios)
}function renderizarGraficosLogs(lista) {
    renderizarGraficoBarrasLogs("graficoLogsPorModulo", contarPorCampo(lista, "modulo"), formatarModulo);
    renderizarGraficoBarrasLogs("graficoLogsPorAcao", contarPorCampo(lista, "acao"), formatarAcao)
}function renderizarGraficoBarrasLogs(idElemento, contagem, formatadorRotulo) {
    const elemento=document.getElementById(idElemento);
    if(!elemento)return;
    const entradas=Object.entries(contagem|| {
    }).sort((a, b)=>b[1]-a[1]).slice(0, 10);
    if(!entradas.length) {
        elemento.innerHTML=`<p class="mensagem-logs">Nenhum dado encontrado.</p>`;
        return
    }const maior=Math.max(...entradas.map(item=>item[1]), 1);
    elemento.innerHTML=entradas.map(([rotulo, valor])=> {
        const largura=Math.max((valor/maior)*100, 5);
        return`<div class="linha-grafico-logs"><span class="rotulo-grafico-logs">${escaparHtml(formatadorRotulo(rotulo))}</span><div class="barra-grafico-logs"><div class="preenchimento-grafico-logs" style="width:${largura}%"></div></div><span class="valor-grafico-logs">${valor}</span></div>`
    }).join("")
}function abrirDetalhesLog(id) {
    const log=logsCarregados.find(item=>String(item.id)===String(id));
    if(!log) {
        alert("Log não encontrado.");
        return
    }const modal=document.getElementById("modalDetalhesLog");
    const conteudo=document.getElementById("conteudoDetalhesLog");
    if(!modal||!conteudo)return;
    conteudo.textContent=JSON.stringify(log, null, 2);
    modal.classList.add("aberto")
}function fecharModalDetalhesLog() {
    document.getElementById("modalDetalhesLog")?.classList.remove("aberto")
}function baixarCsvLogs() {
    const filtros=obterFiltrosLogs();
    let lista=[...logsCarregados];
    if(filtros.usuario)lista=lista.filter(log=>normalizarTexto(`${log.usuario_email||""} ${log.usuario_nome||""}`).includes(filtros.usuario));
    if(filtros.busca)lista=lista.filter(log=>normalizarTexto(JSON.stringify(log)).includes(filtros.busca));
    const linhas=[["Data/Hora", "Data", "Hora", "Usuário", "Nome", "Função", "Página", "Módulo", "Ação", "Tipo Evento", "Tabela", "Registro ID", "Status", "Descrição", "Dados anteriores", "Dados novos", "Detalhes"]];
    lista.forEach(log=> {
        linhas.push([formatarDataHoraBR(log.created_at), log.data_log||"", cortarHora(log.hora_log||""), log.usuario_email||"", log.usuario_nome||"", log.usuario_funcao||"", log.origem_pagina||"", log.modulo||"", log.acao||"", log.tipo_evento||"", log.tabela_afetada||"", log.registro_id||"", log.status||"", log.descricao||"", JSON.stringify(log.dados_anteriores|| {
        }), JSON.stringify(log.dados_novos|| {
        }), JSON.stringify(log.detalhes|| {
        })])
    });
    const conteudo=linhas.map(linha=>linha.map(campo=>`"${String(campo??"").replace(/"/g,'""')}"`).join(";")).join("\n");
    const blob=new Blob(["\ufeff"+conteudo],  {
        type:"text/csv;charset=utf-8;"
    });
    const link=document.createElement("a");
    link.href=URL.createObjectURL(blob);
    link.download="logs_sistema_riolandoconecta.csv";
    link.click();
    URL.revokeObjectURL(link.href)
}function alternarOrdemLogs() {
    const botao=document.getElementById("btnOrdenarLogs");
    if(!botao)return;
    const ordemAtual=botao.dataset.ordem||"desc";
    const novaOrdem=ordemAtual==="desc"?"asc":"desc";
    botao.dataset.ordem=novaOrdem;
    botao.textContent=novaOrdem==="desc"?"📅 Data do log ↓ Mais recentes":"📅 Data do log ↑ Mais antigos";
    logsCarregados=ordenarLogs(logsCarregados||[]);
    renderizarTabelaLogs()
}function ordenarLogs(lista) {
    const botao=document.getElementById("btnOrdenarLogs");
    const ordem=botao?botao.dataset.ordem||"desc":"desc";
    return[...lista].sort((a, b)=> {
        const dataA=new Date(a.created_at||"1900-01-01T00:00:00");
        const dataB=new Date(b.created_at||"1900-01-01T00:00:00");
        return ordem==="asc"?dataA-dataB:dataB-dataA
    })
}function calcularIntervaloPorPeriodo(periodo) {
    const hoje=new Date();
    let inicio=new Date(hoje), fim=new Date(hoje);
    if(periodo==="diario") {
        inicio=new Date(hoje);
        fim=new Date(hoje)
    }else if(periodo==="semanal") {
        const diaSemana=hoje.getDay();
        const dif=diaSemana===0?-6:1-diaSemana;
        inicio=new Date(hoje);
        inicio.setDate(hoje.getDate()+dif);
        fim=new Date(inicio);
        fim.setDate(inicio.getDate()+6)
    }else if(periodo==="bimestral") {
        inicio=new Date(hoje);
        inicio.setMonth(hoje.getMonth()-1);
        inicio.setDate(1)
    }else if(periodo==="trimestral") {
        inicio=new Date(hoje);
        inicio.setMonth(hoje.getMonth()-2);
        inicio.setDate(1)
    }else if(periodo==="semestral") {
        inicio=new Date(hoje);
        inicio.setMonth(hoje.getMonth()-5);
        inicio.setDate(1)
    }else if(periodo==="anual") {
        inicio=new Date(hoje.getFullYear(), 0, 1);
        fim=new Date(hoje.getFullYear(), 11, 31)
    }else {
        inicio=new Date(hoje.getFullYear(), hoje.getMonth(), 1);
        fim=new Date(hoje.getFullYear(), hoje.getMonth()+1, 0)
    }return {
        inicio:formatarDataISO(inicio), fim:formatarDataISO(fim)
    }
}function calcularIntervaloRapido(filtroRapido) {
    const hoje=new Date();
    let inicio=new Date(hoje), fim=new Date(hoje);
    if(filtroRapido==="hoje") {
        inicio=new Date(hoje);
        fim=new Date(hoje)
    }if(filtroRapido==="ontem") {
        inicio=new Date(hoje);
        inicio.setDate(hoje.getDate()-1);
        fim=new Date(inicio)
    }if(filtroRapido==="semana_passada") {
        const diaSemana=hoje.getDay();
        const dif=diaSemana===0?-6:1-diaSemana;
        const segundaAtual=new Date(hoje);
        segundaAtual.setDate(hoje.getDate()+dif);
        inicio=new Date(segundaAtual);
        inicio.setDate(segundaAtual.getDate()-7);
        fim=new Date(inicio);
        fim.setDate(inicio.getDate()+6)
    }if(filtroRapido==="anteriores_neste_mes") {
        inicio=new Date(hoje.getFullYear(), hoje.getMonth(), 1);
        fim=new Date(hoje);
        fim.setDate(hoje.getDate()-1);
        if(fim<inicio)fim=new Date(hoje)
    }if(filtroRapido==="ultimo_mes") {
        inicio=new Date(hoje);
        inicio.setDate(hoje.getDate()-29);
        fim=new Date(hoje)
    }return {
        inicio:formatarDataISO(inicio), fim:formatarDataISO(fim)
    }
}function contarPorCampo(lista, campo) {
    return(lista||[]).reduce((acc, item)=> {
        const valor=item[campo]||"não informado";
        acc[valor]=(acc[valor]||0)+1;
        return acc
    },  {
    })
}function formatarDataISO(data) {
    const ano=data.getFullYear();
    const mes=String(data.getMonth()+1).padStart(2, "0");
    const dia=String(data.getDate()).padStart(2, "0");
    return`${ano}-${mes}-${dia}`
}function formatarDataHoraBR(valor) {
    if(!valor)return"-";
    try {
        return new Date(valor).toLocaleString("pt-BR",  {
            timeZone:"America/Sao_Paulo", day:"2-digit", month:"2-digit", year:"numeric", hour:"2-digit", minute:"2-digit", second:"2-digit"
        })
    }catch(e) {
        return valor
    }
}function cortarHora(hora) {
    if(!hora)return"-";
    return hora.toString().slice(0, 8)
}function formatarModulo(modulo) {
    const mapa= {
        agenda:"Agenda", portfolio:"Portfólio", chamados:"Chamados", central_paeet:"Central PAEET", acompanhamento_paeet:"Acompanhamento PAEET", relatorios:"Relatórios", admin:"Admin", geral:"Geral", "não informado":"Não informado"
    };
    return mapa[modulo]||modulo||"Não informado"
}function formatarAcao(acao) {
    const mapa= {
        criar_evento:"Criar evento", editar_evento:"Editar evento", excluir_evento:"Excluir evento", excluir_eventos_futuros:"Excluir eventos futuros", excluir_serie_eventos:"Excluir série", criar_portfolio:"Criar portfólio", enviar_chamado:"Enviar chamado", preencher_checklist:"Preencher checklist", criar_acompanhamento:"Criar acompanhamento", editar_acompanhamento:"Editar acompanhamento", excluir_acompanhamento:"Excluir acompanhamento", acao_nao_informada:"Ação não informada"
    };
    return mapa[acao]||acao||"Não informado"
}function formatarStatus(status) {
    const mapa= {
        sucesso:"Sucesso", alerta:"Alerta", erro:"Erro"
    };
    return mapa[status]||status||"Sucesso"
}function resumirTexto(texto, limite) {
    const valor=String(texto||"");
    return valor.length<=limite?valor:valor.slice(0, limite)+"..."
}function normalizarTexto(texto) {
    return(texto||"").toString().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim()
}function escaparHtml(texto) {
    return String(texto??"").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g,"&quot;
    ").replace(/'/g,"&#039;
    ")}
function getValor(id){const el=document.getElementById(id);return el?el.value:""}
function setValor(id,valor){const el=document.getElementById(id);if(el)el.value=valor}
function setTexto(id,valor){const el=document.getElementById(id);if(el)el.textContent=valor}
