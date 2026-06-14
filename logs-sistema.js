async function registrarLogSistema(config) {
    try {
        if (!window.supabase || !banco) {
            console.warn("Supabase não disponível para registrar log.");
            return;
        }

        const { data: userData } = await banco.auth.getUser();
        const usuario = userData?.user || null;

        const registroLog = {
            usuario_id: usuario?.id || null,
            usuario_email: usuario?.email || localStorage.getItem("adminEmail") || null,
            usuario_nome: config.usuario_nome || null,
            usuario_funcao: config.usuario_funcao || null,

            origem_pagina: config.origem_pagina || window.location.pathname,
            modulo: config.modulo || "geral",
            acao: config.acao || "acao_nao_informada",
            tipo_evento: config.tipo_evento || null,

            tabela_afetada: config.tabela_afetada || null,
            registro_id: config.registro_id || null,

            descricao: config.descricao || "Ação registrada no sistema.",

            dados_anteriores: config.dados_anteriores || null,
            dados_novos: config.dados_novos || null,
            detalhes: config.detalhes || null,

            user_agent: navigator.userAgent,
            status: config.status || "sucesso"
        };

        const { error } = await banco
            .from("logs_sistema")
            .insert(registroLog);

        if (error) {
            console.warn("Erro ao registrar log:", error);
        }

    } catch (erro) {
        console.warn("Falha inesperada ao registrar log:", erro);
    }
}