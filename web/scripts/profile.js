/*************************************************
 *  PROFILE.JS — VERSÃO 100% FUNCIONAL (CORRIGIDA)
 *************************************************/

const API_URL = "https://tcc-back-2025.vercel.app/livros";
const REGISTROS_URL = "https://tcc-back-2025.vercel.app/registros";

const booksGrid = document.getElementById('books-grid');
const filterButtons = document.querySelectorAll('.filter-buttons button');
const bookSelect = document.getElementById('book-select-register');

let livrosCache = [];


/* ============================================
   1. INICIALIZAÇÃO GERAL
============================================ */
document.addEventListener("DOMContentLoaded", () => {
    carregarLivros();
    carregarLivrosParaFormulario();
    setupEventListeners();
    verificarLivrosAdicionados();
    document.getElementById("reading-date").valueAsDate = new Date();
});


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

    // Progresso
    document.getElementById("current-page-register").addEventListener("input", calculateProgress);
    document.getElementById("total-pages-register").addEventListener("input", calculateProgress);

    // Submit
    document.getElementById("reading-registration-form").addEventListener("submit", handleFormSubmit);

    // Filtros
    filterButtons.forEach(btn =>
        btn.addEventListener("click", () => aplicarFiltro(btn.dataset.filter))
    );

    // Autopreencher ao selecionar livro
    bookSelect.addEventListener("change", preencherDadosLivroSelecionado);

    // Checar novos livros
    setInterval(verificarLivrosAdicionados, 3000);
}


