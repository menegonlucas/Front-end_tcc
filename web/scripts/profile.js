// ===== VARIÁVEIS GLOBAIS =====
let books = JSON.parse(localStorage.getItem('books')) || [];
let logs = JSON.parse(localStorage.getItem('logs')) || [];

// ===== ELEMENTOS DO DOM =====
const currentPageInput = document.getElementById("current-page");
const totalPagesInput = document.getElementById("total-pages");
const progressFill = document.getElementById("progress-fill");
const progressPercentage = document.getElementById("progress-percentage");
const readingForm = document.getElementById("reading-progress-form");
const recentLogs = document.getElementById("recent-logs");
const bookSelect = document.getElementById("book-select");

const booksGrid = document.getElementById("books-grid");
const filterButtons = document.querySelectorAll(".filter-buttons button");

const booksReadElement = document.getElementById("books-read");
const booksInProgressElement = document.getElementById("books-in-progress");

const searchForm = document.getElementById("search-book-form");
const searchQuery = document.getElementById("search-query");
const searchResults = document.getElementById("search-results");


async function loadBooksFromBackend() {
    try {
        const response = await fetch("https://tcc-back-2025.vercel.app/livros");
        const data = await response.json();

        books = data;

        localStorage.setItem('books', JSON.stringify(books));

        renderBooks();
        populateBookSelect();
        updateStats();

    } catch (error) {
        console.error("Erro ao carregar livros do servidor:", error);
    }
}

document.addEventListener('DOMContentLoaded', initializeApp);

async function initializeApp() {
    await loadBooksFromBackend(); // <-- NOVO

    updateProgressBar();
    renderLogs();
    setupEventListeners();
}

function setupEventListeners() {
    currentPageInput.addEventListener("input", updateProgressBar);
    totalPagesInput.addEventListener("input", updateProgressBar);

    readingForm.addEventListener("submit", handleReadingProgressSubmit);

    filterButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            filterButtons.forEach(b => b.setAttribute("aria-selected", "false"));
            btn.setAttribute("aria-selected", "true");
            renderBooks(btn.dataset.filter);
        });
    });

    searchForm.addEventListener("submit", searchBooks);
}

function updateProgressBar() {
    const current = Number(currentPageInput.value);
    const total = Number(totalPagesInput.value);
    const percent = total > 0 ? Math.min(Math.round((current / total) * 100), 100) : 0;
    progressFill.style.width = percent + "%";
    progressPercentage.textContent = percent + "%";
}

function handleReadingProgressSubmit(e) {
    e.preventDefault();
    const book = bookSelect.value;
    const page = currentPageInput.value;
    const total = totalPagesInput.value;
    const comment = document.getElementById("comment").value;

    if (!book || !page || !total) {
        alert("Por favor, preencha todos os campos obrigatórios.");
        return;
    }

    const newLog = {
        book,
        page: parseInt(page),
        total: parseInt(total),
        comment,
        date: new Date().toISOString().split('T')[0]
    };

    logs.unshift(newLog);
    localStorage.setItem('logs', JSON.stringify(logs));

    updateBookStatus(book, page, total);

    renderLogs();
    readingForm.reset();
    updateProgressBar();
    updateStats();

    alert("Progresso registrado com sucesso!");
}

function updateBookStatus(bookTitulo, currentPage, totalPages) {
    const bookIndex = books.findIndex(b => b.titulo === bookTitulo);
    if (bookIndex !== -1) {
        if (currentPage >= totalPages) {
            books[bookIndex].status = "lido";
        } else if (books[bookIndex].status === "quero-ler") {
            books[bookIndex].status = "lendo";
        }
        localStorage.setItem('books', JSON.stringify(books));
        renderBooks(document.querySelector(".filter-buttons button[aria-selected='true']").dataset.filter);
        populateBookSelect();
    }
}

// ===== SELECT DE LIVROS =====
function populateBookSelect() {
    while (bookSelect.options.length > 1) {
        bookSelect.remove(1);
    }
    console.log(books);
    books.forEach(book => {
        const option = document.createElement("option");
        option.value = book.titulo;
        option.textContent = book.titulo;
        bookSelect.appendChild(option);
    });
}

