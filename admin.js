// =====================================================
// PAINEL ADMINISTRATIVO - PORTAL DE AULAS E PORTFÓLIOS
// Professor Willyan Vieira
// =====================================================


// =====================================================
// 1. CONEXÃO COM O SUPABASE
// =====================================================

const SUPABASE_URL = "https://pwomyoprbvoimqmikvev.supabase.co";
const SUPABASE_KEY = "sb_publishable_elGQyDU7ngaUHCLWIHLhDQ_IxiLo6kD";

const banco = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

console.log("Painel admin conectado ao Supabase.");


// =====================================================
// 2. ELEMENTOS PRINCIPAIS
// =====================================================

const btnLoginAdmin = document.getElementById("btnLoginAdmin");
const areaAdmin = document.getElementById("areaAdmin");
const secaoLoginAdmin = document.getElementById("secaoLoginAdmin");
const mensagemLogin = document.getElementById("mensagemLogin");

let aulaEmEdicaoId = null;
let turmaEmEdicaoId = null;
let alunoPaeetEmEdicaoId = null;
let alunoSelecionadoAtendimentoId = null;
let nomeAlunoSelecionadoAtendimento = "";


// =====================================================
// 3. PERFIL PADRÃO
// =====================================================

const perfilPadraoAdmin = {
    nome_funcao: "Professor e PAEET Willyan Vieira",
    email: "willyancruz@prof.educacao.sp.gov.br",
    escola: "PEI Prof. Riolando Canno",
    frase: "“Educar é transformar oportunidades em caminhos possíveis.”",
    foto_url: "https://ui-avatars.com/api/?name=Willyan+Vieira&background=0f766e&color=ffffff"
};


// =====================================================
// 4. LOGIN / SESSÃO
// =====================================================

function mostrarPainelAdminLogado() {
    if (areaAdmin) {
        areaAdmin.style.display = "block";
    }

    if (secaoLoginAdmin) {
        secaoLoginAdmin.style.display = "none";
    }

    carregarPerfilAdminEditavel();
}

function mostrarTelaLoginAdmin() {
    if (areaAdmin) {
        areaAdmin.style.display = "none";
    }

    if (secaoLoginAdmin) {
        secaoLoginAdmin.style.display = "block";
    }
}

if (btnLoginAdmin) {
    btnLoginAdmin.addEventListener("click", async function () {
        const email = document.getElementById("emailAdmin").value.trim();
        const senha = document.getElementById("senhaAdmin").value.trim();

        if (!email || !senha) {
            if (mensagemLogin) {
                mensagemLogin.textContent = "Digite o e-mail e a senha.";
            }
            return;
        }

        if (mensagemLogin) {
            mensagemLogin.textContent = "Verificando login...";
        }

        const { data, error } = await banco.auth.signInWithPassword({
            email: email,
            password: senha
        });

        if (error) {
            if (mensagemLogin) {
                mensagemLogin.textContent = "Erro no login: e-mail ou senha incorretos.";
            }

            console.log("Erro no login:", error);
            return;
        }

        const usuario = data.user;

        if (!usuario) {
            if (mensagemLogin) {
                mensagemLogin.textContent = "Não foi possível identificar o usuário.";
            }
            return;
        }

        const adminAutorizado = await verificarSeUsuarioEAdmin(usuario.email);

        if (!adminAutorizado) {
            if (mensagemLogin) {
                mensagemLogin.textContent = "Este usuário não tem permissão de administrador.";
            }

            await banco.auth.signOut();
            mostrarTelaLoginAdmin();
            return;
        }

        if (mensagemLogin) {
            mensagemLogin.textContent = "Login administrativo realizado com sucesso!";
        }

        mostrarPainelAdminLogado();
        carregarDadosIniciaisAdmin();
    });
}

async function verificarSeUsuarioEAdmin(emailUsuario) {
    const { data, error } = await banco
        .from("admins")
        .select("email")
        .eq("email", emailUsuario)
        .maybeSingle();

    if (error) {
        console.log("Erro ao verificar admin:", error);
        return false;
    }

    return !!data;
}

async function verificarSessaoAtual() {
    const { data, error } = await banco.auth.getUser();

    if (error || !data.user) {
        mostrarTelaLoginAdmin();
        return;
    }

    const adminAutorizado = await verificarSeUsuarioEAdmin(data.user.email);

    if (adminAutorizado) {
        if (mensagemLogin) {
            mensagemLogin.textContent = "Sessão administrativa ativa.";
        }

        mostrarPainelAdminLogado();
        carregarDadosIniciaisAdmin();
    } else {
        await banco.auth.signOut();
        mostrarTelaLoginAdmin();
    }
}

function carregarDadosIniciaisAdmin() {
    carregarTurmasAdmin();
    carregarDisciplinasAdmin();
    carregarAulasAdmin();
    carregarPortfoliosAdmin();
    carregarTurmasCadastradasAdmin();

    if (typeof carregarSolicitacoesAjudaAdmin === "function") {
        carregarSolicitacoesAjudaAdmin();
    }
}

function configurarBotaoSairAdmin() {
    const btnSairAdmin = document.getElementById("btnSairAdmin");

    if (!btnSairAdmin) {
        return;
    }

    btnSairAdmin.addEventListener("click", async function () {
        await banco.auth.signOut();

        mostrarTelaLoginAdmin();

        if (mensagemLogin) {
            mensagemLogin.textContent = "Você saiu do painel administrativo.";
        }

        limparCampoSeExistir("emailAdmin");
        limparCampoSeExistir("senhaAdmin");

        const listaAdminPortfolios = document.getElementById("listaAdminPortfolios");

        if (listaAdminPortfolios) {
            listaAdminPortfolios.innerHTML = "";
        }

        fecharTodasAsTelasAdmin();
    });
}


// =====================================================
// 5. PERFIL ADMINISTRATIVO
// =====================================================

async function carregarPerfilAdminEditavel() {
    const { data: userData, error: userError } = await banco.auth.getUser();

    if (userError || !userData.user) {
        aplicarPerfilAdminNaTela(perfilPadraoAdmin);
        return;
    }

    const usuario = userData.user;

    const { data, error } = await banco
        .from("admin_profiles")
        .select("user_id, nome_funcao, email, escola, frase, foto_url")
        .eq("user_id", usuario.id)
        .maybeSingle();

    if (error) {
        console.log("Erro ao carregar perfil admin:", error);

        aplicarPerfilAdminNaTela({
            ...perfilPadraoAdmin,
            email: usuario.email || perfilPadraoAdmin.email
        });

        return;
    }

    if (!data) {
        const perfilInicial = {
            user_id: usuario.id,
            nome_funcao: perfilPadraoAdmin.nome_funcao,
            email: usuario.email || perfilPadraoAdmin.email,
            escola: perfilPadraoAdmin.escola,
            frase: perfilPadraoAdmin.frase,
            foto_url: perfilPadraoAdmin.foto_url,
            atualizado_em: new Date().toISOString()
        };

        const { error: erroInsert } = await banco
            .from("admin_profiles")
            .insert([perfilInicial]);

        if (erroInsert) {
            console.log("Erro ao criar perfil inicial:", erroInsert);
        }

        aplicarPerfilAdminNaTela(perfilInicial);
        return;
    }

    aplicarPerfilAdminNaTela(data);
}

function aplicarPerfilAdminNaTela(perfil) {
    preencherTexto("nomePerfilAdmin", perfil.nome_funcao || perfilPadraoAdmin.nome_funcao);
    preencherTexto("emailPerfilAdmin", perfil.email || perfilPadraoAdmin.email);
    preencherTexto("escolaPerfilAdmin", perfil.escola || perfilPadraoAdmin.escola);
    preencherTexto("frasePerfilAdmin", perfil.frase || perfilPadraoAdmin.frase);

    const fotoPerfilAdmin = document.getElementById("fotoPerfilAdmin");

    if (fotoPerfilAdmin) {
        fotoPerfilAdmin.src = perfil.foto_url || perfilPadraoAdmin.foto_url;
    }

    preencherFormularioPerfilAdmin(perfil);
}

function preencherFormularioPerfilAdmin(perfil) {
    preencherCampoSeExistir("inputNomePerfilAdmin", perfil.nome_funcao || perfilPadraoAdmin.nome_funcao);
    preencherCampoSeExistir("inputEmailPerfilAdmin", perfil.email || perfilPadraoAdmin.email);
    preencherCampoSeExistir("inputEscolaPerfilAdmin", perfil.escola || perfilPadraoAdmin.escola);
    preencherCampoSeExistir("inputFrasePerfilAdmin", perfil.frase || perfilPadraoAdmin.frase);
}

function abrirTelaEditarPerfilAdmin() {
    fecharTodasAsTelasAdmin();

    const telaEditarPerfil = document.getElementById("telaEditarPerfilAdmin");

    if (telaEditarPerfil) {
        telaEditarPerfil.classList.add("ativa");
    }

    fecharMenuAdmin();
}

async function enviarFotoPerfilAdminParaStorage(arquivo, userId) {
    if (!arquivo || !userId) {
        return null;
    }

    const extensao = arquivo.name.split(".").pop().toLowerCase();
    const nomeArquivo = `perfil-${userId}-${Date.now()}.${extensao}`;
    const caminhoArquivo = `${userId}/${nomeArquivo}`;

    const { error } = await banco.storage
        .from("admin-perfil")
        .upload(caminhoArquivo, arquivo, {
            cacheControl: "3600",
            upsert: true,
            contentType: arquivo.type
        });

    if (error) {
        throw new Error("Erro ao enviar foto de perfil: " + error.message);
    }

    const { data } = banco.storage
        .from("admin-perfil")
        .getPublicUrl(caminhoArquivo);

    return data.publicUrl;
}

async function salvarPerfilAdminEditavel() {
    const confirmar = confirm("Deseja realmente salvar as alterações do perfil administrativo?");

    if (!confirmar) {
        return;
    }

    const mensagem = document.getElementById("mensagemPerfilAdmin");

    if (mensagem) {
        mensagem.textContent = "Salvando perfil administrativo no Supabase...";
    }

    const { data: userData, error: userError } = await banco.auth.getUser();

    if (userError || !userData.user) {
        if (mensagem) {
            mensagem.textContent = "Erro: usuário administrativo não está logado.";
        }
        return;
    }

    const usuario = userData.user;
    const inputFoto = document.getElementById("inputFotoPerfilAdmin");
    const fotoPerfilAdmin = document.getElementById("fotoPerfilAdmin");

    let fotoUrlAtual = fotoPerfilAdmin ? fotoPerfilAdmin.src : perfilPadraoAdmin.foto_url;

    try {
        if (inputFoto && inputFoto.files && inputFoto.files.length > 0) {
            fotoUrlAtual = await enviarFotoPerfilAdminParaStorage(inputFoto.files[0], usuario.id);
        }

        const perfilAtualizado = {
            user_id: usuario.id,
            nome_funcao: pegarValorCampo("inputNomePerfilAdmin") || perfilPadraoAdmin.nome_funcao,
            email: pegarValorCampo("inputEmailPerfilAdmin") || usuario.email,
            escola: pegarValorCampo("inputEscolaPerfilAdmin") || perfilPadraoAdmin.escola,
            frase: pegarValorCampo("inputFrasePerfilAdmin") || perfilPadraoAdmin.frase,
            foto_url: fotoUrlAtual,
            atualizado_em: new Date().toISOString()
        };

        const { error } = await banco
            .from("admin_profiles")
            .upsert([perfilAtualizado], {
                onConflict: "user_id"
            });

        if (error) {
            if (mensagem) {
                mensagem.textContent = "Erro ao salvar perfil: " + error.message;
            }
            return;
        }

        const { error: erroFrasePublica } = await banco
            .from("site_settings")
            .upsert(
                [
                    {
                        chave: "frase_motivacional",
                        valor: perfilAtualizado.frase,
                        atualizado_em: new Date().toISOString()
                    }
                ],
                {
                    onConflict: "chave"
                }
            );

        if (erroFrasePublica) {
            console.log("Erro ao salvar frase pública:", erroFrasePublica);
        }

        aplicarPerfilAdminNaTela(perfilAtualizado);

        if (inputFoto) {
            inputFoto.value = "";
        }

        if (mensagem) {
            mensagem.textContent = "Perfil administrativo salvo com sucesso!";
        }

        alert("Perfil administrativo salvo com sucesso!");

    } catch (erro) {
        console.log("Erro no salvamento do perfil:", erro);

        if (mensagem) {
            mensagem.textContent = erro.message;
        }
    }
}

function configurarPerfilAdminEditavel() {
    const btnEditarPerfilAdmin = document.getElementById("btnEditarPerfilAdmin");
    const btnSalvarPerfilAdmin = document.getElementById("btnSalvarPerfilAdmin");
    const inputFotoPerfilAdmin = document.getElementById("inputFotoPerfilAdmin");

    if (btnEditarPerfilAdmin) {
        btnEditarPerfilAdmin.addEventListener("click", abrirTelaEditarPerfilAdmin);
    }

    if (btnSalvarPerfilAdmin) {
        btnSalvarPerfilAdmin.addEventListener("click", salvarPerfilAdminEditavel);
    }

    if (inputFotoPerfilAdmin) {
        inputFotoPerfilAdmin.addEventListener("change", function (event) {
            const arquivo = event.target.files[0];

            if (!arquivo) {
                return;
            }

            const leitor = new FileReader();

            leitor.onload = function (e) {
                const fotoPerfilAdmin = document.getElementById("fotoPerfilAdmin");

                if (fotoPerfilAdmin) {
                    fotoPerfilAdmin.src = e.target.result;
                }
            };

            leitor.readAsDataURL(arquivo);
        });
    }
}


// =====================================================
// 6. MENU LATERAL
// =====================================================

function abrirMenuAdmin() {
    const menu = document.getElementById("menuLateralAdmin");
    const fundo = document.getElementById("fundoMenuAdmin");

    if (menu) {
        menu.classList.add("aberto");
    }

    if (fundo) {
        fundo.classList.add("aberto");
    }
}

function fecharMenuAdmin() {
    const menu = document.getElementById("menuLateralAdmin");
    const fundo = document.getElementById("fundoMenuAdmin");

    if (menu) {
        menu.classList.remove("aberto");
    }

    if (fundo) {
        fundo.classList.remove("aberto");
    }
}

function fecharTodasAsTelasAdmin() {
    const telas = document.querySelectorAll(".tela-admin-sobreposta");

    telas.forEach(function (tela) {
        tela.classList.remove("ativa");
    });
}

function configurarMenuSobrepostoAdmin() {
    const btnAbrirMenu = document.getElementById("btnAbrirMenuAdmin");
    const btnFecharMenu = document.getElementById("btnFecharMenuAdmin");
    const fundo = document.getElementById("fundoMenuAdmin");

    const itensMenu = document.querySelectorAll(".item-menu-admin[data-tela]");
    const botoesVoltar = document.querySelectorAll(".btnVoltarMenuAdmin");

    if (btnAbrirMenu) {
        btnAbrirMenu.addEventListener("click", abrirMenuAdmin);
    }

    if (btnFecharMenu) {
        btnFecharMenu.addEventListener("click", fecharMenuAdmin);
    }

    if (fundo) {
        fundo.addEventListener("click", fecharMenuAdmin);
    }

    itensMenu.forEach(function (item) {
        item.addEventListener("click", function () {
            const telaEscolhida = item.dataset.tela;

            fecharTodasAsTelasAdmin();

            const tela = document.getElementById(telaEscolhida);

            if (tela) {
                tela.classList.add("ativa");
            }

            fecharMenuAdmin();

            if (telaEscolhida === "telaAulas") {
                carregarTurmasAdmin();
                carregarDisciplinasAdmin();
                carregarAulasAdmin();
            }

if (telaEscolhida === "telaPaeet") {
    carregarAlunosPaeet();

    if (typeof carregarSolicitacoesAjudaAdmin === "function") {
        carregarSolicitacoesAjudaAdmin();
    }
}

if (telaEscolhida === "telaGestaoAlunos") {
    if (typeof carregarAlunosGestaoAdmin === "function") {
        carregarAlunosGestaoAdmin();
    }
}

            if (telaEscolhida === "telaPortfolios") {
                carregarPortfoliosAdmin();
            }

            if (telaEscolhida === "telaEditarPerfilAdmin") {
                carregarPerfilAdminEditavel();
            }

            if (
                telaEscolhida === "telaGerenciarSite" ||
                telaEscolhida === "telaSite" ||
                telaEscolhida === "telaConfiguracoes"
            ) {
                carregarTurmasCadastradasAdmin();
            }
        });
    });

    botoesVoltar.forEach(function (botao) {
        botao.addEventListener("click", function () {
            fecharTodasAsTelasAdmin();
            abrirMenuAdmin();
        });
    });
}


