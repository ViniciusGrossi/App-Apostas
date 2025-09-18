// Configuração do Supabase
const SUPABASE_URL = 'https://cjlvcjfuntfbdrrkigwh.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNqbHZjamZ1bnRmYmRycmtpZ3doIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAyMzYyMDIsImV4cCI6MjA1NTgxMjIwMn0.FBSsXa2vVmrv78_XeLWZcpMKMUIeRe0mS9hBO7Cn45Y';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Dados globais
let betsData = [];
let bookiesData = [];
let currentBetId = null;

let filterOptions = [
    { id: 'todas', label: 'Todas', count: 0 },
    { id: 'pendentes', label: 'Pendentes', count: 0 },
    { id: 'ganhas', label: 'Ganhas', count: 0 },
    { id: 'perdidas', label: 'Perdidas', count: 0 },
    { id: 'canceladas', label: 'Canceladas', count: 0 }
];

// Estado da aplicação
let currentFilter = 'todas';
let searchTerm = '';

// ==================== SISTEMA DE NOTIFICAÇÕES ====================
function showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = `notification ${type}`;
    notification.classList.add('show');
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 4000);
}

// ==================== FUNÇÕES AUXILIARES ====================
function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
}

// Calcular retorno potencial com turbo aplicado corretamente
function calculatePotentialReturn(stake, baseOdd, turboPercent, isBonus) {
    const normalReturn = stake * baseOdd;
    const normalProfit = normalReturn - stake;
    
    let finalReturn = normalReturn;
    
    // Aplicar turbo sobre o lucro
    if (turboPercent > 0) {
        const turboBonus = normalProfit * (turboPercent / 100);
        finalReturn = normalReturn + turboBonus;
    }
    
    if (isBonus) {
        // Para bônus, retorna apenas o lucro final
        return finalReturn - stake;
    } else {
        // Para apostas normais, retorna o valor total
        return finalReturn;
    }
}

// ==================== FUNÇÕES DO MODAL APRIMORADO ====================
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

// ==================== LÓGICA DE INTEGRAÇÃO COM BANCA ====================

