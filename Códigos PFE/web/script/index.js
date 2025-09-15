document.addEventListener("DOMContentLoaded", async () => {
    const booksContainer = document.getElementById("books-container");

    // Função para carregar livros do backend
    async function loadBooks() {
        try {
            const response = await fetch("http://localhost:3001/livros"); // Endpoint da API
            const books = await response.json();

            // Limpa o contêiner de livros
            booksContainer.innerHTML = "";

            // Exibe os livros
            books.forEach((book) => {
                const bookCard = document.createElement("div");
                bookCard.classList.add("book-card");
                bookCard.innerHTML = `
                    <img src="${book.capa}" alt="Capa do Livro">
                    <h3>${book.titulo}</h3>
                    <p><strong>Autor:</strong> ${book.autor}</p>
                    <p><strong>Gênero:</strong> ${book.genero}</p>
                    <p><strong>Ano:</strong> ${book.anoPublicacao}</p>
                `;
                booksContainer.appendChild(bookCard);
            });
        } catch (error) {
            console.error("Erro ao carregar livros:", error);
        }
    }

    // Carrega os livros ao carregar a página
    loadBooks();
});
