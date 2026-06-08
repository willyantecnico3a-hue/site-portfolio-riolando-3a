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


// =====================================================
// 9. LISTAR AULAS
// =====================================================

const btnCarregarAulasAdmin = document.getElementById("btnCarregarAulasAdmin");

if (btnCarregarAulasAdmin) {
    btnCarregarAulasAdmin.addEventListener("click", carregarAulasAdmin);
}

async function carregarAulasAdmin() {
    const lista = document.getElementById("listaAulasAdmin");

    if (!lista) {
        return;
    }

    lista.innerHTML = "<p>Carregando aulas...</p>";

    const { data, error } = await banco
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

    if (error) {
        lista.innerHTML = `<p>Erro ao carregar aulas: ${error.message}</p>`;
        console.log("Erro ao carregar aulas:", error);
        return;
    }

    if (!data || data.length === 0) {
        lista.innerHTML = "<p>Nenhuma aula cadastrada ainda.</p>";
        return;
    }

    lista.innerHTML = "";

    data.forEach(function (aula) {
        lista.innerHTML += `
            <div class="card-aula-admin">

                ${
                    aula.aula_do_dia
                    ? `<span class="badge-aula-dia-admin">⭐ Aula do Dia ativa</span>`
                    : ""
                }

                <h3>${escaparHTML(aula.titulo_aula || "Aula sem título")}</h3>

                <p><strong>Turma:</strong> ${aula.turmas ? escaparHTML(aula.turmas.nome_turma) : "Não informada"}</p>
                <p><strong>Curso:</strong> ${aula.turmas ? escaparHTML(aula.turmas.curso) : "Não informado"}</p>
                <p><strong>Disciplina:</strong> ${aula.disciplinas ? escaparHTML(aula.disciplinas.nome_disciplina) : "Não informada"}</p>
                <p><strong>Data:</strong> ${formatarDataAdmin(aula.data_aula)}</p>
                <p><strong>Horário:</strong> ${formatarHorarioAdmin(aula.horario_inicio)} às ${formatarHorarioAdmin(aula.horario_fim)}</p>
                <p><strong>Local:</strong> ${escaparHTML(aula.local_aula || "Não informado")}</p>
                <p><strong>Status:</strong> ${aula.ativo ? "Ativa" : "Inativa"}</p>

                <div class="materiais-card-admin">
                    ${aula.pdf_url ? `<span>📄 PDF</span>` : ""}
                    ${aula.video_url ? `<span>🎥 Vídeo</span>` : ""}
                    ${aula.atividade_url ? `<span>📝 Atividade</span>` : ""}
                    ${aula.material_extra_url ? `<span>🔗 Extra</span>` : ""}
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
    });
}


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

window.aprovarPortfolio = aprovarPortfolio;
window.ocultarPortfolio = ocultarPortfolio;
window.excluirPortfolio = excluirPortfolio;


// =====================================================
// 18. INICIAR
// =====================================================

configurarMenuSobrepostoAdmin();
configurarBotaoSairAdmin();
configurarPerfilAdminEditavel();
verificarSessaoAtual();

console.log("Funções do painel admin carregadas com sucesso.");