async function processBetCreation(betData) {
    try {
        console.log('Iniciando criação de aposta:', betData);
        
        // Encontrar a casa de apostas
        const bookie = bookiesData.find(b => b.name === betData.casa_de_apostas);
        if (!bookie) {
            throw new Error('Casa de apostas não encontrada');
        }

        const stake = parseFloat(betData.valor_apostado);
        const isBonus = betData.bonus === 1;

        console.log('Casa:', bookie.name, 'Saldo atual:', bookie.balance, 'Stake:', stake, 'É bônus:', isBonus);

        // Se NÃO for bônus, verificar saldo e descontar valor da casa
        if (!isBonus) {
            if (bookie.balance < stake) {
                throw new Error(`Saldo insuficiente na ${bookie.name}. Saldo disponível: ${formatCurrency(bookie.balance)}`);
            }

            // Calcular novo saldo
            const newBalance = bookie.balance - stake;
            
            console.log('Descontando valor. Novo saldo será:', newBalance);

            // Atualizar saldo da casa no banco PRIMEIRO
            const { data: updateData, error: updateError } = await supabaseClient
                .from('bookies')
                .update({ 
                    balance: newBalance,
                    last_update: new Date().toISOString()
                })
                .eq('id', bookie.id)
                .select();

            if (updateError) {
                console.error('Erro ao atualizar bookie:', updateError);
                throw new Error(`Erro ao atualizar saldo da casa: ${updateError.message}`);
            }

            console.log('Saldo atualizado no banco:', updateData);

            // Atualizar localmente APÓS sucesso no banco
            bookie.balance = newBalance;
            
            // Atualizar o display do select de casas
            const houseSelect = document.getElementById('bet-house');
            if (houseSelect) {
                const options = houseSelect.options;
                for (let i = 0; i < options.length; i++) {
                    if (options[i].value === bookie.name) {
                        options[i].textContent = `${bookie.name} (${formatCurrency(newBalance)})`;
                        break;
                    }
                }
                // Atualizar TomSelect se existir
                if (houseSelect.tomselect) {
                    houseSelect.tomselect.sync();
                }
            }
        } else {
            console.log('Aposta com bônus - não descontando valor');
        }

        // Calcular valor_final corretamente
        // Para apostas pendentes, valor_final deve ser 0
        const finalBetData = {
            ...betData,
            valor_final: 0 // Será calculado quando a aposta for resolvida
        };

        // Salvar aposta no banco
        console.log('Salvando aposta:', finalBetData);
        
        const { data, error } = await supabaseClient
            .from('aposta')
            .insert([finalBetData])
            .select();

        if (error) {
            // Se houve erro ao salvar aposta, reverter o saldo
            if (!isBonus) {
                console.log('Erro ao salvar aposta, revertendo saldo...');
                await supabaseClient
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

        console.log('Aposta criada com sucesso:', data);

        // Mostrar notificação de sucesso
        const message = isBonus 
            ? `Aposta criada com bônus! Valor não descontado da ${bookie.name}` 
            : `Aposta criada! ${formatCurrency(stake)} descontado da ${bookie.name}. Novo saldo: ${formatCurrency(bookie.balance)}`;
        showNotification(message, 'success');

        return data[0];
        
    } catch (error) {
        console.error('Erro completo:', error);
        throw new Error(error.message || 'Erro desconhecido ao criar aposta');
    }
}

// Processar resultado da aposta (FUNÇÃO CORRIGIDA)
async function processBetResult(betId, resultado) {
    try {
        console.log('Processando resultado:', betId, resultado);
        
        const bet = betsData.find(b => b.id === betId);
        if (!bet) throw new Error('Aposta não encontrada');

        const bookie = bookiesData.find(b => b.name === bet.house);
        if (!bookie) throw new Error('Casa de apostas não encontrada');

        const stake = parseFloat(bet.stake);
        const baseOdd = parseFloat(bet.odds);
        const turbo = bet.turbo || 0;
        const isBonus = bet.bonus;
        
        console.log('Dados da aposta:', {
            stake, baseOdd, turbo, isBonus, 
            casaAtual: bookie.name, 
            saldoAtual: bookie.balance
        });

        let valorFinal = 0;
        let novoSaldo = bookie.balance;

        if (resultado === 'Ganhou') {
            // Calcular retorno com turbo
            const retornoBase = stake * baseOdd;
            const lucroBase = retornoBase - stake;
            
            // Aplicar turbo sobre o lucro
            const lucroComTurbo = turbo > 0 ? lucroBase * (1 + turbo/100) : lucroBase;
            const retornoTotal = stake + lucroComTurbo;
            
            console.log('Cálculos:', {
                retornoBase,
                lucroBase,
                lucroComTurbo,
                retornoTotal
            });

            if (isBonus) {
                // Para bônus: adiciona apenas o lucro (não retorna o stake pois não foi descontado)
                valorFinal = lucroComTurbo;
                novoSaldo += lucroComTurbo;
                console.log('Aposta bônus ganha. Adicionando lucro:', lucroComTurbo);
            } else {
                // Para aposta normal: adiciona o retorno total (stake + lucro)
                valorFinal = lucroComTurbo; // Registra apenas o lucro como valor_final
                novoSaldo += retornoTotal; // Mas adiciona o total ao saldo
                console.log('Aposta normal ganha. Adicionando retorno total:', retornoTotal);
            }

            // Atualizar saldo da casa
            const { error: updateError } = await supabaseClient
                .from('bookies')
                .update({ 
                    balance: novoSaldo,
                    last_update: new Date().toISOString()
                })
                .eq('id', bookie.id);

            if (updateError) throw updateError;

            bookie.balance = novoSaldo;
            
            showNotification(
                `✅ Aposta ganha! ${formatCurrency(isBonus ? lucroComTurbo : retornoTotal)} adicionado à ${bookie.name}`, 
                'success'
            );
            
        } else if (resultado === 'Perdeu') {
            if (isBonus) {
                // Para bônus perdido: não faz nada com o saldo (não foi descontado inicialmente)
                valorFinal = 0;
                console.log('Aposta bônus perdida. Sem alteração no saldo.');
                showNotification('Aposta bônus perdida registrada', 'warning');
            } else {
                // Para aposta normal perdida: o valor já foi descontado na criação
                valorFinal = -stake;
                console.log('Aposta normal perdida. Valor já foi descontado na criação.');
                showNotification('Aposta perdida registrada', 'warning');
            }
        } else if (resultado === 'Cancelado') {
            // Para apostas canceladas/void: devolver o stake se não era bônus
            if (!isBonus) {
                novoSaldo += stake;
                
                const { error: updateError } = await supabaseClient
                    .from('bookies')
                    .update({ 
                        balance: novoSaldo,
                        last_update: new Date().toISOString()
                    })
                    .eq('id', bookie.id);

                if (updateError) throw updateError;

                bookie.balance = novoSaldo;
                console.log('Aposta cancelada. Stake devolvido:', stake);
                showNotification(`Aposta cancelada! ${formatCurrency(stake)} devolvido à ${bookie.name}`, 'success');
            }
            valorFinal = 0;
        }

        // Atualizar resultado da aposta no banco
        const { error } = await supabaseClient
            .from('aposta')
            .update({ 
                resultado: resultado,
                valor_final: valorFinal
            })
            .eq('id', betId);

        if (error) throw error;

        console.log('Resultado processado. Novo saldo da casa:', bookie.balance);

        // Atualizar localmente
        bet.status = mapStatus(resultado);
        bet.potentialWin = valorFinal;

        // Recarregar dados para atualizar interface
        await loadBets();
        await loadBookies();
        
    } catch (error) {
        console.error('Erro ao processar resultado da aposta:', error);
        showNotification('Erro ao processar resultado da aposta: ' + (error.message || error), 'error');
    }
}

async function setBetResult(betId, resultado) {
    try {
        await processBetResult(betId, resultado);
    } catch (error) {
        console.error('Erro ao definir resultado:', error);
        showNotification('Erro ao definir resultado da aposta', 'error');
    }
}

// Função específica para inicializar o campo torneio
function initializeTournamentField() {
    const tournEl = document.getElementById('bet-tournaments');
    if (tournEl) {
        // Destruir se já existir
        if (tournEl.tomselect) {
            tournEl.tomselect.destroy();
            tournEl.tomselect = null;
        }
        
        // Remover atributos que podem interferir
        tournEl.removeAttribute('style');
        tournEl.style.display = 'block';
        
        // Aguardar um frame de renderização
        requestAnimationFrame(() => {
            try {
                const tomSelectInstance = new TomSelect('#bet-tournaments', {
                    plugins: ['remove_button'],
                    persist: false,
                    createOnBlur: false,
                    create: false,
                    maxItems: null,
                    placeholder: 'Selecione os torneios...',
                    dropdownParent: 'body'
                });
                console.log('Campo torneio inicializado:', tomSelectInstance);
            } catch (error) {
                console.error('Erro ao inicializar campo torneio:', error);
            }
        });
    }
}

// ==================== INICIALIZAÇÃO DOS SELECTS ====================

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

        // Usar função específica para o campo torneio
        initializeTournamentField();
    }, 50);
}

