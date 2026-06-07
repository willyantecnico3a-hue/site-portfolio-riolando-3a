// =====================================================
// NETLIFY FUNCTION - GERAR CONTEÚDO COM DEEPSEEK
// =====================================================
//
// Esta função roda no backend da Netlify.
// A chave DEEPSEEK_API_KEY fica protegida nas variáveis
// de ambiente da Netlify, e não aparece no navegador.
//
// O admin.js continua chamando:
// /.netlify/functions/generate-content
//
// =====================================================

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

        const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

        if (!DEEPSEEK_API_KEY) {
            return {
                statusCode: 500,
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    error: "DEEPSEEK_API_KEY não configurada na Netlify."
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

        const systemPrompt = `
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
        `;

        const userPrompt = `
CONTEXTO ENVIADO PELO PROFESSOR:
${contexto || "Nenhum contexto adicional informado."}

PEDIDO DO PROFESSOR:
${promptProfessor}
        `;

        const resposta = await fetch("https://api.deepseek.com/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${DEEPSEEK_API_KEY}`
            },
            body: JSON.stringify({
                model: "deepseek-chat",
                messages: [
                    {
                        role: "system",
                        content: systemPrompt
                    },
                    {
                        role: "user",
                        content: userPrompt
                    }
                ],
                temperature: 0.7,
                max_tokens: 3500
            })
        });

        const dados = await resposta.json();

        if (!resposta.ok) {
            return {
                statusCode: resposta.status,
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    error: "Erro ao gerar conteúdo com DeepSeek.",
                    details: dados
                })
            };
        }

        const textoGerado =
            dados &&
            dados.choices &&
            dados.choices[0] &&
            dados.choices[0].message &&
            dados.choices[0].message.content
                ? dados.choices[0].message.content
                : "";

        if (!textoGerado) {
            return {
                statusCode: 500,
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    error: "A IA respondeu, mas não retornou conteúdo em texto.",
                    details: dados
                })
            };
        }

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
        console.error("Erro na função DeepSeek:", error);

        return {
            statusCode: 500,
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                error: "Erro interno ao gerar conteúdo com IA.",
                details: error.message
            })
        };
    }
};