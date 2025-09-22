// ========================================
// BetTracker Dashboard - JavaScript
// ========================================

// Log inicial para debug
console.log('=== BetTracker Dashboard JavaScript ===');
console.log('Iniciando em:', new Date().toLocaleString());

// ========================================
// CONFIGURAÇÃO
// ========================================

const SUPABASE_CONFIG = {
    url: 'https://cjlvcjfuntfbdrrkigwh.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNqbHZjamZ1bnRmYmRycmtpZ3doIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAyMzYyMDIsImV4cCI6MjA1NTgxMjIwMn0.FBSsXa2vVmrv78_XeLWZcpMKMUIeRe0mS9hBO7Cn45Y'
};

// ========================================
// VARIÁVEIS GLOBAIS
// ========================================

let supabase = null;
let apostas = [];
let bookiesData = [];
let bancaInicial = 1000;

// ========================================
// FUNÇÕES UTILITÁRIAS
// ========================================

function formatarMoeda(valor) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(valor);
}

function formatarPercentual(valor) {
    return `${valor.toFixed(1)}%`;
}

function showLoading() {
    const loader = document.getElementById('loading-indicator');
    if (loader) loader.classList.remove('hidden');
}

function hideLoading() {
    const loader = document.getElementById('loading-indicator');
    if (loader) loader.classList.add('hidden');
}

// Calcular retorno potencial com turbo
function calculatePotentialReturn(stake, baseOdd, turboPercent, isBonus) {
    const normalReturn = stake * baseOdd;
    const normalProfit = normalReturn - stake;
    
    let finalReturn = normalReturn;
    
    if (turboPercent > 0) {
        const turboBonus = normalProfit * (turboPercent / 100);
        finalReturn = normalReturn + turboBonus;
    }
    
    if (isBonus) {
        return finalReturn - stake; // Para bônus, retorna apenas o lucro
    } else {
        return finalReturn; // Para apostas normais, retorna o valor total
    }
}

// ========================================
// NAVEGAÇÃO RESPONSIVA
// ========================================

