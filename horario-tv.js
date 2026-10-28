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
const FILTRO_PROFESSORES_TEC_DS_TV = "__profs_tec_ds__";
const PROFESSORES_TEC_DS_TV = ["Willyan", "Jeronimo", "Ana Paula", "Gilberto", "Mauro"];
let cacheHorariosFirebaseTv = null;
let promessaHorariosFirebaseTv = null;
let cacheModoSemExpedienteFirebaseTv = null;
let modoSemExpedienteCarregadoFirebaseTv = false;
let promessaModoSemExpedienteFirebaseTv = null;
let pararObservacaoReservasSalasTv = null;
let dataObservadaReservasSalasTv = null;
let proximaTentativaReservasSalasTv = 0;

document.addEventListener("DOMContentLoaded", function () {
    atualizarPainelHorariosTv();
    configurarFiltroProfessorTv();
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
    await atualizarReservasSalasTv();

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

        const horarios = (await carregarHorariosFirebaseTv())
            .filter(function (item) {
                return item.dia_semana === diaSemana;
            })
            .sort(function (a, b) {
                return formatarHorarioBancoTv(a.horario_inicio).localeCompare(formatarHorarioBancoTv(b.horario_inicio));
            });
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
        preencherTextoTv("mensagemStatusTv", "Erro de conexão com o Firebase.");
    }
}

async function atualizarReservasSalasTv() {
    const lista = document.getElementById("listaReservasSalasTv");
    if (!lista) return;

    const firestore = typeof firebaseDbHorariosTv !== "undefined"
        ? firebaseDbHorariosTv
        : window.firebaseDbRiolando;
    if (!firestore) {
        lista.innerHTML = `<p class="mensagem-tv">Não foi possível conectar à agenda de salas.</p>`;
        return;
    }

    const hoje = new Date();
    const offset = hoje.getTimezoneOffset() * 60000;
    const dataHoje = new Date(hoje.getTime() - offset).toISOString().slice(0, 10);
    if (dataObservadaReservasSalasTv && dataObservadaReservasSalasTv !== dataHoje) {
        proximaTentativaReservasSalasTv = 0;
    }
    if (pararObservacaoReservasSalasTv && dataObservadaReservasSalasTv === dataHoje) return;
    if (Date.now() < proximaTentativaReservasSalasTv) return;

    if (pararObservacaoReservasSalasTv) pararObservacaoReservasSalasTv();
    dataObservadaReservasSalasTv = dataHoje;
    pararObservacaoReservasSalasTv = firestore.collection("reservas_salas")
        .where("data", ">=", dataHoje)
        .orderBy("data")
        .limit(300)
        .onSnapshot(function (consulta) {
            const todasReservas = consulta.docs
                .map(function (documento) {
                    return Object.assign({ id: documento.id }, documento.data());
                })
                .sort(function (a, b) {
                    return a.data.localeCompare(b.data)
                        || a.horario_inicio.localeCompare(b.horario_inicio)
                        || a.ambiente.localeCompare(b.ambiente);
                });
            proximaTentativaReservasSalasTv = 0;
            const maxReservasVisiveis = document.getElementById("filtroProfessorNomeTv") ? 1 : 2;
            const reservas = todasReservas.slice(0, maxReservasVisiveis);
            if (reservas.length === 0) {
                lista.innerHTML = `<p class="mensagem-tv">Nenhuma sala reservada nos próximos dias.</p>`;
                return;
            }

            lista.innerHTML = reservas.map(function (reserva) {
                return `
                    <article class="item-reserva-tv">
                        <div class="ambiente-reserva-tv">${escaparHtmlTv(reserva.ambiente)}</div>
                        <div class="detalhe-reserva-tv">
                            <strong>${formatarDataReservaTv(reserva.data)}</strong>
                            <span>${escaparHtmlTv(reserva.horario_inicio)} às ${escaparHtmlTv(reserva.horario_fim)}</span>
                            <span>Professor(a): ${escaparHtmlTv(reserva.professor)}</span>
                        </div>
                    </article>
                `;
            }).join("") + (todasReservas.length > reservas.length
                ? `<span class="mais-reservas-tv">+${todasReservas.length - reservas.length} reservas</span>`
                : "");
        }, function (error) {
            console.error("Erro ao carregar reservas de salas para a TV:", error);
            lista.innerHTML = `<p class="mensagem-tv">Não foi possível carregar a agenda de salas.</p>`;
            pararObservacaoReservasSalasTv = null;
            proximaTentativaReservasSalasTv = Date.now() + 5 * 60 * 1000;
        });
}