// ==================== CARREGAMENTO DE DADOS ====================

// Carregar casas de apostas
async function loadBookies() {
    try {
        const { data, error } = await supabaseClient
            .from('bookies')
            .select('*')
            .order('balance', { ascending: false });

        if (error) throw error;

        bookiesData = data.map(item => ({
            id: item.id,
            name: item.name,
            balance: Number(item.balance)
        }));

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

        // Reinicializar TomSelect se já existir
        if (houseSelect.tomselect) {
            houseSelect.tomselect.destroy();
            houseSelect.tomselect = null;
        }
        
    } catch (error) {
        console.error('Erro ao carregar casas de apostas:', error);
        showNotification('Erro ao carregar casas de apostas', 'error');
    }
}

// Carregar apostas do Supabase
async function loadBets() {
    try {
        const { data, error } = await supabaseClient
            .from('aposta')
            .select('*')
            .order('data', { ascending: false });

        if (error) throw error;

        betsData = data.map(item => {
            const date = new Date(item.data);
            const formattedDate = !isNaN(date) ? date.toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : 'Data Inválida';
            const formattedTime = !isNaN(date) ? date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }) : '';
            
            return {
                id: item.id,
                match: item.partida,
                league: item.torneio,
                date: formattedDate,
                time: formattedTime,
                bet: item.detalhes,
                odds: parseFloat(item.odd),
                stake: item.valor_apostado,
                potentialWin: item.valor_final || calculatePotentialReturn(
                    parseFloat(item.valor_apostado), 
                    parseFloat(item.odd), 
                    item.turbo || 0, 
                    item.bonus === 1
                ),
                status: mapStatus(item.resultado),
                house: item.casa_de_apostas,
                units: 1.0,
                category: item.categoria,
                bonus: item.bonus === 1,
                turbo: item.turbo || 0,
                db_date: item.data
            };
        });

        updateFilterCounts();
        renderFilters();
        renderBets();
    } catch (error) {
        console.error('Erro ao carregar apostas:', error);
        showNotification('Erro ao carregar apostas', 'error');
        createExampleData();
    }
}