function setupResponsiveNavigation() {
    console.log('Configurando navegação responsiva...');
    
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

// ========================================
// MODAL DE NOVA APOSTA
// ========================================

window.openNewBetModal = function() {
    document.getElementById('new-bet-modal').classList.remove('hidden');
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('bet-date').value = today;
    
    // Carregar casas de apostas no select
    loadBookiesIntoSelect();
    
    setTimeout(() => {
        if (window.TomSelect) {
            initializeSelects();
        }
    }, 100);
}

window.closeNewBetModal = function() {
    document.getElementById('new-bet-modal').classList.add('hidden');
    document.getElementById('newBetForm').reset();
    
    // Destruir TomSelect
    ['bet-house', 'bet-type', 'bet-categories'].forEach(id => {
        const element = document.getElementById(id);
        if (element && element.tomselect) {
            element.tomselect.destroy();
            element.tomselect = null;
        }
    });
}

// Carregar casas de apostas no select
function loadBookiesIntoSelect() {
    const houseSelect = document.getElementById('bet-house');
    
    // Limpar opções existentes exceto a primeira
    while (houseSelect.children.length > 1) {
        houseSelect.removeChild(houseSelect.lastChild);
    }
    
    // Adicionar casas de apostas do banco
    bookiesData.forEach(bookie => {
        const option = document.createElement('option');
        option.value = bookie.name;
        option.textContent = `${bookie.name} (${formatarMoeda(bookie.balance)})`;
        houseSelect.appendChild(option);
    });
}

// ========================================
// TOM SELECT (SELECTS PERSONALIZADOS)
// ========================================

function initializeSelects() {
    console.log('Inicializando selects personalizados...');
    
    try {
        // Destruir selects existentes antes de recriar
        ['bet-house', 'bet-type', 'bet-categories'].forEach(id => {
            const element = document.getElementById(id);
            if (element && element.tomselect) {
                element.tomselect.destroy();
                element.tomselect = null;
            }
        });
        
        new TomSelect('#bet-house', {
            create: false,
            sortField: {field: 'text', direction: 'asc'}
        });

        new TomSelect('#bet-type', {
            create: false,
            sortField: {field: 'text', direction: 'asc'}
        });

        new TomSelect('#bet-categories', {
            plugins: ['remove_button'],
            persist: false,
            createOnBlur: false,
            create: false,
            maxItems: null
        });
        
        console.log('✓ Selects inicializados');
    } catch (error) {
        console.error('Erro ao inicializar selects:', error);
    }
}

// ========================================
// CARREGAR DADOS DO SUPABASE
// ========================================

async function carregarDados() {
    console.log('=== Carregando dados ===');
    showLoading();
    
    try {
        if (!supabase) {
            console.log('Supabase não disponível, inicializando...');
            
            if (window.supabase) {
                const { createClient } = window.supabase;
                supabase = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
                console.log('✓ Supabase configurado');
            } else {
                console.error('Biblioteca Supabase não carregada');
                criarDadosExemplo();
                atualizarDashboard();
                return;
            }
        }

        // Carregar apostas
        const { data: apostasData, error: apostasError } = await supabase
            .from('aposta')
            .select('*')
            .order('data', { ascending: false });
        
        if (apostasError) {
            console.error('Erro ao buscar apostas:', apostasError);
            criarDadosExemplo();
            atualizarDashboard();
            return;
        }

        // Processar dados das apostas
        apostas = (apostasData || []).map(item => ({
            id: item.id,
            data: item.data,
            resultado: item.resultado || 'Pendente',
            valor_apostado: parseFloat(item.valor_apostado || 0),
            valor_final: parseFloat(item.valor_final || 0),
            odd: parseFloat(item.odd || 1),
            casa_de_apostas: item.casa_de_apostas,
            tipo_aposta: item.tipo_aposta || 'Simples',
            categoria: item.categoria,
            partida: item.partida,
            detalhes: item.detalhes,
            bonus: item.bonus === 1,
            turbo: item.turbo || 0,
            torneio: item.torneio
        }));
        
        console.log('✓ Apostas carregadas:', apostas.length);
        
        // Carregar dados das casas de apostas (bookies)
        await carregarBookies();
        
        // Calcular banca inicial como a soma dos saldos atuais das casas
        if (bookiesData.length > 0) {
            bancaInicial = bookiesData.reduce((sum, b) => sum + b.balance, 0);
        }
        
        atualizarDashboard();
        
    } catch (error) {
        console.error('Erro geral:', error);
        criarDadosExemplo();
        atualizarDashboard();
    } finally {
        hideLoading();
    }
}

async function carregarBookies() {
    if (!supabase) return;
    
    try {
        const { data, error } = await supabase
            .from('bookies')
            .select('*')
            .order('balance', { ascending: false });
        
        if (error) {
            console.error('Erro ao carregar casas de apostas:', error);
            return;
        }
        
        bookiesData = (data || []).map(item => ({
            id: item.id,
            name: item.name,
            balance: parseFloat(item.balance || 0)
        }));
        
        console.log('✓ Casas de apostas carregadas:', bookiesData.length);
        
    } catch (error) {
        console.error('Erro ao carregar bookies:', error);
    }
}

// ========================================
// CRIAR DADOS DE EXEMPLO
// ========================================

function criarDadosExemplo() {
    console.log('Criando dados de exemplo...');
    
    const hoje = new Date();
    apostas = [];
    
    for (let i = 0; i < 15; i++) {
        const data = new Date(hoje);
        data.setDate(data.getDate() - Math.floor(i * 0.5));
        
        const random = Math.random();
        let resultado;
        if (random < 0.45) resultado = 'Ganhou';
        else if (random < 0.85) resultado = 'Perdeu';
        else resultado = 'Pendente';
        
        const valorApostado = 20 + Math.random() * 80;
        const odd = 1.4 + Math.random() * 2.5;
        
        apostas.push({
            id: i + 1,
            data: data.toISOString(),
            resultado: resultado,
            valor_apostado: valorApostado,
            valor_final: resultado === 'Ganhou' ? (valorApostado * odd) : 
                         resultado === 'Perdeu' ? -valorApostado : 0,
            odd: odd,
            casa_de_apostas: ['Bet365', 'Betano', 'Sportingbet'][Math.floor(Math.random() * 3)],
            tipo_aposta: ['Simples', 'Múltipla', 'Dupla'][Math.floor(Math.random() * 3)],
            categoria: ['Futebol', 'Tênis', 'Basquete'][Math.floor(Math.random() * 3)],
            partida: ['Manchester City vs Arsenal', 'Flamengo vs Palmeiras', 'Real Madrid vs Barcelona'][Math.floor(Math.random() * 3)],
            detalhes: 'Aposta de exemplo',
            bonus: false,
            turbo: 0
        });
    }
    
    bookiesData = [
        { id: 1, name: 'Bet365', balance: 1000 },
        { id: 2, name: 'Betano', balance: 500 }
    ];
    
    bancaInicial = 1500;
    
    console.log('✓ Dados de exemplo criados');
}

// ========================================
// ATUALIZAR DASHBOARD
// ========================================

function atualizarDashboard() {
    console.log('Atualizando dashboard...');
    
    try {
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        const inicioSemana = new Date(hoje);
        inicioSemana.setDate(hoje.getDate() - hoje.getDay());
        const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);

        // Filtrar apostas por período
        const apostasHoje = apostas.filter(a => {
            const dataAposta = new Date(a.data);
            dataAposta.setHours(0, 0, 0, 0);
            return dataAposta.getTime() === hoje.getTime();
        });

        const apostasSemana = apostas.filter(a => {
            const dataAposta = new Date(a.data);
            return dataAposta >= inicioSemana;
        });

        const apostasMes = apostas.filter(a => {
            const dataAposta = new Date(a.data);
            return dataAposta >= inicioMes;
        });

        // Calcular métricas
        calcularMetricasDia(apostasHoje);
        calcularMetricasMes(apostasMes);
        calcularSaldoBanca();
        calcularTaxaAcerto();
        calcularPerformanceSemana(apostasSemana);
        
        // Criar visualizações
        criarGraficoLucroDiario(apostasSemana);
        atualizarApostasRecentes();
        
        console.log('✓ Dashboard atualizado');
    } catch (error) {
        console.error('Erro ao atualizar dashboard:', error);
    }
}

