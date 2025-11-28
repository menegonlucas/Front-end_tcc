/*************************************************
 *  PROFILE.JS — VERSÃO FINAL (UNIFICADA)
 *************************************************/

const API_LIVROS = "https://tcc-back-2025.vercel.app/livros";
const API_REGISTROS = "https://tcc-back-2025.vercel.app/registros";

const booksGrid = document.getElementById('books-grid');
const filterButtons = document.querySelectorAll('.filter-buttons button');
const bookSelect = document.getElementById('book-select-register');

let livrosCache = [];

/* ============================================
   UTIL: pegar usuário do localStorage (formato: { userId: ... } )
============================================ */
function getUsuarioLogado() {
    try {
        return JSON.parse(localStorage.getItem("usuario")) || null;
    } catch (e) {
        return null;
    }
}

/* ============================================
   1. INICIALIZAÇÃO
============================================ */
document.addEventListener("DOMContentLoaded", () => {
    init();
    document.getElementById("reading-date").valueAsDate = new Date();
});

async function init() {
    await carregarLivros();
    await carregarLivrosParaFormulario();
    setupEventListeners();
    verificarLivrosAdicionados();
}

/* ============================================
   2. EVENTOS
============================================ */
function setupEventListeners() {
    // Menu usuário
    const userProfile = document.querySelector(".user-profile");
    const profileMenu = document.querySelector(".profile-menu");

    if (userProfile && profileMenu) {
        userProfile.addEventListener("click", (e) => {
            profileMenu.classList.toggle("open");
            e.stopPropagation();
        });
        document.addEventListener("click", () => profileMenu.classList.remove("open"));
        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape") profileMenu.classList.remove("open");
        });
    }

    // Progresso (barra)
    const curInp = document.getElementById("current-page-register");
    const totInp = document.getElementById("total-pages-register");
    if (curInp) curInp.addEventListener("input", calculateProgress);
    if (totInp) totInp.addEventListener("input", calculateProgress);

    // Submit formulário
    const form = document.getElementById("reading-registration-form");
    if (form) form.addEventListener("submit", handleFormSubmit);

    // Filtros
    filterButtons.forEach(btn =>
        btn.addEventListener("click", () => aplicarFiltro(btn.dataset.filter))
    );

    // Autopreencher ao selecionar livro
    if (bookSelect) bookSelect.addEventListener("change", preencherDadosLivroSelecionado);

    // Checar novos livros periodicamente
    setInterval(verificarLivrosAdicionados, 3000);
}

/* ============================================
   3. CARREGAR LIVROS (e mesclar registros do usuário)
============================================ */
async function carregarLivros() {
    try {
        booksGrid.innerHTML = `<div class="loading">Carregando livros...</div>`;

        const [resLivros, resRegistros] = await Promise.all([
            fetch(API_LIVROS),
            fetch(API_REGISTROS).catch(() => ({ ok: false })) // se registros falharem, seguimos com livros
        ]);

        if (!resLivros.ok) throw new Error("Erro ao buscar livros");

        let livros = await resLivros.json();

        let registros = [];
        if (resRegistros && resRegistros.ok) {
            registros = await resRegistros.json();
        }

        const usuario = getUsuarioLogado();
        const userId = usuario?.userId ?? null;

        // mapa de registros do usuário por livroId
        const mapaRegistros = {};
        registros.forEach(r => {
            const lid = r.livroId ?? (r.livro && r.livro.id);
            if (userId == null || r.usuarioId == userId) {
                if (lid != null) mapaRegistros[lid] = r;
            }
        });

        // injetar 'registro' em cada livro (padrão: null)
        livros = livros.map(l => ({ ...l, registro: mapaRegistros[l.id] || null }));

        // aplicar registro (preenche campos do livro)
        livros = livros.map(l => aplicarRegistroAoLivro(l));

        livrosCache = livros;

        if (livros.length === 0) {
            booksGrid.innerHTML = `<div class="empty-state">Nenhum livro adicionado à biblioteca</div>`;
            return;
        }

        renderizarLivros(livros);

    } catch (e) {
        console.error(e);
        booksGrid.innerHTML = `<div class="error-state">Erro ao carregar livros.</div>`;
    }
}

