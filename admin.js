// =============================
// CONEXÃO COM O SUPABASE
// =============================

const SUPABASE_URL = "https://pwomyoprbvoimqmikvev.supabase.co";

// Use aqui somente a chave ANON PUBLIC ou PUBLISHABLE.
// Nunca use sb_secret ou service_role no navegador.
const SUPABASE_KEY = "sb_publishable_elGQyDU7ngaUHCLWIHLhDQ_IxiLo6kD";

const banco = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

console.log("Painel admin conectado ao Supabase");


// =============================
// ELEMENTOS DA TELA
// =============================

const btnLoginAdmin = document.getElementById("btnLoginAdmin");
const btnSairAdmin = document.getElementById("btnSairAdmin");
const btnCarregarAdmin = document.getElementById("btnCarregarAdmin");

const areaAdmin = document.getElementById("areaAdmin");
const mensagemLogin = document.getElementById("mensagemLogin");
const listaAdminPortfolios = document.getElementById("listaAdminPortfolios");


// =============================
// LOGIN REAL COM SUPABASE AUTH
// =============================

btnLoginAdmin.addEventListener("click", async function () {
    const email = document.getElementById("emailAdmin").value.trim();
    const senha = document.getElementById("senhaAdmin").value.trim();

    if (!email || !senha) {
        mensagemLogin.textContent = "Digite o e-mail e a senha.";
        return;
    }

    mensagemLogin.textContent = "Verificando login...";

    const { data, error } = await banco.auth.signInWithPassword({
        email: email,
        password: senha
    });

    if (error) {
        mensagemLogin.textContent = "Erro no login: e-mail ou senha incorretos.";
        console.log("Erro Auth:", error);
        return;
    }

    const usuario = data.user;

    if (!usuario) {
        mensagemLogin.textContent = "Não foi possível identificar o usuário.";
        return;
    }

    const adminAutorizado = await verificarSeUsuarioEAdmin(usuario.email);

    if (!adminAutorizado) {
        mensagemLogin.textContent = "Este usuário não tem permissão de administrador.";

        await banco.auth.signOut();

        return;
    }

    mensagemLogin.textContent = "Login administrativo realizado com sucesso!";

    areaAdmin.style.display = "block";

    carregarPortfoliosAdmin();
});


// =============================
// VERIFICAR SE O E-MAIL LOGADO É ADMIN
// =============================

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

    if (!data) {
        return false;
    }

    return true;
}


// =============================
// MANTER LOGIN SE JÁ HOUVER SESSÃO
// =============================

async function verificarSessaoAtual() {
    const { data, error } = await banco.auth.getUser();

    if (error || !data.user) {
        areaAdmin.style.display = "none";
        return;
    }

    const adminAutorizado = await verificarSeUsuarioEAdmin(data.user.email);

    if (adminAutorizado) {
        mensagemLogin.textContent = "Sessão administrativa ativa.";
        areaAdmin.style.display = "block";


        carregarTurmasAdmin();
        carregarDisciplinasAdmin();
        carregarAulasAdmin();
        carregarPortfoliosAdmin();
    } else {
        await banco.auth.signOut();
        areaAdmin.style.display = "none";
    }
}

verificarSessaoAtual();


// =============================
// SAIR DO PAINEL ADMIN
// =============================

btnSairAdmin.addEventListener("click", async function () {
    await banco.auth.signOut();

    areaAdmin.style.display = "none";

    mensagemLogin.textContent = "Você saiu do painel administrativo.";

    listaAdminPortfolios.innerHTML = "";
});


// =============================
// CARREGAR PORTFÓLIOS ENVIADOS
// =============================
 
btnCarregarAdmin.addEventListener("click", carregarPortfoliosAdmin);