function calcularMetricasDia(apostasHoje) {
    const apostasHojeCount = apostasHoje.length;
    const investidoHoje = apostasHoje.reduce((sum, a) => sum + a.valor_apostado, 0);
    const retornoHoje = apostasHoje
        .filter(a => a.resultado === 'Ganhou')
        .reduce((sum, a) => {
            // Calcular o retorno real considerando turbo e bonus
            const retorno = calculatePotentialReturn(
                a.valor_apostado, 
                a.odd, 
                a.turbo, 
                a.bonus
            );
            return sum + retorno;
        }, 0);
    const resultadoHoje = retornoHoje - investidoHoje;

    document.getElementById('apostas-hoje').textContent = apostasHojeCount;
    document.getElementById('investido-hoje').textContent = formatarMoeda(investidoHoje);
    document.getElementById('retorno-hoje').textContent = formatarMoeda(retornoHoje);
    document.getElementById('resultado-hoje').textContent = formatarMoeda(resultadoHoje);
    document.getElementById('resultado-hoje').className = resultadoHoje >= 0 ? 
        'text-lg font-bold text-green-400' : 
        'text-lg font-bold text-red-400';
}

function calcularMetricasMes(apostasMes) {
    const apostasFinalizadas = apostasMes.filter(a => a.resultado !== 'Pendente');
    
    const investidoMes = apostasFinalizadas
        .filter(a => !a.bonus) // Não contar apostas bônus no investido
        .reduce((sum, a) => sum + a.valor_apostado, 0);
    
    const ganhosMes = apostasFinalizadas
        .filter(a => a.resultado === 'Ganhou')
        .reduce((sum, a) => {
            // Para apostas ganhas, usar o valor_final que já considera turbo
            if (a.valor_final !== undefined && a.valor_final !== null) {
                return sum + a.valor_final;
            }
            // Fallback: calcular com a função
            const retorno = calculatePotentialReturn(
                a.valor_apostado, 
                a.odd, 
                a.turbo, 
                a.bonus
            );
            return sum + (a.bonus ? retorno : retorno - a.valor_apostado);
        }, 0);
    
    const lucroMes = ganhosMes;
    const roiMes = investidoMes > 0 ? (lucroMes / investidoMes) * 100 : 0;

    document.getElementById('lucro-mes').textContent = formatarMoeda(lucroMes);
    document.getElementById('lucro-indicator').textContent = roiMes >= 0 ? `+${roiMes.toFixed(1)}%` : `${roiMes.toFixed(1)}%`;
    document.getElementById('lucro-indicator').className = roiMes >= 0 ? 
        'text-sm font-medium text-green-400' : 
        'text-sm font-medium text-red-400';
}

