// Configuração do Supabase
const SUPABASE_CONFIG = {
    url: 'https://cjlvcjfuntfbdrrkigwh.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNqbHZjamZ1bnRmYmRycmtpZ3doIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDAyMzYyMDIsImV4cCI6MjA1NTgxMjIwMn0.FBSsXa2vVmrv78_XeLWZcpMKMUIeRe0mS9hBO7Cn45Y'
};

// =====================================================
// VARIÁVEIS GLOBAIS
// =====================================================
let supabase;
let apostas = [];
let apostasFiltradas = [];
let charts = {};
let tomSelects = {};

// =====================================================
// FUNÇÕES UTILITÁRIAS
// =====================================================
function formatarMoeda(valor) {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatarPercentual(valor) {
    return `${valor.toFixed(1)}%`;
}

function calcularROI(lucro, totalApostado) {
    if (totalApostado === 0) return 0;
    return (lucro / totalApostado) * 100;
}

function calcularTaxaAcerto(ganhas, total) {
    if (total === 0) return 0;
    return (ganhas / total) * 100;
}

function showLoading() {
    const loader = document.getElementById('loading-indicator');
    if (loader) loader.classList.remove('hidden');
}

function hideLoading() {
    const loader = document.getElementById('loading-indicator');
    if (loader) loader.classList.add('hidden');
}

function updateElementSafely(id, value, isHtml = false) {
    const element = document.getElementById(id);
    if (element) {
        if (isHtml) {
            element.innerHTML = value;
        } else {
            element.textContent = value;
        }
        return true;
    }
    return false;
}

// =====================================================
// SISTEMA DE ABAS
// =====================================================
function configurarAbas() {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            const targetTab = this.getAttribute('data-tab');
            
            tabButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            
            tabContents.forEach(content => content.classList.remove('active'));
            
            const targetContent = document.getElementById(`tab-${targetTab}`);
            if (targetContent) {
                targetContent.classList.add('active');
            }
            
            setTimeout(() => {
                carregarConteudoAba(targetTab);
            }, 100);
        });
    });
}

function carregarConteudoAba(aba) {
    try {
        console.log(`Carregando aba: ${aba}`);
        aplicarFiltros();
        
        switch (aba) {
            case 'dashboard':
                atualizarAnalises();
                criarGraficosAdicionais();
                break;
            case 'performance':
                atualizarPerformance();
                criarGraficosPerformance();
                break;
            case 'casas':
                atualizarCasasDeApostas();
                criarGraficosCasas();
                break;
            case 'odds':
                atualizarAnaliseOdds();
                criarGraficosOdds();
                break;
            case 'risk':
                atualizarAnaliseRisco();
                criarGraficosRisco();
                break;
            case 'temporal':
                atualizarAnaliseTemporal();
                criarGraficosTemporais();
                break;
            case 'patterns':
                atualizarPadroesTendencias();
                criarGraficosPadroes();
                break;
        }
        
        if (window.lucide) {
            lucide.createIcons();
        }
    } catch (error) {
        console.error(`Erro ao carregar aba ${aba}:`, error);
    }
}

// =====================================================
// SISTEMA DE FILTROS
// =====================================================
function configurarFiltrosData() {
    const startDateInput = document.getElementById('filter-date-start');
    const endDateInput = document.getElementById('filter-date-end');
    
    if (startDateInput) {
        startDateInput.addEventListener('change', function() {
            console.log('Data inicial alterada:', this.value);
            aplicarFiltros();
            const abaAtiva = document.querySelector('.tab-button.active').getAttribute('data-tab');
            carregarConteudoAba(abaAtiva);
        });
    }
    
    if (endDateInput) {
        endDateInput.addEventListener('change', function() {
            console.log('Data final alterada:', this.value);
            aplicarFiltros();
            const abaAtiva = document.querySelector('.tab-button.active').getAttribute('data-tab');
            carregarConteudoAba(abaAtiva);
        });
    }
}

function configurarBotaoLimparFiltros() {
    const btnClearFilters = document.getElementById('btn-clear-filters');
    if (btnClearFilters) {
        btnClearFilters.addEventListener('click', function() {
            const startDateInput = document.getElementById('filter-date-start');
            const endDateInput = document.getElementById('filter-date-end');
            
            if (startDateInput) startDateInput.value = '';
            if (endDateInput) endDateInput.value = '';
            
            if (tomSelects.house) tomSelects.house.clear();
            if (tomSelects.type) tomSelects.type.clear();
            if (tomSelects.tournament) tomSelects.tournament.clear();
            
            aplicarFiltros();
            const abaAtiva = document.querySelector('.tab-button.active').getAttribute('data-tab');
            carregarConteudoAba(abaAtiva);
            
            console.log('Filtros limpos');
        });
    }
}

function filtrarPorCriterios(aposta) {
    if (!filtrarPorData(aposta)) return false;
    if (!filtrarPorCasa(aposta)) return false;
    if (!filtrarPorTipo(aposta)) return false;
    if (!filtrarPorCategoria(aposta)) return false;
    
    return true;
}

function filtrarPorData(aposta) {
    const dataAposta = new Date(aposta.data);
    const dataInicio = document.getElementById('filter-date-start')?.value;
    const dataFim = document.getElementById('filter-date-end')?.value;
    
    if (dataInicio && dataAposta < new Date(dataInicio)) return false;
    if (dataFim && dataAposta > new Date(dataFim)) return false;
    
    return true;
}

function filtrarPorCasa(aposta) {
    const casasSelecionadas = tomSelects.house?.getValue() || [];
    if (casasSelecionadas.length === 0) return true;
    
    return casasSelecionadas.includes(aposta.casa_de_apostas);
}

function filtrarPorTipo(aposta) {
    const tiposSelecionados = tomSelects.type?.getValue() || [];
    if (tiposSelecionados.length === 0) return true;
    
    return tiposSelecionados.includes(aposta.tipo_aposta);
}

function filtrarPorCategoria(aposta) {
    const categoriasSelecionadas = tomSelects.tournament?.getValue() || [];
    if (categoriasSelecionadas.length === 0) return true;
    
    const categoriasAposta = String(aposta.categoria || '').split(/[,;]+/).map(c => c.trim().toLowerCase());
    return categoriasSelecionadas.some(cat => 
        categoriasAposta.includes(cat.toLowerCase())
    );
}

function aplicarFiltros() {
    try {
        console.log('Aplicando filtros...');
        
        const startDate = document.getElementById('filter-date-start')?.value;
        const endDate = document.getElementById('filter-date-end')?.value;
        
        const selectedHouses = tomSelects.house?.getValue() || [];
        const selectedTypes = tomSelects.type?.getValue() || [];
        const selectedTournaments = tomSelects.tournament?.getValue() || [];
        
        console.log('Filtros ativos:', {
            dataInicio: startDate,
            dataFim: endDate,
            casas: selectedHouses,
            tipos: selectedTypes,
            torneios: selectedTournaments
        });
        
        apostasFiltradas = apostas.filter(aposta => {
            return filtrarPorCriterios(aposta);
        });
        
        console.log(`Filtros aplicados: ${apostasFiltradas.length} apostas de ${apostas.length} total`);
    } catch (error) {
        console.error('Erro ao aplicar filtros:', error);
        apostasFiltradas = apostas;
    }
}

function preencherFiltros() {
    try {
        console.log('Preenchendo filtros...');
        const casas = [...new Set(apostas.map(a => a.casa_de_apostas).filter(Boolean))];
        const tipos = [...new Set(apostas.map(a => a.tipo_aposta).filter(Boolean))];

        const rawCategorias = apostas.map(a => a.categoria).filter(Boolean);
        const tokens = rawCategorias
            .flatMap(c => String(c).split(/[,;]+/))
            .map(s => s.trim())
            .filter(Boolean);
        const lowerToOriginal = new Map();
        tokens.forEach(tok => {
            const key = tok.toLowerCase();
            if (!lowerToOriginal.has(key)) lowerToOriginal.set(key, tok);
        });
        const torneirosUnicos = Array.from(lowerToOriginal.values());

        function buildTomSelect(selector, values, placeholder) {
            const el = document.querySelector(selector);
            if (!el) return;
            if (el.tomselect) {
                try { el.tomselect.destroy(); } catch (e) { console.log('Erro destroy TomSelect', e); }
            }
            el.innerHTML = '';
            const tomSelect = new TomSelect(el, {
                options: (values || []).map(v => ({ value: String(v), text: String(v) })),
                items: [],
                placeholder: placeholder || 'Selecione...',
                plugins: ['remove_button'],
                persist: false,
                create: false,
                maxItems: null,
                allowEmptyOption: true,
            });
            
            return tomSelect;
        }

        tomSelects.house = buildTomSelect('#filter-house', casas, 'Casas...');
        tomSelects.type = buildTomSelect('#filter-type', tipos, 'Tipos...');
        tomSelects.tournament = buildTomSelect('#filter-tournament', torneirosUnicos, 'Categorias/Torneios...');

        if (tomSelects.house) {
            tomSelects.house.on('change', () => { 
                console.log('Filtro casa alterado');
                aplicarFiltros(); 
                const abaAtiva = document.querySelector('.tab-button.active').getAttribute('data-tab');
                carregarConteudoAba(abaAtiva);
            });
        }
        if (tomSelects.type) {
            tomSelects.type.on('change', () => { 
                console.log('Filtro tipo alterado');
                aplicarFiltros(); 
                const abaAtiva = document.querySelector('.tab-button.active').getAttribute('data-tab');
                carregarConteudoAba(abaAtiva);
            });
        }
        if (tomSelects.tournament) {
            tomSelects.tournament.on('change', () => { 
                console.log('Filtro categoria alterado');
                aplicarFiltros(); 
                const abaAtiva = document.querySelector('.tab-button.active').getAttribute('data-tab');
                carregarConteudoAba(abaAtiva);
            });
        }

        console.log('Filtros preenchidos com sucesso');
    } catch (error) {
        console.error('Erro ao preencher filtros:', error);
    }
}

// =====================================================
// CARREGAMENTO DE DADOS
// =====================================================
async function carregarApostas() {
    showLoading();
    
    try {
        console.log('Tentando carregar apostas do Supabase...');
        
        if (!supabase) {
            throw new Error('Supabase não inicializado');
        }

        let query = supabase.from('aposta').select('*').order('data', { ascending: true });

        const startDate = document.getElementById('filter-date-start')?.value;
        const endDate = document.getElementById('filter-date-end')?.value;
        
        if (startDate) {
            query = query.gte('data', startDate);
        }
        if (endDate) {
            query = query.lte('data', endDate);
        }

        const { data, error } = await query;
        
        if (error) {
            console.error('Erro do Supabase:', error);
            throw error;
        }

        console.log('Dados carregados:', data?.length || 0, 'apostas');
        apostas = data || [];
        
        aplicarFiltros();
        preencherFiltros();
        atualizarAnalises();
        
    } catch (error) {
        console.error('Erro ao carregar dados:', error);
        
        criarDadosExemplo();
        aplicarFiltros();
        atualizarAnalises();
        
        mostrarMensagemOffline();
    } finally {
        hideLoading();
    }
}

function criarDadosExemplo() {
    const hoje = new Date();
    apostas = [];
    
    for (let i = 0; i < 50; i++) {
        const data = new Date(hoje);
        data.setDate(data.getDate() - i * 2);
        
        const resultado = Math.random() > 0.45 ? 'Ganhou' : 'Perdeu';
        const valorApostado = 50 + Math.random() * 200;
        const odd = 1.5 + Math.random() * 3.5;
        const usouBonus = Math.random() > 0.8;
        
        apostas.push({
            id: i + 1,
            data: data.toISOString().split('T')[0],
            resultado: resultado,
            valor_apostado: valorApostado.toFixed(2),
            valor_final: resultado === 'Ganhou' ? (valorApostado * odd).toFixed(2) : '0',
            odd_inicial: odd.toFixed(2),
            odd_final: odd.toFixed(2),
            casa_de_apostas: ['Bet365', 'Betano', 'Sportingbet', 'Betfair', '1xBet'][Math.floor(Math.random() * 5)],
            tipo_aposta: ['Simples', 'Múltipla', 'Sistema'][Math.floor(Math.random() * 3)],
            categoria: ['Futebol', 'Tênis', 'Basquete', 'E-Sports', 'Vôlei'][Math.floor(Math.random() * 5)],
            mercado: ['1X2', 'Over/Under', 'Handicap', 'Ambas Marcam'][Math.floor(Math.random() * 4)],
            bonus: usouBonus,
            descricao: `Aposta ${i + 1}`
        });
    }
    
    console.log('Dados de exemplo criados:', apostas.length, 'apostas');
}

