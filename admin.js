// =====================================================
// PAINEL ADMINISTRATIVO - PORTAL DE AULAS E PORTFÓLIOS
// Professor Willyan Vieira
// =====================================================
//
// Este arquivo controla:
// 1. Login administrativo com Supabase Auth
// 2. Ocultar login depois que o admin entra
// 3. Perfil administrativo editável salvo no Supabase
// 4. Menu lateral sobreposto do painel admin
// 5. Cadastro de turmas
// 6. Cadastro de disciplinas
// 7. Cadastro e listagem de aulas
// 8. Ativar aula como Aula do Dia
// 9. Aprovação, ocultação e exclusão de portfólios
// 10. Upload e pré-visualização de mídias
// 11. Assistente IA via Netlify Function
//
// =====================================================


// =====================================================
// 1. CONEXÃO COM O SUPABASE
// =====================================================

const SUPABASE_URL = "https://pwomyoprbvoimqmikvev.supabase.co";

// Chave pública do Supabase.
// Nunca coloque service_role ou sb_secret no navegador.
const SUPABASE_KEY = "sb_publishable_elGQyDU7ngaUHCLWIHLhDQ_IxiLo6kD";

const banco = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

console.log("Painel admin conectado ao Supabase.");


// =====================================================
// 2. ELEMENTOS PRINCIPAIS DA TELA
// =====================================================

const btnLoginAdmin = document.getElementById("btnLoginAdmin");
const areaAdmin = document.getElementById("areaAdmin");
const secaoLoginAdmin = document.getElementById("secaoLoginAdmin");
const mensagemLogin = document.getElementById("mensagemLogin");


// =====================================================
// 3. PERFIL ADMINISTRATIVO PADRÃO
// =====================================================

const perfilPadraoAdmin = {
    nome_funcao: "Professor e PAEET Willyan Vieira",
    email: "willyancruz@prof.educacao.sp.gov.br",
    escola: "PEI Prof. Riolando Canno",
    frase: "“Educar é transformar oportunidades em caminhos possíveis.”",
    foto_url: "https://ui-avatars.com/api/?name=Willyan+Vieira&background=0f766e&color=ffffff"
};


// =====================================================
// 4. MOSTRAR PAINEL LOGADO E OCULTAR LOGIN
// =====================================================

function mostrarPainelAdminLogado() {
    if (areaAdmin) {
        areaAdmin.style.display = "block";
    }

    if (secaoLoginAdmin) {
        secaoLoginAdmin.style.display = "none";
    }

    carregarPerfilAdminEditavel().catch(function (erro) {
        console.log("Erro ao carregar perfil após login:", erro);
    });
}


// =====================================================
// 5. MOSTRAR LOGIN E OCULTAR PAINEL
// =====================================================

function mostrarTelaLoginAdmin() {
    if (areaAdmin) {
        areaAdmin.style.display = "none";
    }

    if (secaoLoginAdmin) {
        secaoLoginAdmin.style.display = "block";
    }
}


// =====================================================
// 6. LOGIN ADMINISTRATIVO COM SUPABASE AUTH
// =====================================================

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


// =====================================================
// 7. VERIFICAR SE O USUÁRIO LOGADO É ADMIN
// =====================================================

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


// =====================================================
// 8. MANTER SESSÃO ADMINISTRATIVA ATIVA
// =====================================================

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


// =====================================================
// 9. CARREGAR DADOS INICIAIS DO ADMIN
// =====================================================

function carregarDadosIniciaisAdmin() {
    if (typeof carregarTurmasAdmin === "function") {
        carregarTurmasAdmin();
    }

    if (typeof carregarDisciplinasAdmin === "function") {
        carregarDisciplinasAdmin();
    }

    if (typeof carregarAulasAdmin === "function") {
        carregarAulasAdmin();
    }

    if (typeof carregarPortfoliosAdmin === "function") {
        carregarPortfoliosAdmin();
    }
}


// =====================================================
// 10. BOTÃO SAIR DO PAINEL ADMIN
// =====================================================

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

        const email = document.getElementById("emailAdmin");
        const senha = document.getElementById("senhaAdmin");
        const listaAdminPortfolios = document.getElementById("listaAdminPortfolios");

        if (email) {
            email.value = "";
        }

        if (senha) {
            senha.value = "";
        }

        if (listaAdminPortfolios) {
            listaAdminPortfolios.innerHTML = "";
        }

        fecharTodasAsTelasAdmin();
    });
}


