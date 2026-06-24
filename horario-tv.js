const SUPABASE_URL_TV = "https://pwomyoprbvoimqmikvev.supabase.co";
const SUPABASE_KEY_TV = "sb_publishable_elGQyDU7ngaUHCLWIHLhDQ_IxiLo6kD";

const bancoHorariosTv = supabase.createClient(SUPABASE_URL_TV, SUPABASE_KEY_TV);

const diasSemanaTv = ["domingo", "segunda", "terca", "quarta", "quinta", "sexta", "sabado"];
const nomesDiasTv = {
    domingo: "Domingo",
    segunda: "Segunda-feira",
    terca: "Terça-feira",
    quarta: "Quarta-feira",
    quinta: "Quinta-feira",
    sexta: "Sexta-feira",
    sabado: "Sábado"
};

const INTERVALO_ATUALIZACAO_HORARIOS_TV = 30000;
const INTERVALO_RECARREGAMENTO_COMPLETO_TV = 21600000;
const HORARIO_INICIO_EXPEDIENTE_TV = "06:00";
const HORARIO_FIM_EXPEDIENTE_TV = "21:30";

document.addEventListener("DOMContentLoaded", function () {
    atualizarPainelHorariosTv();
    setInterval(atualizarPainelHorariosTv, INTERVALO_ATUALIZACAO_HORARIOS_TV);
    setTimeout(function () {
        window.location.reload();
    }, INTERVALO_RECARREGAMENTO_COMPLETO_TV);

    document.addEventListener("visibilitychange", function () {
        if (!document.hidden) {
            atualizarPainelHorariosTv();
        }
    });

    window.addEventListener("focus", atualizarPainelHorariosTv);
    window.addEventListener("online", atualizarPainelHorariosTv);
});

async function atualizarPainelHorariosTv() {
    const agora = new Date();
    const diaSemana = diasSemanaTv[agora.getDay()];
    const horaAtual = formatarHoraTv(agora);

    preencherTextoTv("diaSemanaAtualTv", nomesDiasTv[diaSemana] || diaSemana);
    preencherTextoTv("horaAtualTv", horaAtual);
    preencherTextoTv("ultimaAtualizacaoTv", horaAtual);

    try {
        const semExpedienteManual = await buscarModoSemExpedienteManualTv();

        if (semExpedienteManual || horarioForaDoExpedienteTv(horaAtual)) {
            renderizarRiolandoOffTv();
            preencherTextoTv("mensagemStatusTv", semExpedienteManual ? "Modo sem expediente ativado pelo admin." : "Fora do horario de expediente.");
            return;
        }

        if (diaSemana === "domingo" || diaSemana === "sabado") {
            renderizarSemAulasTv("Nenhuma aula cadastrada para hoje.");
            preencherTextoTv("mensagemStatusTv", "Tela pública em modo somente leitura.");
            return;
        }

        const { data, error } = await bancoHorariosTv
            .from("horarios_aulas")
            .select("*")
            .eq("dia_semana", diaSemana)
            .eq("ativo", true)
            .order("horario_inicio", { ascending: true });

        if (error) {
            throw error;
        }

        const horarios = data || [];
        const aulasAgora = horarios.filter(function (item) {
            const inicio = formatarHorarioBancoTv(item.horario_inicio);
            const fim = formatarHorarioBancoTv(item.horario_fim);
            return inicio <= horaAtual && fim > horaAtual;
        });
        const proximosDoDia = horarios.filter(function (item) {
            return formatarHorarioBancoTv(item.horario_inicio) > horaAtual;
        });
        const proximos = filtrarProximoBlocoHorariosTv(proximosDoDia);
        const proximo = proximos.length > 0 ? proximos[0] : null;

        renderizarAulasAgoraTv(aulasAgora);
        renderizarProximosHorariosTv(proximos);
        preencherTextoTv("totalAulasAgoraTv", aulasAgora.length.toString());
        preencherTextoTv("proximoHorarioResumoTv", proximo ? formatarHorarioBancoTv(proximo.horario_inicio) : "--:--");
        preencherTextoTv("mensagemStatusTv", "Tela pública em modo somente leitura.");
    } catch (erro) {
        console.log("Erro ao atualizar horários da TV:", erro);
        renderizarErroTv("Não foi possível carregar os horários agora. Tentando novamente em 1 minuto.");
        preencherTextoTv("mensagemStatusTv", "Erro de conexão com o Supabase.");
    }
}

function renderizarAulasAgoraTv(aulas) {
    const lista = document.getElementById("listaAulasAgoraTv");

    if (!lista) {
        return;
    }

    const totalAulas = aulas ? aulas.length : 0;
    aplicarTamanhoGradeAulasTv(lista, totalAulas);

    if (!aulas || aulas.length === 0) {
        lista.innerHTML = `<p class="mensagem-tv">Nenhuma aula em andamento neste horário.</p>`;
        return;
    }

    lista.innerHTML = aulas.map(montarCardAulaTv).join("");
}

function aplicarTamanhoGradeAulasTv(lista, totalAulas) {
    lista.className = lista.className
        .split(" ")
        .filter(function (classe) {
            return classe && !classe.startsWith("aulas-qtd-") && classe !== "aulas-vazia";
        })
        .join(" ");

    if (totalAulas === 0) {
        lista.classList.add("aulas-vazia");
    } else if (totalAulas > 10) {
        lista.classList.add("aulas-qtd-muitas");
    } else {
        lista.classList.add("aulas-qtd-" + totalAulas);
    }

    if (document.body) {
        document.body.setAttribute("data-total-aulas-agora", totalAulas.toString());
        document.body.setAttribute("data-densidade-aulas", totalAulas >= 7 ? "alta" : totalAulas >= 5 ? "media" : "normal");
    }
}