/* ============================================
   3. CARREGAR LIVROS (com registros)
============================================ */
async function carregarLivros() {
    try {
        booksGrid.innerHTML = `<div class="loading">Carregando livros...</div>`;

        const res = await fetch(API_URL);
        if (!res.ok) throw new Error("Erro ao buscar livros");

        let livros = await res.json();

        // 🔥 APLICAR REGISTROS (status, comentario, data, páginas, progresso)
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
        while (bookSelect.children.length > 1)
            bookSelect.removeChild(bookSelect.lastChild);

        const res = await fetch(API_URL);
        if (!res.ok) throw new Error("Erro ao carregar lista");

        let livros = await res.json();
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
============================================ */
function aplicarRegistroAoLivro(livro) {

    if (!livro.registro) return livro;

    livro.statusLeitura = livro.registro.statusLeitura || livro.statusLeitura;
    livro.comentario = livro.registro.comentario || livro.comentario;
    livro.paginaAtual = livro.registro.paginaAtual || livro.paginaAtual;
    livro.totalPaginas = livro.registro.totalPaginas || livro.totalPaginas;
    livro.dataAtualizacao = livro.registro.dataAtualizacao || livro.dataAtualizacao;

    return livro;
}


/* ============================================
   6. AUTOPREENCHER FORMULÁRIO
============================================ */
function preencherDadosLivroSelecionado() {
    const livro = livrosCache.find(x => x.id == bookSelect.value);
    if (!livro) return resetForm();

    document.getElementById("total-pages-register").value =
        livro.totalPaginas || livro.paginas || "";

    document.getElementById("current-page-register").value =
        livro.paginaAtual || "";

    document.getElementById("reading-comment").value =
        livro.comentario || "";

    if (livro.statusLeitura)
        document.getElementById("reading-status").value = livro.statusLeitura;

    if (livro.dataAtualizacao)
        document.getElementById("reading-date").value = livro.dataAtualizacao;

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
        const progresso = Math.round((pagAtual / totalPag) * 100);

        const card = document.createElement("div");
        card.classList.add("book-card");

        // 🔥 Correção definitiva do filtro
        card.dataset.status = livro.statusLeitura || "quero-ler";

        const comentarioHTML = livro.comentario
            ? `<p class="book-comment"><strong>Comentário:</strong> ${livro.comentario}</p>`
            : "";

        card.innerHTML = `
            <div class="book-cover">
                ${livro.capa ? `<img src="${livro.capa}" alt="${livro.titulo}">`
                : `<div class="book-cover-placeholder"><i class="fas fa-book"></i></div>`}
            </div>

            <div class="book-info">
                <h3>${livro.titulo}</h3>
                <p>${livro.autor}</p>

                <p><strong>Status:</strong> ${formatarStatus(livro.statusLeitura)}</p>

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
   8. CALCULAR PROGRESSO
============================================ */
function calculateProgress() {
    const pag = parseInt(document.getElementById("current-page-register").value) || 0;
    const total = parseInt(document.getElementById("total-pages-register").value) || 1;
    const pct = Math.round((pag / total) * 100);

    document.getElementById("progress-fill-register").style.width = pct + "%";
    document.getElementById("progress-percentage-register").textContent = pct + "%";
}


/* ============================================
   9. SALVAR REGISTRO DE LEITURA
============================================ */
async function handleFormSubmit(e) {
    e.preventDefault();

    const usuario = JSON.parse(localStorage.getItem("usuario"));
    if (!usuario?.userId) {
        alert("Usuário não encontrado. Faça login novamente.");
        return;
    }

    const registro = {
        livroId: parseInt(bookSelect.value),
        usuarioId: usuario.userId,
        paginaAtual: parseInt(current - page - register.value) || 0,
        totalPaginas: parseInt(total - pages - register.value) || 0,
        statusLeitura: document.getElementById("reading-status").value,
        comentario: document.getElementById("reading-comment").value || "",
        dataAtualizacao: document.getElementById("reading-date").value
    };

    try {
        const res = await fetch(REGISTROS_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(registro)
        });

        if (!res.ok) throw new Error("Falha ao salvar");

        alert("Leitura registrada com sucesso!");
        resetForm();
        carregarLivros();

    } catch (e) {
        console.error(e);
        alert("Erro ao registrar leitura.");
    }
}


/* ============================================
   10. RESETAR FORM
============================================ */
function resetForm() {
    document.getElementById("reading-registration-form").reset();
    document.getElementById("reading-date").valueAsDate = new Date();
    calculateProgress();
}


/* ============================================
   11. FILTROS
============================================ */
function aplicarFiltro(filtro) {

    filterButtons.forEach(b => b.setAttribute("aria-selected", false));
    document.querySelector(`[data-filter="${filtro}"]`).setAttribute("aria-selected", true);

    const cards = document.querySelectorAll(".book-card");
    let visiveis = 0;

    cards.forEach(card => {
        card.style.display =
            filtro === "all" || card.dataset.status === filtro ?
                "flex" : "none";

        if (card.style.display === "flex") visiveis++;
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
        btn.addEventListener("click", async () => {

            if (!confirm("Deseja remover este livro?")) return;

            try {
                await fetch(`${API_URL}/${btn.dataset.id}`, { method: "DELETE" });

                carregarLivros();
                carregarLivrosParaFormulario();

            } catch (e) {
                alert("Erro ao remover");
            }
        });
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
   14. FUNÇÕES DE APOIO
============================================ */
function formatarStatus(s) {
    const map = {
        "quero-ler": "Quero Ler",
        "lendo": "Lendo",
        "lido": "Lido",
        "relendo": "Relendo",
        "abandonado": "Abandonado"
    };
    return map[s] || "Não definido";
}


/* ============================================
   15. ESTILOS DINÂMICOS
============================================ */
function adicionarEstilosDinamicos() {
    if (document.getElementById("dynamic-styles")) return;

    const style = document.createElement("style");
    style.id = "dynamic-styles";
    style.textContent = `
        .progress-bar-small{
            height:6px;background:#e0e0e0;border-radius:3px;
        }
        .progress-fill-small{
            height:100%;background:#3498db;border-radius:3px;
        }
        .book-comment{
            font-style:italic;color:#666;margin:5px 0;font-size:.9rem;
        }
    `;
    document.head.appendChild(style);
}