// =====================================================
// 7. TURMAS E DISCIPLINAS
// =====================================================

async function carregarTurmasAdmin() {
    const selectTurma = document.getElementById("adminTurmaAula");

    if (!selectTurma) {
        return;
    }

    const { data, error } = await banco
        .from("turmas")
        .select("id, nome_turma, curso")
        .eq("ativo", true)
        .order("nome_turma", { ascending: true });

    if (error) {
        console.log("Erro ao carregar turmas:", error);
        return;
    }

    selectTurma.innerHTML = `<option value="">Selecione uma turma</option>`;

    data.forEach(function (turma) {
        selectTurma.innerHTML += `
            <option value="${turma.id}">
                ${escaparHTML(turma.nome_turma)} - ${escaparHTML(turma.curso)}
            </option>
        `;
    });
}

async function carregarDisciplinasAdmin() {
    const selectDisciplina = document.getElementById("adminDisciplinaAula");

    if (!selectDisciplina) {
        return;
    }

    const { data, error } = await banco
        .from("disciplinas")
        .select("id, nome_disciplina")
        .eq("ativo", true)
        .order("nome_disciplina", { ascending: true });

    if (error) {
        console.log("Erro ao carregar disciplinas:", error);
        return;
    }

    selectDisciplina.innerHTML = `<option value="">Selecione uma disciplina</option>`;

    data.forEach(function (disciplina) {
        selectDisciplina.innerHTML += `
            <option value="${disciplina.id}">
                ${escaparHTML(disciplina.nome_disciplina)}
            </option>
        `;
    });
}


// =====================================================
// CADASTRAR OU EDITAR TURMA
// =====================================================

const btnCadastrarTurma = document.getElementById("btnCadastrarTurma");

if (btnCadastrarTurma) {
    btnCadastrarTurma.addEventListener("click", salvarOuAtualizarTurma);
}

async function salvarOuAtualizarTurma() {
    const mensagem = document.getElementById("mensagemTurmaAdmin");

    const nome = pegarValorCampo("novaTurmaNome");
    const curso = pegarValorCampo("novaTurmaCurso");
    const descricao = pegarValorCampo("novaTurmaDescricao");

    let foto = pegarValorCampo("novaTurmaFoto");
    const arquivoFoto = document.getElementById("arquivoTurmaFoto");

    if (!nome || !curso) {
        if (mensagem) {
            mensagem.textContent = "Preencha o nome da turma e o curso.";
        }
        return;
    }

    if (mensagem) {
        mensagem.textContent = turmaEmEdicaoId
            ? "Atualizando turma..."
            : "Cadastrando turma...";
    }

    if (arquivoFoto && arquivoFoto.files && arquivoFoto.files.length > 0) {
        if (mensagem) {
            mensagem.textContent = "Enviando foto ou mídia da turma...";
        }

        const urlUpload = await enviarArquivoParaStorage(arquivoFoto, "turmas");

        if (urlUpload) {
            foto = urlUpload;
        } else {
            if (mensagem) {
                mensagem.textContent = "Não foi possível enviar o arquivo.";
            }
            return;
        }
    }

    const dadosTurma = {
        nome_turma: nome,
        curso: curso,
        descricao: descricao,
        foto_url: foto,
        ativo: true
    };

    let resultado;

    if (turmaEmEdicaoId) {
        resultado = await banco
            .from("turmas")
            .update(dadosTurma)
            .eq("id", turmaEmEdicaoId);
    } else {
        resultado = await banco
            .from("turmas")
            .insert([dadosTurma]);
    }

    if (resultado.error) {
        if (mensagem) {
            mensagem.textContent = "Erro ao salvar turma: " + resultado.error.message;
        }

        console.log("Erro turma:", resultado.error);
        return;
    }

    if (mensagem) {
        mensagem.textContent = turmaEmEdicaoId
            ? "Turma atualizada com sucesso!"
            : "Turma cadastrada com sucesso!";
    }

    turmaEmEdicaoId = null;

    if (btnCadastrarTurma) {
        btnCadastrarTurma.textContent = "Cadastrar Turma";
    }

    limparFormularioTurma();

    await carregarTurmasAdmin();
    await carregarTurmasCadastradasAdmin();
}

function limparFormularioTurma() {
    limparCampoSeExistir("novaTurmaNome");
    limparCampoSeExistir("novaTurmaCurso");
    limparCampoSeExistir("novaTurmaDescricao");
    limparCampoSeExistir("novaTurmaFoto");

    const arquivoFoto = document.getElementById("arquivoTurmaFoto");

    if (arquivoFoto) {
        arquivoFoto.value = "";
    }

    const preview = document.getElementById("previewTurmaMidia");

    if (preview) {
        preview.innerHTML = "";
    }
}


// =====================================================
// LISTAR TURMAS CADASTRADAS PARA EDIÇÃO
// =====================================================

const btnCarregarTurmasCadastradas = document.getElementById("btnCarregarTurmasCadastradas");

if (btnCarregarTurmasCadastradas) {
    btnCarregarTurmasCadastradas.addEventListener("click", carregarTurmasCadastradasAdmin);
}

async function carregarTurmasCadastradasAdmin() {
    const lista = document.getElementById("listaTurmasCadastradasAdmin");

    if (!lista) {
        return;
    }

    lista.innerHTML = "<p>Carregando turmas cadastradas...</p>";

    const { data, error } = await banco
        .from("turmas")
        .select("id, nome_turma, curso, descricao, foto_url, ativo")
        .order("nome_turma", { ascending: true });

    if (error) {
        lista.innerHTML = `<p>Erro ao carregar turmas: ${error.message}</p>`;
        console.log("Erro ao carregar turmas cadastradas:", error);
        return;
    }

    if (!data || data.length === 0) {
        lista.innerHTML = "<p>Nenhuma turma cadastrada ainda.</p>";
        return;
    }

    lista.innerHTML = "";

    data.forEach(function (turma) {
        lista.innerHTML += `
            <div class="card-turma-admin">

                <div class="info-turma-admin">
                    <h4>${escaparHTML(turma.nome_turma || "Turma sem nome")}</h4>

                    <p><strong>Curso:</strong> ${escaparHTML(turma.curso || "Não informado")}</p>

                    <p><strong>Descrição:</strong> ${escaparHTML(turma.descricao || "Sem descrição")}</p>

                    <p><strong>Status:</strong> ${turma.ativo ? "Ativa" : "Inativa"}</p>

                    ${
                        turma.foto_url
                        ? `
                            <p>
                                <strong>Mídia:</strong>
                                <a href="${escaparAtributo(turma.foto_url)}" target="_blank" rel="noopener noreferrer">
                                    Abrir foto/mídia
                                </a>
                            </p>
                        `
                        : ""
                    }
                </div>

                ${
                    turma.foto_url
                    ? `
                        <div class="preview-turma-card">
                            ${montarPreviewTurmaCard(turma.foto_url)}
                        </div>
                    `
                    : ""
                }

                <div class="acoes-turma-admin">

                    <button type="button" onclick="editarTurmaAdmin('${turma.id}')" class="btn-editar-turma">
                        ✏️ Editar
                    </button>

                    ${
                        turma.ativo
                        ? `
                            <button type="button" onclick="desativarTurmaAdmin('${turma.id}')" class="btn-desativar-turma">
                                🚫 Desativar
                            </button>
                        `
                        : `
                            <button type="button" onclick="reativarTurmaAdmin('${turma.id}')" class="btn-reativar-turma">
                                ✅ Reativar
                            </button>
                        `
                    }

                    <button type="button" onclick="excluirTurmaAdmin('${turma.id}')" class="btn-excluir-turma">
                        🗑️ Excluir
                    </button>

                </div>

            </div>
        `;
    });
}

function montarPreviewTurmaCard(url) {
    if (!url) {
        return "";
    }

    const tipo = identificarTipoMidia(url);

    if (tipo === "imagem") {
        return `
            <img src="${escaparAtributo(url)}" alt="Imagem da turma">
        `;
    }

    if (tipo === "pdf") {
        return `
            <span class="icone-preview-turma">📄 PDF</span>
        `;
    }

    if (tipo === "video" || tipo === "youtube") {
        return `
            <span class="icone-preview-turma">🎥 Vídeo</span>
        `;
    }

    return `
        <span class="icone-preview-turma">🔗 Link</span>
    `;
}


// =====================================================
// EDITAR TURMA
// =====================================================

async function editarTurmaAdmin(idTurma) {
    const { data, error } = await banco
        .from("turmas")
        .select("id, nome_turma, curso, descricao, foto_url, ativo")
        .eq("id", idTurma)
        .maybeSingle();

    if (error || !data) {
        alert("Erro ao carregar turma para edição.");
        console.log("Erro editar turma:", error);
        return;
    }

    turmaEmEdicaoId = data.id;

    preencherCampoSeExistir("novaTurmaNome", data.nome_turma || "");
    preencherCampoSeExistir("novaTurmaCurso", data.curso || "");
    preencherCampoSeExistir("novaTurmaDescricao", data.descricao || "");
    preencherCampoSeExistir("novaTurmaFoto", data.foto_url || "");

    if (btnCadastrarTurma) {
        btnCadastrarTurma.textContent = "💾 Atualizar Turma";
    }

    const mensagem = document.getElementById("mensagemTurmaAdmin");

    if (mensagem) {
        mensagem.textContent = "Editando turma. Altere as informações e clique em Atualizar Turma.";
    }

    const preview = document.getElementById("previewTurmaMidia");

    if (preview && data.foto_url) {
        mostrarPreviewMidia(data.foto_url, "previewTurmaMidia");
    }

    const campoNome = document.getElementById("novaTurmaNome");

    if (campoNome) {
        campoNome.scrollIntoView({
            behavior: "smooth",
            block: "center"
        });
    }

    alert("Turma carregada para edição.");
}


// =====================================================
// DESATIVAR TURMA
// =====================================================

async function desativarTurmaAdmin(idTurma) {
    const confirmar = confirm("Deseja desativar esta turma? Ela deixará de aparecer para os alunos.");

    if (!confirmar) {
        return;
    }

    const { error } = await banco
        .from("turmas")
        .update({ ativo: false })
        .eq("id", idTurma);

    if (error) {
        alert("Erro ao desativar turma: " + error.message);
        console.log("Erro desativar turma:", error);
        return;
    }

    alert("Turma desativada com sucesso!");

    await carregarTurmasAdmin();
    await carregarTurmasCadastradasAdmin();
}


// =====================================================
// REATIVAR TURMA
// =====================================================

async function reativarTurmaAdmin(idTurma) {
    const confirmar = confirm("Deseja reativar esta turma?");

    if (!confirmar) {
        return;
    }

    const { error } = await banco
        .from("turmas")
        .update({ ativo: true })
        .eq("id", idTurma);

    if (error) {
        alert("Erro ao reativar turma: " + error.message);
        console.log("Erro reativar turma:", error);
        return;
    }

    alert("Turma reativada com sucesso!");

    await carregarTurmasAdmin();
    await carregarTurmasCadastradasAdmin();
}


// =====================================================
// EXCLUIR TURMA
// =====================================================

async function excluirTurmaAdmin(idTurma) {
    const confirmar = confirm(
        "Tem certeza que deseja excluir esta turma? Se houver aulas vinculadas a ela, o Supabase pode bloquear a exclusão."
    );

    if (!confirmar) {
        return;
    }

    const { error } = await banco
        .from("turmas")
        .delete()
        .eq("id", idTurma);

    if (error) {
        alert(
            "Erro ao excluir turma: " +
            error.message +
            "\n\nSe essa turma possui aulas cadastradas, prefira usar Desativar em vez de Excluir."
        );

        console.log("Erro excluir turma:", error);
        return;
    }

    alert("Turma excluída com sucesso!");

    await carregarTurmasAdmin();
    await carregarTurmasCadastradasAdmin();
}


// =====================================================
// 8. AULAS: SALVAR / EDITAR
// =====================================================

const btnSalvarAula = document.getElementById("btnSalvarAula");

if (btnSalvarAula) {
    btnSalvarAula.addEventListener("click", salvarOuAtualizarAula);
}

async function salvarOuAtualizarAula() {
    const mensagem = document.getElementById("mensagemAulaAdmin");

    const turmaId = pegarValorCampo("adminTurmaAula");
    const disciplinaId = pegarValorCampo("adminDisciplinaAula");
    const titulo = pegarValorCampo("adminTituloAula");
    const subtitulo = pegarValorCampo("adminSubtituloAula");
    const descricao = pegarValorCampo("adminDescricaoAula");
    const dataAula = pegarValorCampo("adminDataAula");
    const horarioInicio = pegarValorCampo("adminHorarioInicio");
    const horarioFim = pegarValorCampo("adminHorarioFim");
    const local = pegarValorCampo("adminLocalAula");
    const desafio = pegarValorCampo("adminDesafioAula");

    let pdfUrl = pegarValorCampo("adminPdfAula");
    const arquivoPdfAula = document.getElementById("arquivoPdfAula");

    if (!turmaId || !disciplinaId || !titulo) {
        mensagem.textContent = "Preencha pelo menos turma, disciplina e título da aula.";
        return;
    }

    if (dataAula) {
        const dataOk = verificarFeriadoOuFimDeSemana(dataAula);

        if (!dataOk) {
            const confirmar = confirm(
                "A data escolhida pode ser fim de semana ou feriado. Deseja salvar mesmo assim?"
            );

            if (!confirmar) {
                return;
            }
        }
    }

    if (arquivoPdfAula && arquivoPdfAula.files && arquivoPdfAula.files.length > 0) {
        mensagem.textContent = "Enviando PDF da aula...";

        const urlPdfEnviado = await enviarArquivoParaStorage(arquivoPdfAula, "aulas-pdf");

        if (urlPdfEnviado) {
            pdfUrl = urlPdfEnviado;
        } else {
            mensagem.textContent = "Erro ao enviar o PDF da aula.";
            return;
        }
    }

    mensagem.textContent = aulaEmEdicaoId ? "Atualizando aula..." : "Salvando aula...";

    const dadosAula = {
        turma_id: Number(turmaId),
        disciplina_id: Number(disciplinaId),
        titulo_aula: titulo,
        subtitulo: subtitulo,
        descricao: descricao,
        data_aula: dataAula || null,
        horario_inicio: horarioInicio || null,
        horario_fim: horarioFim || null,
        local_aula: local,
        desafio_pratico: desafio,
        pdf_url: pdfUrl,
        video_url: pegarValorCampo("adminVideoAula"),
        atividade_url: pegarValorCampo("adminAtividadeAula"),
        material_extra_url: pegarValorCampo("adminMaterialExtraAula"),
        ativo: true
    };

    let resultado;

    if (aulaEmEdicaoId) {
        resultado = await banco
            .from("aulas")
            .update(dadosAula)
            .eq("id", aulaEmEdicaoId);
    } else {
        resultado = await banco
            .from("aulas")
            .insert([
                {
                    ...dadosAula,
                    aula_do_dia: false
                }
            ]);
    }

    if (resultado.error) {
        mensagem.textContent = "Erro ao salvar aula: " + resultado.error.message;
        console.log("Erro aula:", resultado.error);
        return;
    }

    mensagem.textContent = aulaEmEdicaoId
        ? "Aula atualizada com sucesso!"
        : "Aula salva com sucesso!";

    aulaEmEdicaoId = null;

    limparFormularioAula();

    if (btnSalvarAula) {
        btnSalvarAula.textContent = "💾 Salvar Aula";
    }

    carregarAulasAdmin();
}