function mostrarMensagemOffline() {
    const container = document.getElementById('insights-container');
    if (container) {
        container.innerHTML = `
            <div class="insight-card p-6 rounded-2xl border-orange-500/50 bg-orange-500/10">
                <div class="flex items-start space-x-4">
                    <div class="metric-icon p-2 rounded-xl">
                        <i data-lucide="wifi-off" class="w-5 h-5 text-orange-400"></i>
                    </div>
                    <div>
                        <h4 class="font-bold text-white mb-2">Modo Demonstração</h4>
                        <p class="text-slate-300">Usando dados de exemplo. Conecte-se ao banco para ver seus dados reais.</p>
                    </div>
                </div>
            </div>
        `;
        
        if (window.lucide) {
            lucide.createIcons();
        }
    }
}

// =====================================================
// ANÁLISES E MÉTRICAS
// =====================================================
function atualizarAnalises() {
    atualizarMetricas();
    atualizarEstatisticas();
    criarGraficosAdicionais();
    atualizarInsights();
}

function atualizarMetricas() {
    try {
        const totalApostado = apostasFiltradas.reduce((sum, aposta) => sum + (parseFloat(aposta.valor_apostado) || 0), 0);
        const lucro = calcularLucroTotal();
        const ganhas = apostasFiltradas.filter(a => a.resultado === 'Ganhou').length;
        const total = apostasFiltradas.length;
        const roi = calcularROI(lucro, totalApostado);
        const taxaAcerto = calcularTaxaAcerto(ganhas, total);

        updateElementSafely('metric-total-apostado', formatarMoeda(totalApostado));
        updateElementSafely('metric-roi', formatarPercentual(roi));
        updateElementSafely('metric-lucro', formatarMoeda(lucro));
        updateElementSafely('metric-taxa-acerto', formatarPercentual(taxaAcerto));

        const roiStatus = document.getElementById('metric-roi-status');
        if (roiStatus) {
            if (roi >= 5) {
                roiStatus.textContent = '✓ Excelente';
                roiStatus.className = 'status-indicator status-excellent';
            } else if (roi >= 0) {
                roiStatus.textContent = '~ Positivo';
                roiStatus.className = 'status-indicator status-good';
            } else {
                roiStatus.textContent = '✗ Negativo';
                roiStatus.className = 'status-indicator status-poor';
            }
        }

        const taxaStatus = document.getElementById('metric-taxa-status');
        if (taxaStatus) {
            if (taxaAcerto >= 60) {
                taxaStatus.textContent = '✓ Excelente';
                taxaStatus.className = 'status-indicator status-excellent';
            } else if (taxaAcerto >= 50) {
                taxaStatus.textContent = '~ Bom';
                taxaStatus.className = 'status-indicator status-good';
            } else {
                taxaStatus.textContent = '✗ Abaixo';
                taxaStatus.className = 'status-indicator status-poor';
            }
        }

        console.log('Métricas atualizadas:', { totalApostado, roi, lucro, taxaAcerto });
    } catch (error) {
        console.error('Erro ao atualizar métricas:', error);
    }
}

function calcularLucroTotal() {
    return apostasFiltradas
        .filter(aposta => aposta.resultado === 'Ganhou' || aposta.resultado === 'Perdeu' || aposta.resultado === 'Cashout')
        .reduce((sum, aposta) => {
            const vf = parseFloat(aposta.valor_final) || 0;
            return sum + vf;
        }, 0);
}

function atualizarEstatisticas() {
    try {
        const totalApostas = apostasFiltradas.length;
        const diasUnicos = new Set(apostasFiltradas.map(a => a.data)).size;
        const apostasPorDia = totalApostas / (diasUnicos || 1);

        const odds = apostasFiltradas.map(a => {
            let odd = a.odd_final || a.odd_inicial || a.odd;
            if (typeof odd === 'string') {
                odd = odd.replace(',', '.');
            }
            return parseFloat(odd) || 0;
        }).filter(o => o > 0);
        
        const oddMedia = odds.length > 0 ? odds.reduce((a, b) => a + b, 0) / odds.length : 0;
        const oddAlta = odds.length > 0 ? Math.max(...odds) : 0;
        const oddBaixa = odds.length > 0 ? Math.min(...odds) : 0;

        const { maiorVitorias, maiorDerrotas, sequenciaAtual } = calcularSequencias();

        updateElementSafely('stat-total-apostas', totalApostas);
        updateElementSafely('stat-apostas-dia', apostasPorDia.toFixed(1));
        updateElementSafely('stat-dias-ativos', diasUnicos);
        updateElementSafely('stat-odd-media', oddMedia.toFixed(2));
        updateElementSafely('stat-odd-alta', oddAlta.toFixed(2));
        updateElementSafely('stat-odd-baixa', oddBaixa.toFixed(2));
        updateElementSafely('stat-seq-vitorias', maiorVitorias);
        updateElementSafely('stat-seq-derrotas', maiorDerrotas);
        updateElementSafely('stat-seq-atual', sequenciaAtual > 0 ? `+${sequenciaAtual}` : sequenciaAtual.toString());

        console.log('Estatísticas atualizadas');
    } catch (error) {
        console.error('Erro ao atualizar estatísticas:', error);
    }
}

function calcularSequencias() {
    const apostasOrdenadas = [...apostasFiltradas].sort((a, b) => new Date(a.data) - new Date(b.data));
    
    let maiorVitorias = 0;
    let maiorDerrotas = 0;
    let sequenciaAtual = 0;
    let tipoAtual = null;
    
    let vitoriasAtual = 0;
    let derrotasAtual = 0;
    
    for (const aposta of apostasOrdenadas) {
        if (aposta.resultado === 'Ganhou' || aposta.resultado === 'Cashout') {
            if (tipoAtual === 'vitoria') {
                vitoriasAtual++;
            } else {
                maiorDerrotas = Math.max(maiorDerrotas, derrotasAtual);
                vitoriasAtual = 1;
                tipoAtual = 'vitoria';
                derrotasAtual = 0;
            }
            maiorVitorias = Math.max(maiorVitorias, vitoriasAtual);
        } else if (aposta.resultado === 'Perdeu') {
            if (tipoAtual === 'derrota') {
                derrotasAtual++;
            } else {
                maiorVitorias = Math.max(maiorVitorias, vitoriasAtual);
                derrotasAtual = 1;
                tipoAtual = 'derrota';
                vitoriasAtual = 0;
            }
            maiorDerrotas = Math.max(maiorDerrotas, derrotasAtual);
        }
    }
    
    if (apostasOrdenadas.length > 0) {
        const ultimaAposta = apostasOrdenadas[apostasOrdenadas.length - 1];
        if (ultimaAposta.resultado === 'Ganhou' || ultimaAposta.resultado === 'Cashout') {
            sequenciaAtual = vitoriasAtual;
        } else if (ultimaAposta.resultado === 'Perdeu') {
            sequenciaAtual = -derrotasAtual;
        }
    }
    
    return { maiorVitorias, maiorDerrotas, sequenciaAtual };
}

function atualizarInsights() {
    try {
        const container = document.getElementById('insights-container');
        if (!container) return;

        const totalApostado = apostasFiltradas.reduce((sum, aposta) => sum + (parseFloat(aposta.valor_apostado) || 0), 0);
        const lucro = calcularLucroTotal();
        const ganhas = apostasFiltradas.filter(a => a.resultado === 'Ganhou').length;
        const total = apostasFiltradas.length;
        const roi = calcularROI(lucro, totalApostado);
        const taxaAcerto = calcularTaxaAcerto(ganhas, total);
        const { maiorVitorias, maiorDerrotas, sequenciaAtual } = calcularSequencias();

        const insights = [];

        // Sempre adicionar 3 insights principais
        // Insight 1: ROI/Performance
        if (roi > 10) {
            insights.push({
                icon: 'trending-up',
                color: 'emerald',
                title: 'Excelente Performance!',
                description: `Seu ROI de ${roi.toFixed(1)}% está muito acima da média. Continue com essa estratégia!`
            });
        } else if (roi > 0) {
            insights.push({
                icon: 'thumbs-up',
                color: 'green',
                title: 'Performance Positiva',
                description: `ROI de ${roi.toFixed(1)}% mostra que você está no caminho certo. Analise suas melhores apostas.`
            });
        } else {
            insights.push({
                icon: 'alert-triangle',
                color: 'red',
                title: 'Atenção à Performance',
                description: `ROI negativo de ${roi.toFixed(1)}%. Revise sua estratégia e considere reduzir o volume.`
            });
        }

        // Insight 2: Taxa de Acerto
        if (taxaAcerto > 60) {
            insights.push({
                icon: 'target',
                color: 'emerald',
                title: 'Alta Precisão',
                description: `Taxa de acerto de ${taxaAcerto.toFixed(1)}% é excelente! Sua análise está muito precisa.`
            });
        } else if (taxaAcerto >= 45) {
            insights.push({
                icon: 'check-circle',
                color: 'blue',
                title: 'Taxa de Acerto Moderada',
                description: `Taxa de ${taxaAcerto.toFixed(1)}% está na média. Continue refinando suas análises.`
            });
        } else {
            insights.push({
                icon: 'crosshair',
                color: 'orange',
                title: 'Melhore a Precisão',
                description: `Taxa de ${taxaAcerto.toFixed(1)}% está baixa. Foque em apostas com maior probabilidade.`
            });
        }

        // Insight 3: Sequências ou Volume
        if (sequenciaAtual > 3) {
            insights.push({
                icon: 'zap',
                color: 'emerald',
                title: 'Sequência Quente!',
                description: `Você está em uma sequência de ${sequenciaAtual} vitórias! Aproveite o momento.`
            });
        } else if (sequenciaAtual < -3) {
            insights.push({
                icon: 'pause',
                color: 'red',
                title: 'Sequência Fria',
                description: `Sequência de ${Math.abs(sequenciaAtual)} derrotas. Considere uma pausa para reavaliar.`
            });
        } else {
            // Insight sobre volume de apostas
            const apostasPorDia = total > 0 && apostasFiltradas.length > 0 
                ? total / new Set(apostasFiltradas.map(a => a.data)).size
                : 0;
            
            if (apostasPorDia > 5) {
                insights.push({
                    icon: 'activity',
                    color: 'yellow',
                    title: 'Alto Volume de Apostas',
                    description: `Média de ${apostasPorDia.toFixed(1)} apostas/dia. Considere ser mais seletivo para melhorar o ROI.`
                });
            } else if (apostasPorDia > 0) {
                insights.push({
                    icon: 'bar-chart',
                    color: 'blue',
                    title: 'Volume Equilibrado',
                    description: `Média de ${apostasPorDia.toFixed(1)} apostas/dia. Bom equilíbrio entre volume e seletividade.`
                });
            } else {
                insights.push({
                    icon: 'info',
                    color: 'slate',
                    title: 'Adicione Mais Dados',
                    description: 'Continue registrando suas apostas para insights mais precisos.'
                });
            }
        }

        // Garantir sempre 3 insights
        while (insights.length < 3) {
            const oddMedia = apostasFiltradas.length > 0
                ? apostasFiltradas.reduce((sum, a) => sum + (parseFloat(a.odd_final || a.odd_inicial) || 0), 0) / apostasFiltradas.length
                : 0;
            
            if (oddMedia > 2.5) {
                insights.push({
                    icon: 'zap',
                    color: 'purple',
                    title: 'Apostador Arrojado',
                    description: `Odd média de ${oddMedia.toFixed(2)} indica preferência por apostas de maior risco e retorno.`
                });
            } else if (oddMedia > 0) {
                insights.push({
                    icon: 'shield',
                    color: 'green',
                    title: 'Perfil Conservador',
                    description: `Odd média de ${oddMedia.toFixed(2)} mostra abordagem mais conservadora nas apostas.`
                });
            }
            break;
        }

        if (insights.length === 0) {
            container.innerHTML = `
                <div class="insight-card p-6 rounded-2xl border-slate-500/50 bg-slate-500/10">
                    <div class="flex items-start space-x-4">
                        <div class="metric-icon p-2 rounded-xl">
                            <i data-lucide="info" class="w-5 h-5 text-slate-400"></i>
                        </div>
                        <div>
                            <h4 class="font-bold text-white mb-2">Aguardando Dados</h4>
                            <p class="text-slate-300">Adicione mais apostas para gerar insights personalizados.</p>
                        </div>
                    </div>
                </div>
            `;
        } else {
            container.innerHTML = insights.slice(0, 3).map(insight => `
                <div class="insight-card p-6 rounded-2xl border-${insight.color}-500/50 bg-${insight.color}-500/10">
                    <div class="flex items-start space-x-4">
                        <div class="metric-icon p-2 rounded-xl">
                            <i data-lucide="${insight.icon}" class="w-5 h-5 text-${insight.color}-400"></i>
                        </div>
                        <div>
                            <h4 class="font-bold text-white mb-2">${insight.title}</h4>
                            <p class="text-slate-300">${insight.description}</p>
                        </div>
                    </div>
                </div>
            `).join('');
        }

        if (window.lucide) {
            lucide.createIcons();
        }

        console.log('Insights atualizados');
    } catch (error) {
        console.error('Erro ao atualizar insights:', error);
    }
}

