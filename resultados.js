// ===================== VARIÁVEIS GLOBAIS =====================
let allBets = [];
let filteredBets = [];
let currentFilter = 'all';
let searchTerm = '';
let selectedBetForCashout = null;
let bookiesData = [];

// ===================== SISTEMA DE NOTIFICAÇÕES ELEGANTE =====================
function showNotification(title, message, type = 'info') {
    const container = document.getElementById('notification-container');
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    const iconMap = {
        success: 'check-circle',
        error: 'x-circle',
        warning: 'alert-triangle',
        info: 'info'
    };
    
    notification.innerHTML = `
        <div class="notification-content">
            <div class="notification-icon">
                <i data-lucide="${iconMap[type]}" class="w-5 h-5 text-${type === 'success' ? 'green' : type === 'error' ? 'red' : type === 'warning' ? 'yellow' : 'blue'}-400"></i>
            </div>
            <div class="notification-text">
                <div class="notification-title">${title}</div>
                <div class="notification-message">${message}</div>
            </div>
        </div>
        <button class="notification-close" onclick="this.parentElement.remove()">
            <i data-lucide="x" class="w-4 h-4 text-white/60"></i>
        </button>
    `;
    
    container.appendChild(notification);
    lucide.createIcons();
    
    // Animar entrada
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    // Auto remover após 5 segundos
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 5000);
}

// ===================== INICIALIZAÇÃO =====================
document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();
    setupResponsiveNavigation();
    setupFilters();
    setupSearch();
    setupSort();
    loadBookies();
    loadPendingBets();
    initializeSelects();
    setupNewBetForm();
    
    // Adicionar listeners para os inputs do modal
    document.getElementById('bet-amount')?.addEventListener('input', updatePotentialReturn);
    document.getElementById('bet-odd')?.addEventListener('input', updateOddIndicators);
});

// ===================== CARREGAMENTO DE DADOS =====================
async function loadBookies() {
    try {
        const { data, error } = await supabase
            .from('bookies')
            .select('*')
            .order('name');

        if (error) throw error;

        bookiesData = data || [];
        
        // Atualizar select de casas de apostas
        const houseSelect = document.getElementById('bet-house');
        // Limpar opções existentes exceto a primeira
        while (houseSelect.children.length > 1) {
            houseSelect.removeChild(houseSelect.lastChild);
        }
        
        // Adicionar casas de apostas
        bookiesData.forEach(bookie => {
            const option = document.createElement('option');
            option.value = bookie.name;
            option.textContent = `${bookie.name} (${formatCurrency(bookie.balance)})`;
            houseSelect.appendChild(option);
        });
        
    } catch (error) {
        console.error('Erro ao carregar casas de apostas:', error);
        showNotification('Erro', 'Erro ao carregar casas de apostas', 'error');
    }
}

async function loadPendingBets() {
    showLoading();
    try {
        const { data: bets, error } = await supabase
            .from('aposta')
            .select('*')
            .eq('resultado', 'Pendente')
            .order('data', { ascending: false });

        if (error) {
            console.error('Erro ao carregar apostas:', error);
            showNotification('Erro', 'Erro ao carregar apostas', 'error');
            return;
        }

        allBets = bets || [];
        applyFiltersAndRender();
        updateMetrics();
    } catch (error) {
        console.error('Erro ao carregar apostas:', error);
        showNotification('Erro', 'Erro ao carregar apostas', 'error');
    } finally {
        hideLoading();
    }
}

// ===================== MÉTRICAS =====================
function updateMetrics() {
    const totalPending = filteredBets.length;
    let totalStake = 0;
    let potentialWin = 0;

    filteredBets.forEach(bet => {
        const stake = parseFloat(bet.valor_apostado || 0);
        const odd = parseFloat(bet.odd || 0);
        const turbo = parseFloat(bet.turbo || 0);
        
        totalStake += stake;
        
        // Calcular retorno potencial
        const normalReturn = stake * odd;
        const normalProfit = normalReturn - stake;
        
        if (turbo > 0) {
            const turboBonus = normalProfit * (turbo / 100);
            potentialWin += normalReturn + turboBonus;
        } else {
            potentialWin += normalReturn;
        }
    });

    document.getElementById('total-pending').textContent = totalPending;
    document.getElementById('total-stake').textContent = formatCurrency(totalStake);
    document.getElementById('potential-win').textContent = formatCurrency(potentialWin);
}

function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
}

// ===================== FILTROS =====================
function setupFilters() {
    const filterButtons = document.querySelectorAll('.filter-button');
    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            filterButtons.forEach(b => b.classList.remove('active'));
            button.classList.add('active');
            currentFilter = button.dataset.filter;
            applyFiltersAndRender();
        });
    });
}

function setupSearch() {
    const searchInput = document.getElementById('search-input');
    searchInput.addEventListener('input', (e) => {
        searchTerm = e.target.value.toLowerCase();
        applyFiltersAndRender();
    });
}

function setupSort() {
    const sortSelect = document.getElementById('sort-select');
    sortSelect.addEventListener('change', () => {
        applyFiltersAndRender();
    });
}

