// =====================================================
// PAINEL ADMINISTRATIVO - PORTAL DE AULAS E PORTFÓLIOS
// Professor Willyan Vieira
// =====================================================

// Este arquivo controla:
// 1. Login administrativo com Supabase Auth
// 2. Menu lateral sobreposto do painel admin
// 3. Cadastro de turmas
// 4. Cadastro de disciplinas
// 5. Cadastro e listagem de aulas
// 6. Aprovação, ocultação e exclusão de portfólios
// 7. Upload e pré-visualização de mídias
// 8. Botão de data atual e alerta para fim de semana/feriado fixo


// =====================================================
// 1. CONEXÃO COM O SUPABASE
// =====================================================

const SUPABASE_URL = "https://pwomyoprbvoimqmikvev.supabase.co";

// Use somente chave publishable ou anon public.
// Nunca coloque service_role ou sb_secret no navegador.
const SUPABASE_KEY = "sb_publishable_elGQyDU7ngaUHCLWIHLhDQ_IxiLo6kD";

// Cria a conexão com o Supabase.
const banco = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

console.log("Painel admin conectado ao Supabase.");


// =====================================================
// 2. ELEMENTOS PRINCIPAIS DA TELA
// =====================================================

// Botão de login do admin.
const btnLoginAdmin = document.getElementById("btnLoginAdmin");

// Área administrativa que fica escondida antes do login.
const areaAdmin = document.getElementById("areaAdmin");

// Mensagem exibida abaixo do login.
const mensagemLogin = document.getElementById("mensagemLogin");


// =====================================================
// 3. LOGIN ADMINISTRATIVO COM SUPABASE AUTH
// =====================================================

if (btnLoginAdmin) {
    btnLoginAdmin.addEventListener("click", async function () {
        const email = document.getElementById("emailAdmin").value.trim();
        const senha = document.getElementById("senhaAdmin").value.trim();

        if (!email || !senha) {
            mensagemLogin.textContent = "Digite o e-mail e a senha.";
            return;
        }

        mensagemLogin.textContent = "Verificando login...";

        // Faz login real usando Supabase Auth.
        const { data, error } = await banco.auth.signInWithPassword({
            email: email,
            password: senha
        });

        if (error) {
            mensagemLogin.textContent = "Erro no login: e-mail ou senha incorretos.";
            console.log("Erro no login:", error);
            return;
        }

        const usuario = data.user;

        if (!usuario) {
            mensagemLogin.textContent = "Não foi possível identificar o usuário.";
            return;
        }

        // Verifica se o e-mail logado está na tabela admins.
        const adminAutorizado = await verificarSeUsuarioEAdmin(usuario.email);

        if (!adminAutorizado) {
            mensagemLogin.textContent = "Este usuário não tem permissão de administrador.";
            await banco.auth.signOut();
            return;
        }

        mensagemLogin.textContent = "Login administrativo realizado com sucesso!";

        // Mostra a área administrativa.
        areaAdmin.style.display = "block";

        // Carrega dados iniciais usados no painel.
        carregarDadosIniciaisAdmin();
    });
}


// =====================================================
// 4. VERIFICAR SE O USUÁRIO LOGADO É ADMIN
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
// 5. MANTER SESSÃO ADMINISTRATIVA ATIVA
// =====================================================

async function verificarSessaoAtual() {
    if (!areaAdmin || !mensagemLogin) {
        return;
    }

    const { data, error } = await banco.auth.getUser();

    if (error || !data.user) {
        areaAdmin.style.display = "none";
        return;
    }

    const adminAutorizado = await verificarSeUsuarioEAdmin(data.user.email);

    if (adminAutorizado) {
        mensagemLogin.textContent = "Sessão administrativa ativa.";
        areaAdmin.style.display = "block";

        carregarDadosIniciaisAdmin();
    } else {
        await banco.auth.signOut();
        areaAdmin.style.display = "none";
    }
}

verificarSessaoAtual();


// =====================================================
// 6. CARREGAR DADOS INICIAIS DO ADMIN
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
// 7. BOTÃO SAIR DO PAINEL ADMIN
// =====================================================

function configurarBotaoSairAdmin() {
    const btnSairAdmin = document.getElementById("btnSairAdmin");

    if (!btnSairAdmin) {
        return;
    }

    btnSairAdmin.addEventListener("click", async function () {
        await banco.auth.signOut();

        if (areaAdmin) {
            areaAdmin.style.display = "none";
        }

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
    });
}