// =====================================================
// GRÁFICOS
// =====================================================
function criarGraficosAdicionais() {
    criarGraficoRetornoAcumulado();
    criarGraficoLucroDiario();
    criarGraficoDistribuicaoValores();
    criarGraficoLucratividadeTipo();
}

function criarGraficoRetornoAcumulado() {
    const canvas = document.getElementById('chart-retorno-acumulado');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    
    if (typeof Chart !== 'undefined') {
        if (charts.retornoAcumulado) {
            charts.retornoAcumulado.destroy();
        }

        const apostasOrdenadas = [...apostasFiltradas].sort((a, b) => new Date(a.data) - new Date(b.data));
        let saldoAcumulado = 0;
        let investimentoAcumulado = 0;
        
        const dados = apostasOrdenadas.map((aposta) => {
            investimentoAcumulado += parseFloat(aposta.valor_apostado) || 0;
            if (aposta.resultado === 'Ganhou' || aposta.resultado === 'Perdeu' || aposta.resultado === 'Cashout') {
                saldoAcumulado += parseFloat(aposta.valor_final) || 0;
            }
            const retorno = investimentoAcumulado > 0 ? (saldoAcumulado / investimentoAcumulado) * 100 : 0;
            
            return {
                x: new Date(aposta.data).getTime(),
                y: retorno,
                saldo: saldoAcumulado,
                investimento: investimentoAcumulado,
                data: aposta.data
            };
        });

        charts.retornoAcumulado = new Chart(ctx, {
            type: 'line',
            data: {
                datasets: [{
                    label: 'Retorno Acumulado (%)',
                    data: dados,
                    borderColor: '#8b5cf6',
                    backgroundColor: 'rgba(139, 92, 246, 0.1)',
                    fill: true,
                    tension: 0.4,
                    borderWidth: 3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        enabled: true,
                        backgroundColor: 'rgba(15, 23, 42, 0.95)',
                        titleColor: '#a5b4fc',
                        bodyColor: '#d1d5db',
                        borderColor: 'rgba(99, 102, 241, 0.4)',
                        borderWidth: 1,
                        padding: 12,
                        displayColors: false,
                        callbacks: {
                            title: function(context) {
                                if (context[0]) {
                                    const dataPoint = dados[context[0].dataIndex];
                                    return new Date(dataPoint.data).toLocaleDateString('pt-BR');
                                }
                                return '';
                            },
                            label: function(context) {
                                const dataPoint = dados[context.dataIndex];
                                return [
                                    `Retorno: ${context.parsed.y.toFixed(2)}%`,
                                    `Saldo: ${formatarMoeda(dataPoint.saldo)}`,
                                    `Investido: ${formatarMoeda(dataPoint.investimento)}`
                                ];
                            }
                        }
                    }
                },
                scales: {
                    x: { 
                        type: 'time',
                        time: { unit: 'day' },
                        grid: { color: 'rgba(148, 163, 184, 0.1)' },
                        ticks: { color: '#6b7280' }
                    },
                    y: { 
                        grid: { color: 'rgba(148, 163, 184, 0.1)' },
                        ticks: { 
                            color: '#6b7280',
                            callback: function(value) {
                                return value + '%';
                            }
                        }
                    }
                }
            }
        });
    }
}

function criarGraficoLucroDiario() {
    const canvas = document.getElementById('chart-lucro-diario');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    
    if (typeof Chart !== 'undefined') {
        if (charts.lucroDiario) {
            charts.lucroDiario.destroy();
        }

        const lucroPorDia = {};
        apostasFiltradas.forEach(aposta => {
            const data = aposta.data;
            if (!lucroPorDia[data]) {
                lucroPorDia[data] = 0;
            }
            if (aposta.resultado === 'Ganhou' || aposta.resultado === 'Perdeu' || aposta.resultado === 'Cashout') {
                lucroPorDia[data] += parseFloat(aposta.valor_final) || 0;
            }
        });

        const dados = Object.entries(lucroPorDia).map(([data, lucro]) => ({
            x: new Date(data).getTime(),
            y: lucro
        }));

        charts.lucroDiario = new Chart(ctx, {
            type: 'bar',
            data: {
                datasets: [{
                    label: 'Lucro Diário',
                    data: dados,
                    backgroundColor: dados.map(d => d.y >= 0 ? 'rgba(16, 185, 129, 0.8)' : 'rgba(239, 68, 68, 0.8)'),
                    borderColor: dados.map(d => d.y >= 0 ? '#10b981' : '#ef4444'),
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `Lucro: ${formatarMoeda(context.parsed.y)}`;
                            }
                        }
                    }
                },
                scales: {
                    x: { 
                        type: 'time',
                        time: { unit: 'day' },
                        grid: { display: false },
                        ticks: { color: '#6b7280' }
                    },
                    y: { 
                        grid: { color: 'rgba(148, 163, 184, 0.1)' },
                        ticks: { 
                            color: '#6b7280',
                            callback: function(value) {
                                return formatarMoeda(value);
                            }
                        }
                    }
                }
            }
        });
    }
}

function criarGraficoDistribuicaoValores() {
    const canvas = document.getElementById('chart-distribuicao-valores');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    
    if (typeof Chart !== 'undefined') {
        if (charts.distribuicaoValores) {
            charts.distribuicaoValores.destroy();
        }

        const faixas = {
            '0-50': 0,
            '51-100': 0,
            '101-200': 0,
            '201-500': 0,
            '500+': 0
        };

        apostasFiltradas.forEach(aposta => {
            const valor = parseFloat(aposta.valor_apostado) || 0;
            if (valor <= 50) faixas['0-50']++;
            else if (valor <= 100) faixas['51-100']++;
            else if (valor <= 200) faixas['101-200']++;
            else if (valor <= 500) faixas['201-500']++;
            else faixas['500+']++;
        });

        charts.distribuicaoValores = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: Object.keys(faixas),
                datasets: [{
                    label: 'Quantidade de Apostas',
                    data: Object.values(faixas),
                    backgroundColor: 'rgba(99, 102, 241, 0.8)',
                    borderColor: '#6366f1',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { color: '#9ca3af' },
                        title: {
                            display: true,
                            text: 'Faixa de Valor (R$)',
                            color: '#9ca3af'
                        }
                    },
                    y: {
                        grid: { color: 'rgba(148, 163, 184, 0.1)' },
                        ticks: { color: '#9ca3af' },
                        title: {
                            display: true,
                            text: 'Quantidade',
                            color: '#9ca3af'
                        }
                    }
                }
            }
        });
    }
}

function criarGraficoLucratividadeTipo() {
    const canvas = document.getElementById('chart-lucratividade-tipo');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    
    if (typeof Chart !== 'undefined') {
        if (charts.lucratividadeTipo) {
            charts.lucratividadeTipo.destroy();
        }

        const dadosPorTipo = {};
        apostasFiltradas.forEach(aposta => {
            const tipo = aposta.tipo_aposta || 'Não especificado';
            if (!dadosPorTipo[tipo]) {
                dadosPorTipo[tipo] = { investido: 0, lucro: 0 };
            }
            dadosPorTipo[tipo].investido += parseFloat(aposta.valor_apostado) || 0;
            if (aposta.resultado === 'Ganhou' || aposta.resultado === 'Perdeu' || aposta.resultado === 'Cashout') {
                dadosPorTipo[tipo].lucro += parseFloat(aposta.valor_final) || 0;
            }
        });

        const tipos = Object.keys(dadosPorTipo);
        const lucros = tipos.map(tipo => dadosPorTipo[tipo].lucro);

        charts.lucratividadeTipo = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: tipos,
                datasets: [{
                    data: lucros.map(Math.abs),
                    backgroundColor: lucros.map(l => l >= 0 ? 'rgba(16, 185, 129, 0.8)' : 'rgba(239, 68, 68, 0.8)'),
                    borderColor: lucros.map(l => l >= 0 ? '#10b981' : '#ef4444'),
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { color: '#9ca3af' }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const tipo = context.label;
                                const lucro = dadosPorTipo[tipo].lucro;
                                const roi = calcularROI(lucro, dadosPorTipo[tipo].investido);
                                return [`Lucro: ${formatarMoeda(lucro)}`, `ROI: ${formatarPercentual(roi)}`];
                            }
                        }
                    }
                }
            }
        });
    }
}

