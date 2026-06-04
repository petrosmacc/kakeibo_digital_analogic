import {
    getCategorias,
    getConfig,
    setConfig,
    addGasto,
    getGastosSemana,
    addReflexao,
    getReflexoes,
    addGastoFixo,
    getGastosFixos,
    updateGastoFixo,
    seedCategorias
} from './db.js';
import db from './db.js'; 
import { renderMesa, setupMesaListeners } from './ui/mesaView.js';
import { renderSalaReflexao, setupSalaListeners } from './ui/salaReflexaoView.js';

// Estado global simples da aplicação
const state = {
    categorias: [],
    config: {
        renda_mensal: 0,
        meta_poupanca: 0
    },
    gastosSemana: [],
    gastosFixos: [],
    reflexoes: [],
    semanaAtual: 1,
    anoAtual: new Date().getFullYear(),
    mesAtual: new Date().getMonth() + 1,
    trimestreAtual: Math.ceil((new Date().getMonth() + 1) / 3),
    telaAtiva: 'mesa',
    periodoReflexao: 'semana',
    tema: localStorage.getItem('tema') || 'claro'
};

// Função auxiliar para obter o número da semana do ano
function getNumeroSemana(d) {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return weekNo;
}

// Inicialização do App
async function init() {
    await db.open();
    await seedCategorias();

    state.semanaAtual = getNumeroSemana(new Date());
    state.anoAtual = new Date().getFullYear();

    // Carrega dados do IndexedDB
    state.categorias = await getCategorias();
    state.config.renda_mensal = Number(await getConfig('renda_mensal')) || 0;
    state.config.meta_poupanca = Number(await getConfig('meta_poupanca')) || 0;
    
    await atualizarDados();
    renderApp();
    console.log("Kakebo Digital pronto");
}

// Atualiza dados dinâmicos do banco
async function atualizarDados() {
    state.gastosSemana = await getGastosSemana(state.semanaAtual, state.anoAtual);
    state.gastosFixos = await getGastosFixos();
    // Carrega reflexões do período ativo
    const periodo = state.periodoReflexao;
    let referencia = '';
    if (periodo === 'semana') {
        referencia = `${state.anoAtual}-W${String(state.semanaAtual).padStart(2,'0')}`;
    } else if (periodo === 'mes') {
        referencia = `${state.anoAtual}-${String(state.mesAtual).padStart(2,'0')}`;
    } else if (periodo === 'trimestre') {
        referencia = `${state.anoAtual}-T${state.trimestreAtual}`;
    } else if (periodo === 'ano') {
        referencia = `${state.anoAtual}`;
    }
    state.reflexoes = await getReflexoes({ periodo, referencia });
}

// Cálculos do Kakeibo
function calcularMetricas() {
    const totalGastosFixos = state.gastosFixos.reduce((acc, g) => acc + Number(g.valor), 0);
    const liquidoMensal = state.config.renda_mensal - state.config.meta_poupanca - totalGastosFixos;
    
    // Orçamento disponível por semana (dividido por 4 semanas padrão do Kakeibo)
    const orcamentoSemanal = liquidoMensal > 0 ? liquidoMensal / 4 : 0;
    
    const totalGastoSemana = state.gastosSemana.reduce((acc, g) => acc + Number(g.valor), 0);
    const saldoSemanalRestante = orcamentoSemanal - totalGastoSemana;

    return {
        totalGastosFixos,
        liquidoMensal,
        orcamentoSemanal,
        totalGastoSemana,
        saldoSemanalRestante
    };
}

// Renderização principal com navegação
function renderApp() {
    const appDiv = document.getElementById('app');
    const metricas = calcularMetricas();
    // Disponibiliza metricas globalmente para uso em salaReflexaoView
    window.__metricas = metricas;

    const navHTML = `
        <nav class="app-nav">
            <button class="btn btn-nav ${state.telaAtiva === 'mesa' ? 'active' : ''}" data-tela="mesa">📝 Mesa</button>
            <button class="btn btn-nav ${state.telaAtiva === 'sala' ? 'active' : ''}" data-tela="sala">🧘 Sala</button>
        </nav>
    `;

    let conteudoHTML = '';
    if (state.telaAtiva === 'mesa') {
        conteudoHTML = renderMesa(state, metricas);
    } else {
        conteudoHTML = renderSalaReflexao(state);
    }

    // Aplica tema ao body
    document.body.className = `tema-${state.tema}`;

    appDiv.innerHTML = `
        ${navHTML}
        <div id="conteudo">
            ${conteudoHTML}
        </div>
    `;

    // Seletor textual de tema (canto superior direito)
    const temaSelector = document.createElement('div');
    temaSelector.className = 'tema-selector';
    temaSelector.innerHTML = `
        <span class="tema-opcao ${state.tema === 'escuro' ? 'ativo' : ''}" data-tema="escuro">escuro</span>
        <span class="tema-separador">|</span>
        <span class="tema-opcao ${state.tema === 'sepia' ? 'ativo' : ''}" data-tema="sepia">sépia</span>
    `;
    temaSelector.addEventListener('click', (e) => {
        const opcao = e.target.closest('.tema-opcao');
        if (!opcao) return;
        const temaClicado = opcao.dataset.tema;
        // Se clicar no já ativo, volta para claro
        if (temaClicado === state.tema) {
            state.tema = 'claro';
        } else {
            state.tema = temaClicado;
        }
        localStorage.setItem('tema', state.tema);
        renderApp();
    });
    appDiv.prepend(temaSelector);

    // Event listeners dos botões de navegação
    document.querySelectorAll('.btn-nav').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tela = e.target.dataset.tela;
            if (tela && tela !== state.telaAtiva) {
                state.telaAtiva = tela;
                renderApp();
            }
        });
    });

    // Configura listeners da Mesa se estiver ativa
    if (state.telaAtiva === 'mesa') {
        setupMesaListeners(state, atualizarDados, renderApp);
    } else {
        setupSalaListeners(state, atualizarDados, renderApp);
    }
}

// Inicializa o app ao carregar a página
window.addEventListener('DOMContentLoaded', init);