function formatarDataReservaTv(value) {
    if (!value) return "Data não informada";
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day).toLocaleDateString("pt-BR", {
        weekday: "short",
        day: "2-digit",
        month: "2-digit"
    });
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
    if (modoSemExpedienteCarregadoFirebaseTv) {
        return cacheModoSemExpedienteFirebaseTv;
    }

    if (promessaModoSemExpedienteFirebaseTv) {
        return promessaModoSemExpedienteFirebaseTv;
    }

    promessaModoSemExpedienteFirebaseTv = new Promise(function (resolve, reject) {
        let primeiraLeitura = true;

        firebaseDbHorariosTv
            .collection("site_settings")
            .doc("riolando_sem_expediente")
            .onSnapshot(function (documento) {
                const valor = documento.exists ? documento.data().valor : false;
                cacheModoSemExpedienteFirebaseTv = valor === true || valor === "true";
                modoSemExpedienteCarregadoFirebaseTv = true;

                if (primeiraLeitura) {
                    primeiraLeitura = false;
                    resolve(cacheModoSemExpedienteFirebaseTv);
                }
            }, function (erro) {
                console.error("Erro ao observar modo sem expediente no Firebase:", erro);
                modoSemExpedienteCarregadoFirebaseTv = false;
                promessaModoSemExpedienteFirebaseTv = null;

                if (primeiraLeitura) {
                    primeiraLeitura = false;
                    reject(erro);
                }
            });
    });

    return promessaModoSemExpedienteFirebaseTv;
}