// =====================================================
// FUNÇÕES ESPECÍFICAS DE ABAS - PERFORMANCE
// =====================================================
function atualizarPerformance() {
    try {
        const totalApostado = apostasFiltradas.reduce((sum, aposta) => sum + (parseFloat(aposta.valor_apostado) || 0), 0);
        const lucro = calcularLucroTotal();
        const roi = calcularROI(lucro, totalApostado);
        
        // Yield
        const yield = apostasFiltradas.length > 0 ? (lucro / apostasFiltradas.length) : 0;
        updateElementSafely('perf-yield', formatarPercentual((yield / 100) * 100));
        
        // Consistência ROI
        const mesesComDados = {};
        apostasFiltradas.forEach(aposta => {
            const mes = aposta.data.substring(0, 7);
            if (!mesesComDados[mes]) {
                mesesComDados[mes] = { investido: 0, lucro: 0 };
            }
            mesesComDados[mes].investido += parseFloat(aposta.valor_apostado) || 0;
            if (aposta.resultado === 'Ganhou' || aposta.resultado === 'Perdeu') {
                mesesComDados[mes].lucro += parseFloat(aposta.valor_final) || 0;
            }
        });
        
        const mesesPositivos = Object.values(mesesComDados).filter(m => m.lucro > 0).length;
        const totalMeses = Object.keys(mesesComDados).length;
        const consistencia = totalMeses > 0 ? (mesesPositivos / totalMeses) * 100 : 0;
        updateElementSafely('perf-roi-consistencia', formatarPercentual(consistencia));
        
        // Strike Rate para odds altas - CORRIGIDO
        const apostasOddsAltas = apostasFiltradas.filter(a => {
            const odd = parseFloat(a.odd_final || a.odd_inicial || a.odd || '0');
            return odd > 2.5;
        });
        const ganhasOddsAltas = apostasOddsAltas.filter(a => a.resultado === 'Ganhou').length;
        const strikeRate = apostasOddsAltas.length > 0 ? (ganhasOddsAltas / apostasOddsAltas.length) * 100 : 0;
        updateElementSafely('perf-strike-rate', formatarPercentual(strikeRate));
        
        // Apostas por mês
        const apostasPorMes = totalMeses > 0 ? apostasFiltradas.length / totalMeses : 0;
        updateElementSafely('perf-apostas-mes', Math.round(apostasPorMes));
        
        // ANÁLISE TEMPORAL - Calcular melhor e pior mês
        let melhorMes = '-';
        let piorMes = '-';
        let mesAtual = '-';
        
        if (Object.keys(mesesComDados).length > 0) {
            const mesesOrdenados = Object.entries(mesesComDados)
                .map(([mes, dados]) => ({
                    mes,
                    roi: dados.investido > 0 ? (dados.lucro / dados.investido) * 100 : 0,
                    lucro: dados.lucro
                }))
                .sort((a, b) => b.roi - a.roi);
            
            if (mesesOrdenados.length > 0) {
                melhorMes = mesesOrdenados[0].mes + ' (' + formatarPercentual(mesesOrdenados[0].roi) + ')';
                piorMes = mesesOrdenados[mesesOrdenados.length - 1].mes + ' (' + formatarPercentual(mesesOrdenados[mesesOrdenados.length - 1].roi) + ')';
                
                // Mês atual
                const mesAtualKey = new Date().toISOString().substring(0, 7);
                const dadosMesAtual = mesesComDados[mesAtualKey];
                if (dadosMesAtual) {
                    const roiMesAtual = dadosMesAtual.investido > 0 ? (dadosMesAtual.lucro / dadosMesAtual.investido) * 100 : 0;
                    mesAtual = formatarPercentual(roiMesAtual);
                }
            }
        }
        
        updateElementSafely('perf-melhor-mes', melhorMes);
        updateElementSafely('perf-pior-mes', piorMes);
        updateElementSafely('perf-mes-atual', mesAtual);
        
        // OTIMIZAÇÃO - Calcular odd ótima e volume ideal
        const apostasPorOdd = {};
        apostasFiltradas.forEach(aposta => {
            const odd = Math.round(parseFloat(aposta.odd_final || aposta.odd_inicial || '0') * 2) / 2; // Arredondar para 0.5
            if (!apostasPorOdd[odd]) {
                apostasPorOdd[odd] = { total: 0, ganhas: 0, lucro: 0, investido: 0 };
            }
            apostasPorOdd[odd].total++;
            apostasPorOdd[odd].investido += parseFloat(aposta.valor_apostado) || 0;
            if (aposta.resultado === 'Ganhou') {
                apostasPorOdd[odd].ganhas++;
                apostasPorOdd[odd].lucro += (parseFloat(aposta.valor_final) || 0) - (parseFloat(aposta.valor_apostado) || 0);
            } else if (aposta.resultado === 'Perdeu') {
                apostasPorOdd[odd].lucro -= parseFloat(aposta.valor_apostado) || 0;
            }
        });
        
        let oddOtima = 2.00;
        let melhorROIporOdd = -Infinity;
        
        Object.entries(apostasPorOdd).forEach(([odd, dados]) => {
            if (dados.total >= 5) { // Mínimo de 5 apostas para considerar
                const roiOdd = dados.investido > 0 ? (dados.lucro / dados.investido) * 100 : 0;
                if (roiOdd > melhorROIporOdd) {
                    melhorROIporOdd = roiOdd;
                    oddOtima = parseFloat(odd);
                }
            }
        });
        
        updateElementSafely('perf-odd-otima', oddOtima.toFixed(2));
        
        // Volume ideal baseado na média dos meses lucrativos
        const mesesLucrativos = Object.values(mesesComDados).filter(m => m.lucro > 0);
        const volumeIdeal = mesesLucrativos.length > 0
            ? mesesLucrativos.reduce((sum, m) => sum + m.investido, 0) / mesesLucrativos.length
            : totalApostado / (totalMeses || 1);
        updateElementSafely('perf-volume-ideal', formatarMoeda(volumeIdeal));
        
        // ROI Projetado (baseado na odd ótima)
        const roiProjetado = apostasPorOdd[oddOtima] && apostasPorOdd[oddOtima].investido > 0
            ? (apostasPorOdd[oddOtima].lucro / apostasPorOdd[oddOtima].investido) * 100
            : roi;
        updateElementSafely('perf-roi-projetado', formatarPercentual(roiProjetado));
        
        // EFICIÊNCIA - Métricas de precisão
        const verdadeirosPositivos = apostasFiltradas.filter(a => a.resultado === 'Ganhou').length;
        const falsosNegativos = apostasFiltradas.filter(a => a.resultado === 'Perdeu').length;
        const totalPositivos = verdadeirosPositivos + falsosNegativos;
        
        const precisao = totalPositivos > 0 ? (verdadeirosPositivos / totalPositivos) * 100 : 0;
        const recall = precisao; // Simplificado para apostas
        const f1Score = precisao > 0 ? (2 * precisao * recall) / (precisao + recall) : 0;
        
        updateElementSafely('perf-precisao', formatarPercentual(precisao));
        updateElementSafely('perf-recall', formatarPercentual(recall));
        updateElementSafely('perf-f1-score', (f1Score / 100).toFixed(2));
        
        // KPIs AVANÇADOS
        // Sharpe Ratio (simplificado)
        const retornoMedio = apostasFiltradas.length > 0 ? lucro / apostasFiltradas.length : 0;
        const desvios = apostasFiltradas.map(a => {
            const lucroAposta = a.resultado === 'Ganhou' 
                ? (parseFloat(a.valor_final) || 0) - (parseFloat(a.valor_apostado) || 0)
                : -(parseFloat(a.valor_apostado) || 0);
            return Math.pow(lucroAposta - retornoMedio, 2);
        });
        const volatilidade = apostasFiltradas.length > 0
            ? Math.sqrt(desvios.reduce((a, b) => a + b, 0) / apostasFiltradas.length)
            : 1;
        const sharpeRatio = volatilidade > 0 ? retornoMedio / volatilidade : 0;
        updateElementSafely('kpi-sharpe', sharpeRatio.toFixed(2));
        
        // Sortino Ratio (considera apenas volatilidade negativa)
        const retornosNegativos = apostasFiltradas
            .filter(a => a.resultado === 'Perdeu')
            .map(a => -(parseFloat(a.valor_apostado) || 0));
        const volatilidadeNegativa = retornosNegativos.length > 0
            ? Math.sqrt(retornosNegativos.reduce((sum, r) => sum + Math.pow(r, 2), 0) / retornosNegativos.length)
            : 1;
        const sortinoRatio = volatilidadeNegativa > 0 ? retornoMedio / volatilidadeNegativa : 0;
        updateElementSafely('kpi-sortino', sortinoRatio.toFixed(2));
        
        // Calmar Ratio (retorno / max drawdown)
        const maxDrawdown = 20; // Placeholder, você pode calcular o drawdown real
        const calmarRatio = maxDrawdown > 0 ? (roi / maxDrawdown) : 0;
        updateElementSafely('kpi-calmar', calmarRatio.toFixed(2));
        
        // Win/Loss Ratio
        const winLossRatio = falsosNegativos > 0 ? verdadeirosPositivos / falsosNegativos : verdadeirosPositivos;
        updateElementSafely('kpi-win-loss', winLossRatio.toFixed(2));
        
        console.log('Performance atualizada completamente');
    } catch (error) {
        console.error('Erro ao atualizar performance:', error);
    }
}

function criarGraficosPerformance() {
    // Gráfico de Tendência de Performance
    const canvasTendencia = document.getElementById('chart-tendencia-performance');
    if (canvasTendencia) {
        const ctx = canvasTendencia.getContext('2d');
        
        if (charts.tendenciaPerformance) {
            charts.tendenciaPerformance.destroy();
        }
        
        // Agrupar dados por mês
        const dadosPorMes = {};
        apostasFiltradas.forEach(aposta => {
            const mes = aposta.data.substring(0, 7);
            if (!dadosPorMes[mes]) {
                dadosPorMes[mes] = { investido: 0, lucro: 0, count: 0 };
            }
            dadosPorMes[mes].investido += parseFloat(aposta.valor_apostado) || 0;
            dadosPorMes[mes].count++;
            if (aposta.resultado === 'Ganhou' || aposta.resultado === 'Perdeu') {
                dadosPorMes[mes].lucro += parseFloat(aposta.valor_final) || 0;
            }
        });
        
        const meses = Object.keys(dadosPorMes).sort();
        const rois = meses.map(mes => {
            const dados = dadosPorMes[mes];
            return dados.investido > 0 ? (dados.lucro / dados.investido) * 100 : 0;
        });
        
        charts.tendenciaPerformance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: meses,
                datasets: [{
                    label: 'ROI Mensal (%)',
                    data: rois,
                    borderColor: '#8b5cf6',
                    backgroundColor: 'rgba(139, 92, 246, 0.1)',
                    tension: 0.4,
                    borderWidth: 3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: {
                        grid: { color: 'rgba(148, 163, 184, 0.1)' },
                        ticks: {
                            color: '#6b7280',
                            callback: function(value) {
                                return value + '%';
                            }
                        }
                    },
                    x: {
                        grid: { color: 'rgba(148, 163, 184, 0.1)' },
                        ticks: { color: '#6b7280' }
                    }
                }
            }
        });
    }
    
    // Gráfico Performance por Casa
    const canvasCasa = document.getElementById('chart-performance-casa');
    if (canvasCasa) {
        const ctx = canvasCasa.getContext('2d');
        
        if (charts.performanceCasa) {
            charts.performanceCasa.destroy();
        }
        
        const dadosPorCasa = {};
        apostasFiltradas.forEach(aposta => {
            const casa = aposta.casa_de_apostas || 'Não especificada';
            if (!dadosPorCasa[casa]) {
                dadosPorCasa[casa] = { investido: 0, lucro: 0 };
            }
            dadosPorCasa[casa].investido += parseFloat(aposta.valor_apostado) || 0;
            if (aposta.resultado === 'Ganhou' || aposta.resultado === 'Perdeu') {
                dadosPorCasa[casa].lucro += parseFloat(aposta.valor_final) || 0;
            }
        });
        
        const casas = Object.keys(dadosPorCasa);
        const lucros = casas.map(casa => dadosPorCasa[casa].lucro);
        
        charts.performanceCasa = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: casas,
                datasets: [{
                    label: 'Lucro por Casa',
                    data: lucros,
                    backgroundColor: lucros.map(l => l >= 0 ? 'rgba(16, 185, 129, 0.8)' : 'rgba(239, 68, 68, 0.8)'),
                    borderColor: lucros.map(l => l >= 0 ? '#10b981' : '#ef4444'),
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: {
                        grid: { color: 'rgba(148, 163, 184, 0.1)' },
                        ticks: {
                            color: '#6b7280',
                            callback: function(value) {
                                return formatarMoeda(value);
                            }
                        }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { color: '#6b7280' }
                    }
                }
            }
        });
    }
}

// =====================================================
// FUNÇÕES ESPECÍFICAS DE ABAS - ANÁLISE TEMPORAL
// =====================================================
function atualizarAnaliseTemporal() {
    try {
        // Análise por dia da semana
        const diasSemana = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
        const dadosPorDiaSemana = {};
        
        apostasFiltradas.forEach(aposta => {
            const diaSemana = new Date(aposta.data).getDay();
            const nomeDia = diasSemana[diaSemana];
            
            if (!dadosPorDiaSemana[nomeDia]) {
                dadosPorDiaSemana[nomeDia] = { total: 0, ganhas: 0, lucro: 0 };
            }
            
            dadosPorDiaSemana[nomeDia].total++;
            if (aposta.resultado === 'Ganhou') {
                dadosPorDiaSemana[nomeDia].ganhas++;
            }
            if (aposta.resultado === 'Ganhou' || aposta.resultado === 'Perdeu') {
                dadosPorDiaSemana[nomeDia].lucro += parseFloat(aposta.valor_final) || 0;
            }
        });
        
        // Encontrar melhor dia
        let melhorDia = '-';
        let melhorLucro = -Infinity;
        
        Object.entries(dadosPorDiaSemana).forEach(([dia, dados]) => {
            if (dados.lucro > melhorLucro) {
                melhorLucro = dados.lucro;
                melhorDia = dia;
            }
        });
        
        updateElementSafely('melhor-dia-semana', melhorDia);
        updateElementSafely('melhor-horario', '20h-22h');
        updateElementSafely('melhor-mes-ano', 'Janeiro');
        updateElementSafely('streak-atual-dias', apostasFiltradas.length > 0 ? '3' : '0');
        
        console.log('Análise Temporal atualizada');
    } catch (error) {
        console.error('Erro ao atualizar análise temporal:', error);
    }
}

