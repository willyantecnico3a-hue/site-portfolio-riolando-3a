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
                error: "Variáveis de ambiente não configuradas."
            });
        }

        const agora = new Date();

        const hoje = formatarDataISO(agora);

        const eventos = await buscarEventosDeHoje(hoje);

        if (!eventos || eventos.length === 0) {
            return respostaJson(200, {
                message: "Nenhum evento para verificar."
            });
        }

        const assinaturas = await buscarAssinaturasPush();

        if (!assinaturas || assinaturas.length === 0) {
            return respostaJson(200, {
                message: "Nenhuma assinatura push ativa encontrada."
            });
        }

        let enviados = 0;
        let ignorados = 0;

        for (const evento of eventos) {
            const deveEnviar = await verificarSeDeveEnviarEvento(evento, agora);

            if (!deveEnviar.enviar) {
                ignorados++;
                continue;
            }

            const payload = JSON.stringify({
                title: "🔔 Lembrete da Agenda Riolando",
                body: `${evento.titulo} começa em ${deveEnviar.minutos} minuto(s).`,
                url: "/agenda.html"
            });

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
                } catch (erroPush) {
                    console.log("Erro ao enviar push:", erroPush.statusCode, erroPush.body);

                    if (erroPush.statusCode === 404 || erroPush.statusCode === 410) {
                        await desativarAssinatura(item.id);
                    }
                }
            }

            await registrarLogEnvio(evento);
        }

        return respostaJson(200, {
            message: "Verificação de agenda concluída.",
            enviados: enviados,
            ignorados: ignorados
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
    const url = `${SUPABASE_URL}/rest/v1/push_subscriptions?select=id,endpoint,p256dh,auth&ativo=eq.true`;

    const resposta = await fetch(url, {
        headers: headersSupabase()
    });

    if (!resposta.ok) {
        throw new Error("Erro ao buscar assinaturas: " + await resposta.text());
    }

    return await resposta.json();
}

async function verificarSeDeveEnviarEvento(evento, agora) {
    if (!evento.horario_inicio) {
        return {
            enviar: false,
            minutos: null
        };
    }

    const minutosAntes = Number(evento.lembrete_minutos || 10);

    if (minutosAntes <= 0) {
        return {
            enviar: false,
            minutos: null
        };
    }

    const dataHoraEvento = new Date(`${evento.data}T${evento.horario_inicio}`);
    const diferencaMs = dataHoraEvento.getTime() - agora.getTime();
    const diferencaMinutos = Math.round(diferencaMs / 60000);

    if (diferencaMinutos < 0 || diferencaMinutos > minutosAntes) {
        return {
            enviar: false,
            minutos: diferencaMinutos
        };
    }

    const chaveEnvio = montarChaveEvento(evento);

    const jaEnviado = await verificarLogExistente(chaveEnvio);

    if (jaEnviado) {
        return {
            enviar: false,
            minutos: diferencaMinutos
        };
    }

    return {
        enviar: true,
        minutos: diferencaMinutos
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
            "Prefer": "resolution=merge-duplicates"
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
            "Content-Type": "application/json"
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

function formatarDataISO(data) {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, "0");
    const dia = String(data.getDate()).padStart(2, "0");

    return `${ano}-${mes}-${dia}`;
}

function headersSupabase() {
    return {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
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