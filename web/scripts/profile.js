const API_URL = "https://tcc-back-2025.vercel.app/livros";
const booksGrid = document.getElementById('books-grid');
const filterButtons = document.querySelectorAll('.filter-buttons button');
const bookSelect = document.getElementById('book-select-register');
let livrosCache = [];

// =========================
// 1. INICIALIZAÇÃO
// =========================
document.addEventListener('DOMContentLoaded', function() {
    carregarLivros();
    carregarLivrosParaFormulario();
    setupEventListeners();
    verificarLivrosAdicionados();
});

// =========================
// 2. CONFIGURAÇÃO DE EVENTOS
// =========================
function setupEventListeners() {
    // Menu do usuário
    const userProfile = document.querySelector('.user-profile');
    const profileMenu = document.querySelector('.profile-menu');

    if (userProfile && profileMenu) {
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
    }

    // Cálculo de progresso
    document.getElementById('current-page-register').addEventListener('input', calculateProgress);
    document.getElementById('total-pages-register').addEventListener('input', calculateProgress);

    // Formulário de registro
    document.getElementById('reading-registration-form').addEventListener('submit', handleFormSubmit);
    
    // Filtros
    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => aplicarFiltro(btn.dataset.filter));
    });

    // Quando selecionar um livro no formulário, preencher automaticamente os dados
    bookSelect.addEventListener('change', preencherDadosLivroSelecionado);

    // Verificar periodicamente por novos livros
    setInterval(verificarLivrosAdicionados, 3000);
}

// =========================
// 3. CARREGAR LIVROS DA BIBLIOTECA
// =========================
async function carregarLivros() {
    try {
        booksGrid.innerHTML = '<div class="loading">Carregando livros...</div>';
        
        const res = await fetch(API_URL);
        
        if (!res.ok) {
            throw new Error(`Erro HTTP: ${res.status}`);
        }
        
        const livros = await res.json();
        livrosCache = livros;

        if (!livros || livros.length === 0) {
            booksGrid.innerHTML = '<div class="empty-state">Nenhum livro adicionado à biblioteca</div>';
            return;
        }

        renderizarLivros(livros);
    } catch (err) {
        console.error('Erro ao carregar livros:', err);
        booksGrid.innerHTML = '<div class="error-state">Erro ao carregar livros. Tente novamente mais tarde.</div>';
    }
}

// =========================
// 4. CARREGAR LIVROS PARA FORMULÁRIO
// =========================
async function carregarLivrosParaFormulario() {
    try {
        // Limpar select exceto primeira opção
        while (bookSelect.children.length > 1) {
            bookSelect.removeChild(bookSelect.lastChild);
        }

        const res = await fetch(API_URL);
        
        if (!res.ok) {
            throw new Error('Erro ao carregar livros');
        }

        const livros = await res.json();
        livrosCache = livros;

        if (livros && livros.length > 0) {
            livros.forEach(livro => {
                const option = document.createElement('option');
                option.value = livro.id;
                option.textContent = `${livro.titulo} - ${livro.autor}`;
                option.setAttribute('data-paginas', livro.paginas || 0);
                bookSelect.appendChild(option);
            });
        } else {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'Nenhum livro na biblioteca';
            bookSelect.appendChild(option);
        }
    } catch (error) {
        console.error('Erro ao carregar livros para formulário:', error);
        const option = document.createElement('option');
        option.value = '';
        option.textContent = 'Erro ao carregar livros';
        bookSelect.appendChild(option);
    }
}

