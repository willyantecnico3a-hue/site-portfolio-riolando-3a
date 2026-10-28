(function () {
    const firebase = window.firebase;
    const auth = window.firebaseAuthRiolando;
    const db = window.firebaseDbRiolando;
    if (!firebase || !auth || !db) throw new Error("Firebase Auth e Firestore precisam ser carregados antes do adaptador.");

    const authReady = new Promise(resolve => {
        const unsubscribe = auth.onAuthStateChanged(() => { unsubscribe(); resolve(); });
    });
    const PUBLIC_TABLES = new Set(["eventos", "site_settings"]);
    const ACTIVE_TABLES = new Set(["turmas", "disciplinas", "aulas", "horarios_aulas"]);
    const ADMIN_TABLES = new Set([
        "acoes_checklist_paeet", "acompanhamento_alunos", "alunos_acompanhamento",
        "atendimentos_paeet", "backup_eventos_15_30_junho_2026", "disciplinas",
        "eventos", "horarios_aulas", "logs_sistema", "perfis", "perfis_acesso",
        "portfolio_alunos", "site_settings", "solicitacoes_ajuda", "turmas", "aulas"
    ]);

    class FirebaseCompatClient {
        constructor() {
            this.auth = createAuthAdapter();
            this.storage = createStorageAdapter();
        }
        from(table) { return new FirebaseQuery(table); }
    }

    class FirebaseQuery {
        constructor(table) {
            this.table = table;
            this.action = "select";
            this.columns = "*";
            this.filters = [];
            this.orders = [];
            this.max = null;
            this.rangeValue = null;
            this.payload = null;
            this.conflict = "id";
            this.singleMode = "many";
        }
        select(columns) { this.columns = columns || "*"; return this; }
        insert(payload) { this.action = "insert"; this.payload = payload; return this; }
        upsert(payload, options) { this.action = "upsert"; this.payload = payload; this.conflict = options?.onConflict || "id"; return this; }
        update(payload) { this.action = "update"; this.payload = payload; return this; }
        delete() { this.action = "delete"; return this; }
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
        order(column, options) { this.orders.push({ column, ascending: options?.ascending !== false }); return this; }
        limit(count) { this.max = Math.max(0, Number(count) || 0); return this; }
        range(from, to) { this.rangeValue = { from: Math.max(0, Number(from) || 0), to: Math.max(0, Number(to) || 0) }; return this; }
        single() { this.singleMode = "single"; return this; }
        maybeSingle() { this.singleMode = "maybe"; return this; }
        addFilter(operator, column, value) { this.filters.push({ operator, column, value }); return this; }
        then(resolve, reject) { return this.execute().then(resolve, reject); }

        async execute() {
            try {
                if (this.action === "select") return { data: await selectRows(this), error: null, count: null };
                if (this.action === "insert" || this.action === "upsert") return { data: await writeRows(this), error: null, count: null };
                const affected = await mutateRows(this);
                return { data: [], error: null, count: affected };
            } catch (error) {
                console.error(`Erro Firestore (${this.table}/${this.action}):`, error);
                return { data: null, error: { message: userMessage(error), code: error.code }, count: null };
            }
        }
    }

    async function getAccess() {
        await authReady;
        const user = auth.currentUser;
        if (!user) return { user: null, admin: false, coordinator: false };
        const [admin, coordinator] = await Promise.all([
            db.collection("_roles_admin").doc(user.uid).get(),
            db.collection("_roles_coordenacao").doc(user.uid).get()
        ]);
        return {
            user,
            admin: admin.exists && admin.data().active === true,
            coordinator: coordinator.exists && coordinator.data().active === true
        };
    }

    function readable(table, access) {
        if (table === "admins") return Boolean(access.user);
        if (table === "admin_profiles") return Boolean(access.user);
        if (access.admin) return ADMIN_TABLES.has(table) || table === "admins" || table === "admin_profiles";
        if (table === "perfis") return Boolean(access.user);
        if (table === "perfis_acesso") return Boolean(access.user);
        if (table === "solicitacoes_ajuda") return true;
        if (table === "portfolio_alunos" || ACTIVE_TABLES.has(table) || PUBLIC_TABLES.has(table)) return true;
        if (table === "acompanhamento_alunos") return access.coordinator;
        return false;
    }

    function scopedFilters(table, filters, access) {
        const scoped = filters.slice();
        if (access.admin) return scoped;
        const uid = access.user?.uid;
        if (table === "perfis" && uid) scoped.push({ operator: "eq", column: "id", value: uid });
        else if (table === "admin_profiles" && uid) scoped.push({ operator: "eq", column: "user_id", value: uid });
        else if (table === "admins" && access.user?.email) scoped.push({ operator: "eq", column: "email", value: access.user.email });
        else if (table === "perfis_acesso" && access.user?.email) scoped.push({ operator: "eq", column: "email", value: access.user.email });
        else if (table === "solicitacoes_ajuda" && uid) scoped.push({ operator: "eq", column: "aluno_id", value: uid });
        else if (ACTIVE_TABLES.has(table) && !(table === "horarios_aulas" && access.coordinator)) scoped.push({ operator: "eq", column: "ativo", value: true });
        else if (table === "portfolio_alunos") {
            scoped.push({ operator: "eq", column: "autorizado", value: true });
            scoped.push({ operator: "eq", column: "aprovado", value: true });
        } else if (table === "acompanhamento_alunos" && access.coordinator) {
            return scoped;
        }
        return scoped;
    }

    function addFirestoreFilter(query, filter) {
        const operators = { eq: "==", neq: "!=", gt: ">", gte: ">=", lt: "<", lte: "<=", in: "in" };
        if (operators[filter.operator]) return query.where(filter.column, operators[filter.operator], filter.value);
        if (filter.operator === "is" && filter.value === null) return query.where(filter.column, "==", null);
        if (filter.operator === "not" && filter.value?.operator === "is" && filter.value.value === null) return query.where(filter.column, "!=", null);
        return query;
    }

    function matches(row, filter) {
        const current = row[filter.column], value = filter.value;
        switch (filter.operator) {
            case "eq": return sameValue(current, value);
            case "neq": return !sameValue(current, value);
            case "gt": return current > value;
            case "gte": return current >= value;
            case "lt": return current < value;
            case "lte": return current <= value;
            case "in": return Array.isArray(value) && value.some(item => sameValue(current, item));
            case "is": return value === null ? current == null : current === value;
            case "not": return filter.value?.operator === "is" && filter.value.value === null ? current != null : true;
            case "like":
            case "ilike": {
                const pattern = String(value ?? "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/%/g, ".*").replace(/_/g, ".");
                return new RegExp(`^${pattern}$`, filter.operator === "ilike" ? "i" : "").test(String(current ?? ""));
            }
            default: return false;
        }
    }

    function sameValue(left, right) {
        if (left === right) return true;
        return left != null && right != null && (typeof left === "number" || typeof right === "number") && String(left) === String(right);
    }

    async function fetchRows(table, filters, access) {
        if (!readable(table, access)) throw new Error("Seu perfil não tem acesso a estes dados.");
        const safeFilters = scopedFilters(table, filters, access);
        let query = db.collection(table);
        for (const filter of safeFilters) query = addFirestoreFilter(query, filter);
        const snapshot = await query.limit(5000).get();
        let rows = snapshot.docs.map(doc => Object.assign({ id: doc.id }, doc.data()));
        rows = rows.filter(row => safeFilters.every(filter => matches(row, filter)) && filters.every(filter => matches(row, filter)));
        return rows;
    }

    async function selectRows(spec) {
        const access = await getAccess();
        let rows = await fetchRows(spec.table, spec.filters, access);
        for (const order of spec.orders) {
            rows.sort((a, b) => {
                const av = a[order.column], bv = b[order.column];
                const cmp = av === bv ? 0 : av == null ? -1 : bv == null ? 1 : av < bv ? -1 : 1;
                return order.ascending ? cmp : -cmp;
            });
        }
        if (spec.rangeValue) rows = rows.slice(spec.rangeValue.from, spec.rangeValue.to + 1);
        else if (spec.max !== null) rows = rows.slice(0, spec.max);
        const related = await addRelations(spec.table, rows, spec.columns, access);
        let data = related.map(row => project(row, spec.columns));
        if (spec.singleMode !== "many") {
            if (data.length > 1 || (spec.singleMode === "single" && data.length !== 1)) throw new Error("A consulta não retornou exatamente um registro.");
            data = data[0] || null;
        }
        return data;
    }

    async function writeRows(spec) {
        const access = await getAccess();
        const input = Array.isArray(spec.payload) ? spec.payload : [spec.payload];
        if (!input.length || input.length > 450) throw new Error("Envie até 450 registros por operação.");
        const output = [];
        const batch = db.batch();
        for (const source of input) {
            const row = Object.assign({}, source || {});
            let ref = null;
            if (spec.action === "upsert") {
                const keys = spec.conflict.split(",").map(key => key.trim()).filter(Boolean);
                const filters = keys.map(key => ({ operator: "eq", column: key, value: row[key] }));
                if (filters.length && filters.every(filter => filter.value != null)) {
                    const found = await fetchRows(spec.table, filters, access);
                    if (found.length) ref = db.collection(spec.table).doc(String(found[0].id));
                }
            }
            if (!ref && row.id != null) ref = db.collection(spec.table).doc(String(row.id));
            if (!ref && spec.table === "site_settings" && row.chave) ref = db.collection(spec.table).doc(String(row.chave));
            if (!ref && spec.table === "admin_profiles" && row.user_id) ref = db.collection(spec.table).doc(String(row.user_id));
            if (!ref) ref = db.collection(spec.table).doc();
            row.id = row.id ?? ref.id;
            batch.set(ref, row, { merge: spec.action === "upsert" });
            output.push(row);
        }
        await batch.commit();
        return output;
    }

    async function mutateRows(spec) {
        const access = await getAccess();
        const rows = await fetchRows(spec.table, spec.filters, access);
        if (rows.length > 450) throw new Error("A operação atingiria mais de 450 registros; refine os filtros.");
        const batch = db.batch();
        for (const row of rows) {
            const ref = db.collection(spec.table).doc(String(row.id));
            if (spec.action === "delete") batch.delete(ref);
            else batch.set(ref, Object.assign({}, row, spec.payload || {}), { merge: true });
        }
        if (rows.length) await batch.commit();
        return rows.length;
    }

    async function addRelations(table, rows, columns, access) {
        const requested = [...String(columns || "").matchAll(/([a-z_][a-z0-9_]*)\s*\(([^()]*)\)/gi)].map(match => match[1]);
        const relationMap = {
            aulas: { disciplinas: { foreignKey: "disciplina_id", collection: "disciplinas" }, turmas: { foreignKey: "turma_id", collection: "turmas" } },
            atendimentos_paeet: { alunos_acompanhamento: { foreignKey: "aluno_id", collection: "alunos_acompanhamento" } }
        };
        for (const name of requested) {
            const join = relationMap[table]?.[name];
            if (!join) continue;
            for (const row of rows) {
                const id = row[join.foreignKey];
                if (id == null) { row[name] = null; continue; }
                const docs = await fetchRows(join.collection, [{ operator: "eq", column: "id", value: id }], access);
                row[name] = docs[0] || null;
            }
        }
        return rows;
    }

    function project(row, columns) {
        if (!columns || columns.trim() === "*") return row;
        const result = {};
        for (const part of splitTopLevel(columns).map(item => item.trim()).filter(Boolean)) {
            const relation = part.match(/^([a-z_][a-z0-9_]*)\s*\((.*)\)$/i);
            if (relation) {
                const value = row[relation[1]], fields = splitTopLevel(relation[2]).map(item => item.trim());
                result[relation[1]] = value ? Object.fromEntries(fields.map(field => [field, value[field]])) : null;
            } else {
                const alias = part.match(/^([a-z_][a-z0-9_]*)\s*:\s*([a-z_][a-z0-9_]*)$/i);
                result[alias ? alias[1] : part] = row[alias ? alias[2] : part];
            }
        }
        return result;
    }

    function splitTopLevel(value) {
        const parts = [];
        let depth = 0, start = 0;
        for (let index = 0; index < value.length; index += 1) {
            if (value[index] === "(") depth += 1;
            else if (value[index] === ")") depth = Math.max(0, depth - 1);
            else if (value[index] === "," && depth === 0) {
                parts.push(value.slice(start, index));
                start = index + 1;
            }
        }
        parts.push(value.slice(start));
        return parts;
    }

    function normalizeUser(user) {
        return user ? Object.assign({}, user, {
            id: user.uid,
            uid: user.uid,
            email: user.email || null,
            user_metadata: { nome: user.displayName || "" },
            app_metadata: {}
        }) : null;
    }

    function createAuthAdapter() {
        return {
            async getUser() { await authReady; return { data: { user: normalizeUser(auth.currentUser) }, error: null }; },
            async getSession() {
                await authReady;
                if (!auth.currentUser) return { data: { session: null }, error: null };
                return { data: { session: { access_token: await auth.currentUser.getIdToken(), token_type: "bearer", user: normalizeUser(auth.currentUser) } }, error: null };
            },
            async signInWithPassword(credentials) {
                try {
                    const result = await auth.signInWithEmailAndPassword(credentials.email, credentials.password);
                    return { data: { user: normalizeUser(result.user), session: { access_token: await result.user.getIdToken(), token_type: "bearer", user: normalizeUser(result.user) } }, error: null };
                } catch (error) { return { data: { user: null, session: null }, error: { message: error.message, code: error.code } }; }
            },
            async signOut() { try { await auth.signOut(); return { error: null }; } catch (error) { return { error: { message: error.message, code: error.code } }; } },
            async updateUser(attributes) {
                const user = auth.currentUser;
                if (!user) return { data: { user: null }, error: { message: "Nenhum usuário autenticado." } };
                try {
                    if (attributes.password) await user.updatePassword(attributes.password);
                    if (attributes.email) await user.updateEmail(attributes.email);
                    if (attributes.data?.nome || attributes.data?.name) await user.updateProfile({ displayName: attributes.data.nome || attributes.data.name });
                    return { data: { user: normalizeUser(auth.currentUser) }, error: null };
                } catch (error) { return { data: { user: null }, error: { message: error.message, code: error.code } }; }
            },
            async resetPasswordForEmail(email, options) {
                try {
                    await auth.sendPasswordResetEmail(email, options?.redirectTo ? { url: options.redirectTo } : undefined);
                    return { data: {}, error: null };
                } catch (error) { return { data: {}, error: { message: error.message, code: error.code } }; }
            },
            async createStudentAccount(details) {
                let secondary = null;
                try {
                    const access = await getAccess();
                    if (!access.admin) throw new Error("Somente um administrador pode criar contas de aluno.");
                    const name = `firebase-student-${Date.now()}`;
                    secondary = firebase.initializeApp(window.firebaseConfigRiolando, name);
                    const credential = await secondary.auth().createUserWithEmailAndPassword(details.email, details.password);
                    await credential.user.updateProfile({ displayName: details.nome });
                    await db.collection("perfis").doc(credential.user.uid).set({
                        id: credential.user.uid,
                        nome: details.nome,
                        email: String(details.email).trim().toLowerCase(),
                        funcao: "aluno",
                        curso: details.curso || "desenvolvimento_sistemas",
                        turma: details.turma || "",
                        senha_temporaria: true,
                        ativo: true,
                        criado_em: new Date().toISOString(),
                        atualizado_em: new Date().toISOString()
                    });
                    await secondary.auth().signOut();
                    return { data: { user: normalizeUser(credential.user) }, error: null };
                } catch (error) {
                    try { if (secondary?.auth().currentUser) await secondary.auth().currentUser.delete(); } catch (_) {}
                    return { data: { user: null }, error: { message: error.message, code: error.code } };
                } finally {
                    if (secondary) await secondary.delete().catch(() => {});
                }
            }
        };
    }

    function createStorageAdapter() {
        return { from() { return {
            async upload() { return { data: null, error: { message: "Envio de arquivos desativado no Firebase Spark. Use links já hospedados ou solicite ao administrador uma alternativa." } }; },
            getPublicUrl() { return { data: { publicUrl: "" } }; }
        }; } };
    }

    function userMessage(error) {
        if (error?.code === "permission-denied") return "Seu perfil não tem permissão para esta operação.";
        if (error?.code === "failed-precondition") return "Esta consulta precisa de um índice do Firestore. Peça ao administrador para revisar a configuração.";
        return error?.message || "Falha ao acessar o Firestore.";
    }

    window.firebaseData = {
        createClient: () => new FirebaseCompatClient(),
        getAccess
    };
}());