// =====================================================
// 11. PERFIL ADMINISTRATIVO EDITÁVEL NO SUPABASE
// =====================================================
//
// Tabela necessária:
// public.admin_profiles
//
// Bucket necessário:
// admin-perfil
//
// Campos esperados na tabela:
// user_id, nome_funcao, email, escola, frase, foto_url
//
// =====================================================


// =====================================================
// 11.1 CARREGAR PERFIL ADMINISTRATIVO DO SUPABASE
// =====================================================

async function carregarPerfilAdminEditavel() {
    const { data: userData, error: userError } = await banco.auth.getUser();

    if (userError || !userData.user) {
        console.log("Usuário não logado para carregar perfil admin.");
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


// =====================================================
// 11.2 APLICAR PERFIL NA TELA
// =====================================================

function aplicarPerfilAdminNaTela(perfil) {
    const fotoPerfilAdmin = document.getElementById("fotoPerfilAdmin");
    const nomePerfilAdmin = document.getElementById("nomePerfilAdmin");
    const emailPerfilAdmin = document.getElementById("emailPerfilAdmin");
    const escolaPerfilAdmin = document.getElementById("escolaPerfilAdmin");
    const frasePerfilAdmin = document.getElementById("frasePerfilAdmin");

    if (fotoPerfilAdmin) {
        fotoPerfilAdmin.src = perfil.foto_url || perfilPadraoAdmin.foto_url;
    }

    if (nomePerfilAdmin) {
        nomePerfilAdmin.textContent = perfil.nome_funcao || perfilPadraoAdmin.nome_funcao;
    }

    if (emailPerfilAdmin) {
        emailPerfilAdmin.textContent = perfil.email || perfilPadraoAdmin.email;
    }

    if (escolaPerfilAdmin) {
        escolaPerfilAdmin.textContent = perfil.escola || perfilPadraoAdmin.escola;
    }

    if (frasePerfilAdmin) {
        frasePerfilAdmin.textContent = perfil.frase || perfilPadraoAdmin.frase;
    }

    preencherFormularioPerfilAdmin(perfil);
}


// =====================================================
// 11.3 PREENCHER FORMULÁRIO DE EDIÇÃO
// =====================================================

function preencherFormularioPerfilAdmin(perfil) {
    const inputNome = document.getElementById("inputNomePerfilAdmin");
    const inputEmail = document.getElementById("inputEmailPerfilAdmin");
    const inputEscola = document.getElementById("inputEscolaPerfilAdmin");
    const inputFrase = document.getElementById("inputFrasePerfilAdmin");

    if (inputNome) {
        inputNome.value = perfil.nome_funcao || perfilPadraoAdmin.nome_funcao;
    }

    if (inputEmail) {
        inputEmail.value = perfil.email || perfilPadraoAdmin.email;
    }

    if (inputEscola) {
        inputEscola.value = perfil.escola || perfilPadraoAdmin.escola;
    }

    if (inputFrase) {
        inputFrase.value = perfil.frase || perfilPadraoAdmin.frase;
    }
}


// =====================================================
// 11.4 ABRIR TELA DE EDIÇÃO DO PERFIL
// =====================================================

function abrirTelaEditarPerfilAdmin() {
    fecharTodasAsTelasAdmin();

    const telaEditarPerfil = document.getElementById("telaEditarPerfilAdmin");

    if (telaEditarPerfil) {
        telaEditarPerfil.classList.add("ativa");
    }

    fecharMenuAdmin();
}


// =====================================================
// 11.5 ENVIAR FOTO PARA SUPABASE STORAGE
// =====================================================

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
        console.log("Erro ao enviar foto de perfil:", error);
        throw new Error("Erro ao enviar foto de perfil: " + error.message);
    }

    const { data } = banco.storage
        .from("admin-perfil")
        .getPublicUrl(caminhoArquivo);

    return data.publicUrl;
}


// =====================================================
// 11.6 SALVAR PERFIL ADMINISTRATIVO NO SUPABASE
// =====================================================

