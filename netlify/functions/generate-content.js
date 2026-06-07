// =====================================================
// NETLIFY FUNCTION - GERAR CONTEÚDO COM GEMINI
// =====================================================
//
// Esta função roda no backend da Netlify.
// A chave GEMINI_API_KEY fica protegida nas variáveis
// de ambiente da Netlify, e não aparece no navegador.
//
// O admin.js chama esta função pelo endereço:
// /.netlify/functions/generate-content
//
// =====================================================

const { GoogleGenerativeAI } = require("@google/generative-ai");

exports.handler = async function (event) {
    try {
        if (event.httpMethod !== "POST") {
            return {
                statusCode: 405,
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    error: "Método não permitido. Use POST."
                })
            };
        }

        const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

        if (!GEMINI_API_KEY) {
            return {
                statusCode: 500,
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    error: "GEMINI_API_KEY não configurada na Netlify."
                })
            };
        }

        const body = JSON.parse(event.body || "{}");

        const tipo = body.tipo || "aula";
        const promptProfessor = body.prompt || "";
        const contexto = body.contexto || "";

        if (!promptProfessor.trim()) {
            return {
                statusCode: 400,
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    error: "Digite um pedido para a IA."
                })
            };
        }

        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

        // IMPORTANTE:
        // O modelo gemini-1.5-flash está retornando 404 no endpoint atual.
        // Por isso usamos gemini-2.0-flash.
        const model = genAI.getGenerativeModel({
            model: "gemini-2.0-flash"
        });

        const promptSistema = `
Você é um assistente pedagógico especializado em cursos técnicos, ensino médio e educação profissional.

Você ajuda o professor Willyan Vieira, da Escola PEI Professor Riolando Canno, a criar aulas, planos de aula, materiais de apoio, glossários, rubricas e atividades para alunos do curso técnico.

Sempre escreva em português do Brasil, com linguagem clara, objetiva, acolhedora e adequada para estudantes do ensino médio/técnico.

Tipo de conteúdo solicitado: ${tipo}

REGRAS GERAIS:
- Organize a resposta com títulos e subtítulos.
- Explique termos técnicos de forma simples.
- Use exemplos práticos.
- Conecte o conteúdo ao cotidiano dos alunos.
- Evite linguagem excessivamente difícil.
- Quando usar termo técnico, explique o significado.
- Produza conteúdo pronto para o professor revisar e usar.

SE O TIPO FOR "aula":
Crie uma aula completa com:
1. Título da aula
2. Objetivo
3. Explicação inicial
4. Desenvolvimento do conteúdo
5. Exemplos práticos
6. Atividade prática
7. Fechamento
8. Sugestão de tarefa

SE O TIPO FOR "plano":
Crie um plano de aula com:
1. Título
2. Componente curricular
3. Turma
4. Duração
5. Objetivos
6. Habilidades ou competências
7. Recursos necessários
8. Metodologia
9. Desenvolvimento da aula
10. Atividade prática
11. Avaliação
12. Observações para registro pedagógico

SE O TIPO FOR "material":
Crie um material de apoio para o aluno com:
1. Título
2. Explicação simples
3. Exemplos práticos
4. Glossário de termos técnicos
5. Passo a passo da atividade
6. Dicas para evitar erros comuns
7. Exercícios
8. Desafio final

SE O TIPO FOR "rubrica":
Crie uma rubrica de avaliação com:
1. Critérios avaliativos
2. Níveis de desempenho
3. Pontuação sugerida
4. O que caracteriza desempenho excelente
5. O que caracteriza desempenho suficiente
6. O que precisa melhorar

CONTEXTO ENVIADO PELO PROFESSOR:
${contexto}

PEDIDO DO PROFESSOR:
${promptProfessor}
        `;

        const result = await model.generateContent(promptSistema);

        const response = await result.response;

        const textoGerado = response.text();

        return {
            statusCode: 200,
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                sucesso: true,
                tipo: tipo,
                conteudo: textoGerado
            })
        };

    } catch (error) {
        console.error("Erro na função Gemini:", error);

        return {
            statusCode: 500,
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                error: "Erro ao gerar conteúdo com IA.",
                details: error.message
            })
        };
    }
};