function filtrarProximoBlocoHorariosTv(proximosDoDia) {
    if (!proximosDoDia || proximosDoDia.length === 0) {
        return [];
    }

    const proximoInicio = formatarHorarioBancoTv(proximosDoDia[0].horario_inicio);

    return proximosDoDia.filter(function (item) {
        return formatarHorarioBancoTv(item.horario_inicio) === proximoInicio;
    });
}

function renderizarProximosHorariosTv(aulas) {
    const area = document.getElementById("proximoHorarioTv");

    if (!area) {
        return;
    }

    area.className = "lista-proximos-tv";
    area.style.removeProperty("--duracao-creditos");

    if (!aulas || aulas.length === 0) {
        area.innerHTML = `<p class="mensagem-tv">Não há próximos horários para hoje.</p>`;
        return;
    }

    area.classList.add(aulas.length > 10 ? "proximos-qtd-muitos" : "proximos-qtd-" + aulas.length);

    const cards = aulas.map(montarCardAulaTv).join("");
    const copiaCards = aulas.length > 1
        ? `<div class="grupo-proximos-tv copia-creditos-tv" aria-hidden="true">${cards}</div>`
        : "";

    area.style.setProperty("--duracao-creditos", Math.max(35, aulas.length * 12) + "s");
    area.innerHTML = `
        <div class="trilho-proximos-tv">
            <div class="grupo-proximos-tv">${cards}</div>
            ${copiaCards}
        </div>
    `;
}

function renderizarSemAulasTv(mensagem) {
    preencherTextoTv("totalAulasAgoraTv", "0");
    preencherTextoTv("proximoHorarioResumoTv", "--:--");
    renderizarAulasAgoraTv([]);

    const proximo = document.getElementById("proximoHorarioTv");

    if (proximo) {
        proximo.innerHTML = `<p class="mensagem-tv">${escaparHtmlTv(mensagem)}</p>`;
    }
}

function renderizarErroTv(mensagem) {
    const lista = document.getElementById("listaAulasAgoraTv");
    const proximo = document.getElementById("proximoHorarioTv");

    if (lista) {
        lista.innerHTML = `<p class="mensagem-tv">${escaparHtmlTv(mensagem)}</p>`;
    }

    if (proximo) {
        proximo.innerHTML = `<p class="mensagem-tv">Aguardando nova tentativa.</p>`;
    }
}

async function buscarModoSemExpedienteManualTv() {
    try {
        const { data, error } = await bancoHorariosTv
            .from("site_settings")
            .select("valor")
            .eq("chave", "riolando_sem_expediente")
            .maybeSingle();

        if (error) {
            console.log("Erro ao consultar modo sem expediente:", error);
            return false;
        }

        return data && data.valor === "true";
    } catch (erro) {
        console.log("Modo sem expediente indisponivel:", erro);
        return false;
    }
}

function horarioForaDoExpedienteTv(horaAtual) {
    return horaAtual >= HORARIO_FIM_EXPEDIENTE_TV || horaAtual < HORARIO_INICIO_EXPEDIENTE_TV;
}

function renderizarRiolandoOffTv() {
    preencherTextoTv("totalAulasAgoraTv", "0");
    preencherTextoTv("proximoHorarioResumoTv", HORARIO_INICIO_EXPEDIENTE_TV);

    const lista = document.getElementById("listaAulasAgoraTv");
    const proximo = document.getElementById("proximoHorarioTv");
    const mensagem = `
        <div class="mensagem-off-tv">
            <strong>RIOLANDO EM OFF</strong>
            <span>Aguarde o horario do proximo expediente iniciar.</span>
        </div>
    `;

    if (lista) {
        aplicarTamanhoGradeAulasTv(lista, 0);
        lista.innerHTML = mensagem;
    }

    if (proximo) {
        proximo.className = "lista-proximos-tv";
        proximo.innerHTML = mensagem;
    }
}

function montarCardAulaTv(aula) {
    return `
        <article class="card-aula-tv">
            <h3>${escaparHtmlTv(aula.professor || "Professor não informado")}</h3>
            <span class="horario">${formatarHorarioBancoTv(aula.horario_inicio)} às ${formatarHorarioBancoTv(aula.horario_fim)}</span>
            <div class="info-aula-tv">
                <div><strong>Turma:</strong> ${escaparHtmlTv(aula.turma || "-")}</div>
                <div><strong>Disciplina:</strong> ${escaparHtmlTv(aula.disciplina || "Não informada")}</div>
                <div><strong>Ambiente:</strong> ${escaparHtmlTv(aula.ambiente || "Não informado")}</div>
            </div>
        </article>
    `;
}

function formatarHoraTv(data) {
    return data.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
    });
}

function formatarHorarioBancoTv(horario) {
    if (!horario) {
        return "--:--";
    }

    return horario.toString().substring(0, 5);
}

function preencherTextoTv(id, texto) {
    const elemento = document.getElementById(id);

    if (elemento) {
        elemento.textContent = texto;
    }
}

function escaparHtmlTv(texto) {
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