function limparFormularioAula() {
    limparCampoSeExistir("adminTituloAula");
    limparCampoSeExistir("adminSubtituloAula");
    limparCampoSeExistir("adminDescricaoAula");
    limparCampoSeExistir("adminDataAula");
    limparCampoSeExistir("adminHorarioInicio");
    limparCampoSeExistir("adminHorarioFim");
    limparCampoSeExistir("adminLocalAula");
    limparCampoSeExistir("adminDesafioAula");
    limparCampoSeExistir("adminPdfAula");
    limparCampoSeExistir("adminVideoAula");
    limparCampoSeExistir("adminAtividadeAula");
    limparCampoSeExistir("adminMaterialExtraAula");

    const arquivoPdfAula = document.getElementById("arquivoPdfAula");

    if (arquivoPdfAula) {
        arquivoPdfAula.value = "";
    }
}

async function editarAulaAdmin(idAula) {
    const { data, error } = await banco
        .from("aulas")
        .select("*")
        .eq("id", idAula)
        .maybeSingle();

    if (error || !data) {
        alert("Erro ao carregar aula para edição.");
        console.log("Erro editar aula:", error);
        return;
    }

    aulaEmEdicaoId = data.id;

    preencherCampoSeExistir("adminTurmaAula", data.turma_id || "");
    preencherCampoSeExistir("adminDisciplinaAula", data.disciplina_id || "");
    preencherCampoSeExistir("adminTituloAula", data.titulo_aula || "");
    preencherCampoSeExistir("adminSubtituloAula", data.subtitulo || "");
    preencherCampoSeExistir("adminDescricaoAula", data.descricao || "");
    preencherCampoSeExistir("adminDataAula", data.data_aula || "");
    preencherCampoSeExistir("adminHorarioInicio", formatarHorarioInputAdmin(data.horario_inicio));
    preencherCampoSeExistir("adminHorarioFim", formatarHorarioInputAdmin(data.horario_fim));
    preencherCampoSeExistir("adminLocalAula", data.local_aula || "");
    preencherCampoSeExistir("adminDesafioAula", data.desafio_pratico || "");
    preencherCampoSeExistir("adminPdfAula", data.pdf_url || "");
    preencherCampoSeExistir("adminVideoAula", data.video_url || "");
    preencherCampoSeExistir("adminAtividadeAula", data.atividade_url || "");
    preencherCampoSeExistir("adminMaterialExtraAula", data.material_extra_url || "");

    if (btnSalvarAula) {
        btnSalvarAula.textContent = "💾 Atualizar Aula";
    }

    const mensagem = document.getElementById("mensagemAulaAdmin");

    if (mensagem) {
        mensagem.textContent = "Editando aula. Faça as alterações e clique em Atualizar Aula.";
    }

    fecharTodasAsTelasAdmin();

    const telaAulas = document.getElementById("telaAulas");

    if (telaAulas) {
        telaAulas.classList.add("ativa");
    }

    const campoTitulo = document.getElementById("adminTituloAula");

    if (campoTitulo) {
        campoTitulo.scrollIntoView({
            behavior: "smooth",
            block: "center"
        });
    }

    alert("Aula carregada para edição.");
}


```javascript
// =====================================================
// 9. LISTAR AULAS - ORGANIZADOR DE AULAS
// =====================================================

const btnCarregarAulasAdmin = document.getElementById("btnCarregarAulasAdmin");

if (btnCarregarAulasAdmin) {
    btnCarregarAulasAdmin.addEventListener("click", carregarAulasAdmin);
}

const btnFiltrarAulasAdmin = document.getElementById("btnFiltrarAulasAdmin");
const btnLimparFiltrosAulasAdmin = document.getElementById("btnLimparFiltrosAulasAdmin");

const filtroDataAulaAdmin = document.getElementById("filtroDataAulaAdmin");
const filtroDataListaAulaAdmin = document.getElementById("filtroDataListaAulaAdmin");
const filtroTextoAulaAdmin = document.getElementById("filtroTextoAulaAdmin");
const filtroTurmaAulaAdmin = document.getElementById("filtroTurmaAulaAdmin");
const filtroCursoAulaAdmin = document.getElementById("filtroCursoAulaAdmin");
const filtroDisciplinaAulaAdmin = document.getElementById("filtroDisciplinaAulaAdmin");

let opcoesOrganizadorAulasCarregadas = false;

if (btnFiltrarAulasAdmin) {
    btnFiltrarAulasAdmin.addEventListener("click", carregarAulasAdmin);
}

if (btnLimparFiltrosAulasAdmin) {
    btnLimparFiltrosAulasAdmin.addEventListener("click", function () {
        limparCampoSeExistir("filtroDataAulaAdmin");
        limparCampoSeExistir("filtroTextoAulaAdmin");
        limparCampoSeExistir("filtroTurmaAulaAdmin");

        preencherCampoSeExistir("filtroDataListaAulaAdmin", "");
        preencherCampoSeExistir("filtroCursoAulaAdmin", "");
        preencherCampoSeExistir("filtroDisciplinaAulaAdmin", "");

        carregarAulasAdmin();
    });
}

if (filtroDataAulaAdmin) {
    filtroDataAulaAdmin.addEventListener("change", function () {
        if (filtroDataListaAulaAdmin) {
            filtroDataListaAulaAdmin.value = filtroDataAulaAdmin.value || "";
        }

        carregarAulasAdmin();
    });
}

if (filtroDataListaAulaAdmin) {
    filtroDataListaAulaAdmin.addEventListener("change", function () {
        if (filtroDataAulaAdmin) {
            filtroDataAulaAdmin.value = filtroDataListaAulaAdmin.value || "";
        }

        carregarAulasAdmin();
    });
}

if (filtroTextoAulaAdmin) {
    filtroTextoAulaAdmin.addEventListener("input", carregarAulasAdmin);
}

if (filtroTurmaAulaAdmin) {
    filtroTurmaAulaAdmin.addEventListener("input", carregarAulasAdmin);
}

if (filtroCursoAulaAdmin) {
    filtroCursoAulaAdmin.addEventListener("change", carregarAulasAdmin);
}

if (filtroDisciplinaAulaAdmin) {
    filtroDisciplinaAulaAdmin.addEventListener("change", carregarAulasAdmin);
}


async function carregarAulasAdmin() {
    const lista = document.getElementById("listaAulasAdmin");
    const resumo = document.getElementById("resumoAulasAdmin");

    if (!lista) {
        return;
    }

    lista.innerHTML = "<p>Carregando aulas cadastradas...</p>";

    if (resumo) {
        resumo.innerHTML = "<p>Organizando aulas...</p>";
    }

    await carregarOpcoesOrganizadorAulasAdmin();

    const filtroData = document.getElementById("filtroDataAulaAdmin");
    const filtroTexto = document.getElementById("filtroTextoAulaAdmin");
    const filtroTurma = document.getElementById("filtroTurmaAulaAdmin");
    const filtroCurso = document.getElementById("filtroCursoAulaAdmin");
    const filtroDisciplina = document.getElementById("filtroDisciplinaAulaAdmin");

    let consulta = banco
        .from("aulas")
        .select(`
            id,
            turma_id,
            disciplina_id,
            titulo_aula,
            subtitulo,
            descricao,
            data_aula,
            horario_inicio,
            horario_fim,
            local_aula,
            desafio_pratico,
            pdf_url,
            video_url,
            atividade_url,
            material_extra_url,
            aula_do_dia,
            ativo,
            turmas (
                nome_turma,
                curso
            ),
            disciplinas (
                nome_disciplina
            )
        `)
        .order("data_aula", { ascending: false })
        .order("horario_inicio", { ascending: false });

    if (filtroData && filtroData.value) {
        consulta = consulta.eq("data_aula", filtroData.value);
    }

    const { data, error } = await consulta;

    if (error) {
        lista.innerHTML = `
            <p class="mensagem-erro-admin">
                Erro ao carregar aulas: ${escaparHTML(error.message)}
            </p>
        `;

        if (resumo) {
            resumo.innerHTML = "<p>Erro ao montar organizador de aulas.</p>";
        }

        console.log("Erro ao carregar aulas:", error);
        return;
    }

    let aulas = data || [];

    const textoBuscado = filtroTexto ? filtroTexto.value.trim().toLowerCase() : "";
    const turmaBuscada = filtroTurma ? filtroTurma.value.trim().toLowerCase() : "";
    const cursoBuscado = filtroCurso ? filtroCurso.value.trim().toLowerCase() : "";
    const disciplinaBuscada = filtroDisciplina ? filtroDisciplina.value.trim().toLowerCase() : "";

    if (textoBuscado) {
        aulas = aulas.filter(function (aula) {
            const texto = [
                aula.titulo_aula,
                aula.subtitulo,
                aula.descricao,
                aula.desafio_pratico,
                aula.local_aula
            ].join(" ").toLowerCase();

            return texto.includes(textoBuscado);
        });
    }

    if (turmaBuscada) {
        aulas = aulas.filter(function (aula) {
            const nomeTurma = aula.turmas && aula.turmas.nome_turma
                ? aula.turmas.nome_turma.toLowerCase()
                : "";

            return nomeTurma.includes(turmaBuscada);
        });
    }

    if (cursoBuscado) {
        aulas = aulas.filter(function (aula) {
            const curso = aula.turmas && aula.turmas.curso
                ? aula.turmas.curso.toLowerCase()
                : "";

            return curso === cursoBuscado;
        });
    }

    if (disciplinaBuscada) {
        aulas = aulas.filter(function (aula) {
            const disciplinaId = aula.disciplina_id
                ? aula.disciplina_id.toString()
                : "";

            const disciplinaNome = aula.disciplinas && aula.disciplinas.nome_disciplina
                ? aula.disciplinas.nome_disciplina.toLowerCase()
                : "";

            return disciplinaId === disciplinaBuscada || disciplinaNome === disciplinaBuscada;
        });
    }

    if (!aulas || aulas.length === 0) {
        lista.innerHTML = `
            <div class="card-vazio-admin">
                <h4>📭 Nenhuma aula encontrada</h4>
                <p>Altere os filtros ou cadastre uma nova aula.</p>
            </div>
        `;

        if (resumo) {
            resumo.innerHTML = `
                <p>
                    Nenhuma aula encontrada com os filtros selecionados.
                </p>
            `;
        }

        return;
    }

    montarResumoOrganizadorAulas(aulas);

    lista.innerHTML = "";

    aulas.forEach(function (aula) {
        lista.innerHTML += montarCardAulaOrganizadaAdmin(aula);
    });
}


async function carregarOpcoesOrganizadorAulasAdmin() {
    if (opcoesOrganizadorAulasCarregadas) {
        return;
    }

    await Promise.all([
        carregarCursosFiltroAulasAdmin(),
        carregarDisciplinasFiltroAulasAdmin(),
        carregarDatasFiltroAulasAdmin()
    ]);

    opcoesOrganizadorAulasCarregadas = true;
}


async function carregarCursosFiltroAulasAdmin() {
    const selectCurso = document.getElementById("filtroCursoAulaAdmin");

    if (!selectCurso) {
        return;
    }

    const { data, error } = await banco
        .from("turmas")
        .select("curso")
        .eq("ativo", true)
        .order("curso", { ascending: true });

    if (error) {
        console.log("Erro ao carregar cursos para filtro:", error);
        return;
    }

    const cursos = new Set();

    (data || []).forEach(function (turma) {
        if (turma.curso) {
            cursos.add(turma.curso);
        }
    });

    selectCurso.innerHTML = `<option value="">Todos os cursos</option>`;

    Array.from(cursos).sort().forEach(function (curso) {
        selectCurso.innerHTML += `
            <option value="${escaparAtributo(curso.toLowerCase())}">
                ${escaparHTML(formatarCursoOrganizadorAula(curso))}
            </option>
        `;
    });
}


async function carregarDisciplinasFiltroAulasAdmin() {
    const selectDisciplina = document.getElementById("filtroDisciplinaAulaAdmin");

    if (!selectDisciplina) {
        return;
    }

    const { data, error } = await banco
        .from("disciplinas")
        .select("id, nome_disciplina")
        .eq("ativo", true)
        .order("nome_disciplina", { ascending: true });

    if (error) {
        console.log("Erro ao carregar disciplinas para filtro:", error);
        return;
    }

    selectDisciplina.innerHTML = `<option value="">Todas as disciplinas</option>`;

    (data || []).forEach(function (disciplina) {
        selectDisciplina.innerHTML += `
            <option value="${disciplina.id}">
                ${escaparHTML(disciplina.nome_disciplina || "Disciplina sem nome")}
            </option>
        `;
    });
}


async function carregarDatasFiltroAulasAdmin() {
    const selectData = document.getElementById("filtroDataListaAulaAdmin");

    if (!selectData) {
        return;
    }

    const { data, error } = await banco
        .from("aulas")
        .select("data_aula")
        .not("data_aula", "is", null)
        .order("data_aula", { ascending: false });

    if (error) {
        console.log("Erro ao carregar datas para filtro:", error);
        return;
    }

    const datas = new Set();

    (data || []).forEach(function (aula) {
        if (aula.data_aula) {
            datas.add(aula.data_aula);
        }
    });

    selectData.innerHTML = `<option value="">Todas as datas</option>`;

    Array.from(datas).sort().reverse().forEach(function (dataAula) {
        selectData.innerHTML += `
            <option value="${escaparAtributo(dataAula)}">
                📌 ${formatarDataAdmin(dataAula)}
            </option>
        `;
    });
}


function montarResumoOrganizadorAulas(aulas) {
    const resumo = document.getElementById("resumoAulasAdmin");

    if (!resumo) {
        return;
    }

    const disciplinas = new Set();
    const turmas = new Set();
    const cursos = new Set();

    aulas.forEach(function (aula) {
        if (aula.disciplinas && aula.disciplinas.nome_disciplina) {
            disciplinas.add(aula.disciplinas.nome_disciplina);
        }

        if (aula.turmas && aula.turmas.nome_turma) {
            turmas.add(aula.turmas.nome_turma);
        }

        if (aula.turmas && aula.turmas.curso) {
            cursos.add(aula.turmas.curso);
        }
    });

    resumo.innerHTML = `
        <div class="item-resumo-aula">
            <strong>${aulas.length}</strong>
            <span>Aulas encontradas</span>
        </div>

        <div class="item-resumo-aula">
            <strong>${disciplinas.size}</strong>
            <span>Disciplinas</span>
        </div>

        <div class="item-resumo-aula">
            <strong>${turmas.size}</strong>
            <span>Turmas</span>
        </div>

        <div class="item-resumo-aula">
            <strong>${cursos.size}</strong>
            <span>Cursos técnicos</span>
        </div>
    `;
}


function montarCardAulaOrganizadaAdmin(aula) {
    const nomeTurma = aula.turmas ? aula.turmas.nome_turma : "Turma não informada";
    const nomeCurso = aula.turmas ? aula.turmas.curso : "Curso não informado";
    const nomeDisciplina = aula.disciplinas ? aula.disciplinas.nome_disciplina : "Disciplina não informada";

    return `
        <div class="card-aula-admin card-aula-organizada">

            <div class="topo-aula-organizada">

                <div>
                    ${
                        aula.aula_do_dia
                        ? `<span class="badge-aula-dia-admin">⭐ Aula do Dia ativa</span>`
                        : ""
                    }

                    <h3>${escaparHTML(aula.titulo_aula || "Aula sem título")}</h3>

                    ${
                        aula.subtitulo
                        ? `<p class="subtitulo-aula-organizada">${escaparHTML(aula.subtitulo)}</p>`
                        : ""
                    }
                </div>

                <div class="data-aula-organizada">
                    <strong>${formatarDataAdmin(aula.data_aula)}</strong>
                    <span>${formatarHorarioAdmin(aula.horario_inicio)} às ${formatarHorarioAdmin(aula.horario_fim)}</span>
                </div>

            </div>


            <div class="grade-info-aula-organizada">

                <div>
                    <span class="rotulo-info-aula">📘 Disciplina</span>
                    <strong>${escaparHTML(nomeDisciplina)}</strong>
                </div>

                <div>
                    <span class="rotulo-info-aula">🎓 Turma</span>
                    <strong>${escaparHTML(nomeTurma)}</strong>
                </div>

                <div>
                    <span class="rotulo-info-aula">🏫 Curso técnico</span>
                    <strong>${escaparHTML(formatarCursoOrganizadorAula(nomeCurso))}</strong>
                </div>

                <div>
                    <span class="rotulo-info-aula">📍 Local</span>
                    <strong>${escaparHTML(aula.local_aula || "Não informado")}</strong>
                </div>

            </div>


            ${
                aula.descricao
                ? `
                    <div class="descricao-aula-organizada descricao-aula-compacta">
                        <strong>Resumo da aula:</strong>

                        <pre class="texto-formatado-aula-admin">${preservarFormatacaoTextoAdmin(aula.descricao)}</pre>
                    </div>
                `
                : ""
            }


            <div class="materiais-card-admin materiais-aula-organizada">
                ${aula.pdf_url ? `<span>📄 PDF</span>` : ""}
                ${aula.video_url ? `<span>🎥 Vídeo</span>` : ""}
                ${aula.atividade_url ? `<span>📝 Atividade</span>` : ""}
                ${aula.material_extra_url ? `<span>🔗 Extra</span>` : ""}
                ${aula.ativo ? `<span class="status-ativo-aula">✅ Ativa</span>` : `<span class="status-inativo-aula">🚫 Inativa</span>`}
            </div>


            <div class="acoes-card-aula-admin">

                <button onclick="editarAulaAdmin('${aula.id}')" class="btn-editar-aula">
                    ✏️ Editar Aula
                </button>

                <button onclick="ativarAulaDoDia('${aula.id}', '${aula.turma_id}')" class="btn-ativar-aula-dia">
                    ⭐ Ativar como Aula do Dia
                </button>

                <button onclick="desativarAula('${aula.id}')" class="btn-desativar-aula">
                    🚫 Desativar
                </button>

                <button onclick="excluirAula('${aula.id}')" class="btn-excluir-aula">
                    🗑️ Excluir
                </button>

            </div>

        </div>
    `;
}


function formatarCursoOrganizadorAula(curso) {
    const nomes = {
        desenvolvimento_sistemas: "Desenvolvimento de Sistemas",
        vendas: "Vendas",
        apoio_pedagogico: "Apoio Pedagógico",
        substituicoes: "Substituições",
        outro: "Outro"
    };

    return nomes[curso] || curso || "Não informado";
}


function preservarFormatacaoTextoAdmin(texto) {
    if (!texto) {
        return "";
    }

    return escaparHTML(texto);
}
```