async function carregarHorariosFirebaseTv() {
    if (cacheHorariosFirebaseTv !== null) {
        return cacheHorariosFirebaseTv;
    }

    if (promessaHorariosFirebaseTv) {
        return promessaHorariosFirebaseTv;
    }

    promessaHorariosFirebaseTv = new Promise(function (resolve, reject) {
        let primeiraLeitura = true;

        firebaseDbHorariosTv.collection("horarios_aulas").where("ativo", "==", true).onSnapshot(function (consulta) {
            cacheHorariosFirebaseTv = consulta.docs
                .map(function (documento) {
                    return Object.assign({ id: documento.id }, documento.data());
                })
                .filter(function (horario) {
                    return horario.ativo === true;
                });

            if (primeiraLeitura) {
                primeiraLeitura = false;
                resolve(cacheHorariosFirebaseTv);
            }
        }, function (erro) {
            console.error("Erro ao observar horários no Firebase:", erro);
            cacheHorariosFirebaseTv = null;
            promessaHorariosFirebaseTv = null;

            if (primeiraLeitura) {
                primeiraLeitura = false;
                reject(erro);
            }
        });
    });

    return promessaHorariosFirebaseTv;
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

function configurarFiltroProfessorTv() {
    const campoNome = document.getElementById("filtroProfessorNomeTv");
    const campoDia = document.getElementById("filtroProfessorDiaTv");
    const btnFiltrar = document.getElementById("btnFiltrarProfessorTv");
    const btnLimpar = document.getElementById("btnLimparFiltroProfessorTv");

    if (!campoNome || !campoDia || !btnFiltrar) {
        return;
    }

    const nomeSalvo = localStorage.getItem("filtroProfessorNomeTv") || "";
    const diaSalvo = localStorage.getItem("filtroProfessorDiaTv") || "";

    carregarListaProfessoresFiltroTv(nomeSalvo);
    campoDia.value = diaSalvo;

    btnFiltrar.addEventListener("click", filtrarAulasProfessorTv);
    campoNome.addEventListener("change", function () {
        if (campoNome.value) {
            filtrarAulasProfessorTv();
        }
    });
    campoDia.addEventListener("change", function () {
        if (campoNome.value) {
            filtrarAulasProfessorTv();
        }
    });

    if (btnLimpar) {
        btnLimpar.addEventListener("click", limparFiltroProfessorTv);
    }

}

async function carregarListaProfessoresFiltroTv(nomeSelecionado) {
    const campoNome = document.getElementById("filtroProfessorNomeTv");

    if (!campoNome) {
        return;
    }

    try {
        const professores = [];
        const nomesUnicos = new Set();

        (await carregarHorariosFirebaseTv()).forEach(function (item) {
            const nome = (item.professor || "").trim();
            const chave = normalizarTextoBuscaTv(nome);

            if (nome && !nomesUnicos.has(chave)) {
                nomesUnicos.add(chave);
                professores.push(nome);
            }
        });

        professores.sort(function (a, b) {
            return a.localeCompare(b, "pt-BR");
        });

        campoNome.innerHTML = `<option value="">Selecione o professor</option>`;

        const opcaoProfessoresTecDs = document.createElement("option");
        opcaoProfessoresTecDs.value = FILTRO_PROFESSORES_TEC_DS_TV;
        opcaoProfessoresTecDs.textContent = "Profs Tec. D.S";
        campoNome.appendChild(opcaoProfessoresTecDs);

        professores.forEach(function (nome) {
            const opcao = document.createElement("option");
            opcao.value = nome;
            opcao.textContent = nome;
            campoNome.appendChild(opcao);
        });

        if (nomeSelecionado) {
            const existeSelecionado = nomeSelecionado === FILTRO_PROFESSORES_TEC_DS_TV || professores.some(function (nome) {
                return normalizarTextoBuscaTv(nome) === normalizarTextoBuscaTv(nomeSelecionado);
            });

            if (!existeSelecionado) {
                const opcaoSalva = document.createElement("option");
                opcaoSalva.value = nomeSelecionado;
                opcaoSalva.textContent = nomeSelecionado;
                campoNome.appendChild(opcaoSalva);
            }

            campoNome.value = nomeSelecionado;
            filtrarAulasProfessorTv();
        }
    } catch (erro) {
        console.log("Erro ao carregar lista de professores:", erro);
        campoNome.innerHTML = `<option value="">Erro ao carregar professores</option>`;
    }
}

async function filtrarAulasProfessorTv() {
    const campoNome = document.getElementById("filtroProfessorNomeTv");
    const campoDia = document.getElementById("filtroProfessorDiaTv");
    const resultado = document.getElementById("resultadoFiltroProfessorTv");

    if (!campoNome || !campoDia || !resultado) {
        return;
    }

    const professor = campoNome.value.trim();
    const dia = campoDia.value;

    if (!professor) {
        resultado.innerHTML = `<p class="mensagem-tv">Selecione o professor para consultar.</p>`;
        return;
    }

    localStorage.setItem("filtroProfessorNomeTv", professor);
    localStorage.setItem("filtroProfessorDiaTv", dia);
    resultado.innerHTML = `<p class="mensagem-tv">Consultando aulas...</p>`;

    try {
        const filtroGrupoTecDs = professor === FILTRO_PROFESSORES_TEC_DS_TV;
        const horarios = await carregarHorariosFirebaseTv();

        const aulasEncontradas = filtroGrupoTecDs
            ? horarios.filter(function (aula) {
                return professorPertenceAoTecnicoDsTv(aula.professor);
            })
            : horarios.filter(function (aula) {
                return normalizarTextoBuscaTv(aula.professor).includes(normalizarTextoBuscaTv(professor));
            });
        const aulasFiltradas = dia
            ? aulasEncontradas.filter(function (aula) {
                return aula.dia_semana === dia;
            })
            : aulasEncontradas;
        const aulasOrdenadas = ordenarAulasPorDiaEHorarioTv(aulasFiltradas);

        if (aulasOrdenadas.length === 0) {
            resultado.innerHTML = `<p class="mensagem-tv">Nenhuma aula encontrada para esse filtro.</p>`;
            return;
        }

        resultado.innerHTML = aulasOrdenadas.map(montarCardAulaFiltroProfessorTv).join("");
    } catch (erro) {
        console.log("Erro ao filtrar aulas do professor:", erro);
        resultado.innerHTML = `<p class="mensagem-tv">Erro ao consultar aulas. Tente novamente.</p>`;
    }
}

function limparFiltroProfessorTv() {
    const campoNome = document.getElementById("filtroProfessorNomeTv");
    const campoDia = document.getElementById("filtroProfessorDiaTv");
    const resultado = document.getElementById("resultadoFiltroProfessorTv");

    if (campoNome) {
        campoNome.value = "";
    }

    if (campoDia) {
        campoDia.value = "";
    }

    localStorage.removeItem("filtroProfessorNomeTv");
    localStorage.removeItem("filtroProfessorDiaTv");

    if (resultado) {
        resultado.innerHTML = `<p class="mensagem-tv">Selecione seu nome para consultar suas aulas.</p>`;
    }
}

function normalizarTextoBuscaTv(texto) {
    return (texto || "")
        .toString()
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
}

function professorPertenceAoTecnicoDsTv(nomeProfessor) {
    const nomeNormalizado = normalizarTextoBuscaTv(nomeProfessor);

    return PROFESSORES_TEC_DS_TV.some(function (nome) {
        return nomeNormalizado.includes(normalizarTextoBuscaTv(nome));
    });
}

function ordenarAulasPorDiaEHorarioTv(aulas) {
    const ordemDias = {
        segunda: 1,
        terca: 2,
        quarta: 3,
        quinta: 4,
        sexta: 5
    };

    return aulas.slice().sort(function (a, b) {
        const diaA = ordemDias[a.dia_semana] || 99;
        const diaB = ordemDias[b.dia_semana] || 99;

        if (diaA !== diaB) {
            return diaA - diaB;
        }

        return formatarHorarioBancoTv(a.horario_inicio).localeCompare(formatarHorarioBancoTv(b.horario_inicio));
    });
}

function montarCardAulaFiltroProfessorTv(aula) {
    return `
        <article class="card-aula-tv">
            <span class="dia-card-filtro-professor">${escaparHtmlTv(nomesDiasTv[aula.dia_semana] || aula.dia_semana || "Dia nao informado")}</span>
            <h3>${escaparHtmlTv(aula.professor || "Professor nao informado")}</h3>
            <span class="horario">${formatarHorarioBancoTv(aula.horario_inicio)} as ${formatarHorarioBancoTv(aula.horario_fim)}</span>
            <div class="info-aula-tv">
                <div><strong>Turma:</strong> ${escaparHtmlTv(aula.turma || "-")}</div>
                <div><strong>Disciplina:</strong> ${escaparHtmlTv(aula.disciplina || "Nao informada")}</div>
                <div><strong>Ambiente:</strong> ${escaparHtmlTv(aula.ambiente || "Nao informado")}</div>
            </div>
        </article>
    `;
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