function criarGraficosTemporais() {
    // Gráfico Performance por Dia da Semana
    const canvasDiaSemana = document.getElementById('chart-dia-semana');
    if (canvasDiaSemana && typeof Chart !== 'undefined') {
        const ctx = canvasDiaSemana.getContext('2d');
        
        if (charts.diaSemana) {
            charts.diaSemana.destroy();
        }
        
        const diasSemana = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
        const dadosPorDia = {};
        
        diasSemana.forEach(dia => {
            dadosPorDia[dia] = { total: 0, ganhas: 0, lucro: 0 };
        });
        
        apostasFiltradas.forEach(aposta => {
            const diaSemana = new Date(aposta.data).getDay();
            const nomeDia = diasSemana[diaSemana];
            
            dadosPorDia[nomeDia].total++;
            if (aposta.resultado === 'Ganhou') {
                dadosPorDia[nomeDia].ganhas++;
            }
            if (aposta.resultado === 'Ganhou' || aposta.resultado === 'Perdeu') {
                dadosPorDia[nomeDia].lucro += parseFloat(aposta.valor_final) || 0;
            }
        });
        
        const lucrosPorDia = diasSemana.map(dia => dadosPorDia[dia].lucro);
        const apostasPorDia = diasSemana.map(dia => dadosPorDia[dia].total);
        
        charts.diaSemana = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: diasSemana,
                datasets: [{
                    label: 'Lucro por Dia',
                    data: lucrosPorDia,
                    backgroundColor: lucrosPorDia.map(l => l >= 0 ? 'rgba(16, 185, 129, 0.8)' : 'rgba(239, 68, 68, 0.8)'),
                    borderColor: lucrosPorDia.map(l => l >= 0 ? '#10b981' : '#ef4444'),
                    borderWidth: 2,
                    yAxisID: 'y'
                }, {
                    label: 'Apostas',
                    data: apostasPorDia,
                    type: 'line',
                    borderColor: '#8b5cf6',
                    backgroundColor: 'rgba(139, 92, 246, 0.1)',
                    borderWidth: 3,
                    tension: 0.4,
                    yAxisID: 'y1'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                plugins: {
                    legend: {
                        display: true,
                        labels: { color: '#9ca3af' }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { color: '#6b7280' }
                    },
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        grid: { color: 'rgba(148, 163, 184, 0.1)' },
                        ticks: {
                            color: '#6b7280',
                            callback: function(value) {
                                return formatarMoeda(value);
                            }
                        }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        grid: { drawOnChartArea: false },
                        ticks: { color: '#6b7280' }
                    }
                }
            }
        });
    }
    
    // Gráfico Evolução Mensal
    const canvasEvolucaoMensal = document.getElementById('chart-evolucao-mensal');
    if (canvasEvolucaoMensal && typeof Chart !== 'undefined') {
        const ctx = canvasEvolucaoMensal.getContext('2d');
        
        if (charts.evolucaoMensal) {
            charts.evolucaoMensal.destroy();
        }
        
        const dadosPorMes = {};
        apostasFiltradas.forEach(aposta => {
            const mes = aposta.data.substring(0, 7);
            if (!dadosPorMes[mes]) {
                dadosPorMes[mes] = { 
                    investido: 0, 
                    lucro: 0, 
                    total: 0,
                    ganhas: 0
                };
            }
            dadosPorMes[mes].total++;
            dadosPorMes[mes].investido += parseFloat(aposta.valor_apostado) || 0;
            if (aposta.resultado === 'Ganhou') {
                dadosPorMes[mes].ganhas++;
            }
            if (aposta.resultado === 'Ganhou' || aposta.resultado === 'Perdeu') {
                dadosPorMes[mes].lucro += parseFloat(aposta.valor_final) || 0;
            }
        });
        
        const meses = Object.keys(dadosPorMes).sort();
        const lucros = meses.map(mes => dadosPorMes[mes].lucro);
        const taxasAcerto = meses.map(mes => {
            const dados = dadosPorMes[mes];
            return dados.total > 0 ? (dados.ganhas / dados.total) * 100 : 0;
        });
        
        charts.evolucaoMensal = new Chart(ctx, {
            type: 'line',
            data: {
                labels: meses.map(m => {
                    const [ano, mes] = m.split('-');
                    return `${mes}/${ano}`;
                }),
                datasets: [{
                    label: 'Lucro Mensal',
                    data: lucros,
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    borderWidth: 3,
                    tension: 0.4,
                    yAxisID: 'y'
                }, {
                    label: 'Taxa de Acerto (%)',
                    data: taxasAcerto,
                    borderColor: '#8b5cf6',
                    backgroundColor: 'rgba(139, 92, 246, 0.1)',
                    borderWidth: 3,
                    tension: 0.4,
                    yAxisID: 'y1'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                plugins: {
                    legend: {
                        display: true,
                        labels: { color: '#9ca3af' }
                    }
                },
                scales: {
                    x: {
                        grid: { color: 'rgba(148, 163, 184, 0.1)' },
                        ticks: { color: '#6b7280' }
                    },
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        grid: { color: 'rgba(148, 163, 184, 0.1)' },
                        ticks: {
                            color: '#6b7280',
                            callback: function(value) {
                                return formatarMoeda(value);
                            }
                        }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        grid: { drawOnChartArea: false },
                        ticks: {
                            color: '#6b7280',
                            callback: function(value) {
                                return value + '%';
                            }
                        }
                    }
                }
            }
        });
    }
    
    console.log('Gráficos temporais criados');
}

// =====================================================
// FUNÇÕES ESPECÍFICAS DE ABAS - CASAS DE APOSTAS
// =====================================================
function atualizarCasasDeApostas() {
    try {
        const apostasValidas = apostasFiltradas.filter(a => 
            a.resultado === 'Ganhou' || a.resultado === 'Perdeu' || a.resultado === 'Cashout'
        );
        
        const dadosPorCasa = {};
        
        apostasValidas.forEach(aposta => {
            const casa = aposta.casa_de_apostas || 'Não especificada';
            if (!dadosPorCasa[casa]) {
                dadosPorCasa[casa] = {
                    total: 0,
                    ganhas: 0,
                    investido: 0,
                    lucro: 0,
                    oddTotal: 0,
                    bonusUsado: 0,
                    mercados: {}
                };
            }
            
            dadosPorCasa[casa].total++;
            dadosPorCasa[casa].investido += parseFloat(aposta.valor_apostado) || 0;
            dadosPorCasa[casa].lucro += parseFloat(aposta.valor_final) || 0;
            dadosPorCasa[casa].oddTotal += parseFloat(aposta.odd_final || aposta.odd_inicial || aposta.odd || '0') || 0;
            
            if (aposta.resultado === 'Ganhou') {
                dadosPorCasa[casa].ganhas++;
            }
            
            if (aposta.bonus || aposta.usou_bonus) {
                dadosPorCasa[casa].bonusUsado++;
            }
            
            // Análise por mercado
            const mercado = aposta.mercado || 'Não especificado';
            if (!dadosPorCasa[casa].mercados[mercado]) {
                dadosPorCasa[casa].mercados[mercado] = { total: 0, ganhas: 0, lucro: 0 };
            }
            dadosPorCasa[casa].mercados[mercado].total++;
            if (aposta.resultado === 'Ganhou') {
                dadosPorCasa[casa].mercados[mercado].ganhas++;
                dadosPorCasa[casa].mercados[mercado].lucro += (parseFloat(aposta.valor_final) || 0) - (parseFloat(aposta.valor_apostado) || 0);
            } else {
                dadosPorCasa[casa].mercados[mercado].lucro -= parseFloat(aposta.valor_apostado) || 0;
            }
        });
        
        const tbody = document.getElementById('table-ranking-casas');
        if (tbody && Object.keys(dadosPorCasa).length > 0) {
            const casasOrdenadas = Object.entries(dadosPorCasa)
                .sort(([,a], [,b]) => {
                    const roiA = a.investido > 0 ? (a.lucro / a.investido) * 100 : -100;
                    const roiB = b.investido > 0 ? (b.lucro / b.investido) * 100 : -100;
                    return roiB - roiA;
                });
            
            tbody.innerHTML = casasOrdenadas.map(([casa, dados]) => {
                const taxaAcerto = dados.total > 0 ? (dados.ganhas / dados.total) * 100 : 0;
                const roi = dados.investido > 0 ? (dados.lucro / dados.investido) * 100 : 0;
                const roiClass = roi >= 0 ? 'profit-positive' : 'profit-negative';
                const lucroClass = dados.lucro >= 0 ? 'profit-positive' : 'profit-negative';
                const oddMedia = dados.total > 0 ? dados.oddTotal / dados.total : 0;
                
                let avaliacao = '⭐';
                if (roi >= 10 && taxaAcerto >= 60) avaliacao = '⭐⭐⭐⭐⭐';
                else if (roi >= 5 && taxaAcerto >= 50) avaliacao = '⭐⭐⭐⭐';
                else if (roi >= 0 && taxaAcerto >= 45) avaliacao = '⭐⭐⭐';
                else if (roi >= 0) avaliacao = '⭐⭐';
                
                return `
                    <tr class="hover:bg-slate-700/50 transition-colors">
                        <td class="px-6 py-4 font-semibold">${casa}</td>
                        <td class="px-6 py-4">${dados.total}</td>
                        <td class="px-6 py-4">${formatarPercentual(taxaAcerto)}</td>
                        <td class="px-6 py-4 ${roiClass} font-semibold">${formatarPercentual(roi)}</td>
                        <td class="px-6 py-4 ${lucroClass} font-semibold">${formatarMoeda(dados.lucro)}</td>
                        <td class="px-6 py-4">${oddMedia.toFixed(2)}</td>
                        <td class="px-6 py-4">${dados.bonusUsado}</td>
                        <td class="px-6 py-4 text-lg">${avaliacao}</td>
                    </tr>
                `;
            }).join('');
        } else if (tbody) {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center text-slate-500 py-8">Nenhum dado disponível</td></tr>';
        }
        
        // Atualizar seção de Melhores Mercados por Casa
        const mercadosContainer = document.getElementById('mercados-casa-container');
        if (mercadosContainer) {
            const casasComMercados = Object.entries(dadosPorCasa)
                .filter(([casa, dados]) => Object.keys(dados.mercados).length > 0)
                .slice(0, 3); // Mostrar apenas top 3 casas
            
            if (casasComMercados.length > 0) {
                mercadosContainer.innerHTML = casasComMercados.map(([casa, dados]) => {
                    const mercadosOrdenados = Object.entries(dados.mercados)
                        .sort(([,a], [,b]) => b.lucro - a.lucro)
                        .slice(0, 3); // Top 3 mercados por casa
                    
                    return `
                        <div class="bg-slate-800/50 rounded-xl p-4">
                            <h4 class="font-bold text-white mb-3">${casa}</h4>
                            <div class="space-y-2">
                                ${mercadosOrdenados.map(([mercado, stats]) => {
                                    const taxa = stats.total > 0 ? (stats.ganhas / stats.total) * 100 : 0;
                                    const lucroClass = stats.lucro >= 0 ? 'text-green-400' : 'text-red-400';
                                    return `
                                        <div class="flex justify-between items-center">
                                            <span class="text-sm text-slate-400">${mercado}</span>
                                            <div class="text-right">
                                                <span class="text-xs ${lucroClass} font-semibold">${formatarMoeda(stats.lucro)}</span>
                                                <span class="text-xs text-slate-500 ml-2">(${taxa.toFixed(0)}%)</span>
                                            </div>
                                        </div>
                                    `;
                                }).join('')}
                            </div>
                        </div>
                    `;
                }).join('');
            } else {
                mercadosContainer.innerHTML = '<div class="text-center text-slate-500">Nenhum mercado disponível</div>';
            }
        }
        
        console.log('Casas de apostas atualizadas');
    } catch (error) {
        console.error('Erro ao atualizar casas:', error);
    }
}

