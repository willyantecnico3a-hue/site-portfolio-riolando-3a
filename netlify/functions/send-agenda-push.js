const webpush = require("web-push");

const SUPABASE_URL = "https://pwomyoprbvoimqmikvev.supabase.co";

const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const SITE_URL = process.env.SITE_URL || "https://riolandoconectatecnico.netlify.app";

webpush.setVapidDetails(
    "mailto:willyancruz@prof.educacao.sp.gov.br",
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
);

exports.handler = async function () {
    try {
        if (!SUPABASE_SERVICE_ROLE_KEY || !VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
            return respostaJson(500, {
                error: "Variáveis de ambiente não configuradas.",
                dica: "Confira VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY e SUPABASE_SERVICE_ROLE_KEY no Netlify."
            });
        }

        const agoraBrasil = obterAgoraBrasil();
        const hoje = agoraBrasil.data;

        const eventos = await buscarEventosDeHoje(hoje);

        if (!eventos || eventos.length === 0) {
            return respostaJson(200, {
                message: "Nenhum evento para verificar.",
                agora_brasil: agoraBrasil
            });
        }

        const assinaturas = await buscarAssinaturasPush();

        if (!assinaturas || assinaturas.length === 0) {
            return respostaJson(200, {
                message: "Nenhuma assinatura push ativa encontrada.",
                eventos_encontrados: eventos.length,
                agora_brasil: agoraBrasil
            });
        }

        let enviados = 0;
        let ignorados = 0;
        let errosPush = 0;
        let detalhes = [];

        for (const evento of eventos) {
            const deveEnviar = await verificarSeDeveEnviarEvento(evento, agoraBrasil);

            if (!deveEnviar.enviar) {
                ignorados++;

                detalhes.push({
                    evento_id: evento.id,
                    titulo: evento.titulo,
                    data: evento.data,
                    horario_inicio: evento.horario_inicio,
                    lembrete_minutos: evento.lembrete_minutos,
                    agora_brasil: agoraBrasil,
                    motivo: deveEnviar.motivo || "Evento fora da janela de envio",
                    minutos_faltando: deveEnviar.minutos
                });

                continue;
            }

            const payload = JSON.stringify({
                title: "🔔 Lembrete da Agenda Riolando",
                body: `${evento.titulo} começa em ${deveEnviar.minutos} minuto(s).`,
                url: `${SITE_URL}/agenda.html`
            });

            let enviadosNesteEvento = 0;

            for (const item of assinaturas) {
                const subscription = {
                    endpoint: item.endpoint,
                    keys: {
                        p256dh: item.p256dh,
                        auth: item.auth
                    }
                };

                try {
                    await webpush.sendNotification(subscription, payload);
                    enviados++;
                    enviadosNesteEvento++;
                } catch (erroPush) {
                    errosPush++;

                    console.log("Erro ao enviar push:", {
                        statusCode: erroPush.statusCode,
                        body: erroPush.body
                    });

                    if (erroPush.statusCode === 404 || erroPush.statusCode === 410) {
                        await desativarAssinatura(item.id);
                    }
                }
            }

            await registrarLogEnvio(evento);

            detalhes.push({
                evento_id: evento.id,
                titulo: evento.titulo,
                data: evento.data,
                horario_inicio: evento.horario_inicio,
                lembrete_minutos: evento.lembrete_minutos,
                agora_brasil: agoraBrasil,
                motivo: "Notificação enviada",
                minutos_faltando: deveEnviar.minutos,
                enviados_neste_evento: enviadosNesteEvento
            });
        }

        return respostaJson(200, {
            message: "Verificação de agenda concluída.",
            agora_brasil: agoraBrasil,
            eventos_encontrados: eventos.length,
            assinaturas_ativas: assinaturas.length,
            enviados: enviados,
            ignorados: ignorados,
            erros_push: errosPush,
            detalhes: detalhes
        });

    } catch (erro) {
        console.log("Erro geral:", erro);

        return respostaJson(500, {
            error: erro.message
        });
    }
};

async function buscarEventosDeHoje(hoje) {
    const url = `${SUPABASE_URL}/rest/v1/eventos?select=id,titulo,data,horario_inicio,lembrete_minutos&data=eq.${hoje}`;

    const resposta = await fetch(url, {
        headers: headersSupabase()
    });

    if (!resposta.ok) {
        throw new Error("Erro ao buscar eventos: " + await resposta.text());
    }

    return await resposta.json();
}

