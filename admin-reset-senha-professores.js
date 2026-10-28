(function () {
    const EMAIL_INSTITUCIONAL = /^[^@\s]+@prof\.educacao\.sp\.gov\.br$/i;

    document.addEventListener("DOMContentLoaded", function () {
        const tela = document.getElementById("telaHorariosProfessores");
        const anchor = tela && (
            tela.querySelector(".controle-expediente-admin")
            || tela.querySelector(".card-admin-form")
        );
        if (!anchor) {
            console.error("A área de redefinição de senha não encontrou a tela de horários dos professores.");
            return;
        }

        const secao = document.createElement("section");
        secao.className = "card-admin-form";
        secao.hidden = true;
        secao.innerHTML = `
            <h3>Redefinir senha de professor</h3>
            <p class="texto-ajuda">
                Envia um link de redefinição para o e-mail institucional. O professor cria a nova senha, que é protegida pelo Firebase e nunca salva no banco do site.
            </p>
            <label for="emailRedefinicaoProfessor">E-mail institucional do professor</label>
            <input type="email" id="emailRedefinicaoProfessor" placeholder="nome@prof.educacao.sp.gov.br" autocomplete="email">
            <button type="button" id="btnEnviarRedefinicaoProfessor">Enviar link de redefinição</button>
            <p id="mensagemRedefinicaoProfessor" role="status"></p>
        `;
        anchor.before(secao);

        const botao = secao.querySelector("#btnEnviarRedefinicaoProfessor");
        const campoEmail = secao.querySelector("#emailRedefinicaoProfessor");
        const mensagem = secao.querySelector("#mensagemRedefinicaoProfessor");
        const auth = window.firebaseAuthRiolando;
        let verificacaoAtual = 0;

        if (!auth || !window.firebaseData || typeof window.firebaseData.getAccess !== "function") {
            console.error("A redefinição de senha exige Firebase Auth e verificação do perfil administrativo.");
            return;
        }

        auth.onAuthStateChanged(async function (user) {
            const verificacao = ++verificacaoAtual;
            secao.hidden = true;
            if (!user) return;

            try {
                const acesso = await window.firebaseData.getAccess();
                if (verificacao !== verificacaoAtual || auth.currentUser?.uid !== user.uid) return;
                secao.hidden = acesso.admin !== true;
            } catch (error) {
                console.error("Não foi possível verificar o acesso administrativo para redefinições:", error);
            }
        });

        botao.addEventListener("click", async function () {
            const user = auth.currentUser;
            const email = String(campoEmail.value || "").trim().toLowerCase();
            if (!user) {
                mensagem.textContent = "Entre como administrador para enviar uma redefinição.";
                return;
            }
            if (!EMAIL_INSTITUCIONAL.test(email)) {
                mensagem.textContent = "Informe um e-mail @prof.educacao.sp.gov.br válido.";
                campoEmail.focus();
                return;
            }

            botao.disabled = true;
            mensagem.textContent = "Verificando permissão e enviando o link...";
            try {
                const acesso = await window.firebaseData.getAccess();
                if (auth.currentUser?.uid !== user.uid || acesso.admin !== true) {
                    throw new Error("Somente o administrador autenticado pode enviar redefinições.");
                }
                if (!window.confirm(`Enviar um link de redefinição de senha para ${email}?`)) {
                    mensagem.textContent = "";
                    return;
                }

                auth.languageCode = "pt-BR";
                await auth.sendPasswordResetEmail(email, {
                    url: `${window.location.origin}/horario-celular.html`
                });
                mensagem.textContent = "Se houver uma conta com esse e-mail, o professor receberá o link para criar uma nova senha.";
            } catch (error) {
                console.error("Erro ao enviar redefinição de senha ao professor:", error);
                mensagem.textContent = mensagemErroRedefinicaoProfessor(error);
            } finally {
                botao.disabled = false;
            }
        });
    });

    function mensagemErroRedefinicaoProfessor(error) {
        if (error.code === "auth/too-many-requests") {
            return "Muitas solicitações. Aguarde antes de tentar novamente.";
        }
        if (error.code === "auth/operation-not-allowed") {
            return "O acesso por e-mail e senha ainda não está habilitado no Firebase.";
        }
        if (error.code === "auth/unauthorized-continue-uri") {
            return "O domínio do site precisa ser autorizado para redefinições no Firebase.";
        }
        return error.message || "Não foi possível enviar o link. Confira a conexão e o e-mail e tente novamente.";
    }
}());
