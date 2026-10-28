const { cert, getApps, initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore } = require("firebase-admin/firestore");

const FIREBASE_PROJECT_ID = "horariosprofsriolandocanno";
const ALLOWED_ORIGINS = new Set([
    "https://horariosprofsriolandocanno.web.app",
    "https://horariosprofsriolandocanno.firebaseapp.com"
]);
const ALLOWED_TYPES = new Set(["aula", "plano", "material", "rubrica"]);
const MAX_PROMPT_LENGTH = 4000;
const MAX_CONTEXT_LENGTH = 8000;

exports.handler = async function (event) {
    const requestHeaders = event.headers || {};
    const origin = requestHeaders.origin || requestHeaders.Origin || "";
    const headers = {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store"
    };

    if (ALLOWED_ORIGINS.has(origin)) {
        headers["Access-Control-Allow-Origin"] = origin;
        headers["Access-Control-Allow-Headers"] = "Authorization, Content-Type";
        headers["Access-Control-Allow-Methods"] = "POST, OPTIONS";
        headers.Vary = "Origin";
    }

    const respond = (statusCode, body) => ({
        statusCode,
        headers,
        body: JSON.stringify(body)
    });

    if (origin && !ALLOWED_ORIGINS.has(origin)) {
        return respond(403, { error: "Origem não autorizada." });
    }
    if (event.httpMethod === "OPTIONS") {
        return { statusCode: 204, headers, body: "" };
    }
    if (event.httpMethod !== "POST") {
        return respond(405, { error: "Método não permitido. Use POST." });
    }

    try {
        const user = await verificarAdministrador(requestHeaders);
        const apiKey = process.env.OPENROUTER_API_KEY;
        if (!apiKey) {
            console.error("OPENROUTER_API_KEY não está configurada na Netlify.");
            return respond(503, { error: "O serviço de IA ainda não está configurado no servidor." });
        }

        let body;
        try {
            body = JSON.parse(event.body || "{}");
        } catch {
            return respond(400, { error: "O pedido não contém JSON válido." });
        }
        if (!body || typeof body !== "object" || Array.isArray(body)) {
            return respond(400, { error: "O pedido precisa ser um objeto JSON válido." });
        }

        const tipo = String(body.tipo || "aula").trim().toLowerCase();
        const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
        const contexto = typeof body.contexto === "string" ? body.contexto.trim() : "";
        if (!ALLOWED_TYPES.has(tipo)) return respond(400, { error: "Tipo de conteúdo inválido." });
        if (!prompt) return respond(400, { error: "Digite um pedido para a IA." });
        if (prompt.length > MAX_PROMPT_LENGTH || contexto.length > MAX_CONTEXT_LENGTH) {
            return respond(400, { error: "O pedido ou o contexto excede o limite permitido." });
        }

        const systemPrompt = `
Você é um assistente pedagógico especializado em cursos técnicos, ensino médio e educação profissional.
Ajude o professor Willyan Vieira, da Escola PEI Professor Riolando Canno, a criar aulas, planos de aula, materiais de apoio, glossários, rubricas e atividades para alunos do curso técnico.
Sempre escreva em português do Brasil, com linguagem clara, objetiva, acolhedora e adequada para estudantes do ensino médio/técnico.
Organize a resposta com títulos e subtítulos, explique termos técnicos de forma simples, use exemplos práticos conectados ao cotidiano dos alunos e produza conteúdo pronto para o professor revisar.

Tipo solicitado: ${tipo}

Para aula, inclua título, objetivo, explicação, desenvolvimento, exemplos, atividade prática, fechamento e tarefa.
Para plano, inclua título, componente, turma, duração, objetivos, habilidades, recursos, metodologia, desenvolvimento, atividade, avaliação e observações pedagógicas.
Para material, inclua título, explicação, exemplos, glossário, passo a passo, erros comuns, exercícios e desafio final.
Para rubrica, inclua critérios, níveis de desempenho, pontuação e descrições dos níveis excelente, suficiente e a melhorar.
        `.trim();

        const resposta = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            signal: AbortSignal.timeout(60000),
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`,
                "HTTP-Referer": "https://horariosprofsriolandocanno.web.app",
                "X-OpenRouter-Title": "Portal de Aulas Riolando Canno"
            },
            body: JSON.stringify({
                model: "openrouter/free",
                messages: [
                    { role: "system", content: systemPrompt },
                    {
                        role: "user",
                        content: `CONTEXTO DO PROFESSOR:\n${contexto || "Nenhum contexto adicional informado."}\n\nPEDIDO:\n${prompt}`
                    }
                ],
                temperature: 0.7,
                max_tokens: 3000
            })
        });

        let dados;
        try {
            dados = await resposta.json();
        } catch {
            console.error("OpenRouter retornou resposta não JSON.", { status: resposta.status, uid: user.uid });
            return respond(502, { error: "O provedor de IA retornou uma resposta inválida. Tente novamente." });
        }

        if (!resposta.ok) {
            const mensagens = {
                401: "A chave do provedor de IA está inválida. Avise o administrador do site.",
                402: "O provedor de IA está sem créditos disponíveis.",
                429: "O limite de solicitações de IA foi atingido. Aguarde e tente novamente."
            };
            const status = resposta.status >= 400 && resposta.status < 500 ? resposta.status : 502;
            console.error("OpenRouter recusou a solicitação.", { status: resposta.status, uid: user.uid });
            return respond(status, {
                error: mensagens[resposta.status] || "Não foi possível gerar conteúdo com o provedor de IA."
            });
        }

        const conteudo = dados?.choices?.[0]?.message?.content;
        if (typeof conteudo !== "string" || !conteudo.trim()) {
            console.error("OpenRouter não retornou conteúdo de texto.", { uid: user.uid, tipo });
            return respond(502, { error: "A IA não retornou conteúdo em texto. Tente novamente." });
        }

        return respond(200, { sucesso: true, tipo, conteudo });
    } catch (error) {
        if (error.statusCode) return respond(error.statusCode, { error: error.message });
        console.error("Erro na função Netlify de geração de conteúdo:", error);
        if (error.name === "TimeoutError" || error.name === "AbortError") {
            return respond(504, { error: "A geração demorou demais. Tente novamente." });
        }
        return respond(500, { error: "Erro interno ao gerar conteúdo com IA." });
    }
};

async function verificarAdministrador(requestHeaders) {
    const authorization = requestHeaders.authorization || requestHeaders.Authorization || "";
    if (!authorization.startsWith("Bearer ")) {
        throw criarErro(401, "Faça login novamente para usar a geração por IA.");
    }

    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!serviceAccountJson) {
        console.error("FIREBASE_SERVICE_ACCOUNT não está configurada na Netlify.");
        throw criarErro(503, "O servidor de IA ainda não está configurado.");
    }

    let serviceAccount;
    try {
        serviceAccount = JSON.parse(serviceAccountJson);
    } catch {
        console.error("FIREBASE_SERVICE_ACCOUNT contém JSON inválido.");
        throw criarErro(503, "A configuração de autenticação do servidor está inválida.");
    }
    if (serviceAccount.project_id !== FIREBASE_PROJECT_ID || typeof serviceAccount.private_key !== "string") {
        console.error("FIREBASE_SERVICE_ACCOUNT não corresponde ao projeto esperado.");
        throw criarErro(503, "A configuração de autenticação do servidor está inválida.");
    }

    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, "\n");
    const app = getApps().find(item => item.name === "netlify-ai") || initializeApp({
        credential: cert(serviceAccount),
        projectId: FIREBASE_PROJECT_ID
    }, "netlify-ai");

    let decodedToken;
    try {
        decodedToken = await getAuth(app).verifyIdToken(authorization.slice("Bearer ".length).trim());
    } catch {
        throw criarErro(401, "Sua sessão expirou. Entre novamente.");
    }

    const role = await getFirestore(app)
        .collection("_roles_admin")
        .doc(decodedToken.uid)
        .get();
    if (!role.exists || role.data().active !== true) {
        throw criarErro(403, "Somente uma conta administradora pode gerar conteúdo.");
    }

    return { uid: decodedToken.uid };
}

function criarErro(statusCode, message) {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
}