function applyFiltersAndRender() {
    let bets = [...allBets];

    // Aplicar filtros
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    switch (currentFilter) {
        case 'today':
            bets = bets.filter(bet => {
                const betDate = new Date(bet.data);
                betDate.setHours(0, 0, 0, 0);
                return betDate.getTime() === today.getTime();
            });
            break;
        case 'week':
            const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
            bets = bets.filter(bet => new Date(bet.data) >= weekAgo);
            break;
        case 'month':
            const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
            bets = bets.filter(bet => new Date(bet.data) >= monthAgo);
            break;
        case 'bonus':
            bets = bets.filter(bet => bet.bonus);
            break;
        case 'turbo':
            bets = bets.filter(bet => Number(bet.turbo) > 0);
            break;
    }

    // Aplicar busca
    if (searchTerm) {
        bets = bets.filter(bet => {
            return (bet.partida && bet.partida.toLowerCase().includes(searchTerm)) ||
                   (bet.casa_de_apostas && bet.casa_de_apostas.toLowerCase().includes(searchTerm)) ||
                   (bet.categoria && bet.categoria.toLowerCase().includes(searchTerm)) ||
                   (bet.torneio && bet.torneio.toLowerCase().includes(searchTerm));
        });
    }

    // Aplicar ordenação
    const sortValue = document.getElementById('sort-select').value;
    switch (sortValue) {
        case 'date-desc':
            bets.sort((a, b) => new Date(b.data) - new Date(a.data));
            break;
        case 'date-asc':
            bets.sort((a, b) => new Date(a.data) - new Date(b.data));
            break;
        case 'value-desc':
            bets.sort((a, b) => parseFloat(b.valor_apostado) - parseFloat(a.valor_apostado));
            break;
        case 'value-asc':
            bets.sort((a, b) => parseFloat(a.valor_apostado) - parseFloat(b.valor_apostado));
            break;
        case 'odd-desc':
            bets.sort((a, b) => parseFloat(b.odd) - parseFloat(a.odd));
            break;
        case 'odd-asc':
            bets.sort((a, b) => parseFloat(a.odd) - parseFloat(b.odd));
            break;
    }

    filteredBets = bets;
    renderBets();
    updateMetrics();
}