async function carregarPortfoliosAdmin() {
    listaAdminPortfolios.innerHTML = "<p>Carregando portfólios...</p>";

    const { data, error } = await banco
        .from("portfolio_alunos")
        .select("id, nome_aluno, telefone, email, link_site, link_video, autorizado, aprovado, criado_em")
        .order("criado_em", { ascending: false });

    if (error) {
        listaAdminPortfolios.innerHTML = `
            <p>Erro ao carregar: ${error.message}</p>
        `;

        console.log("Erro ao carregar portfólios:", error);

        return;
    }

    if (!data || data.length === 0) {
        listaAdminPortfolios.innerHTML = "<p>Nenhum portfólio enviado ainda.</p>";
        return;
    }

    listaAdminPortfolios.innerHTML = "";

    data.forEach(function (aluno) {
        listaAdminPortfolios.innerHTML += `
            <div class="card-publicado">
                <h3>${aluno.nome_aluno}</h3>

                <p><strong>Telefone:</strong> ${aluno.telefone || "Não informado"}</p>

                <p><strong>E-mail:</strong> ${aluno.email || "Não informado"}</p>

                <p>
                    <strong>Site:</strong>
                    <a href="${aluno.link_site}" target="_blank">
                        Acessar site
                    </a>
                </p>

                <p>
                    <strong>Vídeo:</strong>
                    <a href="${aluno.link_video}" target="_blank">
                        Assistir vídeo
                    </a>
                </p>

                <p><strong>Autorizado:</strong> ${aluno.autorizado ? "Sim" : "Não"}</p>

                <p><strong>Aprovado:</strong> ${aluno.aprovado ? "Sim" : "Não"}</p>

                <button onclick="aprovarPortfolio(${aluno.id})">
                    ✅ Aprovar
                </button>

                <button onclick="ocultarPortfolio(${aluno.id})">
                    🚫 Ocultar
                </button>

                <button onclick="excluirPortfolio(${aluno.id})">
                    🗑️ Excluir
                </button>
            </div>
        `;
    });
}


// =============================
// APROVAR PORTFÓLIO
// =============================

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


// =============================
// OCULTAR PORTFÓLIO
// =============================

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


// =============================
// EXCLUIR PORTFÓLIO
// =============================

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

// =============================
// CARREGAR TURMAS NO PAINEL ADMIN
// =============================

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
        console.log("Erro ao carregar turmas no admin:", error);
        return;
    }

    selectTurma.innerHTML = `
        <option value="">Selecione uma turma</option>
    `;

    data.forEach(function(turma) {
        selectTurma.innerHTML += `
            <option value="${turma.id}">
                ${turma.nome_turma} - ${turma.curso}
            </option>
        `;
    });
}


// =============================
// CARREGAR DISCIPLINAS NO PAINEL ADMIN
// =============================

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
        console.log("Erro ao carregar disciplinas no admin:", error);
        return;
    }

    selectDisciplina.innerHTML = `
        <option value="">Selecione uma disciplina</option>
    `;

    data.forEach(function(disciplina) {
        selectDisciplina.innerHTML += `
            <option value="${disciplina.id}">
                ${disciplina.nome_disciplina}
            </option>
        `;
    });
}

// =============================
// SALVAR NOVA AULA
// =============================

const btnSalvarAula = document.getElementById("btnSalvarAula");

if (btnSalvarAula) {
    btnSalvarAula.addEventListener("click", async function() {
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

        if (!turmaId || !disciplinaId || !titulo) {
            mensagem.textContent = "Preencha pelo menos turma, disciplina e título da aula.";
            return;
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
                    ativo: true
                }
            ]);

        if (error) {
            mensagem.textContent = "Erro ao salvar aula: " + error.message;
            console.log("Erro ao salvar aula:", error);
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

        carregarAulasAdmin();
    });
}