async function salvarPerfilAdminEditavel() {
    const confirmar = confirm(
        "Deseja realmente salvar as alterações do perfil administrativo?"
    );

    if (!confirmar) {
        return;
    }

    const inputNome = document.getElementById("inputNomePerfilAdmin");
    const inputEmail = document.getElementById("inputEmailPerfilAdmin");
    const inputEscola = document.getElementById("inputEscolaPerfilAdmin");
    const inputFrase = document.getElementById("inputFrasePerfilAdmin");
    const inputFoto = document.getElementById("inputFotoPerfilAdmin");
    const fotoPerfilAdmin = document.getElementById("fotoPerfilAdmin");
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

    let fotoUrlAtual = fotoPerfilAdmin ? fotoPerfilAdmin.src : perfilPadraoAdmin.foto_url;

    try {
        if (inputFoto && inputFoto.files && inputFoto.files.length > 0) {
            fotoUrlAtual = await enviarFotoPerfilAdminParaStorage(
                inputFoto.files[0],
                usuario.id
            );
        }

        const perfilAtualizado = {
            user_id: usuario.id,
            nome_funcao: inputNome ? inputNome.value.trim() : perfilPadraoAdmin.nome_funcao,
            email: inputEmail ? inputEmail.value.trim() : usuario.email,
            escola: inputEscola ? inputEscola.value.trim() : perfilPadraoAdmin.escola,
            frase: inputFrase ? inputFrase.value.trim() : perfilPadraoAdmin.frase,
            foto_url: fotoUrlAtual,
            atualizado_em: new Date().toISOString()
        };

        const { error } = await banco
            .from("admin_profiles")
            .upsert([perfilAtualizado], {
                onConflict: "user_id"
            });

        if (error) {
            console.log("Erro ao salvar perfil admin:", error);

            if (mensagem) {
                mensagem.textContent = "Erro ao salvar perfil: " + error.message;
            }

            return;
        }

        // =====================================================
// SALVAR FRASE MOTIVACIONAL TAMBÉM PARA A TELA INICIAL
// =====================================================

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

    if (mensagem) {
        mensagem.textContent =
            "Perfil salvo, mas houve erro ao atualizar a frase da tela inicial: " +
            erroFrasePublica.message;
    }

    return;
}

        aplicarPerfilAdminNaTela(perfilAtualizado);

        if (inputFoto) {
            inputFoto.value = "";
        }

        if (mensagem) {
            mensagem.textContent = "Perfil administrativo salvo no Supabase com sucesso!";
        }

        alert("Perfil administrativo salvo com sucesso no banco de dados!");

    } catch (erro) {
        console.log("Erro no salvamento do perfil:", erro);

        if (mensagem) {
            mensagem.textContent = erro.message;
        }
    }
}


// =====================================================
// 11.7 CONFIGURAR EVENTOS DO PERFIL ADMIN
// =====================================================

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
                const fotoBase64 = e.target.result;
                const fotoPerfilAdmin = document.getElementById("fotoPerfilAdmin");

                if (fotoPerfilAdmin) {
                    fotoPerfilAdmin.src = fotoBase64;
                }
            };

            leitor.readAsDataURL(arquivo);
        });
    }
}


// =====================================================
// 12. MENU LATERAL SOBREPOSTO DO ADMIN
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
// 13. CARREGAR TURMAS NO SELECT DO ADMIN
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

    <button onclick="editarAulaAdmin('${aula.id}')" class="btn-editar-aula">
    ✏️ Editar Aula
</button>

    selectTurma.innerHTML = `<option value="">Selecione uma turma</option>`;

    data.forEach(function (turma) {
        selectTurma.innerHTML += `
            <option value="${turma.id}">
                ${turma.nome_turma} - ${turma.curso}
            </option>
        `;
    });
}