function calcularSaldoBanca() {
    // Saldo atual é a soma de todos os saldos das casas
    const saldoAtual = bookiesData.reduce((sum, b) => sum + b.balance, 0);
    
    document.getElementById('saldo-atual').textContent = formatarMoeda(saldoAtual);
}

function calcularTaxaAcerto() {
    const apostasFinalizadas = apostas.filter(a => 
        a.resultado === 'Ganhou' || a.resultado === 'Perdeu'
    );
    const apostasGanhas = apostasFinalizadas.filter(a => a.resultado === 'Ganhou');
    const taxaAcerto = apostasFinalizadas.length > 0 ? 
        (apostasGanhas.length / apostasFinalizadas.length) * 100 : 0;
    
    document.getElementById('taxa-acerto').textContent = formatarPercentual(taxaAcerto);
    
    // Calcular mudança comparado ao mês anterior
    const mesAnterior = new Date();
    mesAnterior.setMonth(mesAnterior.getMonth() - 1);
    const apostasMesAnterior = apostas.filter(a => {
        const dataAposta = new Date(a.data);
        return dataAposta.getMonth() === mesAnterior.getMonth() && 
               dataAposta.getFullYear() === mesAnterior.getFullYear();
    });
    
    const apostasFinalizadasMesAnterior = apostasMesAnterior.filter(a => 
        a.resultado === 'Ganhou' || a.resultado === 'Perdeu'
    );
    const apostasGanhasMesAnterior = apostasFinalizadasMesAnterior.filter(a => a.resultado === 'Ganhou');
    const taxaAcertoMesAnterior = apostasFinalizadasMesAnterior.length > 0 ?
        (apostasGanhasMesAnterior.length / apostasFinalizadasMesAnterior.length) * 100 : 0;
    
    const mudancaTaxa = taxaAcerto - taxaAcertoMesAnterior;
    document.getElementById('taxa-change').textContent = mudancaTaxa >= 0 ? 
        `+${mudancaTaxa.toFixed(1)}%` : `${mudancaTaxa.toFixed(1)}%`;
    document.getElementById('taxa-change').className = mudancaTaxa >= 0 ?
        'text-sm font-medium text-green-400' : 'text-sm font-medium text-red-400';
    
    // Apostas ativas
    const apostasAtivas = apostas.filter(a => a.resultado === 'Pendente').length;
    document.getElementById('apostas-ativas').textContent = apostasAtivas;
}