// =========================
// 5. PREENCHER DADOS DO LIVRO SELECIONADO
// =========================
function preencherDadosLivroSelecionado() {
    const livroId = bookSelect.value;
    if (!livroId) {
        resetForm();
        return;
    }
    
    // Buscar livro no cache
    const livro = livrosCache.find(l => l.id == livroId);
    if (livro) {
        // Preencher total de páginas (se não existir, usar o padrão do livro)
        document.getElementById('total-pages-register').value = livro.totalPaginas || livro.paginas || '';
        
        // Preencher status atual se existir
        if (livro.status) {
            document.getElementById('reading-status').value = livro.status;
        }
        
        // Preencher página atual se existir
        if (livro.paginaAtual) {
            document.getElementById('current-page-register').value = livro.paginaAtual;
        }
        
        // Preencher avaliação se existir
        if (livro.avaliacao) {
            const ratingInput = document.querySelector(`input[name="rating"][value="${livro.avaliacao}"]`);
            if (ratingInput) {
                ratingInput.checked = true;
            }
        }
        
        // Preencher comentário se existir
        if (livro.comentario) {
            document.getElementById('reading-comment').value = livro.comentario;
        }
        
        // Preencher data se existir
        if (livro.dataLeitura) {
            document.getElementById('reading-date').value = livro.dataLeitura;
        }
        
        // Recalcular progresso
        calculateProgress();
    }
}

