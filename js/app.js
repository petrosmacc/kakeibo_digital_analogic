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
import { renderGraficos } from './ui/graficos.js';

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
    telaAtiva: 'mesa',
    periodoReflexao: 'semana'
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
    state.reflexoes = await getReflexoes(state.semanaAtual, state.anoAtual);
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

// Placeholder para Sala de Reflexão
function renderSalaReflexao(state) {
    return `<section class="card"><h2>Sala de Reflexão</h2><p class="empty-msg">Sala de Reflexão em construção</p></section>`;
}

// Renderização principal com navegação
function renderApp() {
    const appDiv = document.getElementById('app');
    const metricas = calcularMetricas();

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

    appDiv.innerHTML = `
        ${navHTML}
        <div id="conteudo">
            ${conteudoHTML}
        </div>
    `;

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
    }
}

// Inicializa o app ao carregar a página
window.addEventListener('DOMContentLoaded', init);