function renderBets() {
    const container = document.getElementById('pending-bets');

    if (!filteredBets || filteredBets.length === 0) {
        container.innerHTML = `
            <div class="empty-state flex flex-col items-center justify-center rounded-3xl p-12">
                <div class="metric-icon p-4 rounded-2xl mb-4">
                    <i data-lucide="check-circle" class="w-16 h-16 text-slate-400"></i>
                </div>
                <h3 class="text-xl font-bold gradient-text mb-2">Nenhuma aposta pendente</h3>
                <p class="text-slate-400 text-center mb-6">
                    ${currentFilter !== 'all' ? 'Nenhuma aposta encontrada com os filtros aplicados' : 'Todas as suas apostas já foram atualizadas'}
                </p>
                ${currentFilter !== 'all' ? `
                    <button onclick="clearFilters()" class="action-button px-6 py-3 rounded-xl text-white font-medium flex items-center space-x-2">
                        <i data-lucide="x" class="w-5 h-5"></i>
                        <span>Limpar Filtros</span>
                    </button>
                ` : ''}
            </div>
        `;
        lucide.createIcons();
        return;
    }

    container.innerHTML = filteredBets.map(bet => {
        const stake = parseFloat(bet.valor_apostado || 0);
        const odd = parseFloat(bet.odd || 0);
        const turbo = parseFloat(bet.turbo || 0);
        
        // Calcular lucro potencial
        const normalProfit = (stake * odd) - stake;
        const turboBonus = turbo > 0 ? normalProfit * (turbo / 100) : 0;
        const totalProfit = normalProfit + turboBonus;
        const totalReturn = stake + totalProfit;

        return `
            <div class="bet-card rounded-2xl md:rounded-3xl p-6 md:p-8">
                <!-- Header da Aposta -->
                <div class="flex justify-between items-start mb-6">
                    <div class="flex-1">
                        <h3 class="text-xl font-bold text-white mb-2">${bet.partida || 'Partida não informada'}</h3>
                        <div class="flex items-center space-x-4 text-sm">
                            <span class="status-simples px-3 py-1 rounded-full font-medium">
                                ${bet.tipo_aposta || 'N/A'}
                            </span>
                            <span class="bg-slate-600/30 text-slate-300 px-3 py-1 rounded-full">
                                ${new Date(bet.data).toLocaleDateString('pt-BR')}
                            </span>
                            ${turbo > 0 ? `<span class="status-turbo px-3 py-1 rounded-full font-medium">TURBO ${turbo}%</span>` : ''}
                        </div>
                    </div>
                    <div class="bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2 rounded-full text-sm font-medium text-white shadow-lg">
                        ${bet.casa_de_apostas || 'N/A'}
                    </div>
                </div>
                
                <!-- Informações Principais -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div class="value-display rounded-xl p-4">
                        <div class="flex items-center space-x-2 mb-2">
                            <i data-lucide="dollar-sign" class="w-4 h-4 text-emerald-400"></i>
                            <span class="text-slate-400 text-sm">Valor Apostado</span>
                            ${bet.bonus ? `<span class="bg-gradient-to-r from-blue-600 to-cyan-600 text-white text-xs px-2 py-1 rounded-full font-bold">BÔNUS</span>` : ''}
                        </div>
                        <p class="text-white font-bold text-lg">${formatCurrency(stake)}</p>
                        ${bet.bonus ? `<p class="text-cyan-400 text-xs mt-1">Não descontado da casa</p>` : ''}
                    </div>
                    
                    <div class="value-display rounded-xl p-4">
                        <div class="flex items-center space-x-2 mb-2">
                            <i data-lucide="trending-up" class="w-4 h-4 text-blue-400"></i>
                            <span class="text-slate-400 text-sm">Odd</span>
                        </div>
                        <p class="text-white font-bold text-lg">${odd.toFixed(2)}</p>
                        ${turbo > 0 ? `<p class="text-purple-400 text-xs mt-1">+${turbo}% de bônus</p>` : ''}
                    </div>
                    
                    <div class="value-display rounded-xl p-4">
                        <div class="flex items-center space-x-2 mb-2">
                            <i data-lucide="gift" class="w-4 h-4 text-purple-400"></i>
                            <span class="text-slate-400 text-sm">Retorno Potencial</span>
                        </div>
                        <p class="text-white font-bold text-lg">${formatCurrency(totalReturn)}</p>
                        <p class="text-green-400 text-xs mt-1">Lucro: ${formatCurrency(totalProfit)}</p>
                    </div>
                </div>

                <!-- Detalhes Expansíveis -->
                <div class="mb-6">
                    <button onclick="toggleBetDetails(${bet.id})" 
                            class="flex items-center justify-between w-full p-4 value-display rounded-xl hover:bg-slate-700/50 transition-all duration-200 group">
                        <div class="flex items-center space-x-3">
                            <i data-lucide="file-text" class="w-5 h-5 text-slate-400 group-hover:text-indigo-400 transition-colors"></i>
                            <span class="text-slate-300 font-medium">Detalhes da Aposta</span>
                        </div>
                        <i data-lucide="chevron-down" class="w-5 h-5 text-slate-400 group-hover:text-indigo-400 transition-all duration-200" id="chevron-${bet.id}"></i>
                    </button>
                    
                    <div id="details-${bet.id}" class="hidden mt-4 p-4 bg-slate-800/30 rounded-xl border-l-4 border-indigo-500">
                        <div class="space-y-3">
                            <div>
                                <span class="text-slate-400 text-sm">Descrição:</span>
                                <p class="text-white mt-1">${bet.detalhes || 'Nenhuma descrição fornecida'}</p>
                            </div>
                            <div class="grid grid-cols-2 gap-4">
                                <div>
                                    <span class="text-slate-400 text-sm">Torneio:</span>
                                    <p class="text-white mt-1">${bet.torneio || 'N/A'}</p>
                                </div>
                                <div>
                                    <span class="text-slate-400 text-sm">Categoria:</span>
                                    <p class="text-white mt-1">${bet.categoria || 'N/A'}</p>
                                </div>
                            </div>
                            ${turbo > 0 ? `
                            <div class="bg-gradient-to-r from-purple-900/20 to-pink-900/20 p-3 rounded-lg border border-purple-500/30">
                                <div class="flex items-center space-x-2 mb-2">
                                    <i data-lucide="zap" class="w-4 h-4 text-purple-400"></i>
                                    <span class="text-purple-300 font-medium">Cálculo Turbo</span>
                                </div>
                                <p class="text-purple-200 text-sm">
                                    Lucro normal: ${formatCurrency(normalProfit)}<br>
                                    Bônus turbo (+${turbo}%): ${formatCurrency(turboBonus)}<br>
                                    <strong>Lucro total: ${formatCurrency(totalProfit)}</strong>
                                </p>
                            </div>
                            ` : ''}
                        </div>
                    </div>
                </div>

                <!-- Botões de Ação -->
                <div class="grid grid-cols-2 gap-4">
                    <button onclick="updateBetStatus(${bet.id}, 'Ganhou')" 
                            class="action-button-green group flex items-center justify-center space-x-3 px-6 py-3 rounded-xl transition-all duration-300 transform hover:scale-105">
                        <i data-lucide="check-circle" class="w-5 h-5 group-hover:scale-110 transition-transform"></i>
                        <span class="font-semibold">Ganhou</span>
                    </button>
                    
                    <button onclick="updateBetStatus(${bet.id}, 'Perdeu')"
                            class="action-button-red group flex items-center justify-center space-x-3 px-6 py-3 rounded-xl transition-all duration-300 transform hover:scale-105">
                        <i data-lucide="x-circle" class="w-5 h-5 group-hover:scale-110 transition-transform"></i>
                        <span class="font-semibold">Perdeu</span>
                    </button>
                </div>
                
                <div class="grid grid-cols-2 gap-4 mt-4">
                    <button onclick="openCashoutModal(${bet.id})"
                            class="action-button-cyan group flex items-center justify-center space-x-3 px-6 py-3 rounded-xl transition-all duration-300 transform hover:scale-105">
                        <i data-lucide="receipt" class="w-5 h-5 group-hover:scale-110 transition-transform"></i>
                        <span class="font-semibold">Cashout</span>
                    </button>
                    
                    <button onclick="cancelBet(${bet.id})"
                            class="action-button-gray group flex items-center justify-center space-x-3 px-6 py-3 rounded-xl transition-all duration-300 transform hover:scale-105">
                        <i data-lucide="ban" class="w-5 h-5 group-hover:scale-110 transition-transform"></i>
                        <span class="font-semibold">Cancelar</span>
                    </button>
                </div>
            </div>
        `;
    }).join('');

    lucide.createIcons();
}

