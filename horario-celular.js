(function () {
    const COLECAO_RESERVAS_SALAS = "reservas_salas";
    const COLECAO_MEMBROS_RESERVAS = "reserva_salas_membros";
    const COLECAO_TRAVAS_RESERVAS = "reserva_salas_locks";
    const AMBIENTES_RESERVA = new Set(["Maker", "Acessa", "Leitura"]);
    const LIMITE_AGENDA_RESERVAS = 300;
    let usuarioReservaSala = null;
    let perfilReservaSala = null;
    let reservasSala = [];
    let pararObservacaoReservasSala = null;
    let timerNovaTentativaReservasSala = null;
    let mensagemErroAcesso = "";
    let sequenciaEstadoAutenticacao = 0;

    document.addEventListener("DOMContentLoaded", function () {
        const auth = window.firebaseAuthRiolando;
        const db = window.firebaseDbRiolando;
        const login = document.getElementById("formLoginReservaSala");
        const botaoEntrarEmail = document.getElementById("btnEntrarEmailReservaSala");
        const botaoCriarAcesso = document.getElementById("btnCriarAcessoReservaSala");
        const botaoMostrarCriarAcesso = document.getElementById("btnMostrarCriarAcessoReservaSala");
        const botaoRecuperarSenha = document.getElementById("btnRecuperarSenhaReservaSala");
        const botaoReenviarVerificacao = document.getElementById("btnReenviarVerificacaoReservaSala");
        const botaoConfirmarVerificacao = document.getElementById("btnConfirmarVerificacaoReservaSala");
        const camposCriarAcesso = document.getElementById("criarAcessoReservaSala");
        const formReserva = document.getElementById("formReservaSala");
        const botaoSair = document.getElementById("btnSairReservaSala");
        const campoData = document.getElementById("dataReservaSala");
        const lista = document.getElementById("listaReservasSalasCelular");

        if (!auth || !db || !login || !botaoEntrarEmail || !formReserva) return;

        if (campoData) {
            campoData.min = dataLocalReservaSala(new Date());
            campoData.value = campoData.min;
        }

        botaoEntrarEmail.addEventListener("click", async function () {
            const email = pegarEmailReservaSala();
            const senha = document.getElementById("senhaReservaSala").value;
            if (!validarEmailInstitucionalReservaSala(email) || !senha) {
                mostrarMensagemReservaSala("mensagemReservaSala", "Informe seu e-mail @prof.educacao.sp.gov.br e sua senha.");
                return;
            }

            mensagemErroAcesso = "";
            botaoEntrarEmail.disabled = true;
            mostrarMensagemReservaSala("mensagemReservaSala", "Validando acesso...");
            try {
                await auth.signInWithEmailAndPassword(email, senha);
            } catch (error) {
                console.error("Erro ao entrar com e-mail na agenda de reservas:", error);
                mensagemErroAcesso = mensagemErroEmailReservaSala(error);
                mostrarMensagemReservaSala("mensagemReservaSala", mensagemErroAcesso);
            } finally {
                botaoEntrarEmail.disabled = false;
            }
        });

        if (botaoMostrarCriarAcesso && camposCriarAcesso) {
            botaoMostrarCriarAcesso.addEventListener("click", function () {
                camposCriarAcesso.hidden = !camposCriarAcesso.hidden;
                if (!camposCriarAcesso.hidden) document.getElementById("confirmarSenhaReservaSala").focus();
            });
        }

        if (botaoCriarAcesso) {
            botaoCriarAcesso.addEventListener("click", async function () {
                const email = pegarEmailReservaSala();
                const senha = document.getElementById("senhaReservaSala").value;
                const confirmacao = document.getElementById("confirmarSenhaReservaSala").value;
                if (!validarEmailInstitucionalReservaSala(email)) {
                    mostrarMensagemReservaSala("mensagemReservaSala", "Use seu e-mail institucional @prof.educacao.sp.gov.br.");
                    return;
                }
                if (senha.length < 8) {
                    mostrarMensagemReservaSala("mensagemReservaSala", "Crie uma senha com pelo menos 8 caracteres.");
                    return;
                }
                if (senha !== confirmacao) {
                    mostrarMensagemReservaSala("mensagemReservaSala", "As senhas não conferem.");
                    return;
                }

                mensagemErroAcesso = "";
                botaoCriarAcesso.disabled = true;
                mostrarMensagemReservaSala("mensagemReservaSala", "Verificando seu cadastro e criando o acesso...");
                let usuarioCriado = null;
                try {
                    const credential = await auth.createUserWithEmailAndPassword(email, senha);
                    usuarioCriado = credential.user;
                    try {
                        await validarCadastroReservaSala(db, usuarioCriado);
                    } catch (error) {
                        try {
                            await usuarioCriado.delete();
                        } catch (erroExclusao) {
                            console.error("Não foi possível remover a conta sem perfil de reserva:", erroExclusao);
                            throw new Error(`${error.message} A conta criada não pôde ser removida; use “Esqueci minha senha” ou contate a escola.`);
                        }
                        throw error;
                    }

                    await enviarVerificacaoEmailReservaSala(usuarioCriado);
                    camposCriarAcesso.hidden = true;
                    mostrarMensagemReservaSala("mensagemReservaSala", "Acesso criado. Enviamos um link de verificação para seu e-mail institucional. Confirme-o antes de entrar.");
                } catch (error) {
                    if (error.code === "auth/email-already-in-use") {
                        try {
                            await enviarRedefinicaoSenhaReservaSala(auth, email);
                            camposCriarAcesso.hidden = true;
                            mostrarMensagemReservaSala("mensagemReservaSala", "Esta conta já está cadastrada. Enviamos um link para definir ou redefinir sua senha ao e-mail institucional.");
                            return;
                        } catch (erroEnvio) {
                            console.error("Erro ao enviar redefinição no primeiro acesso:", erroEnvio);
                            mensagemErroAcesso = mensagemErroEmailReservaSala(erroEnvio);
                            mostrarMensagemReservaSala("mensagemReservaSala", mensagemErroAcesso);
                            return;
                        }
                    }

                    console.error("Erro ao criar acesso por e-mail:", error);
                    mensagemErroAcesso = error.code && error.code.startsWith("auth/")
                        ? mensagemErroEmailReservaSala(error)
                        : mensagemErroFirestoreReservaSala(error);
                    mostrarMensagemReservaSala("mensagemReservaSala", mensagemErroAcesso);
                } finally {
                    botaoCriarAcesso.disabled = false;
                }
            });
        }

        if (botaoRecuperarSenha) {
            botaoRecuperarSenha.addEventListener("click", async function () {
                const email = pegarEmailReservaSala();
                if (!validarEmailInstitucionalReservaSala(email)) {
                    mostrarMensagemReservaSala("mensagemReservaSala", "Informe seu e-mail @prof.educacao.sp.gov.br para receber a redefinição.");
                    return;
                }

                mensagemErroAcesso = "";
                botaoRecuperarSenha.disabled = true;
                mostrarMensagemReservaSala("mensagemReservaSala", "Enviando solicitação de redefinição...");
                try {
                    await enviarRedefinicaoSenhaReservaSala(auth, email);
                    mostrarMensagemReservaSala("mensagemReservaSala", "Se houver uma conta com esse e-mail, você receberá um link para criar uma nova senha.");
                } catch (error) {
                    console.error("Erro ao solicitar redefinição de senha:", error);
                    mostrarMensagemReservaSala("mensagemReservaSala", mensagemErroEmailReservaSala(error));
                } finally {
                    botaoRecuperarSenha.disabled = false;
                }
            });
        }

        if (botaoReenviarVerificacao) {
            botaoReenviarVerificacao.addEventListener("click", async function () {
                if (!auth.currentUser || auth.currentUser.emailVerified) return;
                botaoReenviarVerificacao.disabled = true;
                try {
                    await enviarVerificacaoEmailReservaSala(auth.currentUser);
                    mostrarMensagemReservaSala("mensagemReservaSala", "Enviamos outro link de verificação para seu e-mail.");
                } catch (error) {
                    console.error("Erro ao reenviar verificação de e-mail:", error);
                    mostrarMensagemReservaSala("mensagemReservaSala", mensagemErroEmailReservaSala(error));
                } finally {
                    botaoReenviarVerificacao.disabled = false;
                }
            });
        }

        if (botaoConfirmarVerificacao) {
            botaoConfirmarVerificacao.addEventListener("click", async function () {
                if (!auth.currentUser) return;
                botaoConfirmarVerificacao.disabled = true;
                try {
                    await auth.currentUser.reload();
                    if (!auth.currentUser.emailVerified) {
                        mostrarMensagemReservaSala("mensagemReservaSala", "Ainda não encontramos a confirmação. Abra o link recebido no e-mail e tente novamente.");
                        return;
                    }
                    await auth.currentUser.getIdToken(true);
                    window.location.reload();
                } catch (error) {
                    console.error("Erro ao confirmar o e-mail institucional:", error);
                    mostrarMensagemReservaSala("mensagemReservaSala", mensagemErroEmailReservaSala(error));
                } finally {
                    botaoConfirmarVerificacao.disabled = false;
                }
            });
        }

        formReserva.addEventListener("submit", async function (event) {
            event.preventDefault();
            if (!usuarioReservaSala || !perfilReservaSala) return;

            const submit = formReserva.querySelector('button[type="submit"]');
            submit.disabled = true;
            mostrarMensagemReservaSala("mensagemEnvioReservaSala", "Verificando disponibilidade...");

            try {
                await criarReservaSala(db, {
                    data: document.getElementById("dataReservaSala").value,
                    horario_inicio: document.getElementById("inicioReservaSala").value,
                    horario_fim: document.getElementById("fimReservaSala").value,
                    ambiente: document.getElementById("ambienteReservaSala").value
                });
                mostrarMensagemReservaSala("mensagemEnvioReservaSala", "Reserva confirmada. O ambiente já aparece na agenda da TV.");
                formReserva.reset();
                campoData.min = dataLocalReservaSala(new Date());
                campoData.value = campoData.min;
            } catch (error) {
                console.error("Erro ao criar reserva de sala:", error);
                mostrarMensagemReservaSala("mensagemEnvioReservaSala", mensagemErroFirestoreReservaSala(error));
            } finally {
                submit.disabled = false;
            }
        });

        if (botaoSair) {
            botaoSair.addEventListener("click", function () {
                auth.signOut().catch(function (error) {
                    console.error("Erro ao sair da agenda de reservas:", error);
                    mostrarMensagemReservaSala("mensagemReservaSala", "Não foi possível encerrar a sessão.");
                });
            });
        }

        if (lista) {
            lista.addEventListener("click", async function (event) {
                const button = event.target.closest("[data-cancelar-reserva]");
                if (!button || !usuarioReservaSala) return;

                button.disabled = true;
                try {
                    await cancelarReservaSala(db, button.dataset.cancelarReserva);
                    mostrarMensagemReservaSala("mensagemEnvioReservaSala", "Reserva cancelada.");
                } catch (error) {
                    console.error("Erro ao cancelar reserva:", error);
                    mostrarMensagemReservaSala("mensagemEnvioReservaSala", mensagemErroFirestoreReservaSala(error));
                    button.disabled = false;
                }
            });
        }

        auth.onAuthStateChanged(async function (user) {
            const sequenciaAtual = ++sequenciaEstadoAutenticacao;
            const estadoAindaAtual = function () {
                return sequenciaAtual === sequenciaEstadoAutenticacao
                    && (auth.currentUser?.uid || null) === (user?.uid || null);
            };

            usuarioReservaSala = user;
            perfilReservaSala = null;
            if (pararObservacaoReservasSala) {
                pararObservacaoReservasSala();
                pararObservacaoReservasSala = null;
            }
            if (timerNovaTentativaReservasSala) {
                clearTimeout(timerNovaTentativaReservasSala);
                timerNovaTentativaReservasSala = null;
            }

            const painel = document.getElementById("painelReservaSala");
            login.hidden = false;
            painel.hidden = true;
            if (botaoReenviarVerificacao) botaoReenviarVerificacao.hidden = true;
            if (botaoConfirmarVerificacao) botaoConfirmarVerificacao.hidden = true;
            if (camposCriarAcesso) camposCriarAcesso.hidden = true;

            if (!user) {
                reservasSala = [];
                renderizarAgendaReservasSala();
                mostrarMensagemReservaSala(
                    "mensagemReservaSala",
                    mensagemErroAcesso || "Entre com seu e-mail institucional verificado para agendar."
                );
                return;
            }

            if (!validarEmailInstitucionalReservaSala(user.email)) {
                mensagemErroAcesso = "A agenda aceita somente contas @prof.educacao.sp.gov.br cadastradas pela escola.";
                await encerrarSessaoReservaSala(auth, mensagemErroAcesso);
                return;
            }

            const possuiAcessoPorEmail = user.providerData.some(provider => provider.providerId === "password");
            if (!possuiAcessoPorEmail) {
                mensagemErroAcesso = "Esta conta ainda não tem senha. Use “Primeiro acesso? Criar senha” para receber um link no e-mail institucional.";
                await encerrarSessaoReservaSala(auth, mensagemErroAcesso);
                return;
            }

            if (!user.emailVerified) {
                if (botaoReenviarVerificacao) botaoReenviarVerificacao.hidden = false;
                if (botaoConfirmarVerificacao) botaoConfirmarVerificacao.hidden = false;
                mostrarMensagemReservaSala("mensagemReservaSala", "Confirme o link enviado ao seu e-mail institucional. Depois, entre novamente para reservar.");
                return;
            }

            try {
                const token = await user.getIdTokenResult();
                if (token.signInProvider !== "password") {
                    mensagemErroAcesso = "Entre usando seu e-mail institucional e sua senha. O acesso pelo Google não está disponível.";
                    await encerrarSessaoReservaSala(auth, mensagemErroAcesso);
                    return;
                }
            } catch (error) {
                console.error("Não foi possível confirmar o método de autenticação:", error);
                mensagemErroAcesso = "Não foi possível confirmar seu acesso. Entre novamente com e-mail e senha.";
                await encerrarSessaoReservaSala(auth, mensagemErroAcesso);
                return;
            }

            mostrarMensagemReservaSala("mensagemReservaSala", "Conferindo seu perfil...");
            try {
                perfilReservaSala = await carregarPerfilReservaSala(db, user);
                if (!estadoAindaAtual()) return;

                login.hidden = true;
                painel.hidden = false;
                document.getElementById("nomeProfessorReservaSala").textContent = perfilReservaSala.nome;
                mensagemErroAcesso = "";
                mostrarMensagemReservaSala("mensagemReservaSala", "Acesso autorizado. Você já pode agendar um ambiente.");
                observarAgendaReservasSala(db);
            } catch (error) {
                if (!estadoAindaAtual()) return;
                console.error("Erro ao carregar perfil da agenda de reservas:", error);
                login.hidden = false;
                mensagemErroAcesso = mensagemErroFirestoreReservaSala(error);
                await encerrarSessaoReservaSala(auth, mensagemErroAcesso);
            }
        });
    });

    async function carregarPerfilReservaSala(db, user) {
        const email = String(user.email || "").trim();
        if (!validarEmailInstitucionalReservaSala(email) || user.emailVerified !== true) {
            throw new Error("Entre com um e-mail institucional verificado e cadastrado pela escola.");
        }

        const [papelAdmin, papelCoordenacao] = await Promise.all([
            db.collection("_roles_admin").doc(user.uid).get(),
            db.collection("_roles_coordenacao").doc(user.uid).get()
        ]);
        if (papelAdmin.exists && papelAdmin.data().active === true) {
            return {
                nome: await garantirNomeReservaSala(user),
                perfil: { perfil: "admin", user_id: user.uid, ativo: true }
            };
        }

        const membroRef = db.collection(COLECAO_MEMBROS_RESERVAS).doc(user.uid);
        const membroAtual = await membroRef.get();
        if (membroAtual.exists) {
            const profile = validarPerfilReservaSala(
                await db.collection("perfis_acesso").doc(membroAtual.data().profile_id).get(),
                user
            );
            if (profile.perfil.user_id !== user.uid) {
                throw new Error("Este perfil já está vinculado a outro acesso. Solicite ajuda ao administrador.");
            }
            return profile;
        }

        const perfis = await db.collection("perfis_acesso")
            .where("email", "==", email)
            .limit(1)
            .get();
        if (perfis.empty) {
            if (papelCoordenacao.exists && papelCoordenacao.data().active === true) {
                return {
                    nome: await garantirNomeReservaSala(user),
                    perfil: { perfil: "coordenacao", user_id: user.uid, ativo: true }
                };
            }
            throw new Error("Não encontramos um perfil ativo de professor ou coordenação para este e-mail. Peça à escola para cadastrá-lo.");
        }

        const perfilDoc = perfis.docs[0];
        const perfil = validarDadosPerfilReservaSala(perfilDoc.data(), user);
        if (perfil.perfil.user_id && perfil.perfil.user_id !== user.uid) {
            throw new Error("Este perfil já está vinculado a outro acesso. Solicite ajuda à escola.");
        }
        const membro = {
            profile_id: perfilDoc.id,
            email: email.toLowerCase(),
            nome: perfil.nome
        };

        try {
            await db.runTransaction(async function (transaction) {
                const [membroTransacao, perfilTransacao] = await Promise.all([
                    transaction.get(membroRef),
                    transaction.get(perfilDoc.ref)
                ]);
                if (membroTransacao.exists) return;
                if (!perfilTransacao.exists) {
                    throw new Error("O perfil de professor não foi encontrado.");
                }

                const perfilAtual = validarDadosPerfilReservaSala(perfilTransacao.data(), user);
                transaction.set(perfilDoc.ref, {
                    user_id: user.uid,
                    trocar_senha_obrigatorio: false
                }, { merge: true });
                transaction.set(membroRef, {
                    profile_id: perfilDoc.id,
                    email: email.toLowerCase(),
                    nome: perfilAtual.nome
                });
            });
        } catch (error) {
            const membroAposFalha = await membroRef.get();
            if (!membroAposFalha.exists) throw error;
            return validarPerfilReservaSala(
                await db.collection("perfis_acesso").doc(membroAposFalha.data().profile_id).get(),
                user
            );
        }

        return perfil;
    }

    async function validarCadastroReservaSala(db, user) {
        const email = String(user.email || "").trim();
        const perfis = await db.collection("perfis_acesso")
            .where("email", "==", email)
            .limit(1)
            .get();
        if (perfis.empty) {
            throw new Error("Não encontramos um cadastro ativo de professor ou coordenação para este e-mail. Confirme o endereço ou solicite o cadastro à escola.");
        }

        const perfil = validarDadosPerfilReservaSala(perfis.docs[0].data(), user);
        if (perfil.perfil.user_id && perfil.perfil.user_id !== user.uid) {
            throw new Error("Este perfil já está vinculado a outro acesso. Solicite ajuda à escola.");
        }
    }

    function validarPerfilReservaSala(documento, user) {
        if (!documento.exists) throw new Error("O perfil de professor vinculado não está mais ativo.");
        return validarDadosPerfilReservaSala(documento.data(), user);
    }

    function validarDadosPerfilReservaSala(perfil, user) {
        const email = String(user.email || "").trim().toLowerCase();
        const perfilAtivo = perfil.ativo === true
            && ["professor", "coordenacao"].includes(String(perfil.perfil || "").toLowerCase())
            && String(perfil.email || "").trim().toLowerCase() === email;
        if (!perfilAtivo) {
            throw new Error("Este acesso está disponível apenas para professores e equipe autorizada.");
        }

        return {
            nome: String(perfil.nome || user.displayName || email).trim(),
            perfil
        };
    }

    async function garantirNomeReservaSala(user) {
        const nome = String(user.displayName || user.email || "").trim();
        if (!nome) throw new Error("Não foi possível identificar o nome desta conta.");
        if (user.displayName !== nome) {
            await user.updateProfile({ displayName: nome });
            await user.getIdToken(true);
        }
        return nome;
    }

    function enviarVerificacaoEmailReservaSala(user) {
        return user.sendEmailVerification({
            url: `${window.location.origin}/horario-celular.html`
        });
    }

    function enviarRedefinicaoSenhaReservaSala(auth, email) {
        auth.languageCode = "pt-BR";
        return auth.sendPasswordResetEmail(email, {
            url: `${window.location.origin}/horario-celular.html`
        });
    }

    async function encerrarSessaoReservaSala(auth, mensagem) {
        mensagemErroAcesso = mensagem;
        try {
            await auth.signOut();
        } catch (error) {
            console.error("Não foi possível encerrar uma sessão sem permissão de reserva:", error);
            mostrarMensagemReservaSala("mensagemReservaSala", `${mensagem} Não foi possível encerrar a sessão; recarregue a página.`);
        }
    }

    function pegarEmailReservaSala() {
        return String(document.getElementById("emailReservaSala")?.value || "").trim().toLowerCase();
    }

    function validarEmailInstitucionalReservaSala(email) {
        return /^[^@\s]+@prof\.educacao\.sp\.gov\.br$/i.test(String(email || "").trim());
    }

    function observarAgendaReservasSala(db) {
        if (timerNovaTentativaReservasSala) {
            clearTimeout(timerNovaTentativaReservasSala);
            timerNovaTentativaReservasSala = null;
        }
        if (pararObservacaoReservasSala) pararObservacaoReservasSala();

        const uid = usuarioReservaSala.uid;
        pararObservacaoReservasSala = db.collection(COLECAO_RESERVAS_SALAS)
            .where("data", ">=", dataLocalReservaSala(new Date()))
            .orderBy("data")
            .limit(LIMITE_AGENDA_RESERVAS)
            .onSnapshot(function (consulta) {
                reservasSala = ordenarReservasSala(consulta.docs.map(function (documento) {
                    return Object.assign({ id: documento.id }, documento.data());
                }));
                renderizarAgendaReservasSala();
            }, function (error) {
                console.error("Erro ao observar a agenda de reservas:", error);
                mostrarMensagemReservaSala("mensagemEnvioReservaSala", mensagemErroFirestoreReservaSala(error));
                pararObservacaoReservasSala = null;
                timerNovaTentativaReservasSala = setTimeout(function () {
                    timerNovaTentativaReservasSala = null;
                    if (usuarioReservaSala?.uid === uid) observarAgendaReservasSala(db);
                }, 5 * 60 * 1000);
            });
    }

    async function criarReservaSala(db, value) {
        const reservation = validarReservaSala(value);
        const agora = new Date();
        if (reservation.data < dataLocalReservaSala(agora)
            || (reservation.data === dataLocalReservaSala(agora) && reservation.horario_inicio <= horarioLocalReservaSala(agora))) {
            throw new Error("Escolha uma data e horário futuros.");
        }

        const collection = db.collection(COLECAO_RESERVAS_SALAS);
        const lockRef = db.collection(COLECAO_TRAVAS_RESERVAS)
            .doc(`${reservation.data}_${reservation.ambiente}`);
        const reservationRef = collection.doc();

        await db.runTransaction(async function (transaction) {
            const lockSnapshot = await transaction.get(lockRef);
            const sameDay = await transaction.get(collection.where("data", "==", reservation.data));
            const hasConflict = sameDay.docs.some(function (documento) {
                const existing = documento.data();
                return existing.ambiente === reservation.ambiente
                    && reservation.horario_inicio < existing.horario_fim
                    && reservation.horario_fim > existing.horario_inicio;
            });
            if (hasConflict) {
                throw new Error("Esse ambiente já está reservado nesse intervalo. Escolha outro horário.");
            }

            const version = lockSnapshot.exists ? Number(lockSnapshot.data().version) + 1 : 1;
            const timestamp = firebase.firestore.FieldValue.serverTimestamp();
            transaction.set(reservationRef, Object.assign({
                id: reservationRef.id,
                professor: perfilReservaSala.nome,
                professor_uid: usuarioReservaSala.uid,
                criado_em: timestamp
            }, reservation));
            transaction.set(lockRef, {
                data: reservation.data,
                ambiente: reservation.ambiente,
                version,
                updated_by: usuarioReservaSala.uid,
                updated_at: timestamp,
                last_reservation_id: reservationRef.id
            });
        });
    }

    async function cancelarReservaSala(db, id) {
        const reservationRef = db.collection(COLECAO_RESERVAS_SALAS).doc(String(id || ""));
        await db.runTransaction(async function (transaction) {
            const reservation = await transaction.get(reservationRef);
            if (!reservation.exists) throw new Error("Esta reserva não foi encontrada.");
            const value = reservation.data();
            if (value.professor_uid !== usuarioReservaSala.uid) {
                throw new Error("Você só pode cancelar as suas próprias reservas.");
            }

            const lockRef = db.collection(COLECAO_TRAVAS_RESERVAS)
                .doc(`${value.data}_${value.ambiente}`);
            const lock = await transaction.get(lockRef);
            const timestamp = firebase.firestore.FieldValue.serverTimestamp();
            transaction.delete(reservationRef);
            transaction.set(lockRef, {
                data: value.data,
                ambiente: value.ambiente,
                version: lock.exists ? Number(lock.data().version) + 1 : 1,
                updated_by: usuarioReservaSala.uid,
                updated_at: timestamp,
                last_reservation_id: reservationRef.id
            });
        });
    }

    function validarReservaSala(value) {
        const data = String(value.data || "").trim();
        const parsedDate = new Date(`${data}T00:00:00`);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(data)
            || Number.isNaN(parsedDate.getTime())
            || dataLocalReservaSala(parsedDate) !== data) {
            throw new Error("Selecione uma data válida.");
        }

        const start = String(value.horario_inicio || "").trim();
        const end = String(value.horario_fim || "").trim();
        if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(start)
            || !/^([01]\d|2[0-3]):[0-5]\d$/.test(end)
            || end <= start) {
            throw new Error("Informe um horário de início e fim válido.");
        }

        const ambiente = String(value.ambiente || "").trim();
        if (!AMBIENTES_RESERVA.has(ambiente)) throw new Error("Selecione um ambiente válido.");
        return { data, horario_inicio: start, horario_fim: end, ambiente };
    }

    function ordenarReservasSala(reservas) {
        return reservas.sort(function (a, b) {
            return a.data.localeCompare(b.data)
                || a.horario_inicio.localeCompare(b.horario_inicio)
                || a.ambiente.localeCompare(b.ambiente);
        });
    }

    function renderizarAgendaReservasSala() {
        const lista = document.getElementById("listaReservasSalasCelular");
        if (!lista) return;

        if (reservasSala.length === 0) {
            lista.innerHTML = `<p class="mensagem-tv">Nenhuma reserva nos próximos dias.</p>`;
            return;
        }

        lista.innerHTML = reservasSala.map(function (reserva) {
            return `
                <article class="item-reserva-celular">
                    <div class="detalhe-reserva-celular">
                        <strong>${escaparReservaSala(reserva.ambiente)}</strong>
                        <span>${formatarDataReservaSala(reserva.data)} · ${escaparReservaSala(reserva.horario_inicio)}–${escaparReservaSala(reserva.horario_fim)}</span>
                        <span>Agendado por ${escaparReservaSala(reserva.professor)}</span>
                    </div>
                    ${reserva.professor_uid === usuarioReservaSala?.uid
                        ? `<button type="button" class="botao-cancelar-reserva" data-cancelar-reserva="${escaparReservaSala(reserva.id)}">Cancelar</button>`
                        : ""}
                </article>
            `;
        }).join("");
    }

    function dataLocalReservaSala(date) {
        const offset = date.getTimezoneOffset() * 60000;
        return new Date(date.getTime() - offset).toISOString().slice(0, 10);
    }

    function horarioLocalReservaSala(date) {
        return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
    }

    function formatarDataReservaSala(value) {
        const [year, month, day] = value.split("-").map(Number);
        return new Date(year, month - 1, day).toLocaleDateString("pt-BR", {
            weekday: "short",
            day: "2-digit",
            month: "2-digit"
        });
    }

    function mensagemErroFirestoreReservaSala(error) {
        if (error.code === "permission-denied") {
            return "O Firestore bloqueou a consulta do seu perfil. Confira se o perfil está ativo e vinculado exatamente ao e-mail institucional.";
        }
        if (error.code === "unavailable" || error.code === "deadline-exceeded") {
            return "O Firestore está temporariamente indisponível. Tente novamente em instantes.";
        }
        return error.message || "Não foi possível acessar as reservas.";
    }

    function mensagemErroEmailReservaSala(error) {
        if (error.code === "auth/operation-not-allowed") {
            return "O acesso por e-mail e senha ainda não está habilitado no Firebase.";
        }
        if (error.code === "auth/email-already-in-use") {
            return "Este e-mail já possui acesso. Use “Primeiro acesso? Criar senha” ou “Esqueci minha senha” para receber o link de redefinição.";
        }
        if (error.code === "auth/invalid-email") return "Informe um e-mail institucional válido.";
        if (error.code === "auth/weak-password") return "A senha precisa ter pelo menos 8 caracteres.";
        if (error.code === "auth/invalid-credential" || error.code === "auth/wrong-password" || error.code === "auth/user-not-found") {
            return "E-mail ou senha incorretos. Se for seu primeiro acesso, use “Primeiro acesso? Criar senha”.";
        }
        if (error.code === "auth/too-many-requests") {
            return "Muitas tentativas. Aguarde um pouco antes de tentar novamente.";
        }
        if (error.code === "auth/account-exists-with-different-credential") {
            return "Esta conta já está vinculada a outro método. Use “Esqueci minha senha” para receber um link no e-mail.";
        }
        if (error.code === "auth/credential-already-in-use") {
            return "Esta senha já está vinculada a outra conta. Use uma senha diferente.";
        }
        if (error.code === "auth/provider-already-linked") {
            return "Esta conta já tem acesso por senha. Use “Esqueci minha senha” se precisar redefini-la.";
        }
        if (error.code === "auth/unauthorized-continue-uri") {
            return "O domínio do site precisa ser autorizado para os e-mails de acesso no Firebase.";
        }
        if (error.code === "auth/requires-recent-login") {
            return "Entre novamente com seu e-mail e senha e tente outra vez.";
        }
        return error.message || "Não foi possível concluir o acesso por e-mail.";
    }

    function mostrarMensagemReservaSala(id, mensagem) {
        const element = document.getElementById(id);
        if (element) element.textContent = mensagem;
    }

    function escaparReservaSala(value) {
        return String(value || "").replace(/[&<>"']/g, function (character) {
            return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[character];
        });
    }
}());