// =====================================================
// 14. CARREGAR DISCIPLINAS NO SELECT DO ADMIN
// =====================================================

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
                ${disciplina.nome_disciplina}
            </option>
        `;
    });
}


// =====================================================
// 15. CADASTRAR NOVA TURMA
// =====================================================

const btnCadastrarTurma = document.getElementById("btnCadastrarTurma");

if (btnCadastrarTurma) {
    btnCadastrarTurma.addEventListener("click", async function () {
        const mensagem = document.getElementById("mensagemTurmaAdmin");

        const nome = document.getElementById("novaTurmaNome").value.trim();
        const curso = document.getElementById("novaTurmaCurso").value.trim();
        const descricao = document.getElementById("novaTurmaDescricao").value.trim();

        let foto = document.getElementById("novaTurmaFoto").value.trim();

        const arquivoFoto = document.getElementById("arquivoTurmaFoto");

        if (!nome || !curso) {
            mensagem.textContent = "Preencha o nome da turma e o curso.";
            return;
        }

        mensagem.textContent = "Cadastrando turma...";

        if (arquivoFoto && arquivoFoto.files.length > 0) {
            mensagem.textContent = "Enviando arquivo da turma...";

            const urlUpload = await enviarArquivoParaStorage(arquivoFoto, "turmas");

            if (urlUpload) {
                foto = urlUpload;
            } else {
                mensagem.textContent = "Não foi possível enviar o arquivo.";
                return;
            }
        }

        const { error } = await banco
            .from("turmas")
            .insert([
                {
                    nome_turma: nome,
                    curso: curso,
                    descricao: descricao,
                    foto_url: foto,
                    ativo: true
                }
            ]);

        if (error) {
            mensagem.textContent = "Erro ao cadastrar turma: " + error.message;
            console.log("Erro turma:", error);
            return;
        }

        mensagem.textContent = "Turma cadastrada com sucesso!";

        document.getElementById("novaTurmaNome").value = "";
        document.getElementById("novaTurmaCurso").value = "";
        document.getElementById("novaTurmaDescricao").value = "";
        document.getElementById("novaTurmaFoto").value = "";

        if (arquivoFoto) {
            arquivoFoto.value = "";
        }

        const preview = document.getElementById("previewTurmaMidia");

        if (preview) {
            preview.innerHTML = "";
        }

        carregarTurmasAdmin();
    });
}


// =====================================================
// 16. CADASTRAR NOVA DISCIPLINA
// =====================================================

const btnCadastrarDisciplina = document.getElementById("btnCadastrarDisciplina");

if (btnCadastrarDisciplina) {
    btnCadastrarDisciplina.addEventListener("click", async function () {
        const mensagem = document.getElementById("mensagemDisciplinaAdmin");

        const nome = document.getElementById("novaDisciplinaNome").value.trim();
        const curso = document.getElementById("novaDisciplinaCurso").value.trim();
        const descricao = document.getElementById("novaDisciplinaDescricao").value.trim();

        if (!nome) {
            mensagem.textContent = "Preencha o nome da disciplina.";
            return;
        }

        mensagem.textContent = "Cadastrando disciplina...";

        const { error } = await banco
            .from("disciplinas")
            .insert([
                {
                    nome_disciplina: nome,
                    curso: curso,
                    descricao: descricao,
                    ativo: true
                }
            ]);

        if (error) {
            mensagem.textContent = "Erro ao cadastrar disciplina: " + error.message;
            console.log("Erro disciplina:", error);
            return;
        }

        mensagem.textContent = "Disciplina cadastrada com sucesso!";

        document.getElementById("novaDisciplinaNome").value = "";
        document.getElementById("novaDisciplinaCurso").value = "";
        document.getElementById("novaDisciplinaDescricao").value = "";

        carregarDisciplinasAdmin();
    });
}


// =====================================================
// 17. SALVAR NOVA AULA
// =====================================================

const btnSalvarAula = document.getElementById("btnSalvarAula");

if (btnSalvarAula) {
    btnSalvarAula.addEventListener("click", async function () {
        const mensagem = document.getElementById("mensagemAulaAdmin");

        const turmaId = document.getElementById("adminTurmaAula").value;
        const disciplinaId = document.getElementById("adminDisciplinaAula").value;
        const titulo = document.getElementById("adminTituloAula").value.trim();
        const subtitulo = document.getElementById("adminSubtituloAula").value.trim();
        const descricao = document.getElementById("adminDescricaoAula").value.trim();
        const dataAula = document.getElementById("adminDataAula").value;
        const horarioInicio = document.getElementById("adminHorarioInicio").value;
        const horarioFim = document.getElementById("adminHorarioFim").value;
        const local = document.getElementById("adminLocalAula").value.trim();
        const desafio = document.getElementById("adminDesafioAula").value.trim();

        let pdfUrl = document.getElementById("adminPdfAula")
    ? document.getElementById("adminPdfAula").value.trim()
    : "";

const arquivoPdfAula = document.getElementById("arquivoPdfAula");

if (arquivoPdfAula && arquivoPdfAula.files && arquivoPdfAula.files.length > 0) {
    const urlPdfEnviado = await enviarArquivoParaStorage(arquivoPdfAula, "aulas-pdf");

    if (urlPdfEnviado) {
        pdfUrl = urlPdfEnviado;
    } else {
        mensagem.textContent = "Erro ao enviar o PDF da aula.";
        return;
    }
}

        const videoUrl = document.getElementById("adminVideoAula")
            ? document.getElementById("adminVideoAula").value.trim()
            : "";

        const atividadeUrl = document.getElementById("adminAtividadeAula")
            ? document.getElementById("adminAtividadeAula").value.trim()
            : "";

        const materialExtraUrl = document.getElementById("adminMaterialExtraAula")
            ? document.getElementById("adminMaterialExtraAula").value.trim()
            : "";

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

        mensagem.textContent = "Salvando aula...";

        const { error } = await banco
            .from("aulas")
            .insert([
                {
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
                    video_url: videoUrl,
                    atividade_url: atividadeUrl,
                    material_extra_url: materialExtraUrl,
                    ativo: true,
                    aula_do_dia: false
                }
            ]);

            if (arquivoPdfAula) {
    arquivoPdfAula.value = "";
}

        if (error) {
            mensagem.textContent = "Erro ao salvar aula: " + error.message;
            console.log("Erro aula:", error);
            return;
        }

        mensagem.textContent = "Aula salva com sucesso!";

        document.getElementById("adminTituloAula").value = "";
        document.getElementById("adminSubtituloAula").value = "";
        document.getElementById("adminDescricaoAula").value = "";
        document.getElementById("adminDataAula").value = "";
        document.getElementById("adminHorarioInicio").value = "";
        document.getElementById("adminHorarioFim").value = "";
        document.getElementById("adminLocalAula").value = "";
        document.getElementById("adminDesafioAula").value = "";

        limparCampoSeExistir("adminPdfAula");
        limparCampoSeExistir("adminVideoAula");
        limparCampoSeExistir("adminAtividadeAula");
        limparCampoSeExistir("adminMaterialExtraAula");

        carregarAulasAdmin();
    });
}


// =====================================================
// 18. CARREGAR AULAS CADASTRADAS
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

                <h3>${aula.titulo_aula}</h3>

                <p><strong>Turma:</strong> ${aula.turmas ? aula.turmas.nome_turma : "Não informada"}</p>
                <p><strong>Curso:</strong> ${aula.turmas ? aula.turmas.curso : "Não informado"}</p>
                <p><strong>Disciplina:</strong> ${aula.disciplinas ? aula.disciplinas.nome_disciplina : "Não informada"}</p>
                <p><strong>Data:</strong> ${formatarDataAdmin(aula.data_aula)}</p>
                <p><strong>Horário:</strong> ${formatarHorarioAdmin(aula.horario_inicio)} às ${formatarHorarioAdmin(aula.horario_fim)}</p>
                <p><strong>Local:</strong> ${aula.local_aula || "Não informado"}</p>
                <p><strong>Status:</strong> ${aula.ativo ? "Ativa" : "Inativa"}</p>

                <div class="materiais-card-admin">
                    ${aula.pdf_url ? `<span>📄 PDF</span>` : ""}
                    ${aula.video_url ? `<span>🎥 Vídeo</span>` : ""}
                    ${aula.atividade_url ? `<span>📝 Atividade</span>` : ""}
                    ${aula.material_extra_url ? `<span>🔗 Extra</span>` : ""}
                </div>

                <div class="acoes-card-aula-admin">

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
// 19. ATIVAR AULA COMO AULA DO DIA
// =====================================================

async function ativarAulaDoDia(aulaId, turmaId) {
    if (!banco) {
        alert("Supabase não conectado.");
        return;
    }

    if (!aulaId || !turmaId || turmaId === "undefined") {
        alert("Erro: não foi possível identificar a turma desta aula.");
        console.log("aulaId recebido:", aulaId);
        console.log("turmaId recebido:", turmaId);
        return;
    }

    const confirmar = confirm(
        "Deseja ativar esta aula como Aula do Dia para os alunos?"
    );

    if (!confirmar) {
        return;
    }

    const { error: erroDesmarcar } = await banco
        .from("aulas")
        .update({ aula_do_dia: false })
        .eq("turma_id", turmaId);

    if (erroDesmarcar) {
        alert("Erro ao desmarcar aulas anteriores: " + erroDesmarcar.message);
        console.log("Erro ao desmarcar:", erroDesmarcar);
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
        console.log("Erro ao ativar:", erroAtivar);
        return;
    }

    alert("Aula ativada como Aula do Dia com sucesso!");
    carregarAulasAdmin();
}


// =====================================================
// 20. DESATIVAR AULA
// =====================================================

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
        console.log("Erro ao desativar aula:", error);
        return;
    }

    alert("Aula desativada com sucesso!");
    carregarAulasAdmin();
}


// =====================================================
// 21. EXCLUIR AULA
// =====================================================

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
        console.log("Erro ao excluir aula:", error);
        return;
    }

    alert("Aula excluída com sucesso!");
    carregarAulasAdmin();
}


// =====================================================
// 22. CARREGAR PORTFÓLIOS NO ADMIN
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
        console.log("Erro portfólios:", error);
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
                <h3>${aluno.nome_aluno}</h3>

                <p><strong>Telefone:</strong> ${aluno.telefone || "Não informado"}</p>
                <p><strong>E-mail:</strong> ${aluno.email || "Não informado"}</p>

                <p>
                    <strong>Site:</strong>
                    <a href="${aluno.link_site}" target="_blank">Acessar site</a>
                </p>

                <p>
                    <strong>Vídeo:</strong>
                    <a href="${aluno.link_video}" target="_blank">Assistir vídeo</a>
                </p>

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


// =====================================================
// 23. FILTROS DOS PORTFÓLIOS
// =====================================================

const btnFiltrarPortfolios = document.getElementById("btnFiltrarPortfolios");

if (btnFiltrarPortfolios) {
    btnFiltrarPortfolios.addEventListener("click", carregarPortfoliosAdmin);
}

const btnLimparFiltroPortfolios = document.getElementById("btnLimparFiltroPortfolios");

if (btnLimparFiltroPortfolios) {
    btnLimparFiltroPortfolios.addEventListener("click", function () {
        const filtroNome = document.getElementById("filtroNomePortfolio");
        const filtroData = document.getElementById("filtroDataPortfolio");

        if (filtroNome) {
            filtroNome.value = "";
        }

        if (filtroData) {
            filtroData.value = "";
        }

        carregarPortfoliosAdmin();
    });
}


// =====================================================
// 24. APROVAR PORTFÓLIO
// =====================================================

async function aprovarPortfolio(id) {
    const { error } = await banco
        .from("portfolio_alunos")
        .update({ aprovado: true })
        .eq("id", id);

    if (error) {
        alert("Erro ao aprovar: " + error.message);
        console.log("Erro ao aprovar:", error);
        return;
    }

    alert("Portfólio aprovado!");
    carregarPortfoliosAdmin();
}


// =====================================================
// 25. OCULTAR PORTFÓLIO
// =====================================================

async function ocultarPortfolio(id) {
    const { error } = await banco
        .from("portfolio_alunos")
        .update({ aprovado: false })
        .eq("id", id);

    if (error) {
        alert("Erro ao ocultar: " + error.message);
        console.log("Erro ao ocultar:", error);
        return;
    }

    alert("Portfólio ocultado!");
    carregarPortfoliosAdmin();
}


// =====================================================
// 26. EXCLUIR PORTFÓLIO
// =====================================================

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
        console.log("Erro ao excluir:", error);
        return;
    }

    alert("Portfólio excluído!");
    carregarPortfoliosAdmin();
}


// =====================================================
// 27. UPLOAD DE ARQUIVO PARA SUPABASE STORAGE
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
        console.log("Erro no upload:", error);
        alert("Erro ao enviar arquivo: " + error.message);
        return null;
    }

    const { data } = banco.storage
        .from("materiais")
        .getPublicUrl(caminhoArquivo);

    return data.publicUrl;
}


// =====================================================
// 28. IDENTIFICAR TIPO DE MÍDIA
// =====================================================

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


// =====================================================
// 29. CONVERTER YOUTUBE PARA EMBED
// =====================================================

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


// =====================================================
// 30. MOSTRAR PRÉ-VISUALIZAÇÃO DE MÍDIA
// =====================================================

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
                src="${embed}"
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
                src="${url}"
                alt="Pré-visualização da imagem"
                class="preview-imagem-admin"
            >
        `;
        return;
    }

    if (tipo === "video") {
        preview.innerHTML = `
            <video controls width="100%">
                <source src="${url}" type="video/mp4">
                Seu navegador não suporta vídeo.
            </video>
        `;
        return;
    }

    if (tipo === "pdf") {
        preview.innerHTML = `
            <iframe
                src="${url}"
                width="100%"
                height="400">
            </iframe>
        `;
        return;
    }

    preview.innerHTML = `
        <p>
            Link informado:
            <a href="${url}" target="_blank">${url}</a>
        </p>
    `;
}