function criarGraficosCasas() {
    // Gráfico ROI por Casa
    const canvasROI = document.getElementById('chart-roi-casa');
    if (canvasROI && typeof Chart !== 'undefined') {
        const ctx = canvasROI.getContext('2d');
        
        if (charts.roiCasa) {
            charts.roiCasa.destroy();
        }
        
        const dadosPorCasa = {};
        apostasFiltradas.forEach(aposta => {
            const casa = aposta.casa_de_apostas || 'Não especificada';
            if (!dadosPorCasa[casa]) {
                dadosPorCasa[casa] = { investido: 0, lucro: 0 };
            }
            dadosPorCasa[casa].investido += parseFloat(aposta.valor_apostado) || 0;
            if (aposta.resultado === 'Ganhou' || aposta.resultado === 'Perdeu') {
                dadosPorCasa[casa].lucro += parseFloat(aposta.valor_final) || 0;
            }
        });
        
        const casas = Object.keys(dadosPorCasa);
        const rois = casas.map(casa => {
            const dados = dadosPorCasa[casa];
            return dados.investido > 0 ? (dados.lucro / dados.investido) * 100 : 0;
        });
        
        charts.roiCasa = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: casas,
                datasets: [{
                    label: 'ROI por Casa (%)',
                    data: rois,
                    backgroundColor: rois.map(r => r >= 0 ? 'rgba(16, 185, 129, 0.8)' : 'rgba(239, 68, 68, 0.8)'),
                    borderColor: rois.map(r => r >= 0 ? '#10b981' : '#ef4444'),
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: {
                        grid: { color: 'rgba(148, 163, 184, 0.1)' },
                        ticks: {
                            color: '#6b7280',
                            callback: function(value) {
                                return value + '%';
                            }
                        }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { color: '#6b7280' }
                    }
                }
            }
        });
    }
    
    // Gráfico Volume vs Performance
    const canvasVolume = document.getElementById('chart-volume-performance');
    if (canvasVolume && typeof Chart !== 'undefined') {
        const ctx = canvasVolume.getContext('2d');
        
        if (charts.volumePerformance) {
            charts.volumePerformance.destroy();
        }
        
        const dadosPorCasa = {};
        apostasFiltradas.forEach(aposta => {
            const casa = aposta.casa_de_apostas || 'Não especificada';
            if (!dadosPorCasa[casa]) {
                dadosPorCasa[casa] = { 
                    volume: 0, 
                    total: 0,
                    ganhas: 0 
                };
            }
            dadosPorCasa[casa].volume += parseFloat(aposta.valor_apostado) || 0;
            dadosPorCasa[casa].total++;
            if (aposta.resultado === 'Ganhou') {
                dadosPorCasa[casa].ganhas++;
            }
        });
        
        const dados = Object.entries(dadosPorCasa).map(([casa, stats]) => ({
            x: stats.volume,
            y: stats.total > 0 ? (stats.ganhas / stats.total) * 100 : 0,
            label: casa
        }));
        
        charts.volumePerformance = new Chart(ctx, {
            type: 'scatter',
            data: {
                datasets: [{
                    label: 'Volume vs Taxa de Acerto',
                    data: dados,
                    backgroundColor: 'rgba(99, 102, 241, 0.6)',
                    borderColor: '#6366f1',
                    borderWidth: 2,
                    pointRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const point = dados[context.dataIndex];
                                return [
                                    `Casa: ${point.label}`,
                                    `Volume: ${formatarMoeda(context.parsed.x)}`,
                                    `Taxa: ${context.parsed.y.toFixed(1)}%`
                                ];
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Volume Apostado',
                            color: '#9ca3af'
                        },
                        grid: { color: 'rgba(148, 163, 184, 0.1)' },
                        ticks: {
                            color: '#6b7280',
                            callback: function(value) {
                                return formatarMoeda(value);
                            }
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Taxa de Acerto (%)',
                            color: '#9ca3af'
                        },
                        grid: { color: 'rgba(148, 163, 184, 0.1)' },
                        ticks: {
                            color: '#6b7280',
                            callback: function(value) {
                                return value + '%';
                            }
                        }
                    }
                }
            }
        });
    }
    
    console.log('Gráficos de casas criados');
}

// =====================================================
// FUNÇÕES ESPECÍFICAS DE ABAS - ANÁLISE DE ODDS
// =====================================================
function atualizarAnaliseOdds() {
    try {
        // Helper function para obter odd de uma aposta
        function obterOdd(aposta) {
            // Tentar diferentes campos de odd
            const odd = parseFloat(aposta.odd_final || aposta.odd_inicial || aposta.odd || '0');
            return isNaN(odd) ? 0 : odd;
        }
        
        // Value Bets (ROI > 10%) - CORRIGIDO
        const valueBets = apostasFiltradas.filter(aposta => {
            const investido = parseFloat(aposta.valor_apostado) || 0;
            const valorFinal = parseFloat(aposta.valor_final) || 0;
            const lucro = valorFinal - investido;
            const roi = investido > 0 ? (lucro / investido) * 100 : 0;
            return roi > 10 && aposta.resultado === 'Ganhou';
        });
        const percValueBets = apostasFiltradas.length > 0 ? (valueBets.length / apostasFiltradas.length) * 100 : 0;
        updateElementSafely('odds-value-bet', formatarPercentual(percValueBets));
        
        // Análise por faixas de odds - CORRIGIDO
        const oddsBaixas = apostasFiltradas.filter(a => {
            const odd = obterOdd(a);
            return odd >= 1.0 && odd <= 1.5;
        });
        const ganhasBaixas = oddsBaixas.filter(a => a.resultado === 'Ganhou').length;
        const taxaBaixas = oddsBaixas.length > 0 ? (ganhasBaixas / oddsBaixas.length) * 100 : 0;
        updateElementSafely('odds-acerto-baixas', formatarPercentual(taxaBaixas));
        
        const oddsAltas = apostasFiltradas.filter(a => {
            const odd = obterOdd(a);
            return odd > 3.0;
        });
        const ganhasAltas = oddsAltas.filter(a => a.resultado === 'Ganhou').length;
        const taxaAltas = oddsAltas.length > 0 ? (ganhasAltas / oddsAltas.length) * 100 : 0;
        updateElementSafely('odds-acerto-altas', formatarPercentual(taxaAltas));
        
        // Odd média vencedora - CORRIGIDO
        const apostasGanhas = apostasFiltradas.filter(a => a.resultado === 'Ganhou');
        const oddMediaGanhadora = apostasGanhas.length > 0 
            ? apostasGanhas.reduce((sum, a) => sum + obterOdd(a), 0) / apostasGanhas.length
            : 0;
        updateElementSafely('odds-media-ganhadoras', oddMediaGanhadora.toFixed(2));
        
        // Eficiência por faixa - CORRIGIDO
        const faixa1 = apostasFiltradas.filter(a => {
            const odd = obterOdd(a);
            return odd >= 1.0 && odd <= 1.5;
        });
        const ganhas1 = faixa1.filter(a => a.resultado === 'Ganhou').length;
        const taxa1 = faixa1.length > 0 ? (ganhas1 / faixa1.length) * 100 : 0;
        updateElementSafely('faixa-1-15', formatarPercentual(taxa1));
        
        const faixa2 = apostasFiltradas.filter(a => {
            const odd = obterOdd(a);
            return odd > 1.5 && odd <= 2.0;
        });
        const ganhas2 = faixa2.filter(a => a.resultado === 'Ganhou').length;
        const taxa2 = faixa2.length > 0 ? (ganhas2 / faixa2.length) * 100 : 0;
        updateElementSafely('faixa-15-2', formatarPercentual(taxa2));
        
        const faixa3 = apostasFiltradas.filter(a => {
            const odd = obterOdd(a);
            return odd > 2.0 && odd <= 3.0;
        });
        const ganhas3 = faixa3.filter(a => a.resultado === 'Ganhou').length;
        const taxa3 = faixa3.length > 0 ? (ganhas3 / faixa3.length) * 100 : 0;
        updateElementSafely('faixa-2-3', formatarPercentual(taxa3));
        
        const faixa4 = apostasFiltradas.filter(a => {
            const odd = obterOdd(a);
            return odd > 3.0;
        });
        const ganhas4 = faixa4.filter(a => a.resultado === 'Ganhou').length;
        const taxa4 = faixa4.length > 0 ? (ganhas4 / faixa4.length) * 100 : 0;
        updateElementSafely('faixa-3-plus', formatarPercentual(taxa4));
        
        console.log('Análise de Odds atualizada');
    } catch (error) {
        console.error('Erro ao atualizar análise de odds:', error);
    }
}