// =========================
// 6. RENDERIZAR LIVROS NA GRADE
// =========================
function renderizarLivros(lista) {
    booksGrid.innerHTML = '';

    lista.forEach((livro) => {
        if (!livro.id) {
            console.warn('Livro sem ID:', livro);
            return;
        }

        const card = document.createElement('div');
        card.classList.add('book-card');
        card.setAttribute('data-status', livro.status || 'all');
        card.setAttribute('data-id', livro.id);

        // Calcular progresso
        const totalPaginas = livro.totalPaginas || livro.paginas || 1;
        const paginaAtual = livro.paginaAtual || 0;
        const progresso = Math.min(100, Math.round((paginaAtual / totalPaginas) * 100));

        // Gerar estrelas para avaliação
        let estrelasHTML = '';
        if (livro.avaliacao) {
            const estrelasCheias = livro.avaliacao;
            const estrelasVazias = 5 - livro.avaliacao;
            estrelasHTML = `
                <p class="book-rating">
                    <strong>Avaliação:</strong> 
                    <span class="rating-stars-display">
                        ${'★'.repeat(estrelasCheias)}${'☆'.repeat(estrelasVazias)}
                    </span>
                </p>
            `;
        }

        // Verificar se há comentário
        const comentarioHTML = livro.comentario ? 
            `<p class="book-comment"><strong>Comentário:</strong> ${livro.comentario}</p>` : '';

        card.innerHTML = `
            <div class="book-cover">
                ${livro.capa ? 
                    `<img src="${livro.capa}" alt="${livro.titulo || 'Livro'}" onerror="this.parentElement.innerHTML='<div class=\"book-cover-placeholder\"><i class=\"fas fa-book\"></i></div>'">` : 
                    `<div class="book-cover-placeholder"><i class="fas fa-book"></i></div>`
                }
            </div>
            <div class="book-info">
                <h3 class="book-title">${livro.titulo || 'Título não disponível'}</h3>
                <p class="book-author">${livro.autor || 'Autor desconhecido'}</p>
                <p class="book-status"><strong>Status:</strong> <span class="status-${livro.status || 'none'}">${formatarStatus(livro.status)}</span></p>
                <p class="book-pages"><strong>Progresso:</strong> ${paginaAtual}/${totalPaginas} páginas (${progresso}%)</p>
                <div class="progress-bar-small">
                    <div class="progress-fill-small" style="width: ${progresso}%"></div>
                </div>
                ${estrelasHTML}
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

// =========================
// 7. FUNÇÕES DE FORMULÁRIO
// =========================
function calculateProgress() {
    const currentPage = parseInt(document.getElementById('current-page-register').value) || 0;
    const totalPages = parseInt(document.getElementById('total-pages-register').value) || 1;

    const percentage = Math.min(100, Math.round((currentPage / totalPages) * 100));

    document.getElementById('progress-percentage-register').textContent = percentage + '%';
    document.getElementById('progress-fill-register').style.width = percentage + '%';
}

async function handleFormSubmit(e) {
    e.preventDefault();

    const livroId = parseInt(document.getElementById('book-select-register').value);
    const paginaAtual = parseInt(document.getElementById('current-page-register').value) || null;
    const totalPaginas = parseInt(document.getElementById('total-pages-register').value) || null;
    const statusLeitura = document.getElementById('reading-status').value;
    const dataAtualizacao = document.getElementById('reading-date').value;
    const comentario = document.getElementById('reading-comment').value || null;

    // PEGAR USUÁRIO LOGADO

    const usuarioData = JSON.parse(localStorage.getItem("usuario"));
console.log("USUARIO NO LOCALSTORAGE:", usuarioData);

const usuarioId = usuarioData?.id;

    if (!usuarioId) {
        alert("Erro: usuário não encontrado. Faça login novamente.");
        return;
    }

    if (!livroId || !statusLeitura || !dataAtualizacao) {
        alert("Preencha todos os campos obrigatórios!");
        return;
    }

    const registroData = {
        livroId,
        usuarioId,
        comentario,
        statusLeitura,
        totalPaginas,
        paginaAtual,
        dataAtualizacao
    };

    console.log("Enviando para API /registros:", registroData);

    try {
        const res = await fetch("https://tcc-back-2025.vercel.app/registros", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(registroData)
        });

        if (!res.ok) {
            const txt = await res.text();
            console.error("Erro da API:", txt);
            throw new Error("Erro ao registrar leitura");
        }

        const result = await res.json();
        console.log("Registro criado:", result);

        alert("Leitura registrada com sucesso!");

        resetForm();

        // Recarregar livros para atualizar progresso na biblioteca
        carregarLivros();

    } catch (err) {
        console.error("Erro criação registro:", err);
        alert("Erro ao registrar leitura.");
    }
}


function resetForm() {
    document.getElementById('reading-registration-form').reset();
    document.getElementById('total-pages-register').value = '';
    document.getElementById('reading-date').valueAsDate = new Date();
    calculateProgress();
}

// =========================
// 8. FUNÇÕES DE FILTRO
// =========================
function aplicarFiltro(filtro) {
    // Atualizar botões
    filterButtons.forEach(b => b.setAttribute('aria-selected', 'false'));
    const botaoAtivo = document.querySelector(`[data-filter="${filtro}"]`);
    if (botaoAtivo) {
        botaoAtivo.setAttribute('aria-selected', 'true');
    }

    // Aplicar filtro
    const cards = document.querySelectorAll('.book-card');
    let livrosVisiveis = 0;

    cards.forEach(card => {
        const status = card.getAttribute('data-status');

        if (filtro === 'all' || status === filtro) {
            card.style.display = 'flex';
            livrosVisiveis++;
        } else {
            card.style.display = 'none';
        }
    });

    // Mostrar mensagem se não houver livros
    const existingEmptyMessage = booksGrid.querySelector('.empty-state');
    if (existingEmptyMessage) {
        existingEmptyMessage.remove();
    }

    if (livrosVisiveis === 0 && cards.length > 0) {
        const emptyMessage = document.createElement('div');
        emptyMessage.className = 'empty-state';
        emptyMessage.textContent = `Nenhum livro encontrado com o filtro "${botaoAtivo ? botaoAtivo.textContent : filtro}"`;
        booksGrid.appendChild(emptyMessage);
    }
}

// =========================
// 9. REMOVER LIVROS
// =========================
function ativarBotoesRemover() {
    document.querySelectorAll('.remove-book-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const id = btn.getAttribute('data-id');

            if (!id) {
                console.error('ID do livro não encontrado');
                return;
            }

            if (!confirm('Deseja realmente remover este livro da biblioteca?')) return;

            try {
                const res = await fetch(`${API_URL}/${id}`, {
                    method: 'DELETE'
                });

                if (res.ok) {
                    // Animação de remoção
                    const card = btn.closest('.book-card');
                    card.style.opacity = '0';
                    card.style.transform = 'scale(0.8)';
                    
                    setTimeout(() => {
                        card.remove();
                        
                        // Atualizar cache
                        livrosCache = livrosCache.filter(l => l.id != id);
                        
                        // Recarregar lista do formulário
                        carregarLivrosParaFormulario();
                        
                        // Verificar se ficou vazio
                        if (document.querySelectorAll('.book-card').length === 0) {
                            booksGrid.innerHTML = '<div class="empty-state">Nenhum livro adicionado à biblioteca</div>';
                        }
                    }, 300);
                } else {
                    alert('Erro ao remover livro. Tente novamente.');
                }
            } catch (err) {
                console.error('Erro:', err);
                alert('Erro de conexão ao tentar remover livro.');
            }
        });
    });
}

// =========================
// 10. SINCRONIZAÇÃO ENTRE PÁGINAS
// =========================
function verificarLivrosAdicionados() {
    const livroAdicionado = localStorage.getItem('livroAdicionado');
    
    if (livroAdicionado) {
        try {
            const livro = JSON.parse(livroAdicionado);
            
            // Se o livro foi adicionado há menos de 5 segundos, recarregar as listas
            if (Date.now() - livro.timestamp < 5000) {
                carregarLivros();
                carregarLivrosParaFormulario();
                localStorage.removeItem('livroAdicionado');
                
                // Selecionar automaticamente o livro recém-adicionado
                setTimeout(() => {
                    if (bookSelect) {
                        bookSelect.value = livro.id;
                        preencherDadosLivroSelecionado();
                    }
                }, 1000);
            }
        } catch (e) {
            console.error('Erro ao processar livro adicionado:', e);
            localStorage.removeItem('livroAdicionado');
        }
    }
}

// =========================
// 11. UTILITÁRIOS
// =========================
function formatarStatus(status) {
    const statusMap = {
        'quero-ler': 'Quero Ler',
        'lendo': 'Lendo',
        'lido': 'Lido',
        'relendo': 'Relendo',
        'abandonado': 'Abandonado'
    };
    
    return statusMap[status] || status || 'Não definido';
}

function adicionarEstilosDinamicos() {
    // Verificar se os estilos já foram adicionados
    if (document.getElementById('dynamic-styles')) return;

    const style = document.createElement('style');
    style.id = 'dynamic-styles';
    style.textContent = `
        .progress-bar-small {
            height: 6px;
            background: #e0e0e0;
            border-radius: 3px;
            overflow: hidden;
            margin: 0.5rem 0;
        }
        
        .progress-fill-small {
            height: 100%;
            background: #3498db;
            border-radius: 3px;
            transition: width 0.3s ease;
        }
        
        .status-quero-ler { color: #3498db; font-weight: 600; }
        .status-lendo { color: #f39c12; font-weight: 600; }
        .status-lido { color: #27ae60; font-weight: 600; }
        .status-relendo { color: #9b59b6; font-weight: 600; }
        .status-abandonado { color: #e74c3c; font-weight: 600; }
        .status-none { color: #95a5a6; font-style: italic; }
        
        .book-comment {
            font-style: italic;
            color: #7f8c8d;
            margin: 0.5rem 0;
            font-size: 0.9rem;
        }
        
        .rating-stars-display {
            color: #f1c40f;
            letter-spacing: 2px;
        }
    `;
    document.head.appendChild(style);
}

// =========================
// 12. FUNÇÕES GLOBAIS PARA DEBUG
// =========================
window.debugBiblioteca = {
    recarregar: carregarLivros,
    verCache: () => livrosCache,
    limparForm: resetForm,
    testarConexao: async () => {
        try {
            const res = await fetch(API_URL);
            return { status: res.status, ok: res.ok };
        } catch (error) {
            return { error: error.message };
        }
    }
};

// Data atual como padrão
document.getElementById('reading-date').valueAsDate = new Date();