// =====================================================
// 31. BOTÃO PRÉ-VISUALIZAR MÍDIA DA TURMA
// =====================================================

const btnPreviewTurmaMidia = document.getElementById("btnPreviewTurmaMidia");

if (btnPreviewTurmaMidia) {
    btnPreviewTurmaMidia.addEventListener("click", function () {
        const url = document.getElementById("novaTurmaFoto").value.trim();

        mostrarPreviewMidia(url, "previewTurmaMidia");
    });
}


// =====================================================
// 32. BOTÃO DATA DE HOJE
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


// =====================================================
// 33. VERIFICAR FERIADO OU FIM DE SEMANA
// =====================================================

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
// 34. FUNÇÕES AUXILIARES
// =====================================================

function limparCampoSeExistir(idCampo) {
    const campo = document.getElementById(idCampo);

    if (campo) {
        campo.value = "";
    }
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


// =====================================================
// 35. ASSISTENTE IA DE AULAS VIA NETLIFY FUNCTION
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
        console.log("promptIA:", promptCampo);
        console.log("resultadoIA:", resultadoIA);
        console.log("mensagemIA:", mensagemIA);
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
                <p><strong>Erro:</strong> ${dados.error || "Falha desconhecida."}</p>
                <p>${typeof dados.details === "string" ? dados.details : JSON.stringify(dados.details)}</p>
            `;

            console.log("Erro da função IA:", dados);
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
        console.log("Erro ao chamar IA:", erro);

        mensagemIA.textContent = "Erro de conexão com a função da IA.";

        resultadoIA.innerHTML = `
            <p>
                Não foi possível conectar com a IA.
                Verifique se a função Netlify foi publicada e se a variável
                <strong>OPENROUTER_API_KEY</strong> está configurada no Netlify.
            </p>
            <p><strong>Detalhes:</strong> ${erro.message}</p>
        `;
    }
}


// =====================================================
// 36. FORMATAR TEXTO DA IA PARA HTML
// =====================================================

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


// =====================================================
// 37. COPIAR RESULTADO DA IA
// =====================================================

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
        console.log("Erro ao copiar:", erro);
    }
}


// =====================================================
// 38. USAR RESULTADO DA IA COMO BASE DA AULA
// =====================================================

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
// 39. EXPOR FUNÇÕES PARA O HTML
// =====================================================

window.gerarConteudoIA = gerarConteudoIA;
window.copiarResultadoIA = copiarResultadoIA;
window.enviarResultadoParaAula = enviarResultadoParaAula;

window.ativarAulaDoDia = ativarAulaDoDia;
window.desativarAula = desativarAula;
window.excluirAula = excluirAula;

window.aprovarPortfolio = aprovarPortfolio;
window.ocultarPortfolio = ocultarPortfolio;
window.excluirPortfolio = excluirPortfolio;


// =====================================================
// 40. INICIAR FUNÇÕES DE INTERFACE
// =====================================================

configurarMenuSobrepostoAdmin();
configurarBotaoSairAdmin();
configurarPerfilAdminEditavel();
verificarSessaoAtual();

console.log("Funções do painel admin carregadas com sucesso.");