async function buscarAssinaturasPush() {
    const url = `${SUPABASE_URL}/rest/v1/push_subscriptions?select=id,endpoint,p256dh,auth,ativo&ativo=eq.true`;

    const resposta = await fetch(url, {
        headers: headersSupabase()
    });

    if (!resposta.ok) {
        throw new Error("Erro ao buscar assinaturas: " + await resposta.text());
    }

    return await resposta.json();
}

async function verificarSeDeveEnviarEvento(evento, agoraBrasil) {
    if (!evento.horario_inicio) {
        return {
            enviar: false,
            minutos: null,
            motivo: "Evento sem horário de início"
        };
    }

    const minutosAntes = Number(evento.lembrete_minutos || 10);

    if (minutosAntes <= 0) {
        return {
            enviar: false,
            minutos: null,
            motivo: "Evento está sem lembrete ou lembrete está zerado"
        };
    }

    const horarioEvento = evento.horario_inicio.toString().substring(0, 5);

    const minutosAgora = converterHorarioParaMinutos(agoraBrasil.hora);
    const minutosEvento = converterHorarioParaMinutos(horarioEvento);

    const diferencaMinutos = minutosEvento - minutosAgora;

    if (diferencaMinutos < 0) {
        return {
            enviar: false,
            minutos: diferencaMinutos,
            motivo: "Horário do evento já passou"
        };
    }

    if (diferencaMinutos > minutosAntes) {
        return {
            enviar: false,
            minutos: diferencaMinutos,
            motivo: "Ainda não está dentro do tempo do lembrete"
        };
    }

    const chaveEnvio = montarChaveEvento(evento);

    const jaEnviado = await verificarLogExistente(chaveEnvio);

    if (jaEnviado) {
        return {
            enviar: false,
            minutos: diferencaMinutos,
            motivo: "Esse evento já foi enviado antes e está registrado em push_agenda_logs"
        };
    }

    return {
        enviar: true,
        minutos: diferencaMinutos,
        motivo: "Dentro da janela de envio"
    };
}

async function verificarLogExistente(chaveEnvio) {
    const url = `${SUPABASE_URL}/rest/v1/push_agenda_logs?select=id&chave_envio=eq.${encodeURIComponent(chaveEnvio)}&limit=1`;

    const resposta = await fetch(url, {
        headers: headersSupabase()
    });

    if (!resposta.ok) {
        throw new Error("Erro ao verificar log: " + await resposta.text());
    }

    const data = await resposta.json();

    return data && data.length > 0;
}

async function registrarLogEnvio(evento) {
    const chaveEnvio = montarChaveEvento(evento);

    const resposta = await fetch(`${SUPABASE_URL}/rest/v1/push_agenda_logs`, {
        method: "POST",
        headers: {
            ...headersSupabase(),
            "Content-Type": "application/json",
            "Prefer": "return=minimal"
        },
        body: JSON.stringify({
            evento_id: evento.id,
            data_evento: evento.data,
            horario_inicio: evento.horario_inicio,
            chave_envio: chaveEnvio
        })
    });

    if (!resposta.ok) {
        console.log("Erro ao registrar log:", await resposta.text());
    }
}

async function desativarAssinatura(id) {
    const resposta = await fetch(`${SUPABASE_URL}/rest/v1/push_subscriptions?id=eq.${id}`, {
        method: "PATCH",
        headers: {
            ...headersSupabase(),
            "Content-Type": "application/json",
            "Prefer": "return=minimal"
        },
        body: JSON.stringify({
            ativo: false,
            atualizado_em: new Date().toISOString()
        })
    });

    if (!resposta.ok) {
        console.log("Erro ao desativar assinatura:", await resposta.text());
    }
}

function montarChaveEvento(evento) {
    return `${evento.id}-${evento.data}-${evento.horario_inicio}`;
}

function obterAgoraBrasil() {
    const partes = new Intl.DateTimeFormat("pt-BR", {
        timeZone: "America/Sao_Paulo",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
    }).formatToParts(new Date());

    const mapa = {};

    partes.forEach(function (parte) {
        mapa[parte.type] = parte.value;
    });

    let hora = mapa.hour;

    if (hora === "24") {
        hora = "00";
    }

    return {
        data: `${mapa.year}-${mapa.month}-${mapa.day}`,
        hora: `${hora}:${mapa.minute}`
    };
}

function converterHorarioParaMinutos(horario) {
    if (!horario || typeof horario !== "string") {
        return 0;
    }

    const partes = horario.split(":");
    const horas = Number(partes[0] || 0);
    const minutos = Number(partes[1] || 0);

    return horas * 60 + minutos;
}

function headersSupabase() {
    return {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        Accept: "application/json"
    };
}

function respostaJson(statusCode, body) {
    return {
        statusCode: statusCode,
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(body)
    };
}