// =====================================================
// 10. ATIVAR / DESATIVAR / EXCLUIR AULA
// =====================================================

async function ativarAulaDoDia(aulaId, turmaId) {
    if (!banco) {
        alert("Supabase não conectado.");
        return;
    }

    if (!aulaId || !turmaId || turmaId === "undefined") {
        alert("Erro: não foi possível identificar a turma desta aula.");
        return;
    }

    const confirmar = confirm("Deseja ativar esta aula como Aula do Dia para os alunos?");

    if (!confirmar) {
        return;
    }

    const { error: erroDesmarcar } = await banco
        .from("aulas")
        .update({ aula_do_dia: false })
        .eq("turma_id", turmaId);

    if (erroDesmarcar) {
        alert("Erro ao desmarcar aulas anteriores: " + erroDesmarcar.message);
        return;
    }

    const { error: erroAtivar } = await banco
        .from("aulas")
        .update({
            aula_do_dia: true,
            ativo: true
        })
        .eq("id", aulaId);

    if (erroAtivar) {
        alert("Erro ao ativar aula: " + erroAtivar.message);
        return;
    }

    alert("Aula ativada como Aula do Dia com sucesso!");
    carregarAulasAdmin();
}

function montarResumoOrganizadorAulas(aulas) {
    const resumo = document.getElementById("resumoAulasAdmin");

    if (!resumo) {
        return;
    }

    const disciplinas = new Set();
    const turmas = new Set();
    const cursos = new Set();

    aulas.forEach(function (aula) {
        if (aula.disciplinas && aula.disciplinas.nome_disciplina) {
            disciplinas.add(aula.disciplinas.nome_disciplina);
        }

        if (aula.turmas && aula.turmas.nome_turma) {
            turmas.add(aula.turmas.nome_turma);
        }

        if (aula.turmas && aula.turmas.curso) {
            cursos.add(aula.turmas.curso);
        }
    });

    resumo.innerHTML = `
        <div class="item-resumo-aula">
            <strong>${aulas.length}</strong>
            <span>Aulas encontradas</span>
        </div>

        <div class="item-resumo-aula">
            <strong>${disciplinas.size}</strong>
            <span>Disciplinas</span>
        </div>

        <div class="item-resumo-aula">
            <strong>${turmas.size}</strong>
            <span>Turmas</span>
        </div>

        <div class="item-resumo-aula">
            <strong>${cursos.size}</strong>
            <span>Cursos técnicos</span>
        </div>
    `;
}


function montarCardAulaOrganizadaAdmin(aula) {
    const nomeTurma = aula.turmas ? aula.turmas.nome_turma : "Turma não informada";
    const nomeCurso = aula.turmas ? aula.turmas.curso : "Curso não informado";
    const nomeDisciplina = aula.disciplinas ? aula.disciplinas.nome_disciplina : "Disciplina não informada";

    return `
        <div class="card-aula-admin card-aula-organizada">

            <div class="topo-aula-organizada">

                <div>
                    ${
                        aula.aula_do_dia
                        ? `<span class="badge-aula-dia-admin">⭐ Aula do Dia ativa</span>`
                        : ""
                    }

                    <h3>${escaparHTML(aula.titulo_aula || "Aula sem título")}</h3>

                    ${
                        aula.subtitulo
                        ? `<p class="subtitulo-aula-organizada">${escaparHTML(aula.subtitulo)}</p>`
                        : ""
                    }
                </div>

                <div class="data-aula-organizada">
                    <strong>${formatarDataAdmin(aula.data_aula)}</strong>
                    <span>${formatarHorarioAdmin(aula.horario_inicio)} às ${formatarHorarioAdmin(aula.horario_fim)}</span>
                </div>

            </div>


            <div class="grade-info-aula-organizada">

                <div>
                    <span class="rotulo-info-aula">📘 Disciplina</span>
                    <strong>${escaparHTML(nomeDisciplina)}</strong>
                </div>

                <div>
                    <span class="rotulo-info-aula">🎓 Turma</span>
                    <strong>${escaparHTML(nomeTurma)}</strong>
                </div>

                <div>
                    <span class="rotulo-info-aula">🏫 Curso técnico</span>
                    <strong>${escaparHTML(nomeCurso)}</strong>
                </div>

                <div>
                    <span class="rotulo-info-aula">📍 Local</span>
                    <strong>${escaparHTML(aula.local_aula || "Não informado")}</strong>
                </div>

            </div>


            ${
                aula.descricao
                ? `
                    <div class="descricao-aula-organizada">
                        <strong>Resumo da aula:</strong>
                        <p>${escaparHTML(aula.descricao)}</p>
                    </div>
                `
                : ""
            }


            <div class="materiais-card-admin materiais-aula-organizada">
                ${aula.pdf_url ? `<span>📄 PDF</span>` : ""}
                ${aula.video_url ? `<span>🎥 Vídeo</span>` : ""}
                ${aula.atividade_url ? `<span>📝 Atividade</span>` : ""}
                ${aula.material_extra_url ? `<span>🔗 Extra</span>` : ""}
                ${aula.ativo ? `<span class="status-ativo-aula">✅ Ativa</span>` : `<span class="status-inativo-aula">🚫 Inativa</span>`}
            </div>


            <div class="acoes-card-aula-admin">

                <button onclick="editarAulaAdmin('${aula.id}')" class="btn-editar-aula">
                    ✏️ Editar Aula
                </button>

                <button onclick="ativarAulaDoDia('${aula.id}', '${aula.turma_id}')" class="btn-ativar-aula-dia">
                    ⭐ Ativar como Aula do Dia
                </button>

                <button onclick="desativarAula('${aula.id}')" class="btn-desativar-aula">
                    🚫 Desativar
                </button>

                <button onclick="excluirAula('${aula.id}')" class="btn-excluir-aula">
                    🗑️ Excluir
                </button>

            </div>

        </div>
    `;
}

async function desativarAula(id) {
    const confirmar = confirm("Deseja desativar esta aula?");

    if (!confirmar) {
        return;
    }

    const { error } = await banco
        .from("aulas")
        .update({
            ativo: false,
            aula_do_dia: false
        })
        .eq("id", id);

    if (error) {
        alert("Erro ao desativar aula: " + error.message);
        return;
    }

    alert("Aula desativada com sucesso!");
    carregarAulasAdmin();
}

async function excluirAula(id) {
    const confirmar = confirm("Tem certeza que deseja excluir esta aula?");

    if (!confirmar) {
        return;
    }

    const { error } = await banco
        .from("aulas")
        .delete()
        .eq("id", id);

    if (error) {
        alert("Erro ao excluir aula: " + error.message);
        return;
    }

    alert("Aula excluída com sucesso!");
    carregarAulasAdmin();
}


// =====================================================
// 11. PORTFÓLIOS
// =====================================================

const btnCarregarAdmin = document.getElementById("btnCarregarAdmin");

if (btnCarregarAdmin) {
    btnCarregarAdmin.addEventListener("click", carregarPortfoliosAdmin);
}

async function carregarPortfoliosAdmin() {
    const lista = document.getElementById("listaAdminPortfolios");

    if (!lista) {
        return;
    }

    const filtroNome = document.getElementById("filtroNomePortfolio");
    const filtroData = document.getElementById("filtroDataPortfolio");

    const nomeBuscado = filtroNome ? filtroNome.value.trim() : "";
    const dataBuscada = filtroData ? filtroData.value : "";

    lista.innerHTML = "<p>Carregando portfólios...</p>";

    let consulta = banco
        .from("portfolio_alunos")
        .select("id, nome_aluno, telefone, email, link_site, link_video, autorizado, aprovado, criado_em")
        .order("criado_em", { ascending: false });

    if (nomeBuscado) {
        consulta = consulta.ilike("nome_aluno", `%${nomeBuscado}%`);
    }

    if (dataBuscada) {
        const inicioDia = `${dataBuscada}T00:00:00`;
        const fimDia = `${dataBuscada}T23:59:59`;

        consulta = consulta
            .gte("criado_em", inicioDia)
            .lte("criado_em", fimDia);
    }

    const { data, error } = await consulta;

    if (error) {
        lista.innerHTML = `<p>Erro ao carregar portfólios: ${error.message}</p>`;
        return;
    }

    if (!data || data.length === 0) {
        lista.innerHTML = "<p>Nenhum portfólio encontrado.</p>";
        return;
    }

    lista.innerHTML = "";

    data.forEach(function (aluno) {
        lista.innerHTML += `
            <div class="card-portfolio-admin">
                <h3>${escaparHTML(aluno.nome_aluno || "Aluno sem nome")}</h3>

                <p><strong>Telefone:</strong> ${escaparHTML(aluno.telefone || "Não informado")}</p>
                <p><strong>E-mail:</strong> ${escaparHTML(aluno.email || "Não informado")}</p>

                <p>
                    <strong>Site:</strong>
                    <a href="${escaparAtributo(aluno.link_site || "#")}" target="_blank" rel="noopener noreferrer">
                        Acessar site
                    </a>
                </p>

                ${
                    aluno.link_video
                    ? `
                        <p>
                            <strong>Vídeo:</strong>
                            <a href="${escaparAtributo(aluno.link_video)}" target="_blank" rel="noopener noreferrer">
                                Assistir vídeo
                            </a>
                        </p>
                    `
                    : ""
                }

                <p><strong>Autorizado:</strong> ${aluno.autorizado ? "Sim" : "Não"}</p>
                <p><strong>Aprovado:</strong> ${aluno.aprovado ? "Sim" : "Não"}</p>
                <p><strong>Data de envio:</strong> ${new Date(aluno.criado_em).toLocaleString("pt-BR")}</p>

                <button onclick="aprovarPortfolio('${aluno.id}')">✅ Aprovar</button>
                <button onclick="ocultarPortfolio('${aluno.id}')">🚫 Ocultar</button>
                <button onclick="excluirPortfolio('${aluno.id}')">🗑️ Excluir</button>
            </div>
        `;
    });
}

const btnFiltrarPortfolios = document.getElementById("btnFiltrarPortfolios");

if (btnFiltrarPortfolios) {
    btnFiltrarPortfolios.addEventListener("click", carregarPortfoliosAdmin);
}

const btnLimparFiltroPortfolios = document.getElementById("btnLimparFiltroPortfolios");

if (btnLimparFiltroPortfolios) {
    btnLimparFiltroPortfolios.addEventListener("click", function () {
        limparCampoSeExistir("filtroNomePortfolio");
        limparCampoSeExistir("filtroDataPortfolio");
        carregarPortfoliosAdmin();
    });
}

async function aprovarPortfolio(id) {
    const { error } = await banco
        .from("portfolio_alunos")
        .update({ aprovado: true })
        .eq("id", id);

    if (error) {
        alert("Erro ao aprovar: " + error.message);
        return;
    }

    alert("Portfólio aprovado!");
    carregarPortfoliosAdmin();
}

async function ocultarPortfolio(id) {
    const { error } = await banco
        .from("portfolio_alunos")
        .update({ aprovado: false })
        .eq("id", id);

    if (error) {
        alert("Erro ao ocultar: " + error.message);
        return;
    }

    alert("Portfólio ocultado!");
    carregarPortfoliosAdmin();
}

async function excluirPortfolio(id) {
    const confirmar = confirm("Tem certeza que deseja excluir este portfólio?");

    if (!confirmar) {
        return;
    }

    const { error } = await banco
        .from("portfolio_alunos")
        .delete()
        .eq("id", id);

    if (error) {
        alert("Erro ao excluir: " + error.message);
        return;
    }

    alert("Portfólio excluído!");
    carregarPortfoliosAdmin();
}


// =====================================================
// 12. UPLOAD / PRÉ-VISUALIZAÇÃO
// =====================================================

async function enviarArquivoParaStorage(inputFile, pastaDestino) {
    if (!inputFile || !inputFile.files || inputFile.files.length === 0) {
        return null;
    }

    const arquivo = inputFile.files[0];

    const nomeSeguro = arquivo.name
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, "-")
        .replace(/[^a-zA-Z0-9.\-_]/g, "")
        .toLowerCase();

    const caminhoArquivo = `${pastaDestino}/${Date.now()}-${nomeSeguro}`;

    const { error } = await banco.storage
        .from("materiais")
        .upload(caminhoArquivo, arquivo, {
            cacheControl: "3600",
            upsert: false,
            contentType: arquivo.type
        });

    if (error) {
        alert("Erro ao enviar arquivo: " + error.message);
        return null;
    }

    const { data } = banco.storage
        .from("materiais")
        .getPublicUrl(caminhoArquivo);

    return data.publicUrl;
}