function createExampleData() {
    betsData = [
        { id: 1, match: 'Manchester City vs Arsenal', league: 'Premier League', date: '09/09/2025', time: '16:30', bet: 'Over 2.5 Gols', odds: 1.85, stake: 100, potentialWin: 185, status: 'green', house: 'Bet365', units: 1.0, category: 'Gols', bonus: false, turbo: 0 },
        { id: 2, match: 'Barcelona vs Real Madrid', league: 'La Liga', date: '08/09/2025', time: '21:00', bet: 'Ambas Marcam', odds: 1.60, stake: 150, potentialWin: 240, status: 'Pendente', house: 'Betano', units: 1.0, category: 'Ambas Equipes', bonus: false, turbo: 25 }
    ];

    bookiesData = [
        { id: 1, name: 'Bet365', balance: 1000 },
        { id: 2, name: 'Betano', balance: 500 }
    ];

    updateFilterCounts();
    renderFilters();
    renderBets();
}

// ==================== FUNÇÕES DOS MODAIS DE EDIÇÃO ====================

// Funções para abrir os modais
function openViewModal(betId) {
    const numericBetId = parseInt(betId, 10);
    currentBetId = numericBetId;
    const bet = betsData.find(b => b.id === numericBetId);
    if (!bet) {
        console.error("Aposta não encontrada com ID:", numericBetId);
        return;
    }
    
    document.getElementById('view-match').textContent = bet.match || 'N/A';
    document.getElementById('view-league').textContent = bet.league || 'N/A';
    document.getElementById('view-datetime').textContent = `${bet.date} ${bet.time}`;
    document.getElementById('view-house').textContent = bet.house || 'N/A';
    document.getElementById('view-bet').textContent = bet.bet || 'N/A';
    document.getElementById('view-odds').textContent = bet.odds || 'N/A';
    document.getElementById('view-stake').textContent = `${formatCurrency(bet.stake || 0)}`;
    document.getElementById('view-return').textContent = `${formatCurrency(bet.potentialWin || 0)}`;
    document.getElementById('view-units').textContent = `${bet.units}u`;
    
    const statusEl = document.getElementById('view-status');
    statusEl.className = `status-indicator ${getStatusColor(bet.status)}`;
    statusEl.querySelector('span').textContent = getStatusText(bet.status);
    
    if (bet.turbo > 0) {
        document.getElementById('view-turbo-section').classList.remove('hidden');
        document.getElementById('view-turbo').textContent = `+${bet.turbo}%`;
    } else {
        document.getElementById('view-turbo-section').classList.add('hidden');
    }
    
    document.getElementById('view-modal').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    lucide.createIcons();
}

function openEditModal(betId) {
    const numericBetId = parseInt(betId, 10);
    currentBetId = numericBetId;
    const bet = betsData.find(b => b.id === numericBetId);
    if (!bet) {
        console.error("Aposta não encontrada com ID:", numericBetId);
        return;
    }
    
    const dateObj = bet.db_date ? new Date(bet.db_date) : new Date();
    const dateForInput = dateObj.toISOString().split('T')[0];
    const timeForInput = dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false });

    document.getElementById('edit-match').value = bet.match || '';
    document.getElementById('edit-league').value = bet.league || '';
    document.getElementById('edit-date').value = dateForInput;
    document.getElementById('edit-time').value = timeForInput;
    document.getElementById('edit-house').value = bet.house || '';
    document.getElementById('edit-bet').value = bet.bet || '';
    document.getElementById('edit-odds').value = bet.odds || '';
    document.getElementById('edit-stake').value = bet.stake || '';
    document.getElementById('edit-units').value = bet.units || '';
    document.getElementById('edit-status').value = bet.status || 'Pendente';
    document.getElementById('edit-turbo').value = bet.turbo || 0;
    
    updateCalculatedReturn();
    
    document.getElementById('edit-modal').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    lucide.createIcons();
}