// =====================================================
// 8. MENU LATERAL SOBREPOSTO DO ADMIN
// =====================================================

function configurarMenuSobrepostoAdmin() {
    const btnAbrirMenu = document.getElementById("btnAbrirMenuAdmin");
    const btnFecharMenu = document.getElementById("btnFecharMenuAdmin");
    const menu = document.getElementById("menuLateralAdmin");
    const fundo = document.getElementById("fundoMenuAdmin");

    const itensMenu = document.querySelectorAll(".item-menu-admin[data-tela]");
    const telas = document.querySelectorAll(".tela-admin-sobreposta");
    const botoesVoltar = document.querySelectorAll(".btnVoltarMenuAdmin");

    function abrirMenu() {
        if (menu) {
            menu.classList.add("aberto");
        }

        if (fundo) {
            fundo.classList.add("aberto");
        }
    }

    function fecharMenu() {
        if (menu) {
            menu.classList.remove("aberto");
        }

        if (fundo) {
            fundo.classList.remove("aberto");
        }
    }

    function fecharTelas() {
        telas.forEach(function (tela) {
            tela.classList.remove("ativa");
        });
    }

    if (btnAbrirMenu) {
        btnAbrirMenu.addEventListener("click", abrirMenu);
    }

    if (btnFecharMenu) {
        btnFecharMenu.addEventListener("click", fecharMenu);
    }

    if (fundo) {
        fundo.addEventListener("click", fecharMenu);
    }

    // Cada botão do menu abre apenas uma tela por vez.
    itensMenu.forEach(function (item) {
        item.addEventListener("click", function () {
            const telaEscolhida = item.dataset.tela;

            fecharTelas();

            const tela = document.getElementById(telaEscolhida);

            if (tela) {
                tela.classList.add("ativa");
            }

            fecharMenu();

            // Ao abrir Aulas, atualiza turmas, disciplinas e aulas.
            if (telaEscolhida === "telaAulas") {
                carregarTurmasAdmin();
                carregarDisciplinasAdmin();
                carregarAulasAdmin();
            }

            // Ao abrir Portfólios, atualiza a lista.
            if (telaEscolhida === "telaPortfolios") {
                carregarPortfoliosAdmin();
            }
        });
    });

    // Botão voltar fecha a tela atual e abre novamente o menu lateral.
    botoesVoltar.forEach(function (botao) {
        botao.addEventListener("click", function () {
            fecharTelas();
            abrirMenu();
        });
    });
}