function identificarTipoMidia(url) {
    if (!url) {
        return "vazio";
    }

    const texto = url.toLowerCase();

    if (texto.includes("youtube.com/watch") || texto.includes("youtu.be/")) {
        return "youtube";
    }

    if (
        texto.endsWith(".jpg") ||
        texto.endsWith(".jpeg") ||
        texto.endsWith(".png") ||
        texto.endsWith(".webp") ||
        texto.endsWith(".gif")
    ) {
        return "imagem";
    }

    if (texto.endsWith(".mp4")) {
        return "video";
    }

    if (texto.endsWith(".pdf")) {
        return "pdf";
    }

    return "link";
}

function converterYoutubeParaEmbed(url) {
    try {
        const endereco = new URL(url);

        if (endereco.hostname.includes("youtu.be")) {
            const idVideo = endereco.pathname.replace("/", "");
            return `https://www.youtube.com/embed/${idVideo}`;
        }

        if (endereco.hostname.includes("youtube.com")) {
            const idVideo = endereco.searchParams.get("v");
            return `https://www.youtube.com/embed/${idVideo}`;
        }

        return url;
    } catch (erro) {
        return url;
    }
}

function mostrarPreviewMidia(url, elementoPreviewId) {
    const preview = document.getElementById(elementoPreviewId);

    if (!preview) {
        return;
    }

    if (!url) {
        preview.innerHTML = "<p>Nenhuma mídia informada.</p>";
        return;
    }

    const tipo = identificarTipoMidia(url);

    if (tipo === "youtube") {
        const embed = converterYoutubeParaEmbed(url);

        preview.innerHTML = `
            <iframe
                width="100%"
                height="315"
                src="${escaparAtributo(embed)}"
                title="Vídeo do YouTube"
                frameborder="0"
                allowfullscreen>
            </iframe>
        `;
        return;
    }

    if (tipo === "imagem") {
        preview.innerHTML = `
            <img
                src="${escaparAtributo(url)}"
                alt="Pré-visualização da imagem"
                class="preview-imagem-admin"
            >
        `;
        return;
    }

    if (tipo === "video") {
        preview.innerHTML = `
            <video controls width="100%">
                <source src="${escaparAtributo(url)}" type="video/mp4">
                Seu navegador não suporta vídeo.
            </video>
        `;
        return;
    }

    if (tipo === "pdf") {
        preview.innerHTML = `
            <iframe
                src="${escaparAtributo(url)}"
                width="100%"
                height="400">
            </iframe>
        `;
        return;
    }

    preview.innerHTML = `
        <p>
            Link informado:
            <a href="${escaparAtributo(url)}" target="_blank" rel="noopener noreferrer">
                ${escaparHTML(url)}
            </a>
        </p>
    `;
}

const btnPreviewTurmaMidia = document.getElementById("btnPreviewTurmaMidia");

if (btnPreviewTurmaMidia) {
    btnPreviewTurmaMidia.addEventListener("click", function () {
        const url = pegarValorCampo("novaTurmaFoto");
        mostrarPreviewMidia(url, "previewTurmaMidia");
    });
}


// =====================================================
// 13. DATA / FERIADO
// =====================================================

const btnDataHoje = document.getElementById("btnDataHoje");

if (btnDataHoje) {
    btnDataHoje.addEventListener("click", function () {
        const campoData = document.getElementById("adminDataAula");

        if (!campoData) {
            return;
        }

        const hoje = new Date();

        const ano = hoje.getFullYear();
        const mes = String(hoje.getMonth() + 1).padStart(2, "0");
        const dia = String(hoje.getDate()).padStart(2, "0");

        campoData.value = `${ano}-${mes}-${dia}`;

        verificarFeriadoOuFimDeSemana(campoData.value);
    });
}

const feriadosFixos = [
    "01-01",
    "04-21",
    "05-01",
    "09-07",
    "10-12",
    "11-02",
    "11-15",
    "12-25"
];

function verificarFeriadoOuFimDeSemana(dataTexto) {
    const mensagem = document.getElementById("mensagemDataAula");

    if (!dataTexto || !mensagem) {
        return true;
    }

    const data = new Date(dataTexto + "T00:00:00");
    const diaSemana = data.getDay();
    const mesDia = dataTexto.substring(5);

    if (diaSemana === 0) {
        mensagem.textContent = "Atenção: a data escolhida cai em um domingo.";
        return false;
    }

    if (diaSemana === 6) {
        mensagem.textContent = "Atenção: a data escolhida cai em um sábado.";
        return false;
    }

    if (feriadosFixos.includes(mesDia)) {
        mensagem.textContent = "Atenção: a data escolhida parece ser feriado nacional.";
        return false;
    }

    mensagem.textContent = "Data disponível para planejamento.";
    return true;
}

const campoDataAula = document.getElementById("adminDataAula");

if (campoDataAula) {
    campoDataAula.addEventListener("change", function () {
        verificarFeriadoOuFimDeSemana(campoDataAula.value);
    });
}


// =====================================================
// 14. ASSISTENTE IA
// =====================================================

let ultimoConteudoGeradoIA = "";
let ultimoTipoGeradoIA = "";

async function gerarConteudoIA(tipo) {
    const promptCampo = document.getElementById("promptIA");
    const contextoCampo = document.getElementById("contextoIA");
    const resultadoIA = document.getElementById("resultadoIA");
    const mensagemIA = document.getElementById("mensagemIA");

    if (!promptCampo || !resultadoIA || !mensagemIA) {
        alert("Erro: área da IA não encontrada no HTML.");
        return;
    }

    const prompt = promptCampo.value.trim();
    const contexto = contextoCampo ? contextoCampo.value.trim() : "";

    if (!prompt) {
        mensagemIA.textContent = "Digite um pedido para a IA antes de gerar.";
        return;
    }

    mensagemIA.textContent = "Gerando conteúdo com IA. Aguarde...";
    resultadoIA.innerHTML = "<p>⏳ A IA está preparando o conteúdo...</p>";

    try {
        const resposta = await fetch("/.netlify/functions/generate-content", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                tipo: tipo,
                prompt: prompt,
                contexto: contexto
            })
        });

        let dados = {};

        try {
            dados = await resposta.json();
        } catch (erroJson) {
            dados = {
                error: "A resposta da função não veio em JSON.",
                details: "Verifique se a Netlify Function foi publicada corretamente."
            };
        }

        if (!resposta.ok) {
            mensagemIA.textContent = "Erro ao gerar conteúdo.";

            resultadoIA.innerHTML = `
                <p><strong>Erro:</strong> ${escaparHTML(dados.error || "Falha desconhecida.")}</p>
                <p>${escaparHTML(typeof dados.details === "string" ? dados.details : JSON.stringify(dados.details))}</p>
            `;

            return;
        }

        ultimoConteudoGeradoIA = dados.conteudo || "";
        ultimoTipoGeradoIA = tipo;

        mensagemIA.textContent = "Conteúdo gerado com sucesso!";

        resultadoIA.innerHTML = `
            <div class="conteudo-gerado-ia">
                ${formatarTextoIAParaHTML(ultimoConteudoGeradoIA)}
            </div>
        `;

    } catch (erro) {
        mensagemIA.textContent = "Erro de conexão com a função da IA.";

        resultadoIA.innerHTML = `
            <p>
                Não foi possível conectar com a IA.
                Verifique se a função Netlify foi publicada e se a variável
                <strong>OPENROUTER_API_KEY</strong> está configurada no Netlify.
            </p>
            <p><strong>Detalhes:</strong> ${escaparHTML(erro.message)}</p>
        `;
    }
}

function formatarTextoIAParaHTML(texto) {
    if (!texto) {
        return "<p>Nenhum conteúdo gerado.</p>";
    }

    return texto
        .toString()
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replace(/\n\n/g, "</p><p>")
        .replace(/\n/g, "<br>")
        .replace(/^/, "<p>")
        .replace(/$/, "</p>");
}

async function copiarResultadoIA() {
    if (!ultimoConteudoGeradoIA) {
        alert("Nenhum conteúdo gerado ainda.");
        return;
    }

    try {
        await navigator.clipboard.writeText(ultimoConteudoGeradoIA);
        alert("Conteúdo copiado com sucesso!");
    } catch (erro) {
        alert("Não foi possível copiar automaticamente. Selecione o texto manualmente.");
    }
}

function enviarResultadoParaAula() {
    if (!ultimoConteudoGeradoIA) {
        alert("Nenhum conteúdo gerado ainda.");
        return;
    }

    const tituloAula = document.getElementById("adminTituloAula");
    const descricaoAula = document.getElementById("adminDescricaoAula");
    const desafioAula = document.getElementById("adminDesafioAula");

    if (tituloAula && !tituloAula.value) {
        tituloAula.value = `Conteúdo gerado por IA - ${ultimoTipoGeradoIA}`;
    }

    if (descricaoAula) {
        descricaoAula.value = ultimoConteudoGeradoIA;
    }

    if (desafioAula && ultimoTipoGeradoIA === "rubrica") {
        desafioAula.value = ultimoConteudoGeradoIA;
    }

    alert("Conteúdo enviado para os campos da aula. Abra a seção Aulas para revisar e salvar.");
}


// =====================================================
// 15. FERRAMENTAS SIMPLES PARA TEXTO
// =====================================================

function inserirMarcacaoTexto(idCampo, antes, depois) {
    const campo = document.getElementById(idCampo);

    if (!campo) {
        return;
    }

    const inicio = campo.selectionStart || 0;
    const fim = campo.selectionEnd || 0;
    const texto = campo.value || "";
    const selecionado = texto.substring(inicio, fim);

    campo.value =
        texto.substring(0, inicio) +
        antes +
        selecionado +
        depois +
        texto.substring(fim);

    campo.focus();
}

function aumentarFonteCampo(idCampo) {
    const campo = document.getElementById(idCampo);

    if (!campo) {
        return;
    }

    const tamanhoAtual = parseInt(window.getComputedStyle(campo).fontSize) || 16;
    campo.style.fontSize = (tamanhoAtual + 2) + "px";
}

function diminuirFonteCampo(idCampo) {
    const campo = document.getElementById(idCampo);

    if (!campo) {
        return;
    }

    const tamanhoAtual = parseInt(window.getComputedStyle(campo).fontSize) || 16;
    campo.style.fontSize = Math.max(12, tamanhoAtual - 2) + "px";
}

function trocarFonteCampo(idCampo, fonte) {
    const campo = document.getElementById(idCampo);

    if (!campo) {
        return;
    }

    campo.style.fontFamily = fonte;
}


// =====================================================
// 16. HELPERS
// =====================================================

function pegarValorCampo(idCampo) {
    const campo = document.getElementById(idCampo);

    if (!campo) {
        return "";
    }

    return campo.value.trim();
}

function limparCampoSeExistir(idCampo) {
    const campo = document.getElementById(idCampo);

    if (campo) {
        campo.value = "";
    }
}

function preencherCampoSeExistir(idCampo, valor) {
    const campo = document.getElementById(idCampo);

    if (campo) {
        campo.value = valor;
    }
}

function preencherTexto(idElemento, valor) {
    const elemento = document.getElementById(idElemento);

    if (elemento) {
        elemento.textContent = valor;
    }
}

function formatarHorarioInputAdmin(horario) {
    if (!horario) {
        return "";
    }

    return horario.toString().substring(0, 5);
}