function openDeleteModal(betId) {
    const numericBetId = parseInt(betId, 10);
    currentBetId = numericBetId;
    const bet = betsData.find(b => b.id === numericBetId);
    if (!bet) {
        console.error("Aposta não encontrada com ID:", numericBetId);
        return;
    }
    
    document.getElementById('delete-match').textContent = bet.match || 'N/A';
    document.getElementById('delete-bet').textContent = bet.bet || 'N/A';
    document.getElementById('delete-stake').textContent = `${formatCurrency(bet.stake || 0)}`;
    
    document.getElementById('delete-modal').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    lucide.createIcons();
}

// Funções para fechar os modais
function closeViewModal() {
    document.getElementById('view-modal').classList.add('hidden');
    document.body.style.overflow = '';
    currentBetId = null;
}

function closeEditModal() {
    document.getElementById('edit-modal').classList.add('hidden');
    document.body.style.overflow = '';
    currentBetId = null;
}

function closeDeleteModal() {
    document.getElementById('delete-modal').classList.add('hidden');
    document.body.style.overflow = '';
    currentBetId = null;
}

// Função para atualizar o retorno calculado no modal de edição
function updateCalculatedReturn() {
    const odds = parseFloat(document.getElementById('edit-odds').value) || 0;
    const stake = parseFloat(document.getElementById('edit-stake').value) || 0;
    const turbo = parseFloat(document.getElementById('edit-turbo').value) || 0;
    
    const potentialWin = calculatePotentialReturn(stake, odds, turbo, false);
    document.getElementById('edit-calculated-return').textContent = formatCurrency(potentialWin);
}

// Função para salvar aposta editada
async function saveEditedBet() {
    if (!currentBetId) return;
    
    try {
        const statusMapToDb = { 
            'green': 'Ganhou', 
            'red': 'Perdeu', 
            'Pendente': 'Pendente', 
            'void': 'Cancelado' 
        };
        
        const dateValue = document.getElementById('edit-date').value;
        const timeValue = document.getElementById('edit-time').value;
        const dateTimeString = `${dateValue}T${timeValue}:00`;

        const stake = parseFloat(document.getElementById('edit-stake').value);
        const odd = parseFloat(document.getElementById('edit-odds').value);
        const turbo = parseFloat(document.getElementById('edit-turbo').value) || 0;
        const newStatus = document.getElementById('edit-status').value;
        const newDbStatus = statusMapToDb[newStatus];
        
        // Buscar aposta atual para comparar status
        const currentBet = betsData.find(b => b.id === currentBetId);
        const oldDbStatus = mapStatus(currentBet.status) === 'green' ? 'Ganhou' : 
                        mapStatus(currentBet.status) === 'red' ? 'Perdeu' : 
                        mapStatus(currentBet.status) === 'void' ? 'Cancelado' : 'Pendente';
        
        // Se o status mudou de Pendente para um resultado final
        if (oldDbStatus === 'Pendente' && newDbStatus !== 'Pendente') {
            // Processar o resultado (atualiza saldos)
            await processBetResult(currentBetId, newDbStatus);
        } else {
            // Apenas atualizar os dados sem mexer em saldos
            const updatedBet = {
                partida: document.getElementById('edit-match').value,
                torneio: document.getElementById('edit-league').value,
                data: dateTimeString,
                casa_de_apostas: document.getElementById('edit-house').value,
                detalhes: document.getElementById('edit-bet').value,
                odd: odd,
                valor_apostado: stake,
                resultado: newDbStatus,
                turbo: turbo
            };
            
            // Se não é pendente, calcular valor_final
            if (newDbStatus !== 'Pendente') {
                if (newDbStatus === 'Ganhou') {
                    const lucroBase = (stake * odd) - stake;
                    const lucroComTurbo = turbo > 0 ? lucroBase * (1 + turbo/100) : lucroBase;
                    updatedBet.valor_final = lucroComTurbo;
                } else if (newDbStatus === 'Perdeu') {
                    updatedBet.valor_final = -stake;
                } else {
                    updatedBet.valor_final = 0;
                }
            } else {
                updatedBet.valor_final = 0;
            }
            
            const { error } = await supabaseClient
                .from('aposta')
                .update(updatedBet)
                .eq('id', currentBetId);
                
            if (error) throw error;
        }
        
        closeEditModal();
        await loadBets();
        await loadBookies();
        showNotification('Aposta atualizada com sucesso!', 'success');
        
    } catch (error) {
        console.error('Erro ao atualizar aposta:', error);
        showNotification('Erro ao atualizar aposta', 'error');
    }
}