function clearFilters() {
    currentFilter = 'all';
    searchTerm = '';
    document.getElementById('search-input').value = '';
    document.querySelectorAll('.filter-button').forEach(b => b.classList.remove('active'));
    document.querySelector('[data-filter="all"]').classList.add('active');
    applyFiltersAndRender();
}

// ===================== FUNÇÕES DE GERENCIAMENTO DE SALDO =====================
async function processBetResult(betId, resultado) {
    try {
        const bet = allBets.find(b => b.id === betId);
        if (!bet) throw new Error('Aposta não encontrada');

        const bookie = bookiesData.find(b => b.name === bet.casa_de_apostas);
        if (!bookie) throw new Error('Casa de apostas não encontrada');

        const stake = parseFloat(bet.valor_apostado);
        const baseOdd = parseFloat(bet.odd);
        const turbo = parseFloat(bet.turbo || 0);
        const isBonus = bet.bonus;
        
        let valorFinal = 0;
        let novoSaldo = bookie.balance;
        let message = '';

        if (resultado === 'Ganhou') {
            // Calcular retorno com turbo
            const retornoBase = stake * baseOdd;
            const lucroBase = retornoBase - stake;
            
            // Aplicar turbo sobre o lucro
            const lucroComTurbo = turbo > 0 ? lucroBase * (1 + turbo/100) : lucroBase;
            const retornoTotal = stake + lucroComTurbo;

            if (isBonus) {
                // Para bônus: adiciona apenas o lucro
                valorFinal = lucroComTurbo;
                novoSaldo += lucroComTurbo;
                message = `Aposta bônus ganha! ${formatCurrency(lucroComTurbo)} adicionado à ${bookie.name}`;
            } else {
                // Para aposta normal: adiciona o retorno total
                valorFinal = lucroComTurbo;
                novoSaldo += retornoTotal;
                message = `Aposta ganha! ${formatCurrency(retornoTotal)} adicionado à ${bookie.name}`;
            }

            // Atualizar saldo da casa
            const { error: updateError } = await supabase
                .from('bookies')
                .update({ 
                    balance: novoSaldo,
                    last_update: new Date().toISOString()
                })
                .eq('id', bookie.id);

            if (updateError) throw updateError;

            bookie.balance = novoSaldo;
            showNotification('Vitória!', message, 'success');
            
        } else if (resultado === 'Perdeu') {
            if (isBonus) {
                valorFinal = 0;
                showNotification('Aposta Perdida', 'Aposta bônus perdida. Nenhum valor foi movimentado.', 'warning');
            } else {
                valorFinal = -stake;
                showNotification('Aposta Perdida', 'O valor permanece descontado da casa de apostas.', 'warning');
            }
        } else if (resultado === 'Cancelado') {
            // Devolver stake se não era bônus
            if (!isBonus) {
                novoSaldo += stake;
                
                const { error: updateError } = await supabase
                    .from('bookies')
                    .update({ 
                        balance: novoSaldo,
                        last_update: new Date().toISOString()
                    })
                    .eq('id', bookie.id);

                if (updateError) throw updateError;

                bookie.balance = novoSaldo;
                showNotification('Aposta Cancelada', `${formatCurrency(stake)} devolvido à ${bookie.name}`, 'info');
            } else {
                showNotification('Aposta Cancelada', 'Aposta bônus cancelada. Nenhum valor foi movimentado.', 'info');
            }
            valorFinal = 0;
        }

        // Atualizar resultado da aposta no banco
        const { error } = await supabase
            .from('aposta')
            .update({ 
                resultado: resultado,
                valor_final: valorFinal
            })
            .eq('id', betId);

        if (error) throw error;

        await loadPendingBets();
        
    } catch (error) {
        showNotification('Erro', error.message, 'error');
        console.error('Erro ao processar resultado:', error);
    }
}

// ===================== AÇÕES DAS APOSTAS =====================
async function updateBetStatus(betId, status) {
    await processBetResult(betId, status);
}

async function cancelBet(betId) {
    if (!confirm('Tem certeza que deseja cancelar esta aposta?')) return;
    await processBetResult(betId, 'Cancelado');
}

async function openCashoutModal(betId) {
    selectedBetForCashout = betId;
    
    try {
        const bet = allBets.find(b => b.id === betId);
        if (!bet) throw new Error('Aposta não encontrada');
        
        const stake = parseFloat(bet.valor_apostado || 0);
        const odd = parseFloat(bet.odd || 0);
        const turbo = parseFloat(bet.turbo || 0);
        
        // Calcular lucro potencial
        const normalProfit = (stake * odd) - stake;
        const turboBonus = turbo > 0 ? normalProfit * (turbo / 100) : 0;
        const totalReturn = stake + normalProfit + turboBonus;
        
        const betInfoDiv = document.getElementById('cashout-bet-info');
        betInfoDiv.innerHTML = `
            <div class="space-y-2">
                <div class="flex justify-between">
                    <span class="text-slate-400">Partida:</span>
                    <span class="text-white font-medium">${bet.partida || 'N/A'}</span>
                </div>
                <div class="flex justify-between">
                    <span class="text-slate-400">Valor Apostado:</span>
                    <span class="text-white font-medium">${formatCurrency(stake)}</span>
                </div>
                <div class="flex justify-between">
                    <span class="text-slate-400">Odd:</span>
                    <span class="text-white font-medium">${odd.toFixed(2)}</span>
                </div>
                <div class="flex justify-between">
                    <span class="text-slate-400">Retorno Potencial:</span>
                    <span class="text-emerald-400 font-medium">${formatCurrency(totalReturn)}</span>
                </div>
                ${bet.bonus ? `
                <div class="flex justify-between">
                    <span class="text-slate-400">Tipo:</span>
                    <span class="text-cyan-400 font-medium">Aposta Bônus</span>
                </div>
                ` : ''}
            </div>
        `;
    } catch (error) {
        console.error('Erro ao carregar informações da aposta:', error);
        document.getElementById('cashout-bet-info').innerHTML = '<p class="text-red-400">Erro ao carregar informações</p>';
    }
    
    document.getElementById('cashout-modal').classList.remove('hidden');
}

