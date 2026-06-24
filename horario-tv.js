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
            return inicio <= horaAtual && fim >= horaAtual;
        });
        const proximos = horarios.filter(function (item) {
            return formatarHorarioBancoTv(item.horario_inicio) > horaAtual;
        });
        const proximo = proximos.length > 0 ? proximos[0] : null;

        renderizarAulasAgoraTv(aulasAgora);
        renderizarProximoHorarioTv(proximo);
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

function renderizarProximoHorarioTv(aula) {
    const area = document.getElementById("proximoHorarioTv");

    if (!area) {
        return;
    }

    if (!aula) {
        area.innerHTML = `<p class="mensagem-tv">Não há próximos horários para hoje.</p>`;
        return;
    }

    area.innerHTML = montarCardAulaTv(aula);
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
