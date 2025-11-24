
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');
    const resultsDiv = document.getElementById('results');
    const bookDetailsDiv = document.getElementById('bookDetails');

    // Event Listeners
    searchBtn.addEventListener('click', searchBooks);
    searchInput.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') searchBooks();
    });

    // Função principal de busca
    async function searchBooks() {
      const query = searchInput.value.trim();

      if (!query) {
        alert('Digite algo para buscar');
        return;
      }

      resultsDiv.innerHTML = `
        <div class="loading">
          <i class="fas fa-spinner fa-spin"></i>
          <p>Buscando livros...</p>
        </div>`;

      try {
        const res = await fetch(
          `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=20`
        );
        
        if (!res.ok) throw new Error('Erro na requisição à API');
        
        const data = await res.json();
        displayResults(data);
      } catch (error) {
        console.error('Erro na busca:', error);
        resultsDiv.innerHTML = `
          <div class="error">
            <i class="fas fa-exclamation-triangle"></i>
            <p>Ocorreu um erro na busca. Tente novamente mais tarde.</p>
          </div>`;
      }
    }

    // Exibir resultados da busca
    function displayResults(data) {
      resultsDiv.innerHTML = '';

      if (data.items && data.items.length > 0) {
        const resultsContainer = document.createElement('div');
        resultsContainer.className = 'results-container';

        data.items.forEach(book => {
          const bookCard = createBookCard(book);
          resultsContainer.appendChild(bookCard);
        });

        resultsDiv.appendChild(resultsContainer);
      } else {
        resultsDiv.innerHTML = `
          <div class="no-results">
            <i class="fas fa-exclamation-circle"></i>
            <p>Nenhum livro encontrado. Tente usar outros termos de busca.</p>
          </div>`;
      }
    }

    // Criar card do livro
    function createBookCard(book) {
      const bookCard = document.createElement('div');
      bookCard.className = 'book-card';

      const volumeInfo = book.volumeInfo;
      const title = volumeInfo.title || 'Sem título';
      const authors = volumeInfo.authors ? volumeInfo.authors.join(', ') : 'Autor desconhecido';
      const publishedDate = volumeInfo.publishedDate || 'Data desconhecida';
      const thumbnail = volumeInfo.imageLinks ? 
        volumeInfo.imageLinks.thumbnail.replace('http://', 'https://') : 
        'https://via.placeholder.com/150x200?text=Sem+Imagem';

      bookCard.innerHTML = `
        <div class="book-thumbnail-container">
          <img src="${thumbnail}" alt="${title}" class="book-thumbnail">
        </div>
        <div class="book-info">
          <h3 class="book-title">${title}</h3>
          <p class="book-authors">${authors}</p>
          <p class="book-published">Publicado: ${publishedDate}</p>
        </div>`;

      bookCard.addEventListener('click', () => showBookDetails(book));
      return bookCard;
    }

    // Exibir detalhes do livro
    function showBookDetails(book) {
      const volumeInfo = book.volumeInfo;
      
      // Extrair dados do livro
      const bookData = extractBookData(book);
      
      // Criar HTML dos detalhes
      bookDetailsDiv.innerHTML = createBookDetailsHTML(volumeInfo, bookData);
      bookDetailsDiv.classList.add('active');
      bookDetailsDiv.scrollIntoView({ behavior: 'smooth' });

      // Adicionar evento ao botão de adicionar
      document.getElementById('addBookBtn').addEventListener('click', () => addBookToDatabase(bookData));
    }

    // Extrair dados do livro para o banco
    function extractBookData(book) {
      const volumeInfo = book.volumeInfo;
      
      // Tentar capturar o ISBN
      const isbn = volumeInfo.industryIdentifiers?.find(i => i.type === 'ISBN_13')?.identifier ||
                  volumeInfo.industryIdentifiers?.[0]?.identifier ||
                  `SEMISBN-${Date.now()}`;

      return {
        titulo: volumeInfo.title || 'Sem título',
        autor: volumeInfo.authors ? volumeInfo.authors.join(', ') : 'Autor desconhecido',
        isbn: isbn,
        editora: volumeInfo.publisher || 'Editora desconhecida',
        anoPublicacao: parseInt(volumeInfo.publishedDate?.substring(0, 4)) || 0,
        genero: volumeInfo.categories ? volumeInfo.categories.join(', ') : 'Categorias não informadas',
        sinopse: volumeInfo.description || 'Descrição não disponível.',
        paginas: volumeInfo.pageCount || 0,
        idioma: volumeInfo.language || 'desconhecido',
        capa: volumeInfo.imageLinks ? volumeInfo.imageLinks.thumbnail.replace('http://', 'https://') : '',
        status: 'quero-ler' // Status padrão
      };
    }

    // Criar HTML dos detalhes do livro
    function createBookDetailsHTML(volumeInfo, bookData) {
      const title = volumeInfo.title || 'Sem título';
      const authors = volumeInfo.authors ? volumeInfo.authors.join(', ') : 'Autor desconhecido';
      const publishedDate = volumeInfo.publishedDate || '0000';
      const publisher = volumeInfo.publisher || 'Editora desconhecida';
      const pageCount = volumeInfo.pageCount || 0;
      const categories = volumeInfo.categories ? volumeInfo.categories.join(', ') : 'Categorias não informadas';
      const description = volumeInfo.description || 'Descrição não disponível.';
      const thumbnail = volumeInfo.imageLinks ? 
        volumeInfo.imageLinks.thumbnail.replace('http://', 'https://') : 
        'https://via.placeholder.com/150x200?text=Sem+Imagem';
      const averageRating = volumeInfo.averageRating || 'Não avaliado';
      const ratingsCount = volumeInfo.ratingsCount || 'Sem avaliações';

      return `
        <button class="back-btn" onclick="hideBookDetails()">
          <i class="fas fa-arrow-left"></i> Voltar para resultados
        </button>
        <div class="details-header">
          <img src="${thumbnail}" alt="${title}" class="details-thumbnail">
          <div class="details-info">
            <h2 class="details-title">${title}</h2>
            <p class="details-authors">Por: ${authors}</p>
            <div class="details-meta">
              <span class="meta-item"><i class="fas fa-calendar-alt"></i> ${publishedDate}</span>
              <span class="meta-item"><i class="fas fa-building"></i> ${publisher}</span>
              <span class="meta-item"><i class="fas fa-file"></i> ${pageCount} páginas</span>
              <span class="meta-item"><i class="fas fa-star"></i> ${averageRating} (${ratingsCount})</span>
            </div>
            <p><strong>Categorias:</strong> ${categories}</p>
            <button id="addBookBtn" class="back-btn" style="background: var(--color-success); margin-top: 1rem;">
              <i class="fas fa-plus"></i> Adicionar à Minha Biblioteca
            </button>
          </div>
        </div>
        <div class="details-description">
          <h3>Descrição</h3>
          <p>${description}</p>
        </div>`;
    }

    // Adicionar livro ao banco de dados
    async function addBookToDatabase(bookData) {
      try {
        const res = await fetch('https://tcc-back-2025.vercel.app/livros', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bookData)
        });

        let data;
        try {
          data = await res.json();
        } catch {
          const text = await res.text();
          throw new Error(`Resposta inválida: ${text}`);
        }

        if (res.ok) {
          alert(`✅ Livro "${data.titulo}" adicionado com sucesso!`);
          
          // Salvar no localStorage para sincronizar com a página de perfil
          localStorage.setItem('livroAdicionado', JSON.stringify({
            id: data.id,
            titulo: data.titulo,
            timestamp: Date.now()
          }));
        } else {
          throw new Error(data.mensagem || data.erro || 'Erro desconhecido');
        }
      } catch (error) {
        console.error('Erro ao adicionar livro:', error);
        alert(`❌ Erro: ${error.message}`);
      }
    }

    // Ocultar detalhes do livro
    function hideBookDetails() {
      bookDetailsDiv.classList.remove('active');
      resultsDiv.scrollIntoView({ behavior: 'smooth' });
    }

    // Menu do usuário
    (function initUserMenu() {
      const userProfile = document.querySelector('.user-profile');
      const profileMenu = document.querySelector('.profile-menu');

      if (!userProfile || !profileMenu) return;

      userProfile.addEventListener('click', (e) => {
        profileMenu.classList.toggle('open');
        e.stopPropagation();
      });

      document.addEventListener('click', () => {
        profileMenu.classList.remove('open');
      });

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') profileMenu.classList.remove('open');
      });
    })();