// =============================
// CARREGAR AULAS NO ADMIN
// =============================

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
            titulo_aula,
            subtitulo,
            descricao,
            data_aula,
            horario_inicio,
            horario_fim,
            local_aula,
            desafio_pratico,
            ativo,
            turmas (
                nome_turma,
                curso
            ),
            disciplinas (
                nome_disciplina
            )
        `)
        .order("data_aula", { ascending: false });

    if (error) {
        lista.innerHTML = `
            <p>Erro ao carregar aulas: ${error.message}</p>
        `;
        console.log("Erro ao carregar aulas:", error);
        return;
    }

    if (!data || data.length === 0) {
        lista.innerHTML = "<p>Nenhuma aula cadastrada ainda.</p>";
        return;
    }

    lista.innerHTML = "";

    data.forEach(function(aula) {
        lista.innerHTML += `
            <div class="card-aula-admin">
                <h3>${aula.titulo_aula}</h3>

                <p>
                    <strong>Turma:</strong>
                    ${aula.turmas ? aula.turmas.nome_turma : "Não informada"}
                </p>

                <p>
                    <strong>Curso:</strong>
                    ${aula.turmas ? aula.turmas.curso : "Não informado"}
                </p>

                <p>
                    <strong>Disciplina:</strong>
                    ${aula.disciplinas ? aula.disciplinas.nome_disciplina : "Não informada"}
                </p>

                <p><strong>Data:</strong> ${aula.data_aula || "Não informada"}</p>

                <p>
                    <strong>Horário:</strong>
                    ${aula.horario_inicio || "--"} às ${aula.horario_fim || "--"}
                </p>

                <p><strong>Local:</strong> ${aula.local_aula || "Não informado"}</p>

                <p><strong>Status:</strong> ${aula.ativo ? "Ativa" : "Inativa"}</p>

                <button onclick="desativarAula(${aula.id})">
                    🚫 Desativar
                </button>

                <button onclick="excluirAula(${aula.id})">
                    🗑️ Excluir
                </button>
            </div>
        `;
    });
}

// =============================
// DESATIVAR AULA
// =============================

async function desativarAula(id) {
    const confirmar = confirm("Deseja desativar esta aula?");

    if (!confirmar) {
        return;
    }

    const { error } = await banco
        .from("aulas")
        .update({ ativo: false })
        .eq("id", id);

    if (error) {
        alert("Erro ao desativar aula: " + error.message);
        console.log("Erro ao desativar aula:", error);
        return;
    }

    alert("Aula desativada com sucesso!");

    carregarAulasAdmin();
}


// =============================
// EXCLUIR AULA
// =============================

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

// =============================
// UPLOAD DE ARQUIVO PARA SUPABASE STORAGE
// =============================

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

// =============================
// IDENTIFICAR TIPO DE MÍDIA
// =============================

function identificarTipoMidia(url) {
    if (!url) {
        return "vazio";
    }

    const texto = url.toLowerCase();

    if (
        texto.includes("youtube.com/watch") ||
        texto.includes("youtu.be/")
    ) {
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


// =============================
// CONVERTER LINK DO YOUTUBE PARA EMBED
// =============================

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


// =============================
// GERAR PRÉ-VISUALIZAÇÃO DA MÍDIA
// =============================

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

// =============================
// PRÉ-VISUALIZAR MÍDIA DA TURMA
// =============================

const btnPreviewTurmaMidia = document.getElementById("btnPreviewTurmaMidia");

if (btnPreviewTurmaMidia) {
    btnPreviewTurmaMidia.addEventListener("click", function() {
        const url = document.getElementById("novaTurmaFoto").value.trim();

        mostrarPreviewMidia(url, "previewTurmaMidia");
    });
}

// =============================
// UPLOAD DE ARQUIVO PARA SUPABASE STORAGE
// =============================

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

// =============================
// IDENTIFICAR TIPO DE MÍDIA
// =============================

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


// =============================
// CONVERTER YOUTUBE PARA EMBED
// =============================

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


// =============================
// MOSTRAR PRÉ-VISUALIZAÇÃO DA MÍDIA
// =============================

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

// =============================
// BOTÃO PRÉ-VISUALIZAR MÍDIA DA TURMA
// =============================

const btnPreviewTurmaMidia = document.getElementById("btnPreviewTurmaMidia");

if (btnPreviewTurmaMidia) {
    btnPreviewTurmaMidia.addEventListener("click", function () {
        const url = document.getElementById("novaTurmaFoto").value.trim();

        mostrarPreviewMidia(url, "previewTurmaMidia");
    });
}

// =============================
// CADASTRAR TURMA PELO ADMIN
// COM OPÇÃO DE LINK OU UPLOAD DE ARQUIVO
// =============================

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

            const urlUpload = await enviarArquivoParaStorage(
                arquivoFoto,
                "turmas"
            );

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

        if (typeof carregarTurmasAdmin === "function") {
            carregarTurmasAdmin();
        }
    });
}