// =====================================================
// 9. CARREGAR TURMAS NO SELECT DO ADMIN
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
                ${turma.nome_turma} - ${turma.curso}
            </option>
        `;
    });
}


// =====================================================
// 10. CARREGAR DISCIPLINAS NO SELECT DO ADMIN
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
// 11. CADASTRAR NOVA TURMA
// =====================================================

const btnCadastrarTurma = document.getElementById("btnCadastrarTurma");

if (btnCadastrarTurma) {
    btnCadastrarTurma.addEventListener("click", async function () {
        const mensagem = document.getElementById("mensagemTurmaAdmin");

        const nome = document.getElementById("novaTurmaNome").value.trim();
        const curso = document.getElementById("novaTurmaCurso").value.trim();
        const descricao = document.getElementById("novaTurmaDescricao").value.trim();

        // Pode vir de link colado ou de upload.
        let foto = document.getElementById("novaTurmaFoto").value.trim();

        const arquivoFoto = document.getElementById("arquivoTurmaFoto");

        if (!nome || !curso) {
            mensagem.textContent = "Preencha o nome da turma e o curso.";
            return;
        }

        mensagem.textContent = "Cadastrando turma...";

        // Se o professor escolheu um arquivo, faz upload para o Supabase Storage.
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
// 12. CADASTRAR NOVA DISCIPLINA
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
// 13. SALVAR NOVA AULA
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
        const pdfUrl = document.getElementById("adminPdfAula").value.trim();
const videoUrl = document.getElementById("adminVideoAula").value.trim();
const atividadeUrl = document.getElementById("adminAtividadeAula").value.trim();
const materialExtraUrl = document.getElementById("adminMaterialExtraAula").value.trim();

        if (!turmaId || !disciplinaId || !titulo) {
            mensagem.textContent = "Preencha pelo menos turma, disciplina e título da aula.";
            return;
        }

        // Verifica se a data é fim de semana ou feriado fixo.
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

    ativo: true
}
            ]);

        if (error) {
            mensagem.textContent = "Erro ao salvar aula: " + error.message;
            console.log("Erro aula:", error);
            return;
        }

       mensagem.textContent = "Aula salva com sucesso!";

// Limpa os campos principais da aula
document.getElementById("adminTituloAula").value = "";
document.getElementById("adminSubtituloAula").value = "";
document.getElementById("adminDescricaoAula").value = "";
document.getElementById("adminDataAula").value = "";
document.getElementById("adminHorarioInicio").value = "";
document.getElementById("adminHorarioFim").value = "";
document.getElementById("adminLocalAula").value = "";
document.getElementById("adminDesafioAula").value = "";

// Limpa os campos de materiais da aula
document.getElementById("adminPdfAula").value = "";
document.getElementById("adminVideoAula").value = "";
document.getElementById("adminAtividadeAula").value = "";
document.getElementById("adminMaterialExtraAula").value = "";

carregarAulasAdmin();
    });
}


// =====================================================
// 14. CARREGAR AULAS CADASTRADAS
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
                <h3>${aula.titulo_aula}</h3>

                <p><strong>Turma:</strong> ${aula.turmas ? aula.turmas.nome_turma : "Não informada"}</p>

                <p><strong>Curso:</strong> ${aula.turmas ? aula.turmas.curso : "Não informado"}</p>

                <p><strong>Disciplina:</strong> ${aula.disciplinas ? aula.disciplinas.nome_disciplina : "Não informada"}</p>

                <p><strong>Data:</strong> ${aula.data_aula || "Não informada"}</p>

                <p><strong>Horário:</strong> ${aula.horario_inicio || "--"} às ${aula.horario_fim || "--"}</p>

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


// =====================================================
// 15. DESATIVAR AULA
// =====================================================

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


// =====================================================
// 16. EXCLUIR AULA
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
// 17. CARREGAR PORTFÓLIOS NO ADMIN
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

                <p><strong>Data de envio:</strong> ${new Date(aluno.criado_em).toLocaleString("pt-BR")}</p>

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


// =====================================================
// 18. FILTROS DOS PORTFÓLIOS
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
// 19. APROVAR PORTFÓLIO
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
// 20. OCULTAR PORTFÓLIO
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
// 21. EXCLUIR PORTFÓLIO
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
// 22. UPLOAD DE ARQUIVO PARA SUPABASE STORAGE
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
// 23. IDENTIFICAR TIPO DE MÍDIA
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
// 24. CONVERTER YOUTUBE PARA EMBED
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
// 25. MOSTRAR PRÉ-VISUALIZAÇÃO DE MÍDIA
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
// 26. BOTÃO PRÉ-VISUALIZAR MÍDIA DA TURMA
// =====================================================

const btnPreviewTurmaMidia = document.getElementById("btnPreviewTurmaMidia");

if (btnPreviewTurmaMidia) {
    btnPreviewTurmaMidia.addEventListener("click", function () {
        const url = document.getElementById("novaTurmaFoto").value.trim();

        mostrarPreviewMidia(url, "previewTurmaMidia");
    });
}


// =====================================================
// 27. BOTÃO DATA DE HOJE
// =====================================================

const btnDataHoje = document.getElementById("btnDataHoje");

if (btnDataHoje) {
    btnDataHoje.addEventListener("click", function () {
        const campoData = document.getElementById("adminDataAula");

        const hoje = new Date();

        const ano = hoje.getFullYear();
        const mes = String(hoje.getMonth() + 1).padStart(2, "0");
        const dia = String(hoje.getDate()).padStart(2, "0");

        campoData.value = `${ano}-${mes}-${dia}`;

        verificarFeriadoOuFimDeSemana(campoData.value);
    });
}


// =====================================================
// 28. VERIFICAR FERIADO OU FIM DE SEMANA
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
// 29. INICIAR FUNÇÕES DE INTERFACE
// =====================================================

configurarMenuSobrepostoAdmin();
configurarBotaoSairAdmin();