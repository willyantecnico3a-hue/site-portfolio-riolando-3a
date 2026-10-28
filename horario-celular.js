(function () {
    const COLECAO_RESERVAS_SALAS = "reservas_salas";
    const COLECAO_MEMBROS_RESERVAS = "reserva_salas_membros";
    const COLECAO_TRAVAS_RESERVAS = "reserva_salas_locks";
    const AMBIENTES_RESERVA = new Set(["Maker", "Acessa", "Leitura"]);
    const LIMITE_AGENDA_RESERVAS = 300;
    const DOMINIO_EMAIL_INSTITUCIONAL = "@prof.educacao.sp.gov.br";

    let usuarioReservaSala = null;
    let perfilReservaSala = null;
    let reservasSala = [];
    let pararObservacaoReservasSala = null;
    let timerNovaTentativaReservasSala = null;

    document.addEventListener("DOMContentLoaded", function () {
        const auth = window.firebaseAuthRiolando;
        const db = window.firebaseDbRiolando;
        const login = document.getElementById("formLoginReservaSala");
        const botaoGoogle = document.getElementById("btnEntrarGoogleReservaSala");
        const botaoEntrarEmail = document.getElementById("btnEntrarEmailReservaSala");
        const botaoCriarAcesso = document.getElementById("btnCriarAcessoReservaSala");
        const botaoMostrarCriarAcesso = document.getElementById("btnMostrarCriarAcessoReservaSala");
        const botaoRecuperarSenha = document.getElementById("btnRecuperarSenhaReservaSala");
        const botaoReenviarVerificacao = document.getElementById("btnReenviarVerificacaoReservaSala");
        const botaoConfirmarVerificacao = document.getElementById("btnConfirmarVerificacaoReservaSala");
        const botaoVincularSenha = document.getElementById("btnVincularSenhaReservaSala");
        const secaoVincularSenha = document.getElementById("vincularSenhaReservaSala");
        const camposCriarAcesso = document.getElementById("criarAcessoReservaSala");
        const formReserva = document.getElementById("formReservaSala");
        const botaoSair = document.getElementById("btnSairReservaSala");
        const campoData = document.getElementById("dataReservaSala");
        const lista = document.getElementById("listaReservasSalasCelular");

        if (!auth || !db || !login || !botaoGoogle || !botaoEntrarEmail || !formReserva) return;

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

            botaoEntrarEmail.disabled = true;
            mostrarMensagemReservaSala("mensagemReservaSala", "Validando acesso...");
            try {
                await auth.signInWithEmailAndPassword(email, senha);
            } catch (error) {
                console.error("Erro ao entrar com e-mail na agenda de reservas:", error);
                mostrarMensagemReservaSala("mensagemReservaSala", mensagemErroEmailReservaSala(error));
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

                botaoCriarAcesso.disabled = true;
                mostrarMensagemReservaSala("mensagemReservaSala", "Criando acesso e enviando verificação...");
                try {
                    const credential = await auth.createUserWithEmailAndPassword(email, senha);
                    await credential.user.sendEmailVerification({
                        url: `${window.location.origin}/horario-celular.html`
                    });
                    camposCriarAcesso.hidden = true;
                    mostrarMensagemReservaSala("mensagemReservaSala", "Enviamos um link de verificação para seu e-mail institucional. Confirme-o antes de reservar.");
                } catch (error) {
                    console.error("Erro ao criar acesso por e-mail:", error);
                    mostrarMensagemReservaSala("mensagemReservaSala", mensagemErroEmailReservaSala(error));
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

                botaoRecuperarSenha.disabled = true;
                mostrarMensagemReservaSala("mensagemReservaSala", "Enviando solicitação de redefinição...");
                try {
                    auth.languageCode = "pt-BR";
                    await auth.sendPasswordResetEmail(email, {
                        url: `${window.location.origin}/horario-celular.html`
                    });
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
                    await auth.currentUser.sendEmailVerification({
                        url: `${window.location.origin}/horario-celular.html`
                    });
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

        if (botaoVincularSenha) {
            botaoVincularSenha.addEventListener("click", async function () {
                const user = auth.currentUser;
                const senha = document.getElementById("novaSenhaContaReservaSala").value;
                const confirmacao = document.getElementById("confirmarNovaSenhaContaReservaSala").value;
                if (!user || !user.emailVerified) {
                    mostrarMensagemReservaSala("mensagemVincularSenhaReservaSala", "Confirme seu e-mail antes de adicionar uma senha.");
                    return;
                }
                if (senha.length < 8) {
                    mostrarMensagemReservaSala("mensagemVincularSenhaReservaSala", "Use uma senha com pelo menos 8 caracteres.");
                    return;
                }
                if (senha !== confirmacao) {
                    mostrarMensagemReservaSala("mensagemVincularSenhaReservaSala", "As senhas não conferem.");
                    return;
                }

                botaoVincularSenha.disabled = true;
                try {
                    const credential = firebase.auth.EmailAuthProvider.credential(user.email, senha);
                    await user.linkWithCredential(credential);
                    if (secaoVincularSenha) secaoVincularSenha.hidden = true;
                    mostrarMensagemReservaSala("mensagemReservaSala", "Senha ativada para esta conta. Agora você também pode entrar com e-mail e senha.");
                } catch (error) {
                    console.error("Erro ao ativar senha para a conta:", error);
                    mostrarMensagemReservaSala("mensagemVincularSenhaReservaSala", mensagemErroEmailReservaSala(error));
                } finally {
                    botaoVincularSenha.disabled = false;
                }
            });
        }

        botaoGoogle.addEventListener("click", async function () {
            botaoGoogle.disabled = true;
            mostrarMensagemReservaSala("mensagemReservaSala", "Validando acesso...");
            const provider = new firebase.auth.GoogleAuthProvider();
            provider.setCustomParameters({ prompt: "select_account" });
            try {
                await auth.signInWithPopup(provider);
            } catch (error) {
                if (error.code === "auth/popup-blocked" || error.code === "auth/operation-not-supported-in-this-environment") {
                    try {
                        await auth.signInWithRedirect(provider);
                        return;
                    } catch (redirectError) {
                        error = redirectError;
                    }
                }
                console.error("Erro ao entrar com Google na agenda de reservas:", error);
                mostrarMensagemReservaSala("mensagemReservaSala", mensagemErroReservaSala(error));
                botaoGoogle.disabled = false;
            }
        });

        auth.getRedirectResult().catch(function (error) {
            console.error("Erro ao concluir acesso Google redirecionado:", error);
            mostrarMensagemReservaSala("mensagemReservaSala", mensagemErroReservaSala(error));
        });

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
            botaoGoogle.disabled = false;
            if (botaoReenviarVerificacao) botaoReenviarVerificacao.hidden = true;
            if (botaoConfirmarVerificacao) botaoConfirmarVerificacao.hidden = true;
            if (secaoVincularSenha) secaoVincularSenha.hidden = true;
            if (camposCriarAcesso) camposCriarAcesso.hidden = true;

            if (!user) {
                reservasSala = [];
                renderizarAgendaReservasSala();
                mostrarMensagemReservaSala("mensagemReservaSala", "Entre com seu e-mail institucional verificado para agendar.");
                return;
            }

            if (!validarEmailInstitucionalReservaSala(user.email)) {
                mostrarMensagemReservaSala("mensagemReservaSala", "A agenda aceita somente contas @prof.educacao.sp.gov.br cadastradas pela escola.");
                await auth.signOut().catch(function (error) {
                    console.error("Não foi possível encerrar uma sessão com e-mail não institucional:", error);
                });
                return;
            }

            if (user.providerData.some(provider => provider.providerId === "password") && !user.emailVerified) {
                if (botaoReenviarVerificacao) botaoReenviarVerificacao.hidden = false;
                if (botaoConfirmarVerificacao) botaoConfirmarVerificacao.hidden = false;
                mostrarMensagemReservaSala("mensagemReservaSala", "Confirme o link enviado ao seu e-mail institucional. Depois, entre novamente para reservar.");
                return;
            }

            mostrarMensagemReservaSala("mensagemReservaSala", "Conferindo seu perfil...");
            try {
                perfilReservaSala = await carregarPerfilReservaSala(db, user);
                if (usuarioReservaSala?.uid !== user.uid) return;

                login.hidden = true;
                painel.hidden = false;
                document.getElementById("nomeProfessorReservaSala").textContent = perfilReservaSala.nome;
                if (secaoVincularSenha) {
                    secaoVincularSenha.hidden = user.providerData.some(provider => provider.providerId === "password");
                }
                mostrarMensagemReservaSala("mensagemReservaSala", "Acesse com sua conta institucional. Senhas são gerenciadas pelo Firebase e não são salvas no banco do site.");
                observarAgendaReservasSala(db);
            } catch (error) {
                console.error("Erro ao carregar perfil da agenda de reservas:", error);
                login.hidden = false;
                mostrarMensagemReservaSala("mensagemReservaSala", mensagemErroFirestoreReservaSala(error));
                await auth.signOut().catch(function (signOutError) {
                    console.error("Não foi possível encerrar uma sessão sem permissão de reserva:", signOutError);
                });
            }
        });
    });

    async function carregarPerfilReservaSala(db, user) {
        const email = String(user.email || "").trim().toLowerCase();
        if (!validarEmailInstitucionalReservaSala(email) || user.emailVerified !== true) {
            throw new Error("Entre com um e-mail institucional verificado e cadastrado pela escola.");
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
            throw new Error("Esta conta Google não está cadastrada no acesso de professores.");
        }

        const perfilDoc = perfis.docs[0];
        const perfil = validarDadosPerfilReservaSala(perfilDoc.data(), user);
        const membro = {
            profile_id: perfilDoc.id,
            email,
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
                    email,
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
            return "Seu perfil não tem permissão para reservar. Confira se ele está ativo no acesso de professores.";
        }
        if (error.code === "unavailable" || error.code === "deadline-exceeded") {
            return "O Firestore está temporariamente indisponível. Tente novamente em instantes.";
        }
        return error.message || "Não foi possível acessar as reservas.";
    }

    function mensagemErroReservaSala(error) {
        if (error.code === "auth/popup-closed-by-user") return "A janela do Google foi fechada antes de concluir o acesso.";
        if (error.code === "auth/unauthorized-domain") return "Este domínio não está autorizado para acesso Google no Firebase.";
        if (error.code === "auth/account-exists-with-different-credential") return "Esta conta já está cadastrada com outro método de acesso.";
        if (error.code === "auth/too-many-requests") return "Muitas tentativas de acesso. Aguarde e tente novamente.";
        return error.message || "Não foi possível entrar.";
    }

    function mensagemErroEmailReservaSala(error) {
        if (error.code === "auth/operation-not-allowed") {
            return "O acesso por e-mail e senha ainda não está habilitado no Firebase.";
        }
        if (error.code === "auth/email-already-in-use") {
            return "Este e-mail já possui acesso. Entre com sua senha ou pelo Google e ative uma senha no painel.";
        }
        if (error.code === "auth/invalid-email") return "Informe um e-mail institucional válido.";
        if (error.code === "auth/weak-password") return "A senha precisa ter pelo menos 8 caracteres.";
        if (error.code === "auth/invalid-credential" || error.code === "auth/wrong-password" || error.code === "auth/user-not-found") {
            return "E-mail ou senha incorretos. Se sua conta usa Google, entre por esse botão e ative uma senha no painel.";
        }
        if (error.code === "auth/too-many-requests") {
            return "Muitas tentativas. Aguarde um pouco antes de tentar novamente.";
        }
        if (error.code === "auth/account-exists-with-different-credential") {
            return "Esta conta já usa Google. Entre pelo botão Google e ative uma senha no painel.";
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
            return "Entre novamente pelo Google e tente ativar a senha.";
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
