document.addEventListener("DOMContentLoaded", () => {
    const addBookForm = document.getElementById("addBookForm");
    const readingProgressForm = document.getElementById("reading-progress-form");
    const booksContainer = document.getElementById("books-container");
    const bookInput = document.getElementById("escolherlivros");
    const bookSuggestions = document.getElementById("livros-sugestoes");
    const progressFill = document.getElementById("progress-fill");
    const progressPercentage = document.getElementById("progress-percentage");
    let booksData = [];

    // Funções para armazenamento local
    function getLocalStorageData() {
        return JSON.parse(localStorage.getItem('readingProgress')) || {};
    }

    function saveLocalStorageData(data) {
        localStorage.setItem('readingProgress', JSON.stringify(data));
    }

    function getBookProgress(bookId) {
        const data = getLocalStorageData();
        return data[bookId] || null;
    }

    function saveBookProgress(bookId, progressData) {
        const data = getLocalStorageData();
        data[bookId] = progressData;
        saveLocalStorageData(data);
    }

    // Função para carregar livros da API do Google Books
    async function loadBooks(searchTerm = '') {
        try {
            booksContainer.innerHTML = "<p>Carregando livros...</p>";
            
            let apiUrl = 'https://www.googleapis.com/books/v1/volumes?maxResults=20';
            if (searchTerm) {
                apiUrl += `&q=${encodeURIComponent(searchTerm)}`;
            } else {
                apiUrl += '&q=literatura';
            }

            const response = await fetch(apiUrl);
            if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);
            
            const data = await response.json();
            booksData = data.items || [];

            // Limpa o contêiner e o datalist
            booksContainer.innerHTML = "";
            bookSuggestions.innerHTML = "";

            if (booksData.length === 0) {
                booksContainer.innerHTML = "<p>Nenhum livro encontrado. Tente outro termo de busca.</p>";
                return;
            }

            booksData.forEach((item) => {
                const book = item.volumeInfo;
                const bookId = item.id;
                const title = book.title || "Título desconhecido";
                const authors = book.authors ? book.authors.join(", ") : "Autor desconhecido";
                const thumbnail = book.imageLinks?.thumbnail || './img/no-cover.jpg';

                // Adiciona ao datalist
                const option = document.createElement("option");
                option.value = title;
                option.dataset.id = bookId;
                bookSuggestions.appendChild(option);

                // Adiciona ao container de livros
                const bookElement = document.createElement("div");
                bookElement.classList.add("book");
                bookElement.dataset.id = bookId;
                
                const progressData = getBookProgress(bookId);
                const status = progressData?.status || "Não iniciado";
                const progress = progressData ? 
                    `${Math.round((progressData.currentPage / progressData.totalPages) * 100)}%` : 
                    "0%";

                bookElement.innerHTML = `
                    <div class="book-header">
                        <img src="${thumbnail}" alt="${title}" class="book-cover" width="60">
                        <div>
                            <h3>${title}</h3>
                            <p class="book-author">${authors}</p>
                        </div>
                    </div>
                    <div class="book-status">
                        <span class="status-badge ${status}">${status}</span>
                        <span class="progress-text">${progress}</span>
                    </div>
                    <div class="book-actions">
                        <button class="edit-progress" data-id="${bookId}">Editar Progresso</button>
                    </div>
                `;
                booksContainer.appendChild(bookElement);
            });

            // Adiciona eventos aos botões
            document.querySelectorAll('.edit-progress').forEach(button => {
                button.addEventListener('click', (e) => {
                    const bookId = e.target.dataset.id;
                    const book = booksData.find(b => b.id === bookId);
                    if (book) {
                        bookInput.value = book.volumeInfo.title;
                        const progressData = getBookProgress(bookId);
                        if (progressData) {
                            document.getElementById('reading-status').value = progressData.status;
                            document.getElementById('total-pages').value = progressData.totalPages;
                            document.getElementById('current-page').value = progressData.currentPage;
                            document.getElementById('comment').value = progressData.comment || '';
                            updateProgressBar((progressData.currentPage / progressData.totalPages) * 100);
                        }
                    }
                });
            });

        } catch (error) {
            console.error("Erro ao carregar livros:", error);
            booksContainer.innerHTML = `<p class="error">Erro ao carregar livros: ${error.message}</p>`;
        }
    }

    // Função para atualizar a barra de progresso
    function updateProgressBar(progress) {
        const percentage = Math.min(Math.max(0, progress), 100);
        progressFill.style.width = `${percentage}%`;
        progressPercentage.textContent = `${Math.round(percentage)}%`;
    }

    // Evento de busca de livros
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = 'Buscar livros...';
    searchInput.classList.add('search-input');
    booksContainer.before(searchInput);
    
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            loadBooks(e.target.value);
        }
    });

    // Evento de envio do formulário de progresso
    readingProgressForm.addEventListener("submit", (event) => {
        event.preventDefault();

        const bookTitle = bookInput.value.trim();
        const selectedOption = [...bookSuggestions.options].find(opt => opt.value === bookTitle);
        if (!selectedOption) {
            alert("Selecione um livro válido da lista de sugestões.");
            return;
        }

        const bookId = selectedOption.dataset.id;
        const status = document.getElementById("reading-status").value;
        const totalPages = parseInt(document.getElementById("total-pages").value) || 0;
        const currentPage = parseInt(document.getElementById("current-page").value) || 0;
        const comment = document.getElementById("comment").value.trim();

        if (totalPages <= 0 || currentPage < 0) {
            alert("Por favor, insira valores válidos para as páginas.");
            return;
        }

        saveBookProgress(bookId, {
            status,
            totalPages,
            currentPage,
            comment,
            lastUpdated: new Date().toISOString()
        });

        updateProgressBar((currentPage / totalPages) * 100);
        readingProgressForm.reset();
        loadBooks(searchInput.value);
    });

    // Inicialização
    loadBooks();
});