function formatarDataAdmin(dataTexto) {
    if (!dataTexto) {
        return "Não informada";
    }

    const partes = dataTexto.split("-");

    if (partes.length !== 3) {
        return dataTexto;
    }

    return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function formatarHorarioAdmin(horario) {
    if (!horario) {
        return "--:--";
    }

    return horario.substring(0, 5);
}

function escaparHTML(texto) {
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

function escaparAtributo(texto) {
    if (!texto) {
        return "";
    }

    return texto
        .toString()
        .replaceAll("&", "&amp;")
        .replaceAll('"', "&quot;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;");
}


// =====================================================
// 17. EXPOR FUNÇÕES PARA O HTML
// =====================================================

window.gerarConteudoIA = gerarConteudoIA;
window.copiarResultadoIA = copiarResultadoIA;
window.enviarResultadoParaAula = enviarResultadoParaAula;

window.ativarAulaDoDia = ativarAulaDoDia;
window.desativarAula = desativarAula;
window.excluirAula = excluirAula;
window.editarAulaAdmin = editarAulaAdmin;

window.editarTurmaAdmin = editarTurmaAdmin;
window.desativarTurmaAdmin = desativarTurmaAdmin;
window.reativarTurmaAdmin = reativarTurmaAdmin;
window.excluirTurmaAdmin = excluirTurmaAdmin;

window.inserirMarcacaoTexto = inserirMarcacaoTexto;
window.aumentarFonteCampo = aumentarFonteCampo;
window.diminuirFonteCampo = diminuirFonteCampo;
window.trocarFonteCampo = trocarFonteCampo;

window.editarAlunoPaeet = editarAlunoPaeet;
window.abrirAtendimentoPaeet = abrirAtendimentoPaeet;
window.carregarHistoricoPaeet = carregarHistoricoPaeet;
window.concluirAcompanhamentoPaeet = concluirAcompanhamentoPaeet;
window.excluirAlunoPaeet = excluirAlunoPaeet;
// =====================================================
// PAEET - APOIA TÉCNICO RIOLANDO
// =====================================================

const btnSalvarAlunoPaeet = document.getElementById("btnSalvarAlunoPaeet");
const btnCarregarAlunosPaeet = document.getElementById("btnCarregarAlunosPaeet");
const btnFiltrarPaeet = document.getElementById("btnFiltrarPaeet");
const btnLimparFiltroPaeet = document.getElementById("btnLimparFiltroPaeet");
const btnSalvarAtendimentoPaeet = document.getElementById("btnSalvarAtendimentoPaeet");
const btnCancelarAtendimentoPaeet = document.getElementById("btnCancelarAtendimentoPaeet");

if (btnSalvarAlunoPaeet) {
    btnSalvarAlunoPaeet.addEventListener("click", salvarAlunoPaeet);
}

if (btnCarregarAlunosPaeet) {
    btnCarregarAlunosPaeet.addEventListener("click", carregarAlunosPaeet);
}

if (btnFiltrarPaeet) {
    btnFiltrarPaeet.addEventListener("click", carregarAlunosPaeet);
}

if (btnLimparFiltroPaeet) {
    btnLimparFiltroPaeet.addEventListener("click", function () {
        limparCampoSeExistir("filtroPaeetNome");
        preencherCampoSeExistir("filtroPaeetSituacao", "todos");
        carregarAlunosPaeet();
    });
}

if (btnSalvarAtendimentoPaeet) {
    btnSalvarAtendimentoPaeet.addEventListener("click", salvarAtendimentoPaeet);
}

if (btnCancelarAtendimentoPaeet) {
    btnCancelarAtendimentoPaeet.addEventListener("click", cancelarAtendimentoPaeet);
}

// =====================================================
// SOLICITAÇÕES DE AJUDA DOS ALUNOS
// =====================================================

// =====================================================
// SOLICITAÇÕES DE AJUDA DOS ALUNOS
// Integração com a Área do Aluno
// Status válidos no banco:
// enviado, em_analise, respondido, resolvido, arquivado
// =====================================================

const btnCarregarSolicitacoesAjuda = document.getElementById("btnCarregarSolicitacoesAjuda");
const filtroStatusSolicitacoesAjuda = document.getElementById("filtroStatusSolicitacoesAjuda");
const filtroTurmaSolicitacoesAjuda = document.getElementById("filtroTurmaSolicitacoesAjuda");
const filtroNomeSolicitacoesAjuda = document.getElementById("filtroNomeSolicitacoesAjuda");

if (btnCarregarSolicitacoesAjuda) {
    btnCarregarSolicitacoesAjuda.addEventListener("click", carregarSolicitacoesAjudaAdmin);
}

if (filtroStatusSolicitacoesAjuda) {
    filtroStatusSolicitacoesAjuda.addEventListener("change", carregarSolicitacoesAjudaAdmin);
}

if (filtroTurmaSolicitacoesAjuda) {
    filtroTurmaSolicitacoesAjuda.addEventListener("input", carregarSolicitacoesAjudaAdmin);
}

if (filtroNomeSolicitacoesAjuda) {
    filtroNomeSolicitacoesAjuda.addEventListener("input", carregarSolicitacoesAjudaAdmin);
}


async function carregarSolicitacoesAjudaAdmin() {
    const lista = document.getElementById("listaSolicitacoesAjudaAdmin");

    if (!lista) {
        console.log("Elemento listaSolicitacoesAjudaAdmin não encontrado no admin.html.");
        return;
    }

    lista.innerHTML = "<p>Carregando solicitações de ajuda dos alunos...</p>";

    let consulta = banco
        .from("solicitacoes_ajuda")
        .select("*")
        .order("criado_em", { ascending: false });

    if (filtroStatusSolicitacoesAjuda && filtroStatusSolicitacoesAjuda.value !== "todos") {
        consulta = consulta.eq("status", filtroStatusSolicitacoesAjuda.value);
    }

    if (filtroTurmaSolicitacoesAjuda && filtroTurmaSolicitacoesAjuda.value.trim()) {
        consulta = consulta.ilike("turma", `%${filtroTurmaSolicitacoesAjuda.value.trim()}%`);
    }

    if (filtroNomeSolicitacoesAjuda && filtroNomeSolicitacoesAjuda.value.trim()) {
        consulta = consulta.ilike("nome_aluno", `%${filtroNomeSolicitacoesAjuda.value.trim()}%`);
    }

    const { data, error } = await consulta;

    if (error) {
        lista.innerHTML = `
            <p class="mensagem-erro-admin">
                Erro ao carregar solicitações: ${escaparHTML(error.message)}
            </p>
        `;

        console.log("Erro ao carregar solicitações de ajuda:", error);
        return;
    }

    if (!data || data.length === 0) {
        lista.innerHTML = `
            <div class="card-vazio-admin">
                <h4>📭 Nenhuma solicitação encontrada</h4>
                <p>Quando os alunos enviarem pedidos de ajuda, eles aparecerão aqui.</p>
            </div>
        `;
        return;
    }

    const resumo = montarResumoSolicitacoesAjuda(data);

    lista.innerHTML = `
        <div class="resumo-solicitacoes-ajuda-admin">
            <div>
                <strong>${resumo.total}</strong>
                <span>Total</span>
            </div>

            <div>
                <strong>${resumo.enviado}</strong>
                <span>Enviados</span>
            </div>

            <div>
                <strong>${resumo.em_analise}</strong>
                <span>Em análise</span>
            </div>

            <div>
                <strong>${resumo.respondido}</strong>
                <span>Respondidos</span>
            </div>

            <div>
                <strong>${resumo.resolvido}</strong>
                <span>Resolvidos</span>
            </div>
        </div>
    `;

    data.forEach(function (pedido) {
        lista.innerHTML += montarCardSolicitacaoAjudaAdmin(pedido);
    });
}


function montarResumoSolicitacoesAjuda(lista) {
    return {
        total: lista.length,
        enviado: lista.filter(item => item.status === "enviado").length,
        em_analise: lista.filter(item => item.status === "em_analise").length,
        respondido: lista.filter(item => item.status === "respondido").length,
        resolvido: lista.filter(item => item.status === "resolvido").length,
        arquivado: lista.filter(item => item.status === "arquivado").length
    };
}


function montarCardSolicitacaoAjudaAdmin(pedido) {
    const status = pedido.status || "enviado";
    const idSeguro = escaparAtributo(pedido.id);

    return `
        <div class="card-solicitacao-ajuda status-${escaparAtributo(status)}">

            <div class="topo-card-aluno-paeet">

                <div>
                    <h4>${escaparHTML(pedido.nome_aluno || "Aluno sem nome")}</h4>

                    <p class="subinfo-solicitacao-ajuda">
                        ${escaparHTML(pedido.email_aluno || "E-mail não informado")}
                    </p>
                </div>

                <span class="selo-paeet status-ajuda-${escaparAtributo(status)}">
                    ${nomeStatusSolicitacaoAjuda(status)}
                </span>

            </div>


            <div class="grid-info-solicitacao-ajuda">

                <p>
                    <strong>Turma:</strong>
                    ${escaparHTML(pedido.turma || "Não informada")}
                </p>

                <p>
                    <strong>Curso:</strong>
                    ${formatarCursoSolicitacaoAjuda(pedido.curso)}
                </p>

                <p>
                    <strong>Tipo de ajuda:</strong>
                    ${formatarTipoAjudaAdmin(pedido.tipo_ajuda)}
                </p>

                <p>
                    <strong>Enviado em:</strong>
                    ${formatarDataHoraAdminCompleta(pedido.criado_em)}
                </p>

            </div>


            <div class="bloco-solicitacao-ajuda-admin">

                <strong>Mensagem do aluno:</strong>

                <p class="texto-solicitacao-ajuda">
                    ${escaparHTML(pedido.mensagem || "Sem mensagem")}
                </p>

            </div>


            <div class="bloco-resposta-ajuda-admin">

                <label for="respostaAjuda_${idSeguro}">
                    Resposta / orientação do professor
                </label>

                <textarea
                    id="respostaAjuda_${idSeguro}"
                    class="textarea-resposta-ajuda-admin"
                    placeholder="Digite a devolutiva para o aluno..."
                >${escaparHTML(pedido.resposta_professor || "")}</textarea>

                ${
                    pedido.respondido_em
                        ? `
                            <p class="data-resposta-ajuda-admin">
                                Última resposta em ${formatarDataHoraAdminCompleta(pedido.respondido_em)}
                            </p>
                        `
                        : ""
                }

            </div>


            <div class="acoes-paeet acoes-solicitacao-ajuda">

                <button type="button" onclick="marcarSolicitacaoAjuda('${idSeguro}', 'em_analise')">
                    🔵 Em análise
                </button>

                <button type="button" onclick="responderSolicitacaoAjuda('${idSeguro}')">
                    🟢 Responder aluno
                </button>

                <button type="button" onclick="marcarSolicitacaoAjuda('${idSeguro}', 'resolvido')">
                    ✅ Resolvido
                </button>

                <button type="button" onclick="transformarSolicitacaoEmAcompanhamento('${idSeguro}')">
                    🧭 Criar acompanhamento PAEET
                </button>

                <button type="button" onclick="marcarSolicitacaoAjuda('${idSeguro}', 'arquivado')">
                    📦 Arquivar
                </button>

                <button type="button" onclick="excluirSolicitacaoAjuda('${idSeguro}')" class="btn-excluir-solicitacao">
                    🗑️ Excluir
                </button>

            </div>

        </div>
    `;
}


function nomeStatusSolicitacaoAjuda(status) {
    const nomes = {
        enviado: "🟡 Enviado",
        em_analise: "🔵 Em análise",
        respondido: "🟢 Respondido",
        resolvido: "✅ Resolvido",
        arquivado: "⚪ Arquivado"
    };

    return nomes[status] || "🟡 Enviado";
}


function formatarTipoAjudaAdmin(tipo) {
    const nomes = {
        duvida_atividade: "Dúvida em atividade",
        dificuldade_projeto: "Dificuldade em projeto",
        organizacao_estudos: "Organização dos estudos",
        apoio_paeet: "Apoio PAEET",
        problema_acesso: "Problema de acesso ao sistema",
        outro: "Outro assunto"
    };

    return nomes[tipo] || tipo || "Não informado";
}


function formatarCursoSolicitacaoAjuda(curso) {
    const nomes = {
        todos: "Todos",
        desenvolvimento_sistemas: "Desenvolvimento de Sistemas",
        vendas: "Vendas",
        substituicoes: "Substituições",
        apoio_pedagogico: "Apoio Pedagógico",
        outro: "Outro"
    };

    return escaparHTML(nomes[curso] || curso || "Não informado");
}


function formatarDataHoraAdminCompleta(dataTexto) {
    if (!dataTexto) {
        return "Não informado";
    }

    const data = new Date(dataTexto);

    if (isNaN(data.getTime())) {
        return "Não informado";
    }

    return data.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
    }) + " às " + data.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit"
    });
}


async function marcarSolicitacaoAjuda(idPedido, novoStatus) {
    const statusValidos = [
        "enviado",
        "em_analise",
        "respondido",
        "resolvido",
        "arquivado"
    ];

    if (!statusValidos.includes(novoStatus)) {
        alert("Status inválido: " + novoStatus);
        return;
    }

    const confirmar = confirm(
        "Deseja alterar o status deste chamado para: " +
        nomeStatusSolicitacaoAjuda(novoStatus) +
        "?"
    );

    if (!confirmar) {
        return;
    }

    const dadosAtualizacao = {
        status: novoStatus,
        atualizado_em: new Date().toISOString()
    };

    if (novoStatus === "respondido" || novoStatus === "resolvido") {
        dadosAtualizacao.respondido_em = new Date().toISOString();
    }

    const { error } = await banco
        .from("solicitacoes_ajuda")
        .update(dadosAtualizacao)
        .eq("id", idPedido);

    if (error) {
        alert("Erro ao atualizar solicitação: " + error.message);
        console.log("Erro ao atualizar solicitação:", error);
        return;
    }

    await carregarSolicitacoesAjudaAdmin();
}


async function responderSolicitacaoAjuda(idPedido) {
    const campoResposta = document.getElementById("respostaAjuda_" + idPedido);

    if (!campoResposta) {
        alert("Campo de resposta não encontrado.");
        return;
    }

    const resposta = campoResposta.value.trim();

    if (!resposta) {
        alert("Digite uma resposta para o aluno antes de salvar.");
        campoResposta.focus();
        return;
    }

    const { data: userData } = await banco.auth.getUser();

    const emailAdmin =
        userData &&
        userData.user &&
        userData.user.email
            ? userData.user.email
            : "Professor/Admin";

    const confirmar = confirm("Deseja enviar esta resposta para o aluno?");

    if (!confirmar) {
        return;
    }

    const { error } = await banco
        .from("solicitacoes_ajuda")
        .update({
            resposta_professor: resposta,
            respondido_por: emailAdmin,
            respondido_em: new Date().toISOString(),
            atualizado_em: new Date().toISOString(),
            status: "respondido"
        })
        .eq("id", idPedido);

    if (error) {
        alert("Erro ao salvar resposta: " + error.message);
        console.log("Erro ao responder solicitação:", error);
        return;
    }

    alert("Resposta enviada com sucesso! O aluno verá a devolutiva na Área do Aluno.");

    await carregarSolicitacoesAjudaAdmin();
}


async function excluirSolicitacaoAjuda(idPedido) {
    const confirmar = confirm(
        "Deseja excluir esta solicitação de ajuda?\n\nEssa ação removerá o chamado da área do aluno."
    );

    if (!confirmar) {
        return;
    }

    const { error } = await banco
        .from("solicitacoes_ajuda")
        .delete()
        .eq("id", idPedido);

    if (error) {
        alert("Erro ao excluir solicitação: " + error.message);
        console.log("Erro ao excluir solicitação:", error);
        return;
    }

    alert("Solicitação excluída com sucesso!");

    await carregarSolicitacoesAjudaAdmin();
}


async function transformarSolicitacaoEmAcompanhamento(idPedido) {
    const { data, error } = await banco
        .from("solicitacoes_ajuda")
        .select("*")
        .eq("id", idPedido)
        .maybeSingle();

    if (error || !data) {
        alert("Erro ao carregar solicitação.");
        console.log("Erro ao transformar solicitação:", error);
        return;
    }

    preencherCampoSeExistir("paeetNomeAluno", data.nome_aluno || "");
    preencherCampoSeExistir("paeetTurmaAluno", data.turma || "");
    preencherCampoSeExistir("paeetCursoAluno", data.curso || "");
    preencherCampoSeExistir("paeetSituacaoAluno", "amarelo");
    preencherCampoSeExistir("paeetDificuldadeAluno", formatarTipoAjudaAdmin(data.tipo_ajuda));
    preencherCampoSeExistir("paeetObservacaoAluno", data.mensagem || "");
    preencherCampoSeExistir("paeetProximoPassoAluno", "Realizar atendimento individual, registrar orientação e acompanhar a evolução do estudante.");

    const { error: erroStatus } = await banco
        .from("solicitacoes_ajuda")
        .update({
            status: "em_analise",
            atualizado_em: new Date().toISOString()
        })
        .eq("id", idPedido);

    if (erroStatus) {
        console.log("Erro ao marcar solicitação como em análise:", erroStatus);
    }

    const campoNome = document.getElementById("paeetNomeAluno");

    if (campoNome) {
        campoNome.scrollIntoView({
            behavior: "smooth",
            block: "center"
        });
    }

    alert("Dados enviados para o formulário de acompanhamento PAEET. Revise e clique em salvar.");

    await carregarSolicitacoesAjudaAdmin();
}


// Expor funções usadas nos botões HTML gerados dinamicamente
window.carregarSolicitacoesAjudaAdmin = carregarSolicitacoesAjudaAdmin;
window.marcarSolicitacaoAjuda = marcarSolicitacaoAjuda;
window.responderSolicitacaoAjuda = responderSolicitacaoAjuda;
window.excluirSolicitacaoAjuda = excluirSolicitacaoAjuda;
window.transformarSolicitacaoEmAcompanhamento = transformarSolicitacaoEmAcompanhamento;

// =====================================================
// SALVAR OU ATUALIZAR ALUNO EM ACOMPANHAMENTO
// =====================================================

async function salvarAlunoPaeet() {
    const mensagem = document.getElementById("mensagemPaeetAluno");

    const nome = pegarValorCampo("paeetNomeAluno");
    const turma = pegarValorCampo("paeetTurmaAluno");
    const curso = pegarValorCampo("paeetCursoAluno");
    const situacao = pegarValorCampo("paeetSituacaoAluno") || "verde";
    const dificuldade = pegarValorCampo("paeetDificuldadeAluno");
    const observacao = pegarValorCampo("paeetObservacaoAluno");
    const proximoPasso = pegarValorCampo("paeetProximoPassoAluno");

    if (!nome) {
        if (mensagem) {
            mensagem.textContent = "Preencha o nome do aluno.";
        }
        return;
    }

    const { data: userData } = await banco.auth.getUser();

    const dadosAluno = {
        nome_aluno: nome,
        turma: turma,
        curso: curso,
        situacao: situacao,
        dificuldade_principal: dificuldade,
        observacao: observacao,
        proximo_passo: proximoPasso,
        status: "em_acompanhamento",
        atualizado_em: new Date().toISOString()
    };

    if (!alunoPaeetEmEdicaoId) {
        dadosAluno.criado_por = userData && userData.user ? userData.user.id : null;
    }

    if (mensagem) {
        mensagem.textContent = alunoPaeetEmEdicaoId
            ? "Atualizando acompanhamento..."
            : "Salvando acompanhamento...";
    }

    let resultado;

    if (alunoPaeetEmEdicaoId) {
        resultado = await banco
            .from("alunos_acompanhamento")
            .update(dadosAluno)
            .eq("id", alunoPaeetEmEdicaoId);
    } else {
        resultado = await banco
            .from("alunos_acompanhamento")
            .insert([dadosAluno]);
    }

    if (resultado.error) {
        if (mensagem) {
            mensagem.textContent = "Erro ao salvar: " + resultado.error.message;
        }

        console.log("Erro PAEET:", resultado.error);
        return;
    }

    if (mensagem) {
        mensagem.textContent = alunoPaeetEmEdicaoId
            ? "Acompanhamento atualizado com sucesso!"
            : "Aluno cadastrado em acompanhamento com sucesso!";
    }

    alunoPaeetEmEdicaoId = null;

    limparFormularioAlunoPaeet();

    if (btnSalvarAlunoPaeet) {
        btnSalvarAlunoPaeet.textContent = "💾 Salvar acompanhamento";
    }

    await carregarAlunosPaeet();
}


