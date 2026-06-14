/* =====================================================
   CENTRAL PAEET - RIOLANDO CONECTA TÉCNICO
   ARQUIVO: central-paeet.js
===================================================== */

document.addEventListener("DOMContentLoaded", iniciarCentralPaeet);

function iniciarCentralPaeet() {
    configurarBuscaECategorias();
    carregarChecklistCentral();
    atualizarStatusChecklistCentral();
    configurarBotaoLimparChecklist();
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
   CHECKLIST LOCAL
===================================================== */

function carregarChecklistCentral() {
    const checks = document.querySelectorAll("#checklistCentralPaeet input[type='checkbox']");

    checks.forEach(function (check) {
        const chave = criarChaveChecklist(check.dataset.check);
        const salvo = localStorage.getItem(chave);

        check.checked = salvo === "true";

        check.addEventListener("change", function () {
            localStorage.setItem(chave, check.checked ? "true" : "false");
            atualizarStatusChecklistCentral();
        });
    });
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

    botao.addEventListener("click", function () {
        const confirmar = confirm("Deseja limpar o checklist da Central PAEET?");

        if (!confirmar) {
            return;
        }

        const checks = document.querySelectorAll("#checklistCentralPaeet input[type='checkbox']");

        checks.forEach(function (check) {
            check.checked = false;
            localStorage.removeItem(criarChaveChecklist(check.dataset.check));
        });

        atualizarStatusChecklistCentral();
    });
}


function criarChaveChecklist(nome) {
    return `central_paeet_check_${nome}`;
}