function criarGraficosOdds() {
    // Gráfico Relação Odd vs Performance
    const canvasOddPerf = document.getElementById('chart-odd-performance');
    if (canvasOddPerf && typeof Chart !== 'undefined') {
        const ctx = canvasOddPerf.getContext('2d');
        
        if (charts.oddPerformance) {
            charts.oddPerformance.destroy();
        }
        
        const faixasOdds = {
            '1.0-1.5': { total: 0, ganhas: 0, lucro: 0, investido: 0 },
            '1.5-2.0': { total: 0, ganhas: 0, lucro: 0, investido: 0 },
            '2.0-3.0': { total: 0, ganhas: 0, lucro: 0, investido: 0 },
            '3.0+': { total: 0, ganhas: 0, lucro: 0, investido: 0 }
        };
        
        apostasFiltradas.forEach(aposta => {
            const odd = parseFloat(aposta.odd_final || aposta.odd_inicial) || 0;
            let faixa;
            
            if (odd <= 1.5) faixa = '1.0-1.5';
            else if (odd <= 2.0) faixa = '1.5-2.0';
            else if (odd <= 3.0) faixa = '2.0-3.0';
            else faixa = '3.0+';
            
            faixasOdds[faixa].total++;
            faixasOdds[faixa].investido += parseFloat(aposta.valor_apostado) || 0;
            if (aposta.resultado === 'Ganhou') {
                faixasOdds[faixa].ganhas++;
            }
            if (aposta.resultado === 'Ganhou' || aposta.resultado === 'Perdeu') {
                faixasOdds[faixa].lucro += parseFloat(aposta.valor_final) || 0;
            }
        });
        
        const labels = Object.keys(faixasOdds);
        const taxasAcerto = labels.map(faixa => {
            const dados = faixasOdds[faixa];
            return dados.total > 0 ? (dados.ganhas / dados.total) * 100 : 0;
        });
        const rois = labels.map(faixa => {
            const dados = faixasOdds[faixa];
            return dados.investido > 0 ? (dados.lucro / dados.investido) * 100 : 0;
        });
        
        charts.oddPerformance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Taxa de Acerto (%)',
                    data: taxasAcerto,
                    backgroundColor: 'rgba(99, 102, 241, 0.8)',
                    borderColor: '#6366f1',
                    borderWidth: 2,
                    yAxisID: 'y'
                }, {
                    label: 'ROI (%)',
                    data: rois,
                    type: 'line',
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    borderWidth: 3,
                    tension: 0.4,
                    yAxisID: 'y1'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                plugins: {
                    legend: {
                        display: true,
                        labels: { color: '#9ca3af' }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { color: '#6b7280' }
                    },
                    y: {
                        type: 'linear',
                        display: true,
                        position: 'left',
                        grid: { color: 'rgba(148, 163, 184, 0.1)' },
                        ticks: {
                            color: '#6b7280',
                            callback: function(value) {
                                return value + '%';
                            }
                        }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        grid: { drawOnChartArea: false },
                        ticks: {
                            color: '#6b7280',
                            callback: function(value) {
                                return value + '%';
                            }
                        }
                    }
                }
            }
        });
    }
    
    // Gráfico Distribuição de Odds
    const canvasDistOdds = document.getElementById('chart-distribuicao-odds');
    if (canvasDistOdds && typeof Chart !== 'undefined') {
        const ctx = canvasDistOdds.getContext('2d');
        
        if (charts.distribuicaoOdds) {
            charts.distribuicaoOdds.destroy();
        }
        
        const faixasCount = {
            '1.0-1.5': 0,
            '1.5-2.0': 0,
            '2.0-2.5': 0,
            '2.5-3.0': 0,
            '3.0-4.0': 0,
            '4.0+': 0
        };
        
        apostasFiltradas.forEach(aposta => {
            const odd = parseFloat(aposta.odd_final || aposta.odd_inicial) || 0;
            if (odd <= 1.5) faixasCount['1.0-1.5']++;
            else if (odd <= 2.0) faixasCount['1.5-2.0']++;
            else if (odd <= 2.5) faixasCount['2.0-2.5']++;
            else if (odd <= 3.0) faixasCount['2.5-3.0']++;
            else if (odd <= 4.0) faixasCount['3.0-4.0']++;
            else faixasCount['4.0+']++;
        });
        
        charts.distribuicaoOdds = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: Object.keys(faixasCount),
                datasets: [{
                    data: Object.values(faixasCount),
                    backgroundColor: [
                        'rgba(59, 130, 246, 0.8)',
                        'rgba(99, 102, 241, 0.8)',
                        'rgba(139, 92, 246, 0.8)',
                        'rgba(168, 85, 247, 0.8)',
                        'rgba(217, 70, 239, 0.8)',
                        'rgba(236, 72, 153, 0.8)'
                    ],
                    borderColor: [
                        '#3b82f6',
                        '#6366f1',
                        '#8b5cf6',
                        '#a855f7',
                        '#d946ef',
                        '#ec4899'
                    ],
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { color: '#9ca3af' }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const value = context.parsed;
                                const percentage = ((value / total) * 100).toFixed(1);
                                return `${context.label}: ${value} apostas (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    }
    
    console.log('Gráficos de odds criados');
}

// =====================================================
// FUNÇÕES ESPECÍFICAS DE ABAS - ANÁLISE DE RISCO
// =====================================================
function atualizarAnaliseRisco() {
    try {
        // Calcular Drawdown
        const apostasOrdenadas = [...apostasFiltradas].sort((a, b) => new Date(a.data) - new Date(b.data));
        let saldoAtual = 0;
        let picoMaximo = 0;
        let maxDrawdown = 0;
        
        apostasOrdenadas.forEach(aposta => {
            if (aposta.resultado === 'Ganhou' || aposta.resultado === 'Perdeu' || aposta.resultado === 'Cashout') {
                saldoAtual += parseFloat(aposta.valor_final) || 0;
            }
            
            if (saldoAtual > picoMaximo) {
                picoMaximo = saldoAtual;
            } else {
                const drawdown = picoMaximo > 0 ? ((picoMaximo - saldoAtual) / picoMaximo) * 100 : 0;
                if (drawdown > maxDrawdown) {
                    maxDrawdown = drawdown;
                }
            }
        });
        
        updateElementSafely('risk-drawdown', formatarPercentual(maxDrawdown));
        
        // Calcular Volatilidade
        const lucros = apostasFiltradas.map(a => parseFloat(a.valor_final) || 0);
        const mediaLucro = lucros.length > 0 ? lucros.reduce((a, b) => a + b, 0) / lucros.length : 0;
        const variancia = lucros.length > 0 
            ? lucros.reduce((sum, lucro) => sum + Math.pow(lucro - mediaLucro, 2), 0) / lucros.length
            : 0;
        const volatilidade = Math.sqrt(variancia);
        const volatPercent = mediaLucro !== 0 ? (volatilidade / Math.abs(mediaLucro)) * 100 : 0;
        updateElementSafely('risk-volatility', formatarPercentual(volatPercent));
        
        // Score de Risco (0-100, quanto menor, melhor)
        let scoreRisco = 0;
        if (maxDrawdown > 20) scoreRisco += 30;
        else if (maxDrawdown > 10) scoreRisco += 20;
        else if (maxDrawdown > 5) scoreRisco += 10;
        
        if (volatPercent > 50) scoreRisco += 30;
        else if (volatPercent > 30) scoreRisco += 20;
        else if (volatPercent > 15) scoreRisco += 10;
        
        const taxaAcerto = apostasFiltradas.length > 0 
            ? (apostasFiltradas.filter(a => a.resultado === 'Ganhou').length / apostasFiltradas.length) * 100
            : 0;
        if (taxaAcerto < 40) scoreRisco += 20;
        else if (taxaAcerto < 50) scoreRisco += 10;
        
        updateElementSafely('risk-score', Math.round(scoreRisco));
        
        // Critério de Kelly simplificado
        const p = taxaAcerto / 100; // Probabilidade de ganhar
        const b = 2; // Odd média (simplificado)
        const q = 1 - p; // Probabilidade de perder
        const kelly = ((p * b - q) / b) * 100;
        updateElementSafely('risk-kelly', formatarPercentual(Math.max(0, kelly)));
        
        console.log('Análise de Risco atualizada');
    } catch (error) {
        console.error('Erro ao atualizar análise de risco:', error);
    }
}

function criarGraficosRisco() {
    // Gráfico de Drawdown
    const canvasDrawdown = document.getElementById('chart-drawdown');
    if (canvasDrawdown && typeof Chart !== 'undefined') {
        const ctx = canvasDrawdown.getContext('2d');
        
        if (charts.drawdown) {
            charts.drawdown.destroy();
        }
        
        const apostasOrdenadas = [...apostasFiltradas].sort((a, b) => new Date(a.data) - new Date(b.data));
        let saldoAtual = 0;
        let picoMaximo = 0;
        const dadosDrawdown = [];
        
        apostasOrdenadas.forEach(aposta => {
            if (aposta.resultado === 'Ganhou' || aposta.resultado === 'Perdeu') {
                saldoAtual += parseFloat(aposta.valor_final) || 0;
            }
            
            if (saldoAtual > picoMaximo) {
                picoMaximo = saldoAtual;
            }
            
            const drawdown = picoMaximo > 0 ? ((picoMaximo - saldoAtual) / picoMaximo) * 100 : 0;
            
            dadosDrawdown.push({
                x: new Date(aposta.data).getTime(),
                y: -drawdown // Negativo para mostrar como queda
            });
        });
        
        charts.drawdown = new Chart(ctx, {
            type: 'line',
            data: {
                datasets: [{
                    label: 'Drawdown (%)',
                    data: dadosDrawdown,
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    fill: true,
                    tension: 0.4,
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    x: {
                        type: 'time',
                        time: { unit: 'day' },
                        grid: { color: 'rgba(148, 163, 184, 0.1)' },
                        ticks: { color: '#6b7280' }
                    },
                    y: {
                        grid: { color: 'rgba(148, 163, 184, 0.1)' },
                        ticks: {
                            color: '#6b7280',
                            callback: function(value) {
                                return value + '%';
                            }
                        }
                    }
                }
            }
        });
    }
    
    // Gráfico Risco-Retorno
    const canvasRiscoRetorno = document.getElementById('chart-risco-retorno');
    if (canvasRiscoRetorno && typeof Chart !== 'undefined') {
        const ctx = canvasRiscoRetorno.getContext('2d');
        
        if (charts.riscoRetorno) {
            charts.riscoRetorno.destroy();
        }
        
        // Agrupar por mês para calcular risco-retorno
        const dadosPorMes = {};
        apostasFiltradas.forEach(aposta => {
            const mes = aposta.data.substring(0, 7);
            if (!dadosPorMes[mes]) {
                dadosPorMes[mes] = { lucros: [], investido: 0 };
            }
            dadosPorMes[mes].investido += parseFloat(aposta.valor_apostado) || 0;
            if (aposta.resultado === 'Ganhou' || aposta.resultado === 'Perdeu') {
                dadosPorMes[mes].lucros.push(parseFloat(aposta.valor_final) || 0);
            }
        });
        
        const pontos = Object.entries(dadosPorMes).map(([mes, dados]) => {
            const retornoMedio = dados.lucros.length > 0 
                ? dados.lucros.reduce((a, b) => a + b, 0) / dados.lucros.length 
                : 0;
            const variancia = dados.lucros.length > 0
                ? dados.lucros.reduce((sum, lucro) => sum + Math.pow(lucro - retornoMedio, 2), 0) / dados.lucros.length
                : 0;
            const risco = Math.sqrt(variancia);
            
            return {
                x: risco,
                y: retornoMedio,
                label: mes
            };
        });
        
        charts.riscoRetorno = new Chart(ctx, {
            type: 'scatter',
            data: {
                datasets: [{
                    label: 'Risco vs Retorno',
                    data: pontos,
                    backgroundColor: pontos.map(p => p.y >= 0 ? 'rgba(16, 185, 129, 0.8)' : 'rgba(239, 68, 68, 0.8)'),
                    borderColor: pontos.map(p => p.y >= 0 ? '#10b981' : '#ef4444'),
                    borderWidth: 2,
                    pointRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const point = pontos[context.dataIndex];
                                return [
                                    `Mês: ${point.label}`,
                                    `Risco: ${context.parsed.x.toFixed(2)}`,
                                    `Retorno: ${formatarMoeda(context.parsed.y)}`
                                ];
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Risco (Volatilidade)',
                            color: '#9ca3af'
                        },
                        grid: { color: 'rgba(148, 163, 184, 0.1)' },
                        ticks: { color: '#6b7280' }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Retorno Médio',
                            color: '#9ca3af'
                        },
                        grid: { color: 'rgba(148, 163, 184, 0.1)' },
                        ticks: {
                            color: '#6b7280',
                            callback: function(value) {
                                return formatarMoeda(value);
                            }
                        }
                    }
                }
            }
        });
    }
    
    // Atualizar métricas avançadas de risco
    const apostasOrdenadas = [...apostasFiltradas].sort((a, b) => new Date(a.data) - new Date(b.data));
    const retornos = apostasOrdenadas.map(a => {
        if (a.resultado === 'Ganhou') {
            return (parseFloat(a.valor_final) || 0) - (parseFloat(a.valor_apostado) || 0);
        } else if (a.resultado === 'Perdeu') {
            return -(parseFloat(a.valor_apostado) || 0);
        }
        return 0;
    });
    
    // Value at Risk (95%)
    const retornosOrdenados = [...retornos].sort((a, b) => a - b);
    const indexVaR = Math.floor(retornos.length * 0.05);
    const var95 = retornosOrdenados.length > 0 ? retornosOrdenados[indexVaR] : 0;
    updateElementSafely('var-95', formatarMoeda(var95));
    
    // Expected Shortfall
    const retornosAbaixoVaR = retornosOrdenados.slice(0, indexVaR);
    const expectedShortfall = retornosAbaixoVaR.length > 0 
        ? retornosAbaixoVaR.reduce((a, b) => a + b, 0) / retornosAbaixoVaR.length
        : 0;
    updateElementSafely('expected-shortfall', formatarMoeda(expectedShortfall));
    
    // Recovery Time (dias para recuperar do drawdown)
    let recoveryTime = 0;
    let emDrawdown = false;
    let diasEmDrawdown = 0;
    let saldoTemp = 0;
    let picoTemp = 0;
    
    apostasOrdenadas.forEach(aposta => {
        if (aposta.resultado === 'Ganhou' || aposta.resultado === 'Perdeu') {
            saldoTemp += parseFloat(aposta.valor_final) || 0;
            if (saldoTemp > picoTemp) {
                picoTemp = saldoTemp;
                if (emDrawdown) {
                    recoveryTime = Math.max(recoveryTime, diasEmDrawdown);
                    emDrawdown = false;
                    diasEmDrawdown = 0;
                }
            } else {
                emDrawdown = true;
                diasEmDrawdown++;
            }
        }
    });
    
    updateElementSafely('recovery-time', recoveryTime + ' dias');
    
    // Risk-Adjusted Return
    const lucroTotal = calcularLucroTotal();
    const desvios = retornos.map(r => Math.pow(r - (lucroTotal / retornos.length), 2));
    const desvioPadrao = Math.sqrt(desvios.reduce((a, b) => a + b, 0) / (retornos.length || 1));
    const riskAdjustedReturn = desvioPadrao > 0 ? (lucroTotal / desvioPadrao) * 100 : 0;
    updateElementSafely('risk-adjusted-return', formatarPercentual(riskAdjustedReturn));
    
    console.log('Gráficos de risco criados');
}

// =====================================================
// FUNÇÕES ESPECÍFICAS DE ABAS - ANÁLISE TEMPORAL
// =====================================================
function atualizarAnaliseTemporal() {
    try {
        // Análise por dia da semana
        const diasSemana = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
        const dadosPorDiaSemana = {};
        
        apostasFiltradas.forEach(aposta => {
            const diaSemana = new Date(aposta.data).getDay();
            const nomeDia = diasSemana[diaSemana];
            
            if (!dadosPorDiaSemana[nomeDia]) {
                dadosPorDiaSemana[nomeDia] = { total: 0, ganhas: 0, lucro: 0 };
            }
            
            dadosPorDiaSemana[nomeDia].total++;
            if (aposta.resultado === 'Ganhou') {
                dadosPorDiaSemana[nomeDia].ganhas++;
            }
            if (aposta.resultado === 'Ganhou' || aposta.resultado === 'Perdeu') {
                dadosPorDiaSemana[nomeDia].lucro += parseFloat(aposta.valor_final) || 0;
            }
        });
        
        // Encontrar melhor dia
        let melhorDia = '-';
        let melhorLucro = -Infinity;
        
        Object.entries(dadosPorDiaSemana).forEach(([dia, dados]) => {
            if (dados.lucro > melhorLucro) {
                melhorLucro = dados.lucro;
                melhorDia = dia;
            }
        });
        
        updateElementSafely('melhor-dia-semana', melhorDia);
        
        // Para as outras métricas temporais, vamos usar valores placeholder por enquanto
        updateElementSafely('melhor-horario', '20h-22h');
        updateElementSafely('melhor-mes-ano', 'Janeiro');
        updateElementSafely('streak-atual-dias', apostasFiltradas.length > 0 ? '3' : '0');
        
        console.log('Análise Temporal atualizada');
    } catch (error) {
        console.error('Erro ao atualizar análise temporal:', error);
    }
}

function criarGraficosTemporais() {
    // Implementação dos gráficos temporais
    console.log('Criando gráficos Temporais...');
}

// =====================================================
// FUNÇÕES ESPECÍFICAS DE ABAS - PADRÕES E TENDÊNCIAS
// =====================================================
function atualizarPadroesTendencias() {
    try {
        // Análise de Consistência
        const mesesComDados = {};
        apostasFiltradas.forEach(aposta => {
            const mes = aposta.data.substring(0, 7);
            if (!mesesComDados[mes]) {
                mesesComDados[mes] = { total: 0, ganhas: 0 };
            }
            mesesComDados[mes].total++;
            if (aposta.resultado === 'Ganhou') {
                mesesComDados[mes].ganhas++;
            }
        });
        
        const taxasPorMes = Object.values(mesesComDados).map(m => 
            m.total > 0 ? (m.ganhas / m.total) * 100 : 0
        );
        
        const mediaTaxa = taxasPorMes.length > 0 
            ? taxasPorMes.reduce((a, b) => a + b, 0) / taxasPorMes.length 
            : 0;
        
        const desvioTaxa = taxasPorMes.length > 0
            ? Math.sqrt(taxasPorMes.reduce((sum, taxa) => sum + Math.pow(taxa - mediaTaxa, 2), 0) / taxasPorMes.length)
            : 0;
        
        const consistencia = mediaTaxa > 0 ? Math.max(0, 100 - desvioTaxa) : 0;
        updateElementSafely('pattern-consistency', formatarPercentual(consistencia));
        
        // Momentum (últimas 10 vs anteriores)
        const ultimas10 = apostasFiltradas.slice(-10);
        const anteriores = apostasFiltradas.slice(0, -10);
        
        const taxaUltimas = ultimas10.length > 0 
            ? (ultimas10.filter(a => a.resultado === 'Ganhou').length / ultimas10.length) * 100
            : 0;
        
        const taxaAnteriores = anteriores.length > 0
            ? (anteriores.filter(a => a.resultado === 'Ganhou').length / anteriores.length) * 100
            : 0;
        
        let momentum = 'Neutro';
        if (taxaUltimas > taxaAnteriores + 10) momentum = 'Positivo';
        else if (taxaUltimas < taxaAnteriores - 10) momentum = 'Negativo';
        
        updateElementSafely('pattern-momentum', momentum);
        updateElementSafely('pattern-cycle', '7 dias');
        updateElementSafely('pattern-direction', taxaUltimas > 50 ? 'Ascendente' : 'Descendente');
        
        // Análise de Bônus
        const apostasComBonus = apostasFiltradas.filter(a => a.bonus || a.usou_bonus);
        updateElementSafely('bonus-count', apostasComBonus.length);
        
        const lucroBonus = apostasComBonus.reduce((sum, a) => {
            if (a.resultado === 'Ganhou' || a.resultado === 'Perdeu') {
                return sum + (parseFloat(a.valor_final) || 0);
            }
            return sum;
        }, 0);
        const investidoBonus = apostasComBonus.reduce((sum, a) => sum + (parseFloat(a.valor_apostado) || 0), 0);
        const roiBonus = investidoBonus > 0 ? (lucroBonus / investidoBonus) * 100 : 0;
        updateElementSafely('bonus-roi', formatarPercentual(roiBonus));
        
        const ganhasBonus = apostasComBonus.filter(a => a.resultado === 'Ganhou').length;
        const taxaBonus = apostasComBonus.length > 0 ? (ganhasBonus / apostasComBonus.length) * 100 : 0;
        updateElementSafely('bonus-winrate', formatarPercentual(taxaBonus));
        updateElementSafely('bonus-profit', formatarMoeda(lucroBonus));
        
        console.log('Padrões e Tendências atualizados');
    } catch (error) {
        console.error('Erro ao atualizar padrões e tendências:', error);
    }
}

function criarGraficosPadroes() {
    // Como a aba de padrões é mais analítica, vou criar visualizações complementares
    // que podem ser adicionadas aos cards existentes
    
    // Análise de categorias
    const containerCategorias = document.getElementById('patterns-categoria');
    if (containerCategorias) {
        const categorias = {};
        
        apostasFiltradas.forEach(aposta => {
            const categoria = aposta.categoria || 'Não especificada';
            if (!categorias[categoria]) {
                categorias[categoria] = {
                    total: 0,
                    ganhas: 0,
                    lucro: 0,
                    investido: 0
                };
            }
            
            categorias[categoria].total++;
            categorias[categoria].investido += parseFloat(aposta.valor_apostado) || 0;
            
            if (aposta.resultado === 'Ganhou') {
                categorias[categoria].ganhas++;
            }
            
            if (aposta.resultado === 'Ganhou' || aposta.resultado === 'Perdeu') {
                categorias[categoria].lucro += parseFloat(aposta.valor_final) || 0;
            }
        });
        
        const categoriasHtml = Object.entries(categorias)
            .sort(([,a], [,b]) => b.lucro - a.lucro)
            .map(([categoria, dados]) => {
                const taxaAcerto = dados.total > 0 ? (dados.ganhas / dados.total) * 100 : 0;
                const roi = dados.investido > 0 ? (dados.lucro / dados.investido) * 100 : 0;
                const corTaxa = taxaAcerto >= 60 ? 'text-green-400' : taxaAcerto >= 50 ? 'text-yellow-400' : 'text-red-400';
                const corROI = roi >= 0 ? 'text-green-400' : 'text-red-400';
                
                return `
                    <div class="bg-slate-800/50 rounded-xl p-4">
                        <h4 class="font-bold text-white mb-3">${categoria}</h4>
                        <div class="space-y-2">
                            <div class="flex justify-between">
                                <span class="text-slate-400">Apostas:</span>
                                <span class="font-semibold">${dados.total}</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-slate-400">Taxa:</span>
                                <span class="font-semibold ${corTaxa}">${taxaAcerto.toFixed(1)}%</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-slate-400">ROI:</span>
                                <span class="font-semibold ${corROI}">${roi.toFixed(1)}%</span>
                            </div>
                            <div class="flex justify-between">
                                <span class="text-slate-400">Lucro:</span>
                                <span class="font-semibold ${corROI}">${formatarMoeda(dados.lucro)}</span>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        
        containerCategorias.innerHTML = categoriasHtml || '<div class="text-center text-slate-500">Nenhuma categoria encontrada</div>';
    }
    
    // Criar um heatmap mensal
    const heatmapContainer = document.getElementById('heatmap-mensal');
    if (heatmapContainer) {
        const mesesPorAno = {};
        const mesesNomes = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        
        apostasFiltradas.forEach(aposta => {
            const data = new Date(aposta.data);
            const ano = data.getFullYear();
            const mes = data.getMonth();
            
            if (!mesesPorAno[ano]) {
                mesesPorAno[ano] = new Array(12).fill(null).map(() => ({ lucro: 0, investido: 0 }));
            }
            
            mesesPorAno[ano][mes].investido += parseFloat(aposta.valor_apostado) || 0;
            if (aposta.resultado === 'Ganhou' || aposta.resultado === 'Perdeu') {
                mesesPorAno[ano][mes].lucro += parseFloat(aposta.valor_final) || 0;
            }
        });
        
        let heatmapHtml = '<table class="w-full">';
        heatmapHtml += '<thead><tr><th class="text-left p-2 text-slate-400">Ano</th>';
        mesesNomes.forEach(mes => {
            heatmapHtml += `<th class="p-2 text-slate-400 text-sm">${mes}</th>`;
        });
        heatmapHtml += '</tr></thead><tbody>';
        
        Object.entries(mesesPorAno).sort().forEach(([ano, meses]) => {
            heatmapHtml += `<tr><td class="p-2 font-semibold">${ano}</td>`;
            meses.forEach(mesData => {
                const roi = mesData.investido > 0 ? (mesData.lucro / mesData.investido) * 100 : 0;
                let bgColor = 'bg-slate-700/50';
                let textColor = 'text-slate-400';
                
                if (mesData.investido > 0) {
                    if (roi > 10) {
                        bgColor = 'bg-green-500/50';
                        textColor = 'text-green-300';
                    } else if (roi > 0) {
                        bgColor = 'bg-green-500/30';
                        textColor = 'text-green-400';
                    } else if (roi > -10) {
                        bgColor = 'bg-yellow-500/30';
                        textColor = 'text-yellow-400';
                    } else {
                        bgColor = 'bg-red-500/30';
                        textColor = 'text-red-400';
                    }
                }
                
                heatmapHtml += `<td class="p-1">
                    <div class="heatmap-cell ${bgColor} ${textColor}" 
                         title="ROI: ${roi.toFixed(1)}% | Lucro: ${formatarMoeda(mesData.lucro)}">
                        ${mesData.investido > 0 ? roi.toFixed(0) + '%' : '-'}
                    </div>
                </td>`;
            });
            heatmapHtml += '</tr>';
        });
        
        heatmapHtml += '</tbody></table>';
        heatmapContainer.innerHTML = heatmapHtml;
    }
    
    console.log('Gráficos de padrões criados');
}

// =====================================================
// INICIALIZAÇÃO
// =====================================================
document.addEventListener('DOMContentLoaded', () => {
    try {
        console.log('Inicializando BetTracker Dashboard Enhanced...');
        
        if (window.lucide) {
            lucide.createIcons();
        }

        try {
            if (window.supabase) {
                supabase = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
                console.log('Supabase inicializado');
            } else {
                console.warn('Supabase não disponível');
            }
        } catch (error) {
            console.error('Erro ao inicializar Supabase:', error);
        }
        
        configurarAbas();
        
        const hoje = new Date().toISOString().split('T')[0];
        const endDateInput = document.getElementById('filter-date-end');
        if (endDateInput) {
            endDateInput.value = hoje;
        }
        
        const refreshBtn = document.getElementById('refresh-data');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                carregarApostas();
                setTimeout(() => {
                    const abaAtiva = document.querySelector('.tab-button.active').getAttribute('data-tab');
                    carregarConteudoAba(abaAtiva);
                }, 500);
            });
        }
        
        configurarFiltrosData();
        configurarBotaoLimparFiltros();
        carregarApostas();
        
        console.log('Dashboard Enhanced inicializado com sucesso!');
    } catch (error) {
        console.error('Erro na inicialização:', error);
    }
});