// =====================================================
// CARREGAR ALUNOS ACOMPANHADOS
// =====================================================

async function carregarAlunosPaeet() {
    const lista = document.getElementById("listaAlunosPaeet");

    if (!lista) {
        return;
    }

    lista.innerHTML = "<p>Carregando acompanhamentos...</p>";

    const filtroNome = pegarValorCampo("filtroPaeetNome");
    const filtroSituacao = pegarValorCampo("filtroPaeetSituacao") || "todos";

    let consulta = banco
        .from("alunos_acompanhamento")
        .select("*")
        .order("atualizado_em", { ascending: false });

    if (filtroNome) {
        consulta = consulta.ilike("nome_aluno", `%${filtroNome}%`);
    }

    if (filtroSituacao && filtroSituacao !== "todos") {
        consulta = consulta.eq("situacao", filtroSituacao);
    }

    const { data, error } = await consulta;

    if (error) {
        lista.innerHTML = `<p>Erro ao carregar acompanhamentos: ${error.message}</p>`;
        console.log("Erro ao carregar PAEET:", error);
        return;
    }

    atualizarResumoPaeet(data || []);

    if (!data || data.length === 0) {
        lista.innerHTML = "<p>Nenhum aluno em acompanhamento encontrado.</p>";
        return;
    }

    lista.innerHTML = "";

    data.forEach(function (aluno) {
        lista.innerHTML += `
            <div class="card-aluno-paeet borda-${aluno.situacao || "verde"}">

                <div class="topo-card-aluno-paeet">
                    <h4>${escaparHTML(aluno.nome_aluno || "Aluno sem nome")}</h4>
                    <span class="selo-paeet situacao-${aluno.situacao || "verde"}">
                        ${nomeSituacaoPaeet(aluno.situacao)}
                    </span>
                </div>

                <p><strong>Turma:</strong> ${escaparHTML(aluno.turma || "Não informada")}</p>
                <p><strong>Curso:</strong> ${escaparHTML(aluno.curso || "Não informado")}</p>

                <p><strong>Dificuldade principal:</strong></p>
                <p>${escaparHTML(aluno.dificuldade_principal || "Não informada")}</p>

                <p><strong>Observação:</strong></p>
                <p>${escaparHTML(aluno.observacao || "Sem observação")}</p>

                <p><strong>Próximo passo:</strong></p>
                <p>${escaparHTML(aluno.proximo_passo || "Não informado")}</p>

                <div class="acoes-paeet">
                    <button type="button" onclick="editarAlunoPaeet('${aluno.id}')">
                        ✏️ Editar
                    </button>

                    <button type="button" onclick="abrirAtendimentoPaeet('${aluno.id}', '${escaparAtributo(aluno.nome_aluno || "")}')">
                        📝 Registrar atendimento
                    </button>

                    <button type="button" onclick="carregarHistoricoPaeet('${aluno.id}', '${escaparAtributo(aluno.nome_aluno || "")}')">
                        📚 Ver histórico
                    </button>

                    <button type="button" onclick="concluirAcompanhamentoPaeet('${aluno.id}')">
                        ✅ Concluir
                    </button>

                    <button type="button" onclick="excluirAlunoPaeet('${aluno.id}')">
                        🗑️ Excluir
                    </button>
                </div>

            </div>
        `;
    });
}


// =====================================================
// EDITAR ALUNO PAEET
// =====================================================

async function editarAlunoPaeet(idAluno) {
    const { data, error } = await banco
        .from("alunos_acompanhamento")
        .select("*")
        .eq("id", idAluno)
        .maybeSingle();

    if (error || !data) {
        alert("Erro ao carregar aluno para edição.");
        console.log("Erro editar PAEET:", error);
        return;
    }

    alunoPaeetEmEdicaoId = data.id;

    preencherCampoSeExistir("paeetNomeAluno", data.nome_aluno || "");
    preencherCampoSeExistir("paeetTurmaAluno", data.turma || "");
    preencherCampoSeExistir("paeetCursoAluno", data.curso || "");
    preencherCampoSeExistir("paeetSituacaoAluno", data.situacao || "verde");
    preencherCampoSeExistir("paeetDificuldadeAluno", data.dificuldade_principal || "");
    preencherCampoSeExistir("paeetObservacaoAluno", data.observacao || "");
    preencherCampoSeExistir("paeetProximoPassoAluno", data.proximo_passo || "");

    if (btnSalvarAlunoPaeet) {
        btnSalvarAlunoPaeet.textContent = "💾 Atualizar acompanhamento";
    }

    const mensagem = document.getElementById("mensagemPaeetAluno");

    if (mensagem) {
        mensagem.textContent = "Editando acompanhamento do aluno.";
    }

    const campoNome = document.getElementById("paeetNomeAluno");

    if (campoNome) {
        campoNome.scrollIntoView({
            behavior: "smooth",
            block: "center"
        });
    }
}


// =====================================================
// ABRIR ÁREA DE ATENDIMENTO
// =====================================================

function abrirAtendimentoPaeet(idAluno, nomeAluno) {
    alunoSelecionadoAtendimentoId = idAluno;
    nomeAlunoSelecionadoAtendimento = nomeAluno;

    const area = document.getElementById("areaAtendimentoPaeet");
    const textoAluno = document.getElementById("alunoSelecionadoAtendimentoPaeet");

    if (area) {
        area.style.display = "block";
    }

    if (textoAluno) {
        textoAluno.innerHTML = `<strong>Aluno selecionado:</strong> ${escaparHTML(nomeAluno)}`;
    }

    const hoje = new Date();
    const ano = hoje.getFullYear();
    const mes = String(hoje.getMonth() + 1).padStart(2, "0");
    const dia = String(hoje.getDate()).padStart(2, "0");

    preencherCampoSeExistir("paeetDataAtendimento", `${ano}-${mes}-${dia}`);

    if (area) {
        area.scrollIntoView({
            behavior: "smooth",
            block: "center"
        });
    }
}


// =====================================================
// SALVAR ATENDIMENTO
// =====================================================

async function salvarAtendimentoPaeet() {
    const mensagem = document.getElementById("mensagemAtendimentoPaeet");

    if (!alunoSelecionadoAtendimentoId) {
        if (mensagem) {
            mensagem.textContent = "Selecione um aluno antes de registrar atendimento.";
        }
        return;
    }

    const { data: userData } = await banco.auth.getUser();

    const dadosAtendimento = {
        aluno_id: Number(alunoSelecionadoAtendimentoId),
        data_atendimento: pegarValorCampo("paeetDataAtendimento") || null,
        motivo: pegarValorCampo("paeetMotivoAtendimento"),
        orientacao_realizada: pegarValorCampo("paeetOrientacaoAtendimento"),
        combinado: pegarValorCampo("paeetCombinadoAtendimento"),
        proximo_retorno: pegarValorCampo("paeetProximoRetorno") || null,
        professor_responsavel: pegarValorCampo("paeetProfessorResponsavel"),
        criado_por: userData && userData.user ? userData.user.id : null
    };

    if (!dadosAtendimento.motivo && !dadosAtendimento.orientacao_realizada) {
        if (mensagem) {
            mensagem.textContent = "Preencha pelo menos o motivo ou a orientação realizada.";
        }
        return;
    }

    if (mensagem) {
        mensagem.textContent = "Salvando atendimento...";
    }

    const { error } = await banco
        .from("atendimentos_paeet")
        .insert([dadosAtendimento]);

    if (error) {
        if (mensagem) {
            mensagem.textContent = "Erro ao salvar atendimento: " + error.message;
        }

        console.log("Erro atendimento PAEET:", error);
        return;
    }

    if (mensagem) {
        mensagem.textContent = "Atendimento salvo com sucesso!";
    }

    limparFormularioAtendimentoPaeet();

    await carregarHistoricoPaeet(alunoSelecionadoAtendimentoId, nomeAlunoSelecionadoAtendimento);
}


// =====================================================
// CARREGAR HISTÓRICO DE ATENDIMENTOS
// =====================================================

async function carregarHistoricoPaeet(idAluno, nomeAluno) {
    const historico = document.getElementById("historicoAtendimentosPaeet");

    if (!historico) {
        return;
    }

    historico.innerHTML = `<p>Carregando histórico de ${escaparHTML(nomeAluno)}...</p>`;

    const { data, error } = await banco
        .from("atendimentos_paeet")
        .select("*")
        .eq("aluno_id", idAluno)
        .order("data_atendimento", { ascending: false })
        .order("criado_em", { ascending: false });

    if (error) {
        historico.innerHTML = `<p>Erro ao carregar histórico: ${error.message}</p>`;
        console.log("Erro histórico PAEET:", error);
        return;
    }

    if (!data || data.length === 0) {
        historico.innerHTML = `
            <p>Nenhum atendimento registrado para <strong>${escaparHTML(nomeAluno)}</strong>.</p>
        `;
        return;
    }

    historico.innerHTML = `
        <h4>Histórico de ${escaparHTML(nomeAluno)}</h4>
    `;

    data.forEach(function (item) {
        historico.innerHTML += `
            <div class="card-historico-paeet">
                <p><strong>Data:</strong> ${formatarDataAdmin(item.data_atendimento)}</p>
                <p><strong>Motivo:</strong> ${escaparHTML(item.motivo || "Não informado")}</p>
                <p><strong>Orientação:</strong> ${escaparHTML(item.orientacao_realizada || "Não informada")}</p>
                <p><strong>Combinado:</strong> ${escaparHTML(item.combinado || "Não informado")}</p>
                <p><strong>Próximo retorno:</strong> ${formatarDataAdmin(item.proximo_retorno)}</p>
                <p><strong>Professor responsável:</strong> ${escaparHTML(item.professor_responsavel || "Não informado")}</p>
            </div>
        `;
    });
}


// =====================================================
// CONCLUIR ACOMPANHAMENTO
// =====================================================

async function concluirAcompanhamentoPaeet(idAluno) {
    const confirmar = confirm("Deseja marcar este acompanhamento como concluído?");

    if (!confirmar) {
        return;
    }

    const { error } = await banco
        .from("alunos_acompanhamento")
        .update({
            status: "concluido",
            situacao: "verde",
            atualizado_em: new Date().toISOString()
        })
        .eq("id", idAluno);

    if (error) {
        alert("Erro ao concluir acompanhamento: " + error.message);
        return;
    }

    alert("Acompanhamento concluído com sucesso!");
    await carregarAlunosPaeet();
}


// =====================================================
// EXCLUIR ALUNO DO ACOMPANHAMENTO
// =====================================================

async function excluirAlunoPaeet(idAluno) {
    const confirmar = confirm(
        "Tem certeza que deseja excluir este acompanhamento? O histórico vinculado também poderá ser removido."
    );

    if (!confirmar) {
        return;
    }

    const { error } = await banco
        .from("alunos_acompanhamento")
        .delete()
        .eq("id", idAluno);

    if (error) {
        alert("Erro ao excluir acompanhamento: " + error.message);
        return;
    }

    alert("Acompanhamento excluído com sucesso!");
    await carregarAlunosPaeet();
}


// =====================================================
// FUNÇÕES AUXILIARES PAEET
// =====================================================

function limparFormularioAlunoPaeet() {
    limparCampoSeExistir("paeetNomeAluno");
    limparCampoSeExistir("paeetTurmaAluno");
    limparCampoSeExistir("paeetCursoAluno");
    preencherCampoSeExistir("paeetSituacaoAluno", "verde");
    limparCampoSeExistir("paeetDificuldadeAluno");
    limparCampoSeExistir("paeetObservacaoAluno");
    limparCampoSeExistir("paeetProximoPassoAluno");
}

function limparFormularioAtendimentoPaeet() {
    limparCampoSeExistir("paeetMotivoAtendimento");
    limparCampoSeExistir("paeetOrientacaoAtendimento");
    limparCampoSeExistir("paeetCombinadoAtendimento");
    limparCampoSeExistir("paeetProximoRetorno");
}

function cancelarAtendimentoPaeet() {
    alunoSelecionadoAtendimentoId = null;
    nomeAlunoSelecionadoAtendimento = "";

    const area = document.getElementById("areaAtendimentoPaeet");

    if (area) {
        area.style.display = "none";
    }

    limparFormularioAtendimentoPaeet();
}

function nomeSituacaoPaeet(situacao) {
    const nomes = {
        verde: "🟢 Normal",
        amarelo: "🟡 Atenção",
        vermelho: "🔴 Intervenção"
    };

    return nomes[situacao] || "🟢 Normal";
}

function atualizarResumoPaeet(alunos) {
    const total = alunos.length;
    const verdes = alunos.filter(function (aluno) {
        return aluno.situacao === "verde";
    }).length;

    const amarelos = alunos.filter(function (aluno) {
        return aluno.situacao === "amarelo";
    }).length;

    const vermelhos = alunos.filter(function (aluno) {
        return aluno.situacao === "vermelho";
    }).length;

    preencherTexto("totalAlunosPaeet", total);
    preencherTexto("totalVerdePaeet", verdes);
    preencherTexto("totalAmareloPaeet", amarelos);
    preencherTexto("totalVermelhoPaeet", vermelhos);
}

window.aprovarPortfolio = aprovarPortfolio;
window.ocultarPortfolio = ocultarPortfolio;
window.excluirPortfolio = excluirPortfolio;
window.marcarSolicitacaoAjuda = marcarSolicitacaoAjuda;
window.excluirSolicitacaoAjuda = excluirSolicitacaoAjuda;
window.transformarSolicitacaoEmAcompanhamento = transformarSolicitacaoEmAcompanhamento;


// =====================================================
// 18. INICIAR
// =====================================================

configurarMenuSobrepostoAdmin();
configurarBotaoSairAdmin();
configurarPerfilAdminEditavel();
verificarSessaoAtual();

console.log("Funções do painel admin carregadas com sucesso.");

// =====================================================
// ACESSO PÚBLICO POR TURMA NA TELA DE LOGIN DO ADMIN
// =====================================================

document.addEventListener("DOMContentLoaded", function () {
    carregarTurmasPublicasNaTelaAdmin();
    configurarAcessoTurmaPublicaAdmin();
});

async function carregarTurmasPublicasNaTelaAdmin() {
    const select = document.getElementById("selectTurmaPublicaAdmin");
    const mensagem = document.getElementById("mensagemTurmaPublicaAdmin");

    if (!select) {
        return;
    }

    select.innerHTML = `<option value="">Carregando turmas...</option>`;

    const { data, error } = await banco
        .from("turmas")
        .select("id, nome_turma, curso")
        .eq("ativo", true)
        .order("nome_turma", { ascending: true });

    if (error) {
        console.log("Erro ao carregar turmas públicas:", error);

        select.innerHTML = `<option value="">Erro ao carregar turmas</option>`;

        if (mensagem) {
            mensagem.textContent = "Não foi possível carregar as turmas. Verifique a política pública no Supabase.";
        }

        return;
    }

    if (!data || data.length === 0) {
        select.innerHTML = `<option value="">Nenhuma turma ativa encontrada</option>`;

        if (mensagem) {
            mensagem.textContent = "Nenhuma turma ativa foi cadastrada ainda.";
        }

        return;
    }

    select.innerHTML = `<option value="">Selecione sua turma</option>`;

    data.forEach(function (turma) {
        select.innerHTML += `
            <option value="${turma.id}">
                ${escaparHTML(turma.nome_turma || "Turma")} - ${escaparHTML(turma.curso || "Curso")}
            </option>
        `;
    });

    if (mensagem) {
        mensagem.textContent = "Selecione a turma para acessar os materiais.";
    }
}

