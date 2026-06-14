/* =====================================================
   CENTRAL PAEET - RIOLANDO CONECTA TÉCNICO
   ARQUIVO: central-paeet.js
   Versão: 20260614-02

   Funções:
   - Busca e filtro dos cards
   - Checklist local no navegador
   - Salvamento do checklist no Supabase
===================================================== */

const SUPABASE_URL_CENTRAL = "https://pwomyoprbvoimqmikvev.supabase.co";
const SUPABASE_KEY_CENTRAL = "sb_publishable_elGQyDU7ngaUHCLWIHLhDQ_IxiLo6kD";

let bancoCentral = null;

if (window.supabase) {
    bancoCentral = window.supabase.createClient(SUPABASE_URL_CENTRAL, SUPABASE_KEY_CENTRAL);
}

document.addEventListener("DOMContentLoaded", iniciarCentralPaeet);

async function iniciarCentralPaeet() {
    const acessoLiberado = await verificarAcessoAdministradorCentral();

    if (!acessoLiberado) {
        return;
    }

    configurarBuscaECategorias();
    carregarChecklistCentral();
    atualizarStatusChecklistCentral();
    configurarBotaoLimparChecklist();
}

async function verificarAcessoAdministradorCentral() {
    try {
        if (!bancoCentral) {
            bloquearCentralSemPermissao("Erro ao carregar conexão com o Supabase.");
            return false;
        }

        const { data: sessaoData, error: erroSessao } = await bancoCentral.auth.getSession();

        if (erroSessao || !sessaoData || !sessaoData.session) {
            bloquearCentralSemPermissao("Você precisa estar logado como administrador para acessar a Central PAEET.");
            return false;
        }

        const usuario = sessaoData.session.user;

        if (!usuario || !usuario.email) {
            bloquearCentralSemPermissao("Usuário administrativo não identificado.");
            return false;
        }

        const email = usuario.email.toLowerCase();

        const { data: admin, error: erroAdmin } = await bancoCentral
            .from("admins")
            .select("email")
            .ilike("email", email)
            .limit(1);

        if (erroAdmin || !admin || admin.length === 0) {
            bloquearCentralSemPermissao("Este usuário não possui permissão administrativa.");
            return false;
        }

        localStorage.setItem("adminEmail", email);

        return true;

    } catch (erro) {
        console.error("Erro ao verificar permissão administrativa:", erro);
        bloquearCentralSemPermissao("Erro ao validar acesso administrativo.");
        return false;
    }
}


function bloquearCentralSemPermissao(mensagem) {
    document.body.innerHTML = `
        <main class="container-central-paeet">
            <section class="card-aviso-central">
                <div class="icone-aviso-central">🔒</div>

                <div>
                    <h2>Acesso restrito</h2>
                    <p>${mensagem}</p>
                    <p>Faça login com uma conta administrativa para continuar.</p>
                    <a href="admin.html" class="btn-topo-central">Voltar para o login administrativo</a>
                </div>
            </section>
        </main>
    `;

    setTimeout(function () {
        window.location.href = "admin.html";
    }, 2500);
}


function configurarBuscaECategorias() {
    const campoBusca = document.getElementById("buscaCardCentral");
    const filtroCategoria = document.getElementById("filtroCategoriaCentral");

    if (campoBusca) {
        campoBusca.addEventListener("input", filtrarCardsCentral);
    }

    if (filtroCategoria) {
        filtroCategoria.addEventListener("change", filtrarCardsCentral);
    }
}


function filtrarCardsCentral() {
    const termo = normalizarTextoCentral(document.getElementById("buscaCardCentral")?.value || "");
    const categoria = document.getElementById("filtroCategoriaCentral")?.value || "todos";

    const cards = document.querySelectorAll(".card-central-paeet");
    let totalVisiveis = 0;

    removerMensagensSemResultado();

    cards.forEach(function (card) {
        const textoBusca = normalizarTextoCentral(
            `${card.textContent || ""} ${card.dataset.busca || ""}`
        );

        const categoriasCard = normalizarTextoCentral(card.dataset.categoria || "");
        const combinaBusca = !termo || textoBusca.includes(termo);
        const combinaCategoria = categoria === "todos" || categoriasCard.includes(normalizarTextoCentral(categoria));

        if (combinaBusca && combinaCategoria) {
            card.classList.remove("oculto");
            totalVisiveis++;
        } else {
            card.classList.add("oculto");
        }
    });

    if (totalVisiveis === 0) {
        inserirMensagemSemResultado();
    }
}


function inserirMensagemSemResultado() {
    const primeiraGrade = document.querySelector(".grade-cards-central");

    if (!primeiraGrade) {
        return;
    }

    const mensagem = document.createElement("div");
    mensagem.className = "mensagem-sem-resultados";
    mensagem.textContent = "Nenhum card encontrado para essa busca ou categoria.";
    mensagem.dataset.mensagemResultado = "true";

    primeiraGrade.appendChild(mensagem);
}


function removerMensagensSemResultado() {
    document.querySelectorAll("[data-mensagem-resultado='true']").forEach(function (mensagem) {
        mensagem.remove();
    });
}


function normalizarTextoCentral(texto) {
    return texto
        .toString()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();
}


/* =====================================================
   CHECKLIST LOCAL + SUPABASE
===================================================== */