function renderBooks(filter = "all") {
    booksGrid.innerHTML = "";
    const filtered = filter === "all" ? books : books.filter(b => b.status === filter);

    if (!filtered.length) {
        booksGrid.innerHTML = '<div class="empty-state">Nenhum livro encontrado.</div>';
        return;
    }

    filtered.forEach(book => {
        const div = document.createElement("div");
        div.className = "book-card";
        div.innerHTML = `
            <h4>${book.titulo}</h4>
            <p>${book.autor}</p>
            <span class="status">${formatStatus(book.status)}</span>
        `;
        booksGrid.appendChild(div);
    });
}

function renderLogs() {
    recentLogs.innerHTML = "";
    if (!logs.length) {
        recentLogs.innerHTML = '<div class="empty-state">Nenhum registro de leitura encontrado.</div>';
        return;
    }
    const recent = logs.slice(0, 5);
    recent.forEach(log => {
        const li = document.createElement("li");
        li.className = "log-item";
        li.innerHTML = `
            <div>
                <strong class="log-book">${log.book}</strong>
                <div class="log-details">Página ${log.page} de ${log.total} • ${formatDate(log.date)}</div>
                <div class="log-comment">${log.comment || "Sem comentário"}</div>
            </div>
        `;
        recentLogs.appendChild(li);
    });
}

function formatStatus(status) {
    const statusMap = {
        "lendo": "Lendo",
        "lido": "Lido",
        "relendo": "Relendo",
        "quero-ler": "Quero Ler",
        "abandonado": "Abandonado"
    };
    return statusMap[status] || status;
}

function formatDate(dateString) {
    const options = { day: '2-digit', month: '2-digit', year: 'numeric' };
    return new Date(dateString).toLocaleDateString('pt-BR', options);
}

function updateStats() {
    const booksRead = books.filter(book => book.status === "lido").length;
    const booksInProgress = books.filter(book =>
        book.status === "lendo" || book.status === "relendo"
    ).length;
    booksReadElement.textContent = booksRead;
    booksInProgressElement.textContent = booksInProgress;
}

// ===== PESQUISA GOOGLE BOOKS =====
async function searchBooks(e) {
    e.preventDefault();
    const query = searchQuery.value.trim();
    if (!query) return;
    searchResults.innerHTML = "<p>Buscando...</p>";

    try {
        const response = await fetch(
            `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=10`
        );
        const data = await response.json();

        if (!data.items || data.items.length === 0) {
            searchResults.innerHTML = "<p>Nenhum resultado encontrado.</p>";
            return;
        }

        searchResults.innerHTML = "";
        data.items.forEach(item => {
            const titulo = item.volumeInfo.titulo || "Sem título";
            const autor = item.volumeInfo.autor ? item.volumeInfo.autor.join(", ") : "Autor desconhecido";
            const thumbnail = item.volumeInfo.imageLinks?.thumbnail || "";

            const div = document.createElement("div");
            div.className = "search-item";
            div.innerHTML = `
                <img src="${thumbnail}" alt="${titulo}" class="search-thumb">
                <div class="search-info">
                    <strong>${titulo}</strong><br>
                    <em>${autor}</em>
                </div>
                <button class="add-btn"><i class="fas fa-plus"></i> Adicionar</button>
            `;

            div.querySelector(".add-btn").addEventListener("click", () => {
                if (books.some(b => b.titulo.toLowerCase() === titulo.toLowerCase())) {
                    alert("Este livro já está na sua biblioteca.");
                    return;
                }
                books.push({ titulo, autor: autores, status: "quero-ler" });
                localStorage.setItem('books', JSON.stringify(books));
                renderBooks(document.querySelector(".filter-buttons button[aria-selected='true']").dataset.filter);
                populateBookSelect();
                updateStats();
                alert("Livro adicionado à sua biblioteca!");
            });

            searchResults.appendChild(div);
        });
    } catch (error) {
        console.error(error);
        searchResults.innerHTML = "<p>Erro ao buscar livros. Tente novamente.</p>";
    }
}