/* ============================================
   4. CARREGAR LISTA PARA O SELECT DO FORM
============================================ */
async function carregarLivrosParaFormulario() {
    try {
        // limpar opções (mantém o primeiro placeholder)
        while (bookSelect && bookSelect.children.length > 1) bookSelect.removeChild(bookSelect.lastChild);

        const resLivros = await fetch(API_LIVROS);
        if (!resLivros.ok) throw new Error("Erro ao carregar lista de livros");
        let livros = await resLivros.json();

        // tentar buscar registros também para autopreencher total/pagina/comentário
        let registros = [];
        try {
            const resRegs = await fetch(API_REGISTROS);
            if (resRegs.ok) registros = await resRegs.json();
        } catch (err) {
            console.warn("Não foi possível obter registros para o formulário", err);
        }

        const usuario = getUsuarioLogado();
        const userId = usuario?.userId ?? null;

        const mapaRegistros = {};
        registros.forEach(r => {
            const lid = r.livroId ?? (r.livro && r.livro.id);
            if (userId == null || r.usuarioId == userId) {
                if (lid != null) mapaRegistros[lid] = r;
            }
        });

        // anexar registro (se existir)
        livros = livros.map(l => ({ ...l, registro: mapaRegistros[l.id] || null }));
        livros = livros.map(l => aplicarRegistroAoLivro(l));
        livrosCache = livros;

        livros.forEach(livro => {
            const opt = document.createElement("option");
            opt.value = livro.id;
            opt.textContent = `${livro.titulo} - ${livro.autor}`;
            opt.dataset.paginas = livro.paginas || 0;
            bookSelect.appendChild(opt);
        });

    } catch (e) {
        console.error(e);
        const opt = document.createElement("option");
        opt.textContent = "Erro ao carregar livros";
        bookSelect.appendChild(opt);
    }
}

/* ============================================
   5. APLICAR REGISTRO AO LIVRO
   -> transforma livro.registro em campos legíveis para o card/form
============================================ */
function aplicarRegistroAoLivro(livro) {
    // se o backend não forneceu 'registro', apenas retorna o livro
    if (!livro) return livro;
    if (!livro.registro) return livro;

    // adaptadores: seu backend usa names como paginaAtual, totalPaginas, statusLeitura, comentario, dataAtualizacao
    livro.statusLeitura = livro.registro.statusLeitura || livro.statusLeitura || "";
    livro.comentario = livro.registro.comentario || livro.comentario || "";
    livro.paginaAtual = livro.registro.paginaAtual ?? livro.paginaAtual ?? 0;
    livro.totalPaginas = livro.registro.totalPaginas ?? livro.totalPaginas ?? livro.paginas ?? 0;
    livro.dataAtualizacao = livro.registro.dataAtualizacao || livro.dataAtualizacao || null;

    return livro;
}

/* ============================================
   6. AUTOPREENCHER FORMULÁRIO AO SELECIONAR
============================================ */
function preencherDadosLivroSelecionado() {
    const livro = livrosCache.find(x => String(x.id) === String(bookSelect.value));
    if (!livro) return resetForm();

    document.getElementById("total-pages-register").value = livro.totalPaginas || livro.paginas || "";
    document.getElementById("current-page-register").value = livro.paginaAtual || "";
    document.getElementById("reading-comment").value = livro.comentario || "";

    // leitura: se backend fornece enum (LENDO), convert para opção do select (lendo)
    if (livro.statusLeitura) {
        const statusNormalized = String(livro.statusLeitura).toLowerCase().replace("_", "-");
        document.getElementById("reading-status").value = statusNormalized;
    } else {
        document.getElementById("reading-status").value = "";
    }

    if (livro.dataAtualizacao) document.getElementById("reading-date").value = (new Date(livro.dataAtualizacao)).toISOString().slice(0, 10);

    calculateProgress();
}

