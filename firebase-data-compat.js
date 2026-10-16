(function () {
    const firebase = window.firebase;
    const auth = window.firebaseAuthRiolando;
    const downloadUrls = new Map();
    if (!firebase || !auth || !window.firebaseDbRiolando) {
        throw new Error("Firebase precisa ser carregado antes do adaptador de compatibilidade.");
    }
    const authReady = new Promise(resolve => {
        const unsubscribe = auth.onAuthStateChanged(() => {
            unsubscribe();
            resolve();
        });
    });

    class FirebaseCompatClient {
        constructor() {
            this.auth = createAuthAdapter();
            this.storage = createStorageAdapter();
        }

        from(table) {
            return new FirebaseQuery(table);
        }
    }

    class FirebaseQuery {
        constructor(table) {
            this.spec = {
                table,
                action: "select",
                columns: "*",
                filters: [],
                orders: [],
                limit: null,
                payload: null,
                conflict: null
            };
            this.singleMode = "many";
        }

        select(columns) {
            this.spec.columns = columns || "*";
            return this;
        }

        insert(payload) {
            this.spec.action = "insert";
            this.spec.payload = payload;
            return this;
        }

        upsert(payload, options) {
            this.spec.action = "upsert";
            this.spec.payload = payload;
            this.spec.conflict = options?.onConflict || null;
            return this;
        }

        update(payload) {
            this.spec.action = "update";
            this.spec.payload = payload;
            return this;
        }

        delete() {
            this.spec.action = "delete";
            return this;
        }

        eq(column, value) { return this.addFilter("eq", column, value); }
        neq(column, value) { return this.addFilter("neq", column, value); }
        gt(column, value) { return this.addFilter("gt", column, value); }
        gte(column, value) { return this.addFilter("gte", column, value); }
        lt(column, value) { return this.addFilter("lt", column, value); }
        lte(column, value) { return this.addFilter("lte", column, value); }
        ilike(column, value) { return this.addFilter("ilike", column, value); }
        like(column, value) { return this.addFilter("like", column, value); }
        in(column, value) { return this.addFilter("in", column, value); }
        is(column, value) { return this.addFilter("is", column, value); }
        not(column, operator, value) { return this.addFilter("not", column, { operator, value }); }

        order(column, options) {
            this.spec.orders.push({ column, ascending: options?.ascending !== false });
            return this;
        }

        limit(count) {
            this.spec.limit = Math.max(0, Number(count) || 0);
            return this;
        }

        range(from, to) {
            this.spec.range = { from: Math.max(0, Number(from) || 0), to: Math.max(0, Number(to) || 0) };
            return this;
        }

        single() {
            this.singleMode = "single";
            return this;
        }

        maybeSingle() {
            this.singleMode = "maybe";
            return this;
        }

        addFilter(operator, column, value) {
            this.spec.filters.push({ operator, column, value });
            return this;
        }

        then(resolve, reject) {
            return this.execute().then(resolve, reject);
        }

        async execute() {
            try {
                const result = await callDatabaseApi(this.spec);
                if (result.error) return { data: null, error: result.error, count: result.count ?? null };
                let data = result.data;
                if (this.singleMode !== "many") {
                    if (Array.isArray(data)) {
                        if (data.length > 1 || (this.singleMode === "single" && data.length !== 1)) {
                            return { data: null, error: { message: "A consulta não retornou exatamente um registro." } };
                        }
                        data = data[0] || null;
                    }
                }
                return { data, error: null, count: result.count ?? null };
            } catch (error) {
                return { data: null, error: { message: error.message || "Falha ao acessar o Firebase." } };
            }
        }
    }

    async function callDatabaseApi(spec) {
        await authReady;
        const currentUser = auth.currentUser;
        const token = currentUser ? await currentUser.getIdToken() : null;
        const response = await fetch("/api/database", {
            method: "POST",
            headers: Object.assign({ "Content-Type": "application/json" }, token ? { Authorization: `Bearer ${token}` } : {}),
            body: JSON.stringify(spec)
        });
        let body;
        try {
            body = await response.json();
        } catch {
            throw new Error("O serviço Firebase retornou uma resposta inválida.");
        }
        if (!response.ok) throw new Error(body.message || "Não foi possível acessar os dados no Firebase.");
        return body;
    }

    function normalizeUser(user) {
        if (!user) return null;
        return Object.assign({}, user, {
            id: user.uid,
            user_metadata: { nome: user.displayName || "" },
            app_metadata: {}
        });
    }

    function createAuthAdapter() {
        return {
            async getUser() {
                await authReady;
                const user = normalizeUser(auth.currentUser);
                return { data: { user }, error: null };
            },
            async getSession() {
                await authReady;
                const user = auth.currentUser;
                if (!user) return { data: { session: null }, error: null };
                const accessToken = await user.getIdToken();
                return {
                    data: { session: { access_token: accessToken, token_type: "bearer", user: normalizeUser(user) } },
                    error: null
                };
            },
            async signInWithPassword(credentials) {
                try {
                    const result = await auth.signInWithEmailAndPassword(credentials.email, credentials.password);
                    const accessToken = await result.user.getIdToken();
                    return {
                        data: { user: normalizeUser(result.user), session: { access_token: accessToken, token_type: "bearer", user: normalizeUser(result.user) } },
                        error: null
                    };
                } catch (error) {
                    return { data: { user: null, session: null }, error: { message: error.message, code: error.code } };
                }
            },
            async signOut() {
                try {
                    await auth.signOut();
                    return { error: null };
                } catch (error) {
                    return { error: { message: error.message, code: error.code } };
                }
            },
            async updateUser(attributes) {
                const user = auth.currentUser;
                if (!user) return { data: { user: null }, error: { message: "Nenhum usuário autenticado." } };
                try {
                    if (attributes.password) await user.updatePassword(attributes.password);
                    if (attributes.email) await user.updateEmail(attributes.email);
                    if (attributes.data?.nome || attributes.data?.name) {
                        await user.updateProfile({ displayName: attributes.data.nome || attributes.data.name });
                    }
                    return { data: { user: normalizeUser(auth.currentUser) }, error: null };
                } catch (error) {
                    return { data: { user: null }, error: { message: error.message, code: error.code } };
                }
            },
            async resetPasswordForEmail(email, options) {
                try {
                    const settings = options?.redirectTo ? { url: options.redirectTo } : undefined;
                    await auth.sendPasswordResetEmail(email, settings);
                    return { data: {}, error: null };
                } catch (error) {
                    return { data: {}, error: { message: error.message, code: error.code } };
                }
            }
        };
    }

    function createStorageAdapter() {
        return {
            from(bucket) {
                return {
                    async upload(objectPath, file, options) {
                        try {
                            const reference = window.firebaseStorageRiolando.ref(`${bucket}/${objectPath}`);
                            const cacheControl = /^\d+$/.test(String(options?.cacheControl || ""))
                                ? `public,max-age=${options.cacheControl}`
                                : (options?.cacheControl || "public,max-age=3600");
                            const task = await reference.put(file, {
                                contentType: options?.contentType || file.type || "application/octet-stream",
                                cacheControl
                            });
                            const publicUrl = await task.ref.getDownloadURL();
                            downloadUrls.set(`${bucket}/${objectPath}`, publicUrl);
                            return { data: { path: objectPath }, error: null };
                        } catch (error) {
                            return { data: null, error: { message: error.message, code: error.code } };
                        }
                    },
                    getPublicUrl(objectPath) {
                        const url = downloadUrls.get(`${bucket}/${objectPath}`);
                        return { data: { publicUrl: url || "" } };
                    }
                };
            }
        };
    }

    window.firebaseData = {
        createClient() {
            return new FirebaseCompatClient();
        }
    };
}());