function closeCashoutModal() {
    selectedBetForCashout = null;
    document.getElementById('cashout-modal').classList.add('hidden');
    document.getElementById('cashout-value').value = '';
}

async function confirmCashout() {
    if (!selectedBetForCashout) return;

    const cashoutValue = parseFloat(document.getElementById('cashout-value').value);
    if (isNaN(cashoutValue) || cashoutValue <= 0) {
        showNotification('Erro', 'Digite um valor válido para o cashout', 'error');
        return;
    }

    try {
        showLoading();
        
        const bet = allBets.find(b => b.id === selectedBetForCashout);
        if (!bet) throw new Error('Aposta não encontrada');

        const bookie = bookiesData.find(b => b.name === bet.casa_de_apostas);
        if (!bookie) throw new Error('Casa de apostas não encontrada');

        // Atualizar status e valor do cashout
        const { error: betError } = await supabase
            .from('aposta')
            .update({ 
                resultado: 'Cashout',
                cashout_value: cashoutValue,
                valor_final: cashoutValue - parseFloat(bet.valor_apostado)
            })
            .eq('id', selectedBetForCashout);

        if (betError) throw betError;

        // Adicionar valor do cashout à casa de apostas
        const novoSaldo = bookie.balance + cashoutValue;
        
        const { error: bookieError } = await supabase
            .from('bookies')
            .update({ 
                balance: novoSaldo,
                last_update: new Date().toISOString()
            })
            .eq('id', bookie.id);
            
        if (bookieError) throw bookieError;

        bookie.balance = novoSaldo;
        
        showNotification(
            'Cashout Realizado',
            `${formatCurrency(cashoutValue)} foi adicionado à ${bet.casa_de_apostas}`,
            'success'
        );

        closeCashoutModal();
        await loadPendingBets();
    } catch (error) {
        showNotification('Erro', 'Erro ao realizar cashout', 'error');
        console.error('Erro no cashout:', error);
    } finally {
        hideLoading();
    }
}

// ===================== FUNÇÕES DO MODAL NOVA APOSTA =====================

// Função para inicializar selects
function initializeSelects() {
    // Destruir selects existentes antes de recriar
    ['bet-house', 'bet-type', 'bet-categories', 'bet-tournaments'].forEach(id => {
        const element = document.getElementById(id);
        if (element && element.tomselect) {
            element.tomselect.destroy();
            element.tomselect = null;
        }
    });

    // Aguardar um pouco para garantir que os elementos estejam disponíveis
    setTimeout(() => {
        // Select de casas de apostas
        const houseEl = document.getElementById('bet-house');
        if (houseEl) {
            new TomSelect('#bet-house', {
                create: false,
                sortField: {field: 'text', direction: 'asc'},
                placeholder: 'Selecione uma casa...',
                onChange: function(value) {
                    updateAvailableBalance();
                }
            });
        }

        const typeEl = document.getElementById('bet-type');
        if (typeEl) {
            new TomSelect('#bet-type', {
                create: false,
                sortField: {field: 'text', direction: 'asc'},
                placeholder: 'Selecione o tipo...'
            });
        }

        const catEl = document.getElementById('bet-categories');
        if (catEl) {
            new TomSelect('#bet-categories', {
                plugins: ['remove_button'],
                persist: false,
                createOnBlur: false,
                create: false,
                maxItems: null,
                placeholder: 'Selecione as categorias...'
            });
        }

        const tournEl = document.getElementById('bet-tournaments');
        if (tournEl) {
            new TomSelect('#bet-tournaments', {
                plugins: ['remove_button'],
                persist: false,
                createOnBlur: false,
                create: false,
                maxItems: null,
                placeholder: 'Selecione os torneios...'
            });
        }
    }, 50);
}

function openNewBetModal() {
    document.getElementById('new-bet-modal').classList.remove('hidden');
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('bet-date').value = today;
    
    // Resetar formulário
    document.getElementById('newBetForm').reset();
    document.getElementById('bet-date').value = today;
    
    // Resetar radio buttons
    const turbo0 = document.querySelector('input[name="turbo"][value="0"]');
    const bonus0 = document.querySelector('input[name="bonus"][value="0"]');
    if (turbo0) turbo0.checked = true;
    if (bonus0) bonus0.checked = true;
    
    // Resetar elementos visuais
    document.getElementById('potential-return-preview').classList.add('hidden');
    document.getElementById('bet-summary').classList.add('hidden');
    document.getElementById('bonus-info').classList.add('hidden');
    document.getElementById('turbo-info').classList.add('hidden');
    document.getElementById('house-balance-info').classList.add('hidden');
    document.getElementById('odd-quality').classList.add('hidden');
    document.getElementById('implied-probability').classList.add('hidden');
    
    // Reinicializar selects
    setTimeout(() => {
        initializeSelects();
    }, 200);
}