/* ============================================
   7. RENDERIZAR CARDS NA BIBLIOTECA
============================================ */
function renderizarLivros(lista) {
    booksGrid.innerHTML = "";

    lista.forEach(livro => {
        const totalPag = livro.totalPaginas || livro.paginas || 1;
        const pagAtual = livro.paginaAtual || 0;
        const progresso = totalPag > 0 ? Math.round((pagAtual / totalPag) * 100) : 0;

        const card = document.createElement("div");
        card.classList.add("book-card");
        card.dataset.status = (livro.statusLeitura ? livro.statusLeitura.toLowerCase().replace("_", "-") : "quero-ler");

        const comentarioHTML = livro.comentario
            ? `<p class="book-comment"><strong>Comentário:</strong> ${livro.comentario}</p>`
            : "";

        card.innerHTML = `
            <div class="book-cover">
                ${livro.capa ? `<img src="${livro.capa}" alt="${livro.titulo}">` : `<div class="book-cover-placeholder"><i class="fas fa-book"></i></div>`}
            </div>

            <div class="book-info">
                <h3>${livro.titulo}</h3>
                <p>${livro.autor}</p>

                <p><strong>Status:</strong> ${formatarStatus(card.dataset.status)}</p>

                <p class="book-pages">
                    <strong>Progresso:</strong> ${pagAtual}/${totalPag} páginas (${progresso}%)
                </p>

                <div class="progress-bar-small">
                    <div class="progress-fill-small" style="width: ${progresso}%;"></div>
                </div>

                ${comentarioHTML}

                <button class="remove-book-btn" data-id="${livro.id}">
                    <i class="fas fa-trash"></i> Remover
                </button>
            </div>
        `;
        booksGrid.appendChild(card);
    });

    ativarBotoesRemover();
    adicionarEstilosDinamicos();
}

/* ============================================
   8. CALCULAR PROGRESSO (barra do formulário)
============================================ */
function calculateProgress() {
    const pag = parseInt(document.getElementById("current-page-register").value) || 0;
    const total = parseInt(document.getElementById("total-pages-register").value) || 1;
    const pct = total > 0 ? Math.round((pag / total) * 100) : 0;

    const fill = document.getElementById("progress-fill-register");
    const pctEl = document.getElementById("progress-percentage-register");
    if (fill) fill.style.width = pct + "%";
    if (pctEl) pctEl.textContent = pct + "%";
}

/* ============================================
   9. SALVAR REGISTRO DE LEITURA (criar ou atualizar)
============================================ */
async function handleFormSubmit(e) {
    e.preventDefault();

    const usuario = getUsuarioLogado();
    if (!usuario?.userId) {
        alert("Usuário não encontrado. Faça login novamente.");
        return;
    }

    const livroIdVal = parseInt(bookSelect.value);
    if (!livroIdVal) {
        alert("Selecione um livro.");
        return;
    }

    // transformar status para enum do Prisma (LENDO, QUERO_LER, ...)
    const rawStatus = document.getElementById("reading-status").value || "";
    const statusLeitura = rawStatus.toUpperCase().replace("-", "_");

    const registroPayload = {
        livroId: livroIdVal,
        usuarioId: usuario.userId,
        paginaAtual: parseInt(document.getElementById("current-page-register").value) || 0,
        totalPaginas: parseInt(document.getElementById("total-pages-register").value) || 0,
        statusLeitura,
        comentario: document.getElementById("reading-comment").value || "",
        dataAtualizacao: new Date(document.getElementById("reading-date").value).toISOString()
    };

    try {
        // POST: o controller de registro que te passei já atualiza se já existe registro do mesmo usuario+livro
        const res = await fetch(API_REGISTROS, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(registroPayload)
        });

        if (!res.ok) {
            const text = await res.text().catch(() => "");
            throw new Error(`Falha ao salvar registro (${res.status}) ${text}`);
        }

        alert("Leitura registrada com sucesso!");
        resetForm();
        await carregarLivros();
        await carregarLivrosParaFormulario();

    } catch (err) {
        console.error("Erro ao registrar leitura:", err);
        alert("Erro ao registrar leitura. Veja o console para detalhes.");
    }
}