function carregarChecklistCentral() {
    const checks = document.querySelectorAll("#checklistCentralPaeet input[type='checkbox']");

    checks.forEach(function (check) {
        const chave = criarChaveChecklist(check.dataset.check);
        const salvo = localStorage.getItem(chave);

        check.checked = salvo === "true";

        check.addEventListener("change", async function () {
            localStorage.setItem(chave, check.checked ? "true" : "false");
            atualizarStatusChecklistCentral();

            await salvarAcaoChecklistNoServidor(check);
        });
    });
}


async function salvarAcaoChecklistNoServidor(check) {
    const codigo = check.dataset.check;
    const descricao = check.dataset.descricao || check.closest("label")?.innerText?.trim() || codigo;
    const status = check.checked ? "concluido" : "pendente";

    atualizarMensagemServidorChecklist("Salvando ação no servidor...");

    if (!bancoCentral) {
        atualizarMensagemServidorChecklist("Supabase não carregou. A ação ficou salva apenas neste navegador.", true);
        return;
    }

    try {
        const usuario = await obterUsuarioAtualCentral();
        const email = usuario?.email || localStorage.getItem("adminEmail") || "nao_identificado@riolandoconecta.local";

        const hoje = formatarDataLocalCentral(new Date());
        const hora = formatarHoraLocalCentral(new Date());

        const registroExistente = await buscarRegistroChecklistDoDia(email, codigo, hoje);

        if (registroExistente) {
            const { error } = await bancoCentral
                .from("acoes_checklist_paeet")
                .update({
                    hora_acao: hora,
                    status: status,
                    item_descricao: descricao,
                    professor_nome: "Willyan Vieira da Cruz",
                    professor_email: email,
                    origem: "central_paeet"
                })
                .eq("id", registroExistente.id);

            if (error) {
                throw error;
            }

            atualizarMensagemServidorChecklist("Ação atualizada no servidor com sucesso.");
            return;
        }

        const { error } = await bancoCentral
            .from("acoes_checklist_paeet")
            .insert({
                data_acao: hoje,
                hora_acao: hora,
                professor_nome: "Willyan Vieira da Cruz",
                professor_email: email,
                item_codigo: codigo,
                item_descricao: descricao,
                status: status,
                origem: "central_paeet"
            });

        if (error) {
            throw error;
        }

        atualizarMensagemServidorChecklist("Ação salva no servidor com sucesso.");

    } catch (erro) {
        console.error("Erro ao salvar checklist PAEET:", erro);
        atualizarMensagemServidorChecklist(
            "Não foi possível salvar no servidor. Verifique se a tabela acoes_checklist_paeet foi criada e se o usuário está autenticado.",
            true
        );
    }
}


async function buscarRegistroChecklistDoDia(email, codigo, data) {
    const { data: registros, error } = await bancoCentral
        .from("acoes_checklist_paeet")
        .select("*")
        .eq("professor_email", email)
        .eq("item_codigo", codigo)
        .eq("data_acao", data)
        .order("created_at", { ascending: false })
        .limit(1);

    if (error) {
        console.warn("Não foi possível consultar registro existente:", error);
        return null;
    }

    return registros && registros.length > 0 ? registros[0] : null;
}


async function obterUsuarioAtualCentral() {
    try {
        const { data } = await bancoCentral.auth.getUser();
        return data?.user || null;
    } catch (erro) {
        return null;
    }
}


function atualizarStatusChecklistCentral() {
    const checks = Array.from(document.querySelectorAll("#checklistCentralPaeet input[type='checkbox']"));
    const total = checks.length;
    const concluidos = checks.filter(function (check) {
        return check.checked;
    }).length;

    const status = document.getElementById("statusChecklistCentral");

    if (status) {
        status.textContent = `${concluidos} de ${total} concluídos`;
    }
}


function configurarBotaoLimparChecklist() {
    const botao = document.getElementById("btnLimparChecklistCentral");

    if (!botao) {
        return;
    }

    botao.addEventListener("click", async function () {
        const confirmar = confirm("Deseja limpar o checklist da Central PAEET? Essa ação também registrará os itens como pendentes no servidor.");

        if (!confirmar) {
            return;
        }

        const checks = document.querySelectorAll("#checklistCentralPaeet input[type='checkbox']");

        for (const check of checks) {
            check.checked = false;
            localStorage.removeItem(criarChaveChecklist(check.dataset.check));
            await salvarAcaoChecklistNoServidor(check);
        }

        atualizarStatusChecklistCentral();
        atualizarMensagemServidorChecklist("Checklist limpo e atualizado no servidor.");
    });
}


function criarChaveChecklist(nome) {
    return `central_paeet_check_${nome}`;
}


function atualizarMensagemServidorChecklist(mensagem, erro = false) {
    const elemento = document.getElementById("statusServidorChecklistCentral");

    if (!elemento) {
        return;
    }

    elemento.textContent = mensagem;
    elemento.classList.toggle("erro", erro);
}


function formatarDataLocalCentral(data) {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, "0");
    const dia = String(data.getDate()).padStart(2, "0");

    return `${ano}-${mes}-${dia}`;
}


function formatarHoraLocalCentral(data) {
    const hora = String(data.getHours()).padStart(2, "0");
    const minuto = String(data.getMinutes()).padStart(2, "0");
    const segundo = String(data.getSeconds()).padStart(2, "0");

    return `${hora}:${minuto}:${segundo}`;
}
