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
import { renderMesa } from './ui/mesaView.js';
import { renderSalaReflexao } from './ui/salaReflexaoView.js';
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
    anoAtual: new Date().getFullYear()
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
    render();
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

// Renderização da Interface
function render() {
    const appDiv = document.getElementById('app');
    const metricas = calcularMetricas();

    const mesaHTML = renderMesa(state, metricas);
    const reflexaoHTML = renderSalaReflexao(state);
    const graficosHTML = renderGraficos(state);

    appDiv.innerHTML = `
        ${mesaHTML}
        <div class="container">
            ${graficosHTML}
            ${reflexaoHTML}
        </div>
    `;

    setupEventListeners();
}

// Configuração dos Event Listeners da UI
function setupEventListeners() {
    // Salvar Configurações
    document.getElementById('form-config').addEventListener('submit', async (e) => {
        e.preventDefault();
        const renda = Number(document.getElementById('renda').value);
        const poupanca = Number(document.getElementById('poupanca').value);
        
        await setConfig('renda_mensal', renda);
        await setConfig('meta_poupanca', poupanca);
        
        state.config.renda_mensal = renda;
        state.config.meta_poupanca = poupanca;
        
        await atualizarDados();
        render();
    });

    // Adicionar Gasto Diário
    document.getElementById('form-gasto').addEventListener('submit', async (e) => {
        e.preventDefault();
        const valor = Number(document.getElementById('gasto-valor').value);
        const categoria_id = Number(document.getElementById('gasto-categoria').value);
        const data = document.getElementById('gasto-data').value;
        const nota = document.getElementById('gasto-nota').value;

        const dataObj = new Date(data);
        const semana = getNumeroSemana(dataObj);
        const ano = dataObj.getFullYear();

        await addGasto({
            valor,
            categoria_id,
            data,
            nota,
            semana,
            ano
        });

        await atualizarDados();
        render();
    });

    // Adicionar Gasto Fixo
    document.getElementById('form-gasto-fixo').addEventListener('submit', async (e) => {
        e.preventDefault();
        const descricao = document.getElementById('fixo-desc').value;
        const valor = Number(document.getElementById('fixo-valor').value);
        const categoria_id = Number(document.getElementById('fixo-cat').value);

        await addGastoFixo({
            descricao,
            valor,
            categoria_id,
            recorrencia: 'mensal',
            dia_vencimento: 1
        });

        await atualizarDados();
        render();
    });

    // Adicionar Reflexão
    document.getElementById('form-reflexao').addEventListener('submit', async (e) => {
        e.preventDefault();
        const texto = document.getElementById('reflexao-texto').value;

        await addReflexao({
            semana: state.semanaAtual,
            ano: state.anoAtual,
            texto
        });

        await atualizarDados();
        render();
    });

    // Deletar itens (Gastos ou Gastos Fixos)
    document.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const id = Number(e.target.dataset.id);
            const type = e.target.dataset.type;

            if (type === 'gasto') {
                await db.gastos.delete(id);
            } else if (type === 'fixo') {
                await db.gastos_fixos.delete(id);
            }

            await atualizarDados();
            render();
        });
    });
}

// Inicializa o app ao carregar a página
window.addEventListener('DOMContentLoaded', init);
