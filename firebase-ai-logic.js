import { initializeApp } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js";
import { GoogleAIBackend, getAI, getGenerativeModel } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-ai.js";
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-app-check.js";

window.firebaseAiLogicReady = (async function () {
    const config = window.firebaseConfigRiolando;
    const siteKey = window.firebaseAppCheckSiteKeyRiolando;
    if (!config) {
        throw new Error("A configuração Firebase não foi carregada.");
    }
    if (!siteKey) {
        throw new Error("Configure o App Check com reCAPTCHA v3 no Firebase para ativar a IA.");
    }

    const app = initializeApp(config, "firebase-ai-logic");
    initializeAppCheck(app, {
        provider: new ReCaptchaEnterpriseProvider(siteKey),
        isTokenAutoRefreshEnabled: true
    });

    const ai = getAI(app, { backend: new GoogleAIBackend() });
    const model = getGenerativeModel(ai, {
        model: "gemini-2.5-flash",
        generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 3000
        }
    });

    return {
        async generate({ tipo, prompt, contexto }) {
            const user = window.firebaseAuthRiolando?.currentUser;
            if (!user) {
                throw new Error("Entre na sua conta administradora para gerar conteúdo.");
            }

            let role;
            try {
                role = await window.firebaseDbRiolando
                    .collection("_roles_admin")
                    .doc(user.uid)
                    .get();
            } catch (error) {
                console.error("Erro ao verificar o perfil administrativo antes da geração:", error);
                throw new Error("Não foi possível validar sua permissão. Tente novamente.");
            }

            if (!role.exists || role.data().active !== true) {
                throw new Error("Somente uma conta administradora pode gerar conteúdo.");
            }

            const instrucoes = [
                "Você é um assistente pedagógico especializado em cursos técnicos, ensino médio e educação profissional.",
                "Ajude a criar materiais para alunos de ensino médio e curso técnico.",
                "Escreva em português do Brasil, com linguagem clara, objetiva e acolhedora.",
                "Organize o conteúdo com títulos e subtítulos, explique termos técnicos e use exemplos práticos.",
                tipo === "aula" && "Para aula, inclua título, objetivo, explicação, desenvolvimento, exemplos, atividade prática, fechamento e tarefa.",
                tipo === "plano" && "Para plano, inclua título, componente, turma, duração, objetivos, habilidades, recursos, metodologia, desenvolvimento, atividade, avaliação e observações pedagógicas.",
                tipo === "material" && "Para material, inclua título, explicação simples, exemplos, glossário, passo a passo, erros comuns, exercícios e desafio final.",
                tipo === "rubrica" && "Para rubrica, inclua critérios, níveis de desempenho, pontuação e descrições dos níveis excelente, suficiente e a melhorar."
            ].filter(Boolean).join("\n");
            const pedido = `${instrucoes}\n\nContexto do professor:\n${contexto || "Nenhum contexto adicional informado."}\n\nPedido:\n${prompt}`;

            try {
                const result = await model.generateContent(pedido);
                const conteudo = result.response.text();
                if (!conteudo || !conteudo.trim()) {
                    throw new Error("A IA não retornou conteúdo em texto.");
                }
                return conteudo;
            } catch (error) {
                console.error("Erro do Firebase AI Logic:", error);
                throw new Error(mensagemErroFirebaseAI(error));
            }
        }
    };
}()).catch(error => {
    console.error("Firebase AI Logic não foi inicializado:", error);
    throw error;
});

function mensagemErroFirebaseAI(error) {
    const code = String(error?.code || "");
    if (code.includes("app-check") || code.includes("appCheck")) {
        return "O App Check não autorizou esta solicitação. Confira o domínio e a configuração reCAPTCHA v3 no Firebase.";
    }
    if (code.includes("unauthenticated") || code.includes("permission-denied")) {
        return "O Firebase AI Logic recusou o acesso. Verifique a configuração do projeto e do App Check.";
    }
    if (code.includes("resource-exhausted") || code.includes("quota")) {
        return "A cota gratuita de IA foi atingida. Aguarde e tente novamente.";
    }
    return error?.message || "Não foi possível gerar conteúdo com o Firebase AI Logic.";
}