function calcularPerformanceSemana(apostasSemana) {
    const apostasFinalizadas = apostasSemana.filter(a => 
        a.resultado === 'Ganhou' || a.resultado === 'Perdeu'
    );
    
    const investidoSemana = apostasFinalizadas
        .filter(a => !a.bonus)
        .reduce((sum, a) => sum + a.valor_apostado, 0);
    
    const lucroSemana = apostasFinalizadas
        .filter(a => a.resultado === 'Ganhou')
        .reduce((sum, a) => {
            if (a.valor_final !== undefined && a.valor_final !== null) {
                return sum + a.valor_final;
            }
            const retorno = calculatePotentialReturn(
                a.valor_apostado, 
                a.odd, 
                a.turbo, 
                a.bonus
            );
            return sum + (a.bonus ? retorno : retorno - a.valor_apostado);
        }, 0);
    
    const roiSemana = investidoSemana > 0 ? (lucroSemana / investidoSemana) * 100 : 0;
    
    // ROI Semanal
    document.getElementById('roi-semana').textContent = formatarPercentual(roiSemana);
    document.getElementById('roi-semana').className = roiSemana >= 0 ?
        'text-xl font-bold text-green-400' : 'text-xl font-bold text-red-400';
    
    // Média por dia
    const diasComApostas = new Set(apostasSemana.map(a => 
        new Date(a.data).toDateString()
    )).size || 1;
    const mediaDia = lucroSemana / diasComApostas;
    document.getElementById('media-dia').textContent = formatarMoeda(mediaDia);
    document.getElementById('media-dia').className = mediaDia >= 0 ?
        'text-lg font-bold text-green-400' : 'text-lg font-bold text-red-400';
    
    // Vitórias e derrotas
    const vitorias = apostasFinalizadas.filter(a => a.resultado === 'Ganhou').length;
    const derrotas = apostasFinalizadas.filter(a => a.resultado === 'Perdeu').length;
    const total = vitorias + derrotas || 1;
    
    document.getElementById('vitorias-semana').textContent = vitorias;
    document.getElementById('derrotas-semana').textContent = derrotas;
    
    // Barras de progresso
    document.getElementById('vitorias-bar').style.width = `${(vitorias / total) * 100}%`;
    document.getElementById('derrotas-bar').style.width = `${(derrotas / total) * 100}%`;
}

function criarGraficoLucroDiario(apostasSemana) {
    const container = document.getElementById('chart-lucro-diario');
    container.innerHTML = '';
    
    // Agrupar por dia
    const dadosPorDia = {};
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    
    // Criar estrutura para últimos 7 dias
    for (let i = 6; i >= 0; i--) {
        const data = new Date(hoje);
        data.setDate(hoje.getDate() - i);
        const dataStr = data.toISOString().split('T')[0];
        dadosPorDia[dataStr] = { investido: 0, lucro: 0 };
    }
    
    // Processar apostas
    apostasSemana.forEach(aposta => {
        const dataStr = aposta.data.split('T')[0];
        if (dadosPorDia[dataStr]) {
            if (aposta.resultado === 'Ganhou') {
                if (aposta.valor_final !== undefined && aposta.valor_final !== null) {
                    dadosPorDia[dataStr].lucro += aposta.valor_final;
                } else {
                    const retorno = calculatePotentialReturn(
                        aposta.valor_apostado, 
                        aposta.odd, 
                        aposta.turbo, 
                        aposta.bonus
                    );
                    dadosPorDia[dataStr].lucro += (aposta.bonus ? retorno : retorno - aposta.valor_apostado);
                }
            } else if (aposta.resultado === 'Perdeu' && !aposta.bonus) {
                dadosPorDia[dataStr].lucro -= aposta.valor_apostado;
            }
        }
    });
    
    // Encontrar valor máximo para escala
    const valores = Object.values(dadosPorDia).map(d => Math.abs(d.lucro));
    const maxValor = Math.max(...valores, 100);
    
    // Criar barras
    Object.entries(dadosPorDia).forEach(([data, dados]) => {
        const dataObj = new Date(data);
        const diaSemana = dataObj.toLocaleDateString('pt-BR', { weekday: 'short' });
        const diaNumero = dataObj.getDate();
        
        const grupo = document.createElement('div');
        grupo.className = 'chart-bar-group';
        
        const percentual = (Math.abs(dados.lucro) / maxValor) * 100;
        const altura = Math.max(percentual, 2);
        
        const barra = document.createElement('div');
        barra.className = dados.lucro >= 0 ? 'chart-bar' : 'chart-bar loss';
        barra.style.height = `${altura}%`;
        
        const valor = document.createElement('div');
        valor.className = 'chart-value';
        valor.textContent = formatarMoeda(dados.lucro);
        
        const label = document.createElement('div');
        label.className = 'chart-label';
        label.innerHTML = `${diaSemana}<br>${diaNumero}`;
        
        if (dados.lucro >= 0) {
            grupo.appendChild(valor);
            grupo.appendChild(barra);
        } else {
            grupo.appendChild(barra);
            grupo.appendChild(valor);
        }
        
        grupo.appendChild(label);
        container.appendChild(grupo);
    });
}