// Função para confirmar exclusão
async function confirmDeleteBet() {
    if (!currentBetId) return;
    try {
        const { error } = await supabaseClient.from('aposta').delete().eq('id', currentBetId);
        if (error) throw error;
        closeDeleteModal();
        loadBets();
        showNotification('Aposta excluída com sucesso!', 'success');
    } catch (error) {
        console.error('Erro ao excluir aposta:', error);
        showNotification('Erro ao excluir aposta', 'error');
    }
}

// ==================== EVENT LISTENERS ====================

// Inicialização do formulário de nova aposta
document.getElementById('newBetForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    // Mostrar spinner de loading
    const submitBtn = document.getElementById('submit-bet-btn');
    const spinner = document.getElementById('saving-spinner');
    submitBtn.disabled = true;
    spinner.classList.remove('hidden');

    try {
        // Obter valores dos campos com validação de tipo
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

        // Validar se elementos existem
        if (!categoriesEl || !tournamentsEl || !amountEl || !oddEl || !casaEl) {
            throw new Error('Erro: elementos do formulário não encontrados');
        }

        const categories = categoriesEl.tomselect ? 
            categoriesEl.tomselect.getValue() : 
            Array.from(categoriesEl.selectedOptions).map(o => o.value);
        
        const tournaments = tournamentsEl.tomselect ? 
            tournamentsEl.tomselect.getValue() : 
            Array.from(tournamentsEl.selectedOptions).map(o => o.value);

        const amount = parseFloat(amountEl.value);
        const odd = parseFloat(oddEl.value);
        
        // Obter turbo e bonus de forma mais segura
        const turboElement = document.querySelector('input[name="turbo"]:checked');
        const bonusElement = document.querySelector('input[name="bonus"]:checked');
        
        const turbo = turboElement ? parseInt(turboElement.value) : 0;
        const bonus = bonusElement ? (bonusElement.value === '1') : false;
        
        const casa = casaEl.tomselect ? casaEl.tomselect.getValue() : casaEl.value;
        const match = matchEl.value || '';
        const details = detailsEl.value || '';
        const type = typeEl.tomselect ? typeEl.tomselect.getValue() : typeEl.value;
        const date = dateEl.value;
        const time = timeEl.value || '00:00';

        // Validações detalhadas
        if (!casa) {
            throw new Error('Selecione uma casa de apostas');
        }

        if (!amount || amount <= 0) {
            throw new Error('Digite um valor válido para a aposta');
        }

        if (!odd || odd < 1) {
            throw new Error('Digite uma odd válida (mínimo 1.0)');
        }

        if (!date) {
            throw new Error('Selecione uma data para a aposta');
        }

        if (!match.trim()) {
            throw new Error('Digite o nome da partida');
        }

        // Construir datetime string
        const dateTimeString = `${date}T${time}:00`;

        // Preparar payload com valores seguros
        const payload = {
            data: dateTimeString,
            casa_de_apostas: casa.toString(),
            tipo_aposta: type || 'Simples',
            categoria: Array.isArray(categories) ? categories.join(', ') : (categories || 'Outros'),
            resultado: 'Pendente',
            valor_apostado: Number(amount),
            odd: Number(odd),
            valor_final: 0, // Será calculado quando a aposta for resolvida
            partida: match.trim(),
            detalhes: details.trim() || match.trim(),
            bonus: bonus ? 1 : 0,  // Converter boolean para 1/0
            turbo: Number(turbo),
            torneio: Array.isArray(tournaments) ? tournaments.join(', ') : (tournaments || 'Outros')
        };

        console.log('Payload enviado:', payload); // Debug

        await processBetCreation(payload);
        closeNewBetModal();
        await loadBets();
        await loadBookies(); // Recarregar saldos das casas
        document.getElementById('newBetForm').reset();
        
    } catch (error) {
        console.error('Erro detalhado ao criar aposta:', error);
        showNotification(`Erro: ${error.message || 'Erro desconhecido'}`, 'error');
    } finally {
        // Esconder spinner e reabilitar botão
        submitBtn.disabled = false;
        spinner.classList.add('hidden');
    }
});

// ==================== SISTEMA DE NAVEGAÇÃO RESPONSIVA ====================
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

// ==================== FUNÇÕES DE MAPEAMENTO E STATUS ====================