function configurarAcessoTurmaPublicaAdmin() {
    const btn = document.getElementById("btnEntrarTurmaPublica");
    const select = document.getElementById("selectTurmaPublicaAdmin");
    const mensagem = document.getElementById("mensagemTurmaPublicaAdmin");

    if (!btn || !select) {
        return;
    }

    btn.addEventListener("click", function () {
        const turmaId = select.value;

        if (!turmaId) {
            if (mensagem) {
                mensagem.textContent = "Selecione uma turma antes de continuar.";
            }

            select.focus();
            return;
        }

        window.location.href = "index.html?turma=" + encodeURIComponent(turmaId);
    });
}


// =====================================================
// GESTÃO DE ALUNOS - CADASTRO, LISTAGEM, RESET E CSV
// =====================================================

const btnGerarSenhaAlunoAdmin = document.getElementById("btnGerarSenhaAlunoAdmin");
const btnCriarAlunoAdmin = document.getElementById("btnCriarAlunoAdmin");
const btnCarregarAlunosAdmin = document.getElementById("btnCarregarAlunosAdmin");
const btnImportarCsvAlunosAdmin = document.getElementById("btnImportarCsvAlunosAdmin");

const filtroAlunoAdminNome = document.getElementById("filtroAlunoAdminNome");
const filtroAlunoAdminTurma = document.getElementById("filtroAlunoAdminTurma");
const filtroAlunoAdminStatus = document.getElementById("filtroAlunoAdminStatus");

if (btnGerarSenhaAlunoAdmin) {
    btnGerarSenhaAlunoAdmin.addEventListener("click", function () {
        const campoSenha = document.getElementById("gestaoAlunoSenha");

        if (campoSenha) {
            campoSenha.value = gerarSenhaTemporariaAluno();
        }
    });
}

if (btnCriarAlunoAdmin) {
    btnCriarAlunoAdmin.addEventListener("click", criarAlunoManualAdmin);
}

if (btnCarregarAlunosAdmin) {
    btnCarregarAlunosAdmin.addEventListener("click", carregarAlunosGestaoAdmin);
}

if (btnImportarCsvAlunosAdmin) {
    btnImportarCsvAlunosAdmin.addEventListener("click", importarAlunosCsvAdmin);
}

if (filtroAlunoAdminNome) {
    filtroAlunoAdminNome.addEventListener("input", carregarAlunosGestaoAdmin);
}

if (filtroAlunoAdminTurma) {
    filtroAlunoAdminTurma.addEventListener("input", carregarAlunosGestaoAdmin);
}

if (filtroAlunoAdminStatus) {
    filtroAlunoAdminStatus.addEventListener("change", carregarAlunosGestaoAdmin);
}


function gerarSenhaTemporariaAluno() {
    const ano = new Date().getFullYear();

    const numero = Math.floor(1000 + Math.random() * 9000);

    return "Riolando@" + ano + numero;
}


async function obterTokenAdminAtual() {
    const { data, error } = await banco.auth.getSession();

    if (error || !data || !data.session) {
        return "";
    }

    return data.session.access_token;
}


async function criarAlunoManualAdmin() {
    const mensagem = document.getElementById("mensagemGestaoAlunoAdmin");

    const nome = pegarValorCampo("gestaoAlunoNome");
    const email = pegarValorCampo("gestaoAlunoEmail").toLowerCase();
    const turma = pegarValorCampo("gestaoAlunoTurma");
    const curso = pegarValorCampo("gestaoAlunoCurso") || "desenvolvimento_sistemas";
    const senhaTemporaria = pegarValorCampo("gestaoAlunoSenha");

    if (!nome || !email || !senhaTemporaria) {
        if (mensagem) {
            mensagem.textContent = "Preencha nome, e-mail e senha temporária.";
        }
        return;
    }

    if (!email.includes("@")) {
        if (mensagem) {
            mensagem.textContent = "Digite um e-mail válido.";
        }
        return;
    }

    if (senhaTemporaria.length < 6) {
        if (mensagem) {
            mensagem.textContent = "A senha temporária precisa ter pelo menos 6 caracteres.";
        }
        return;
    }

    if (mensagem) {
        mensagem.textContent = "Criando aluno no Supabase Auth...";
    }

    const token = await obterTokenAdminAtual();

    if (!token) {
        if (mensagem) {
            mensagem.textContent = "Sessão administrativa expirada. Faça login novamente.";
        }
        return;
    }

    try {
        const resposta = await fetch("/.netlify/functions/criar-aluno", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + token
            },
            body: JSON.stringify({
                nome: nome,
                email: email,
                turma: turma,
                curso: curso,
                senhaTemporaria: senhaTemporaria
            })
        });

        const dados = await resposta.json();

        if (!resposta.ok || !dados.sucesso) {
            if (mensagem) {
                mensagem.textContent = dados.mensagem || "Erro ao criar aluno.";
            }
            return;
        }

        if (mensagem) {
            mensagem.textContent = "Aluno criado com sucesso! Senha temporária: " + senhaTemporaria;
        }

        limparCampoSeExistir("gestaoAlunoNome");
        limparCampoSeExistir("gestaoAlunoEmail");
        limparCampoSeExistir("gestaoAlunoTurma");
        limparCampoSeExistir("gestaoAlunoSenha");

        await carregarAlunosGestaoAdmin();

    } catch (erro) {
        console.log("Erro ao criar aluno:", erro);

        if (mensagem) {
            mensagem.textContent = "Erro de conexão ao criar aluno: " + erro.message;
        }
    }
}


async function carregarAlunosGestaoAdmin() {
    const lista = document.getElementById("listaAlunosAdmin");

    if (!lista) {
        return;
    }

    lista.innerHTML = "<p>Carregando alunos cadastrados...</p>";

    let consulta = banco
        .from("perfis")
        .select("*")
        .eq("funcao", "aluno")
        .order("nome", { ascending: true });

    if (filtroAlunoAdminNome && filtroAlunoAdminNome.value.trim()) {
        consulta = consulta.ilike("nome", "%" + filtroAlunoAdminNome.value.trim() + "%");
    }

    if (filtroAlunoAdminTurma && filtroAlunoAdminTurma.value.trim()) {
        consulta = consulta.ilike("turma", "%" + filtroAlunoAdminTurma.value.trim() + "%");
    }

    if (filtroAlunoAdminStatus) {
        if (filtroAlunoAdminStatus.value === "ativo") {
            consulta = consulta.eq("ativo", true);
        }

        if (filtroAlunoAdminStatus.value === "inativo") {
            consulta = consulta.eq("ativo", false);
        }

        if (filtroAlunoAdminStatus.value === "senha_temporaria") {
            consulta = consulta.eq("senha_temporaria", true);
        }
    }

    const { data, error } = await consulta;

    if (error) {
        lista.innerHTML = "<p>Erro ao carregar alunos: " + escaparHTML(error.message) + "</p>";
        console.log("Erro ao carregar alunos:", error);
        return;
    }

    if (!data || data.length === 0) {
        lista.innerHTML = `
            <div class="card-vazio-admin">
                <h4>📭 Nenhum aluno encontrado</h4>
                <p>Cadastre um aluno manualmente ou importe uma planilha CSV.</p>
            </div>
        `;
        return;
    }

    lista.innerHTML = "";

    data.forEach(function (aluno) {
        lista.innerHTML += montarCardAlunoGestaoAdmin(aluno);
    });
}


function montarCardAlunoGestaoAdmin(aluno) {
    const statusAcesso = aluno.ativo ? "Ativo" : "Inativo";
    const statusSenha = aluno.senha_temporaria ? "Senha temporária" : "Senha definitiva";

    return `
        <div class="card-solicitacao-ajuda">

            <div class="topo-card-aluno-paeet">

                <div>
                    <h4>${escaparHTML(aluno.nome || "Aluno sem nome")}</h4>

                    <p class="subinfo-solicitacao-ajuda">
                        ${escaparHTML(aluno.email || "E-mail não informado")}
                    </p>
                </div>

                <span class="selo-paeet">
                    ${aluno.ativo ? "🟢 Ativo" : "🔴 Inativo"}
                </span>

            </div>

            <div class="grid-info-solicitacao-ajuda">

                <p>
                    <strong>Turma:</strong>
                    ${escaparHTML(aluno.turma || "Não informada")}
                </p>

                <p>
                    <strong>Curso:</strong>
                    ${formatarCursoGestaoAluno(aluno.curso)}
                </p>

                <p>
                    <strong>Acesso:</strong>
                    ${escaparHTML(statusAcesso)}
                </p>

                <p>
                    <strong>Senha:</strong>
                    ${escaparHTML(statusSenha)}
                </p>

            </div>

            <div class="bloco-resposta-ajuda-admin">

                <label for="novaSenhaAluno_${escaparAtributo(aluno.id)}">
                    Nova senha temporária
                </label>

                <input
                    type="text"
                    id="novaSenhaAluno_${escaparAtributo(aluno.id)}"
                    placeholder="Digite ou gere uma nova senha"
                    value="${escaparAtributo(gerarSenhaTemporariaAluno())}"
                >

            </div>

            <div class="acoes-paeet acoes-solicitacao-ajuda">

                <button type="button" onclick="resetarSenhaAlunoAdmin('${escaparAtributo(aluno.id)}')">
                    🔐 Resetar senha
                </button>

                <button type="button" onclick="alternarStatusAlunoAdmin('${escaparAtributo(aluno.id)}', ${aluno.ativo ? "false" : "true"})">
                    ${aluno.ativo ? "🚫 Desativar" : "✅ Ativar"}
                </button>

            </div>

        </div>
    `;
}


function formatarCursoGestaoAluno(curso) {
    const nomes = {
        desenvolvimento_sistemas: "Desenvolvimento de Sistemas",
        vendas: "Vendas",
        apoio_pedagogico: "Apoio Pedagógico",
        outro: "Outro"
    };

    return nomes[curso] || curso || "Não informado";
}


async function resetarSenhaAlunoAdmin(alunoId) {
    const campoSenha = document.getElementById("novaSenhaAluno_" + alunoId);

    if (!campoSenha) {
        alert("Campo de senha não encontrado.");
        return;
    }

    const novaSenhaTemporaria = campoSenha.value.trim();

    if (!novaSenhaTemporaria || novaSenhaTemporaria.length < 6) {
        alert("Digite uma senha temporária com pelo menos 6 caracteres.");
        campoSenha.focus();
        return;
    }

    const confirmar = confirm("Deseja resetar a senha deste aluno?");

    if (!confirmar) {
        return;
    }

    const token = await obterTokenAdminAtual();

    if (!token) {
        alert("Sessão administrativa expirada. Faça login novamente.");
        return;
    }

    try {
        const resposta = await fetch("/.netlify/functions/resetar-senha-aluno", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + token
            },
            body: JSON.stringify({
                alunoId: alunoId,
                novaSenhaTemporaria: novaSenhaTemporaria
            })
        });

        const dados = await resposta.json();

        if (!resposta.ok || !dados.sucesso) {
            alert(dados.mensagem || "Erro ao resetar senha.");
            return;
        }

        alert("Senha resetada com sucesso! Nova senha temporária: " + novaSenhaTemporaria);

        await carregarAlunosGestaoAdmin();

    } catch (erro) {
        console.log("Erro ao resetar senha:", erro);
        alert("Erro de conexão ao resetar senha: " + erro.message);
    }
}


async function alternarStatusAlunoAdmin(alunoId, novoStatus) {
    const confirmar = confirm(
        novoStatus
            ? "Deseja ativar o acesso deste aluno?"
            : "Deseja desativar o acesso deste aluno?"
    );

    if (!confirmar) {
        return;
    }

    const { error } = await banco
        .from("perfis")
        .update({
            ativo: novoStatus,
            atualizado_em: new Date().toISOString()
        })
        .eq("id", alunoId);

    if (error) {
        alert("Erro ao alterar status: " + error.message);
        console.log("Erro ao alterar status aluno:", error);
        return;
    }

    alert("Status do aluno atualizado com sucesso!");

    await carregarAlunosGestaoAdmin();
}


async function importarAlunosCsvAdmin() {
    const input = document.getElementById("arquivoCsvAlunosAdmin");
    const resultado = document.getElementById("resultadoImportacaoAlunosAdmin");

    if (!input || !input.files || input.files.length === 0) {
        if (resultado) {
            resultado.innerHTML = "<p>Selecione um arquivo CSV antes de importar.</p>";
        }
        return;
    }

    const arquivo = input.files[0];

    if (resultado) {
        resultado.innerHTML = "<p>Lendo arquivo CSV...</p>";
    }

    const texto = await arquivo.text();

    const alunos = converterCsvParaAlunos(texto);

    if (!alunos || alunos.length === 0) {
        if (resultado) {
            resultado.innerHTML = "<p>Nenhum aluno válido encontrado no CSV.</p>";
        }
        return;
    }

    if (resultado) {
        resultado.innerHTML = `<p>Importando ${alunos.length} aluno(s)...</p>`;
    }

    const token = await obterTokenAdminAtual();

    if (!token) {
        if (resultado) {
            resultado.innerHTML = "<p>Sessão administrativa expirada. Faça login novamente.</p>";
        }
        return;
    }

    let sucessos = 0;
    let erros = 0;
    let linhasResultado = "";

    for (const aluno of alunos) {
        try {
            const resposta = await fetch("/.netlify/functions/criar-aluno", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": "Bearer " + token
                },
                body: JSON.stringify({
                    nome: aluno.nome,
                    email: aluno.email,
                    turma: aluno.turma,
                    curso: aluno.curso,
                    senhaTemporaria: aluno.senha
                })
            });

            const dados = await resposta.json();

            if (!resposta.ok || !dados.sucesso) {
                erros++;

                linhasResultado += `
                    <p>❌ ${escaparHTML(aluno.email)} — ${escaparHTML(dados.mensagem || "Erro ao importar.")}</p>
                `;
            } else {
                sucessos++;

                linhasResultado += `
                    <p>✅ ${escaparHTML(aluno.email)} — importado com sucesso.</p>
                `;
            }

        } catch (erro) {
            erros++;

            linhasResultado += `
                <p>❌ ${escaparHTML(aluno.email)} — ${escaparHTML(erro.message)}</p>
            `;
        }
    }

    if (resultado) {
        resultado.innerHTML = `
            <h4>Resultado da importação</h4>
            <p><strong>Sucessos:</strong> ${sucessos}</p>
            <p><strong>Erros:</strong> ${erros}</p>
            ${linhasResultado}
        `;
    }

    await carregarAlunosGestaoAdmin();
}


function converterCsvParaAlunos(textoCsv) {
    const linhas = textoCsv
        .split(/\r?\n/)
        .map(linha => linha.trim())
        .filter(linha => linha.length > 0);

    if (linhas.length <= 1) {
        return [];
    }

    const alunos = [];

    for (let i = 1; i < linhas.length; i++) {
        const colunas = linhas[i].split(",").map(valor => valor.trim());

        const nome = colunas[0] || "";
        const email = (colunas[1] || "").toLowerCase();
        const turma = colunas[2] || "";
        const curso = colunas[3] || "desenvolvimento_sistemas";
        const senha = colunas[4] || gerarSenhaTemporariaAluno();

        if (nome && email && email.includes("@")) {
            alunos.push({
                nome: nome,
                email: email,
                turma: turma,
                curso: curso,
                senha: senha
            });
        }
    }

    return alunos;
}


// Expor funções para botões dinâmicos
window.resetarSenhaAlunoAdmin = resetarSenhaAlunoAdmin;
window.alternarStatusAlunoAdmin = alternarStatusAlunoAdmin;
window.carregarAlunosGestaoAdmin = carregarAlunosGestaoAdmin;