function closeNewBetModal() {
    document.getElementById('new-bet-modal').classList.add('hidden');
    
    // Destruir selects TomSelect antes de resetar
    ['bet-house', 'bet-type', 'bet-categories', 'bet-tournaments'].forEach(id => {
        const element = document.getElementById(id);
        if (element && element.tomselect) {
            element.tomselect.destroy();
            element.tomselect = null;
        }
    });
}

// Funções do modal
function setQuickAmount(amount) {
    const input = document.getElementById('bet-amount');
    input.value = amount;
    input.dispatchEvent(new Event('input'));
    
    // Feedback visual
    const buttons = document.querySelectorAll('.quick-amount-btn');
    buttons.forEach(btn => {
        if (btn.textContent.includes(amount)) {
            btn.classList.add('bg-green-600/30', 'border-green-500/50');
            setTimeout(() => {
                btn.classList.remove('bg-green-600/30', 'border-green-500/50');
            }, 500);
        }
    });
}

function updatePotentialReturn() {
    const stake = parseFloat(document.getElementById('bet-amount').value) || 0;
    const odd = parseFloat(document.getElementById('bet-odd').value) || 0;
    const turbo = parseInt(document.querySelector('input[name="turbo"]:checked')?.value) || 0;
    const isBonus = document.querySelector('input[name="bonus"]:checked')?.value === '1';
    
    if (stake > 0 && odd > 0) {
        const normalReturn = stake * odd;
        const normalProfit = normalReturn - stake;
        
        let finalReturn = normalReturn;
        let turboBonus = 0;
        
        if (turbo > 0) {
            turboBonus = normalProfit * (turbo / 100);
            finalReturn = normalReturn + turboBonus;
        }
        
        // Atualizar preview
        const preview = document.getElementById('potential-return-preview');
        preview.classList.remove('hidden');
        
        document.getElementById('preview-return').textContent = formatCurrency(isBonus ? normalProfit + turboBonus : finalReturn);
        document.getElementById('profit-amount').textContent = formatCurrency(normalProfit + turboBonus);
        
        // Mostrar percentual de lucro
        const profitPercent = ((normalProfit + turboBonus) / stake * 100).toFixed(1);
        document.getElementById('profit-percent').textContent = `+${profitPercent}%`;
        document.getElementById('profit-percentage').classList.remove('hidden');
        
        // Turbo preview
        if (turbo > 0) {
            document.getElementById('turbo-preview').classList.remove('hidden');
            document.getElementById('turbo-bonus-amount').textContent = `+${formatCurrency(turboBonus)}`;
        } else {
            document.getElementById('turbo-preview').classList.add('hidden');
        }
        
        // Atualizar resumo
        updateSummary(stake, odd, finalReturn, normalProfit + turboBonus);
    } else {
        document.getElementById('potential-return-preview').classList.add('hidden');
        document.getElementById('bet-summary').classList.add('hidden');
    }
    
    // Verificar saldo
    checkBalance();
}

function updateOddIndicators() {
    const odd = parseFloat(document.getElementById('bet-odd').value) || 0;
    
    if (odd > 0) {
        // Calcular probabilidade implícita
        const probability = (1 / odd * 100).toFixed(1);
        document.getElementById('prob-value').textContent = `${probability}%`;
        document.getElementById('implied-probability').classList.remove('hidden');
        
        // Atualizar indicador de qualidade
        const quality = document.getElementById('odd-quality');
        quality.classList.remove('hidden');
        
        let rating, color, width;
        if (odd < 1.5) {
            rating = 'Baixa';
            color = 'from-red-500 to-orange-500';
            width = '25%';
        } else if (odd < 2.0) {
            rating = 'Moderada';
            color = 'from-yellow-500 to-amber-500';
            width = '50%';
        } else if (odd < 3.0) {
            rating = 'Boa';
            color = 'from-green-500 to-emerald-500';
            width = '75%';
        } else {
            rating = 'Alta';
            color = 'from-blue-500 to-purple-500';
            width = '100%';
        }
        
        const ratingEl = document.getElementById('odd-rating');
        const barEl = document.getElementById('odd-bar');
        
        ratingEl.textContent = rating;
        ratingEl.className = `font-semibold px-2 py-1 rounded-full bg-gradient-to-r ${color} text-white text-xs`;
        barEl.className = `h-2 rounded-full transition-all duration-500 bg-gradient-to-r ${color}`;
        barEl.style.width = width;
    } else {
        document.getElementById('implied-probability').classList.add('hidden');
        document.getElementById('odd-quality').classList.add('hidden');
    }
    
    updatePotentialReturn();
}

function updateAvailableBalance() {
    const house = document.getElementById('bet-house').value;
    const infoDiv = document.getElementById('house-balance-info');
    
    if (house) {
        const bookie = bookiesData.find(b => b.name === house);
        if (bookie) {
            infoDiv.classList.remove('hidden');
            document.getElementById('available-balance').textContent = formatCurrency(bookie.balance);
        }
        checkBalance();
    } else {
        infoDiv.classList.add('hidden');
    }
}