// Função para mapear status do banco para o sistema
function mapStatus(resultado) {
    const statusMap = {
        'Ganhou': 'green',
        'Perdeu': 'red',
        'Pendente': 'Pendente',
        'Cancelado': 'void',
        'Cashout': 'Ganhou'
    };
    return statusMap[resultado] || 'Pendente';
}

// Funções auxiliares para status
function getStatusColor(status) {
    const colors = {
        'green': 'status-green',
        'red': 'status-red',
        'Pendente': 'status-pending',
        'void': 'status-void'
    };
    return colors[status] || colors.void;
}

function getStatusText(status) {
    const texts = {
        'green': 'Ganhou',
        'red': 'Perdeu',
        'Pendente': 'Pendente',
        'void': 'Cancelada'
    };
    return texts[status] || 'Desconhecido';
}

// ==================== FUNÇÕES DE ATUALIZAÇÃO DE DADOS ====================

// Função para atualizar contagens dos filtros
function updateFilterCounts() {
    filterOptions = [
        { 
            id: 'todas', 
            label: 'Todas', 
            count: betsData.length 
        },
        { 
            id: 'pendentes', 
            label: 'Pendentes', 
            count: betsData.filter(bet => bet.status === 'Pendente').length 
        },
        { 
            id: 'ganhas', 
            label: 'Ganhas', 
            count: betsData.filter(bet => bet.status === 'green').length 
        },
        { 
            id: 'perdidas', 
            label: 'Perdidas', 
            count: betsData.filter(bet => bet.status === 'red').length 
        },
        { 
            id: 'canceladas', 
            label: 'Canceladas', 
            count: betsData.filter(bet => bet.status === 'void').length 
        }
    ];
}

// ==================== FUNÇÕES DE RENDERIZAÇÃO ====================

function renderFilters() {
    const container = document.getElementById('filter-buttons');
    container.innerHTML = filterOptions.map(filter => `
        <button
            data-filter="${filter.id}"
            class="filter-button ${currentFilter === filter.id ? 'active' : ''} flex items-center space-x-2 px-4 py-2 rounded-xl text-sm transition-all"
        >
            <span class="font-medium">${filter.label}</span>
            <span class="metric-icon text-xs px-2 py-1 rounded-full">
                ${filter.count}
            </span>
        </button>
    `).join('');

    // Adiciona eventos aos botões
    container.querySelectorAll('button').forEach(button => {
        button.addEventListener('click', () => {
            currentFilter = button.dataset.filter;
            renderFilters();
            renderBets();
        });
    });
}