function atualizarApostasRecentes() {
    const container = document.getElementById('apostas-recentes');
    container.innerHTML = '';
    
    // Pegar as 5 apostas mais recentes
    const apostasRecentes = apostas.slice(0, 5);
    
    if (apostasRecentes.length === 0) {
        container.innerHTML = `
            <div class="text-center text-gray-400 py-8">
                <i data-lucide="inbox" class="w-12 h-12 mx-auto mb-3 opacity-50"></i>
                <p>Nenhuma aposta registrada</p>
            </div>
        `;
        lucide.createIcons();
        return;
    }
    
    apostasRecentes.forEach(aposta => {
        const card = document.createElement('div');
        card.className = 'bet-card p-4 rounded-2xl flex justify-between items-center';
        
        const statusClass = aposta.resultado === 'Ganhou' ? 'status-ganhou' :
                           aposta.resultado === 'Perdeu' ? 'status-perdeu' :
                           aposta.resultado === 'Cashout' ? 'status-cashout' :
                           aposta.resultado === 'Cancelado' ? 'status-cashout' :
                           'status-pendente';
        
        card.innerHTML = `
            <div>
                <p class="text-sm font-medium">${aposta.partida || aposta.detalhes || 'Sem descrição'}</p>
                <p class="text-xs text-gray-400 mt-1">
                    ${new Date(aposta.data).toLocaleDateString('pt-BR')} • 
                    ${aposta.casa_de_apostas || 'Casa não informada'}
                    ${aposta.bonus ? ' • <span class="text-yellow-400">Bônus</span>' : ''}
                    ${aposta.turbo > 0 ? ` • <span class="text-purple-400">Turbo +${aposta.turbo}%</span>` : ''}
                </p>
            </div>
            <div class="text-right">
                <p class="text-sm font-bold">${formatarMoeda(aposta.valor_apostado)}</p>
                <span class="status-indicator ${statusClass}">
                    ${aposta.resultado || 'Pendente'}
                </span>
            </div>
        `;
        
        container.appendChild(card);
    });
}

// ========================================
// SUBMISSÃO DO FORMULÁRIO
// ========================================