function checkBalance() {
    const stake = parseFloat(document.getElementById('bet-amount').value) || 0;
    const house = document.getElementById('bet-house').value;
    const isBonus = document.querySelector('input[name="bonus"]:checked')?.value === '1';
    
    if (house && stake > 0 && !isBonus) {
        const bookie = bookiesData.find(b => b.name === house);
        if (bookie) {
            const warning = document.getElementById('balance-warning');
            const submitBtn = document.getElementById('submit-bet-btn');
            
            if (stake > bookie.balance) {
                warning.classList.remove('hidden');
                submitBtn.disabled = true;
            } else {
                warning.classList.add('hidden');
                submitBtn.disabled = false;
            }
            
            // Atualizar percentual da banca
            const percent = ((stake / bookie.balance) * 100).toFixed(1);
            document.getElementById('stake-percent-value').textContent = `${percent}%`;
            document.getElementById('stake-percentage').classList.remove('hidden');
        }
    }
}

function updateBonusInfo() {
    const isBonus = document.querySelector('input[name="bonus"]:checked')?.value === '1';
    const infoDiv = document.getElementById('bonus-info');
    
    if (isBonus) {
        infoDiv.classList.remove('hidden');
    } else {
        infoDiv.classList.add('hidden');
    }
    
    updatePotentialReturn();
}

function updateTurboBonus() {
    const turbo = parseInt(document.querySelector('input[name="turbo"]:checked')?.value) || 0;
    const infoDiv = document.getElementById('turbo-info');
    
    if (turbo > 0) {
        infoDiv.classList.remove('hidden');
        document.getElementById('turbo-percent').textContent = `${turbo}%`;
    } else {
        infoDiv.classList.add('hidden');
    }
    
    updatePotentialReturn();
}

function updateSummary(stake, odd, returnValue, profit) {
    const summary = document.getElementById('bet-summary');
    
    if (stake > 0 && odd > 0) {
        summary.classList.remove('hidden');
        document.getElementById('summary-stake').textContent = formatCurrency(stake);
        document.getElementById('summary-odd').textContent = odd.toFixed(2);
        document.getElementById('summary-return').textContent = formatCurrency(returnValue);
        document.getElementById('summary-profit').textContent = formatCurrency(profit);
        
        // Adicionar avisos se necessário
        const warningsDiv = document.getElementById('summary-warnings');
        warningsDiv.innerHTML = '';
        
        if (odd > 10) {
            warningsDiv.innerHTML += `
                <div class="p-2 bg-yellow-500/20 rounded-lg flex items-center text-xs text-yellow-300">
                    <i data-lucide="alert-triangle" class="w-3 h-3 mr-2"></i>
                    Odd muito alta - verifique se está correta
                </div>
            `;
            warningsDiv.classList.remove('hidden');
        }
        
        if (stake > 1000) {
            warningsDiv.innerHTML += `
                <div class="p-2 bg-orange-500/20 rounded-lg flex items-center text-xs text-orange-300">
                    <i data-lucide="alert-circle" class="w-3 h-3 mr-2"></i>
                    Valor alto - certifique-se da aposta
                </div>
            `;
            warningsDiv.classList.remove('hidden');
        }
        
        // Reinicializar ícones Lucide
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    } else {
        summary.classList.add('hidden');
    }
}

function autoResize(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
}

function updateOddsCalculation() {
    // Função placeholder para quando tipos múltiplos são selecionados
    updatePotentialReturn();
}

// Configurar formulário
function setupNewBetForm() {
    const form = document.getElementById('newBetForm');
    if (!form) return;

    form.addEventListener('submit', async function(e) {
        e.preventDefault();

        // Mostrar spinner de loading
        const submitBtn = document.getElementById('submit-bet-btn');
        const spinner = document.getElementById('saving-spinner');
        submitBtn.disabled = true;
        spinner.classList.remove('hidden');

        try {
            // Obter valores dos campos
            const categoriesEl = document.getElementById('bet-categories');
            const tournamentsEl = document.getElementById('bet-tournaments');
            const amountEl = document.getElementById('bet-amount');
            const oddEl = document.getElementById('bet-odd');
            const casaEl = document.getElementById('bet-house');
            const matchEl = document.getElementById('bet-match');
            const detailsEl = document.getElementById('bet-details');
            const typeEl = document.getElementById('bet-type');
            const dateEl = document.getElementById('bet-date');
            const timeEl = document.getElementById('bet-time');

            const categories = categoriesEl.tomselect ? 
                categoriesEl.tomselect.getValue() : 
                Array.from(categoriesEl.selectedOptions).map(o => o.value);
            
            const tournaments = tournamentsEl.tomselect ? 
                tournamentsEl.tomselect.getValue() : 
                Array.from(tournamentsEl.selectedOptions).map(o => o.value);

            const amount = parseFloat(amountEl.value);
            const odd = parseFloat(oddEl.value);
            const turbo = parseInt(document.querySelector('input[name="turbo"]:checked')?.value) || 0;
            const bonus = document.querySelector('input[name="bonus"]:checked')?.value === '1';
            
            const casa = casaEl.tomselect ? casaEl.tomselect.getValue() : casaEl.value;
            const match = matchEl.value || '';
            const details = detailsEl.value || '';
            const type = typeEl.tomselect ? typeEl.tomselect.getValue() : typeEl.value;
            const date = dateEl.value;
            const time = timeEl.value || '00:00';

            // Validações
            if (!casa) throw new Error('Selecione uma casa de apostas');
            if (!amount || amount <= 0) throw new Error('Digite um valor válido para a aposta');
            if (!odd || odd < 1) throw new Error('Digite uma odd válida (mínimo 1.0)');
            if (!date) throw new Error('Selecione uma data para a aposta');
            if (!match.trim()) throw new Error('Digite o nome da partida');

            // Preparar payload
            const dateTimeString = `${date}T${time}:00`;
            
            const payload = {
                data: dateTimeString,
                casa_de_apostas: casa,
                tipo_aposta: type || 'Simples',
                categoria: Array.isArray(categories) ? categories.join(', ') : (categories || 'Outros'),
                resultado: 'Pendente',
                valor_apostado: amount,
                odd: odd,
                valor_final: 0,
                partida: match.trim(),
                detalhes: details.trim() || match.trim(),
                bonus: bonus ? 1 : 0,
                turbo: turbo,
                torneio: Array.isArray(tournaments) ? tournaments.join(', ') : (tournaments || 'Outros')
            };

            // Processar aposta
            await processBetCreation(payload);
            
            closeNewBetModal();
            await loadPendingBets();
            await loadBookies();
            form.reset();
            
        } catch (error) {
            console.error('Erro ao criar aposta:', error);
            showNotification('Erro', error.message || 'Erro desconhecido', 'error');
        } finally {
            submitBtn.disabled = false;
            spinner.classList.add('hidden');
        }
    });
}