function renderBets() {
    const tbody = document.getElementById('bets-table-body');
    const filteredBets = betsData.filter(bet => {
        const matchesFilter = currentFilter === 'todas' || 
            (currentFilter === 'pendentes' && bet.status === 'Pendente') ||
            (currentFilter === 'ganhas' && bet.status === 'green') ||
            (currentFilter === 'perdidas' && bet.status === 'red') ||
            (currentFilter === 'canceladas' && bet.status === 'void');
        
        const matchesSearch = searchTerm === '' || 
            (bet.match && bet.match.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (bet.league && bet.league.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (bet.bet && bet.bet.toLowerCase().includes(searchTerm.toLowerCase()));
        
        return matchesFilter && matchesSearch;
    });

    tbody.innerHTML = filteredBets.map(bet => `
        <tr class="bet-row hover:bg-slate-700/50 transition-all">
            <td class="px-4 py-4">
                <div>
                    <p class="text-white font-medium text-sm">${bet.match || 'N/A'}</p>
                    <p class="text-slate-400 text-xs">${bet.league || 'N/A'}</p>
                </div>
            </td>
            <td class="px-4 py-4">
                <div>
                    <p class="text-white text-sm">${bet.bet || 'N/A'}</p>
                    <div class="flex items-center space-x-2 text-xs text-slate-400 mt-1">
                        <span>${bet.units}u • ${bet.house || 'N/A'}</span>
                        ${bet.bonus ? '<span class="text-yellow-400">(Bônus)</span>' : ''}
                    </div>
                </div>
            </td>
            <td class="px-4 py-4">
                <div>
                    <p class="text-white text-sm">${bet.date}</p>
                    <p class="text-slate-400 text-xs">${bet.time}</p>
                </div>
            </td>
            <td class="px-4 py-4 text-center">
                <div class="flex flex-col items-center">
                    <span class="text-blue-400 font-medium text-lg">${bet.odds || 'N/A'}</span>
                    ${bet.turbo > 0 ? `
                        <div class="bg-gradient-to-r from-purple-500 to-purple-600 text-white text-xs px-2 py-1 rounded-full font-bold mt-1">
                            +${bet.turbo}%
                        </div>
                    ` : ''}
                </div>
            </td>
            <td class="px-4 py-4 text-center">
                <span class="text-white font-medium">${formatCurrency(bet.stake || 0)}</span>
            </td>
            <td class="px-4 py-4 text-center">
                <span class="text-green-400 font-medium">${formatCurrency(bet.potentialWin || 0)}</span>
            </td>
            <td class="px-4 py-4 text-center">
                <div class="status-indicator ${getStatusColor(bet.status)}">
                    <span>${getStatusText(bet.status)}</span>
                </div>
            </td>
            <td class="px-4 py-4">
                <div class="flex items-center justify-center space-x-2">
                    <button onclick="openViewModal('${bet.id}')" class="action-icon p-2 text-slate-400 hover:text-blue-400 rounded-lg transition-all hover:bg-blue-400/10">
                        <i data-lucide="eye" class="w-4 h-4"></i>
                    </button>
                    <button onclick="openEditModal('${bet.id}')" class="action-icon p-2 text-slate-400 hover:text-green-400 rounded-lg transition-all hover:bg-green-400/10">
                        <i data-lucide="edit" class="w-4 h-4"></i>
                    </button>
                    <button onclick="openDeleteModal('${bet.id}')" class="action-icon p-2 text-slate-400 hover:text-red-400 rounded-lg transition-all hover:bg-red-400/10">
                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');

    // Atualiza informação de paginação
    document.getElementById('pagination-info').textContent = 
        `Mostrando ${filteredBets.length} de ${betsData.length} apostas`;

    // Atualiza stats cards
    updateStatsCards();

    // Reinicializa os ícones
    lucide.createIcons();
}

function updateStatsCards() {
    const total = betsData.length;
    const green = betsData.filter(bet => bet.status === 'green').length;
    const red = betsData.filter(bet => bet.status === 'red').length;
    const pending = betsData.filter(bet => bet.status === 'Pendente').length;

    document.getElementById('total-bets').textContent = total;
    document.getElementById('green-bets').textContent = green;
    document.getElementById('red-bets').textContent = red;
    document.getElementById('pending-bets').textContent = pending;
}

// ==================== FUNÇÕES DO MODAL ====================

function openNewBetModal() {
    document.getElementById('new-bet-modal').classList.remove('hidden');
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('bet-date').value = today;
    
    // Resetar formulário primeiro
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
    
    // Aguardar o modal aparecer e elementos estarem disponíveis antes de inicializar
    setTimeout(() => {
        initializeSelects();
        
        // Verificação específica para o campo torneio
        setTimeout(() => {
            const tournEl = document.getElementById('bet-tournaments');
            if (tournEl && !tournEl.tomselect) {
                console.log('Forçando re-inicialização do campo torneio...');
                try {
                    new TomSelect('#bet-tournaments', {
                        plugins: ['remove_button'],
                        persist: false,
                        createOnBlur: false,
                        create: false,
                        maxItems: null,
                        placeholder: 'Selecione os torneios...'
                    });
                } catch (error) {
                    console.error('Erro na re-inicialização:', error);
                }
            }
        }, 300);
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

// ==================== INICIALIZAÇÃO ====================

document.addEventListener('DOMContentLoaded', async () => {
    // Inicializa os ícones
    lucide.createIcons();

    // Configurar navegação responsiva
    setupResponsiveNavigation();

    // Carregar dados
    await loadBookies();
    await loadBets();

    // Inicializa os selects personalizados
    initializeSelects();

    // Configura busca
    document.getElementById('search-input').addEventListener('input', (e) => {
        searchTerm = e.target.value;
        renderBets();
    });

    // Configurar listeners para o modal de edição
    ['edit-odds', 'edit-stake', 'edit-turbo'].forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('input', updateCalculatedReturn);
        }
    });

    // Adicionar listeners para os inputs do modal de nova aposta
    document.getElementById('bet-amount')?.addEventListener('input', updatePotentialReturn);
    document.getElementById('bet-odd')?.addEventListener('input', updateOddIndicators);

    // Fechar modais com ESC
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeViewModal();
            closeEditModal();
            closeDeleteModal();
            closeNewBetModal();
        }
    });
});