async function salvarNovaAposta(event) {
    event.preventDefault();
    showLoading();
    
    try {
        const categoriesEl = document.getElementById('bet-categories');
        const categories = categoriesEl.tomselect ? 
            categoriesEl.tomselect.getValue() : 
            Array.from(categoriesEl.selectedOptions).map(o => o.value);
        
        const formData = {
            data: document.getElementById('bet-date').value + 'T12:00:00',
            casa_de_apostas: document.getElementById('bet-house').value,
            tipo_aposta: document.getElementById('bet-type').value,
            valor_apostado: parseFloat(document.getElementById('bet-amount').value),
            odd: parseFloat(document.getElementById('bet-odd').value),
            categoria: Array.isArray(categories) ? categories.join(', ') : (categories || 'Outros'),
            partida: document.getElementById('bet-match').value,
            detalhes: document.getElementById('bet-details').value || document.getElementById('bet-match').value,
            bonus: document.querySelector('input[name="bonus"]:checked').value === '1' ? 1 : 0,
            turbo: 0, // Valor padrão, pode adicionar campo se necessário
            resultado: 'Pendente',
            valor_final: 0,
            torneio: 'Outros'
        };
        
        // Verificar saldo se não for bônus
        if (formData.bonus === 0) {
            const bookie = bookiesData.find(b => b.name === formData.casa_de_apostas);
            if (!bookie) {
                throw new Error('Casa de apostas não encontrada');
            }
            if (bookie.balance < formData.valor_apostado) {
                throw new Error(`Saldo insuficiente na ${bookie.name}. Saldo disponível: ${formatarMoeda(bookie.balance)}`);
            }
            
            // Atualizar saldo da casa
            const novoSaldo = bookie.balance - formData.valor_apostado;
            const { error: updateError } = await supabase
                .from('bookies')
                .update({ 
                    balance: novoSaldo,
                    last_update: new Date().toISOString()
                })
                .eq('id', bookie.id);
            
            if (updateError) throw updateError;
            
            // Atualizar localmente
            bookie.balance = novoSaldo;
        }
        
        // Salvar aposta
        const { data, error } = await supabase
            .from('aposta')
            .insert([formData]);
        
        if (error) {
            // Reverter saldo se houver erro
            if (formData.bonus === 0) {
                const bookie = bookiesData.find(b => b.name === formData.casa_de_apostas);
                if (bookie) {
                    await supabase
                        .from('bookies')
                        .update({ 
                            balance: bookie.balance + formData.valor_apostado,
                            last_update: new Date().toISOString()
                        })
                        .eq('id', bookie.id);
                    bookie.balance += formData.valor_apostado;
                }
            }
            throw error;
        }
        
        console.log('✓ Aposta salva com sucesso');
        
        closeNewBetModal();
        await carregarDados();
        
        // Mostrar notificação de sucesso
        mostrarNotificacao(formData.bonus === 1 ? 
            'Aposta bônus registrada com sucesso!' : 
            `Aposta registrada! ${formatarMoeda(formData.valor_apostado)} descontado da ${formData.casa_de_apostas}`, 
            'success'
        );
        
    } catch (error) {
        console.error('Erro ao salvar aposta:', error);
        mostrarNotificacao(error.message || 'Erro ao salvar aposta. Tente novamente.', 'error');
    } finally {
        hideLoading();
    }
}

function mostrarNotificacao(mensagem, tipo = 'info') {
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg transition-all transform translate-x-0 ${
        tipo === 'success' ? 'bg-green-500' :
        tipo === 'error' ? 'bg-red-500' :
        'bg-blue-500'
    } text-white`;
    notification.innerHTML = `
        <div class="flex items-center space-x-3">
            <i data-lucide="${tipo === 'success' ? 'check-circle' : tipo === 'error' ? 'x-circle' : 'info'}" 
               class="w-5 h-5"></i>
            <span>${mensagem}</span>
        </div>
    `;
    
    document.body.appendChild(notification);
    lucide.createIcons();
    
    setTimeout(() => {
        notification.style.transform = 'translateX(500px)';
        setTimeout(() => notification.remove(), 500);
    }, 3000);
}

// ========================================
// INICIALIZAÇÃO
// ========================================

async function inicializar() {
    console.log('=== Inicializando aplicação ===');
    
    try {
        // Configurar Supabase
        if (window.supabase) {
            const { createClient } = window.supabase;
            supabase = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
            console.log('✓ Supabase configurado');
        } else {
            console.log('⚠️ Supabase não disponível, usando modo offline');
        }
        
        // Configurar navegação responsiva
        setupResponsiveNavigation();
        
        // Inicializar ícones
        if (window.lucide) {
            lucide.createIcons();
            console.log('✓ Ícones inicializados');
        }
        
        // Configurar formulário
        const form = document.getElementById('newBetForm');
        if (form) {
            form.addEventListener('submit', salvarNovaAposta);
            console.log('✓ Formulário configurado');
        }
        
        // Carregar dados
        await carregarDados();
        
        // Atualizar a cada 30 segundos
        setInterval(carregarDados, 30000);
        
        console.log('✓ Aplicação inicializada com sucesso');
        
    } catch (error) {
        console.error('Erro na inicialização:', error);
        criarDadosExemplo();
        atualizarDashboard();
    }
}

// Iniciar quando o DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inicializar);
} else {
    inicializar();
}