/* ============================================
   10. RESETAR FORM
============================================ */
function resetForm() {
    const form = document.getElementById("reading-registration-form");
    if (form) form.reset();
    document.getElementById("reading-date").valueAsDate = new Date();
    calculateProgress();
}

/* ============================================
   11. FILTROS
============================================ */
function aplicarFiltro(filtro) {
    filterButtons.forEach(b => b.setAttribute("aria-selected", false));
    const btn = document.querySelector(`[data-filter="${filtro}"]`);
    if (btn) btn.setAttribute("aria-selected", true);

    const cards = document.querySelectorAll(".book-card");
    let visiveis = 0;

    cards.forEach(card => {
        const show = (filtro === "all" || card.dataset.status === filtro);
        card.style.display = show ? "flex" : "none";
        if (show) visiveis++;
    });

    const empty = booksGrid.querySelector(".empty-state");
    if (empty) empty.remove();

    if (visiveis === 0) {
        const msg = document.createElement("div");
        msg.className = "empty-state";
        msg.textContent = "Nenhum livro encontrado com este filtro";
        booksGrid.appendChild(msg);
    }
}

/* ============================================
   12. REMOVER LIVRO
============================================ */
function ativarBotoesRemover() {
    document.querySelectorAll(".remove-book-btn").forEach(btn => {
        btn.removeEventListener("click", onRemoveClick); // evitar múltiplos binds
        btn.addEventListener("click", onRemoveClick);
    });
}

function onRemoveClick(e) {
    const id = e.currentTarget.dataset.id;
    if (!confirm("Deseja remover este livro?")) return;

    fetch(`${API_LIVROS}/${id}`, { method: "DELETE" })
        .then(res => {
            if (!res.ok) throw new Error("Erro ao deletar");
            // atualizar UI
            carregarLivros();
            carregarLivrosParaFormulario();
        })
        .catch(err => {
            console.error("Erro ao remover livro:", err);
            alert("Erro ao remover livro.");
        });
}

/* ============================================
   13. SINCRONIZAR ADIÇÃO ENTRE PÁGINAS
============================================ */
function verificarLivrosAdicionados() {
    const l = localStorage.getItem("livroAdicionado");
    if (!l) return;

    const livro = JSON.parse(l);
    if (Date.now() - livro.timestamp < 5000) {
        carregarLivros();
        carregarLivrosParaFormulario();
    }

    localStorage.removeItem("livroAdicionado");
}

/* ============================================
   14. AUX / FORMATOS
============================================ */
function formatarStatus(s) {
    const map = {
        "quero-ler": "Quero Ler",
        "lendo": "Lendo",
        "lido": "Lido",
        "relendo": "Relendo",
        "abandonado": "Abandonado"
    };
    return map[s] || (s ? s : "Não definido");
}

/* ============================================
   15. ESTILOS DINÂMICOS
============================================ */
function adicionarEstilosDinamicos() {
    if (document.getElementById("dynamic-styles")) return;
    const style = document.createElement("style");
    style.id = "dynamic-styles";
    style.textContent = `
        .progress-bar-small{ height:6px;background:#e0e0e0;border-radius:3px; }
        .progress-fill-small{ height:100%;background:#3498db;border-radius:3px; }
        .book-comment{ font-style:italic;color:#666;margin:5px 0;font-size:.9rem; }
    `;
    document.head.appendChild(style);
}