async function processBetCreation(betData) {
    try {
        console.log('Criando aposta:', betData);
        
        // Encontrar a casa de apostas
        const bookie = bookiesData.find(b => b.name === betData.casa_de_apostas);
        if (!bookie) throw new Error('Casa de apostas não encontrada');

        const stake = parseFloat(betData.valor_apostado);
        const isBonus = betData.bonus === 1;

        // Se NÃO for bônus, verificar saldo e descontar valor
        if (!isBonus) {
            if (bookie.balance < stake) {
                throw new Error(`Saldo insuficiente na ${bookie.name}`);
            }

            const newBalance = bookie.balance - stake;
            
            // Atualizar saldo da casa no banco
            const { error: updateError } = await supabase
                .from('bookies')
                .update({ 
                    balance: newBalance,
                    last_update: new Date().toISOString()
                })
                .eq('id', bookie.id);

            if (updateError) throw updateError;

            bookie.balance = newBalance;
        }

        // Salvar aposta
        const { data, error } = await supabase
            .from('aposta')
            .insert([betData])
            .select();

        if (error) {
            // Se houve erro ao salvar aposta, reverter o saldo
            if (!isBonus) {
                await supabase
                    .from('bookies')
                    .update({ 
                        balance: bookie.balance + stake,
                        last_update: new Date().toISOString()
                    })
                    .eq('id', bookie.id);
                bookie.balance += stake;
            }
            throw error;
        }

        const message = isBonus 
            ? `Aposta criada com bônus! Valor não descontado` 
            : `Aposta criada! ${formatCurrency(stake)} descontado da ${bookie.name}`;
        
        showNotification('Sucesso', message, 'success');
        
        return data[0];
        
    } catch (error) {
        console.error('Erro ao criar aposta:', error);
        throw error;
    }
}

// ===================== FUNÇÕES AUXILIARES =====================
function toggleBetDetails(betId) {
    const detailsDiv = document.getElementById(`details-${betId}`);
    const chevronIcon = document.getElementById(`chevron-${betId}`);
    
    if (detailsDiv.classList.contains('hidden')) {
        detailsDiv.classList.remove('hidden');
        chevronIcon.style.transform = 'rotate(180deg)';
    } else {
        detailsDiv.classList.add('hidden');
        chevronIcon.style.transform = 'rotate(0deg)';
    }
}

function showLoading() {
    const loader = document.getElementById('loading-indicator');
    if (loader) loader.classList.remove('hidden');
}

function hideLoading() {
    const loader = document.getElementById('loading-indicator');
    if (loader) loader.classList.add('hidden');
}

// Sistema de navegação responsiva
function setupResponsiveNavigation() {
    const menuToggle = document.getElementById('menu-toggle');
    const closeSidebar = document.getElementById('close-sidebar');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');

    function openSidebar() {
        sidebar.classList.remove('sidebar-hidden');
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeSidebarFunc() {
        sidebar.classList.add('sidebar-hidden');
        overlay.classList.remove('active');
        document.body.style.overflow = '';
    }

    if (menuToggle) {
        menuToggle.addEventListener('click', openSidebar);
    }

    if (closeSidebar) {
        closeSidebar.addEventListener('click', closeSidebarFunc);
    }

    if (overlay) {
        overlay.addEventListener('click', closeSidebarFunc);
    }

    window.addEventListener('resize', function() {
        if (window.innerWidth >= 768) {
            sidebar.classList.remove('sidebar-hidden');
            overlay.classList.remove('active');
            document.body.style.overflow = '';
        } else {
            sidebar.classList.add('sidebar-hidden');
        }
    });

    if (window.innerWidth < 768) {
        sidebar.classList.add('sidebar-hidden');
    }
}