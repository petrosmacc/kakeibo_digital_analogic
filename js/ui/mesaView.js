import {
    setConfig,
    addGasto,
    addGastoFixo,
} from '../db.js';
import db from '../db.js';
import { exportarTemplateSemanal } from './exportPdf.js';

// Função auxiliar para obter o número da semana do ano (mesma lógica de app.js)
function getNumeroSemana(d) {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return weekNo;
}

function calcularDatasSemana() {
    const hoje = new Date();
    const diaDaSemana = hoje.getDay();
    const diffParaSegunda = (diaDaSemana === 0 ? -6 : 1) - diaDaSemana;
    const dataInicio = new Date(hoje);
    dataInicio.setDate(hoje.getDate() + diffParaSegunda);
    const dataFim = new Date(dataInicio);
    dataFim.setDate(dataInicio.getDate() + 6);
    const fmt = { day: '2-digit', month: 'short' };
    return {
        dataInicioFormatada: dataInicio.toLocaleDateString('pt-BR', fmt),
        dataFimFormatada: dataFim.toLocaleDateString('pt-BR', fmt)
    };
}

export function renderMesa(state, metricas) {
    const { dataInicioFormatada, dataFimFormatada } = calcularDatasSemana();
    
    return `
        <header class="app-header">
            <h1>Kakebo Digital <span>家計簿</span></h1>
            <p class="subtitle">Semana ${state.semanaAtual} | ${dataInicioFormatada} a ${dataFimFormatada} de ${state.anoAtual}</p>
        </header>

        <main class="container">
            <!-- Painel de Métricas -->
            <section class="card dashboard">
                <h2>Resumo Financeiro</h2>
                <div class="grid-metrics">
                    <div class="metric-box">
                        <span class="label">Renda Mensal</span>
                        <span class="value">R$ ${state.config.renda_mensal.toFixed(2)}</span>
                    </div>
                    <div class="metric-box">
                        <span class="label">Meta de Poupança</span>
                        <span class="value color-save">R$ ${state.config.meta_poupanca.toFixed(2)}</span>
                    </div>
                    <div class="metric-box">
                        <span class="label">Gastos Fixos</span>
                        <span class="value color-expense">R$ ${metricas.totalGastosFixos.toFixed(2)}</span>
                    </div>
                    <div class="metric-box highlight">
                        <span class="label">Orçamento Semanal</span>
                        <span class="value">R$ ${metricas.orcamentoSemanal.toFixed(2)}</span>
                    </div>
                </div>

                <div class="weekly-status">
                    <h3>Status da Semana Atual</h3>
                    <div class="progress-bar-container">
                        <div class="progress-bar" style="width: ${Math.min(100, (metricas.totalGastoSemana / (metricas.orcamentoSemanal || 1)) * 100)}%"></div>
                    </div>
                    <div class="flex-between">
                        <span>Gasto: <strong>R$ ${metricas.totalGastoSemana.toFixed(2)}</strong></span>
                        <span>Restante: <strong class="${metricas.saldoSemanalRestante >= 0 ? 'color-save' : 'color-expense'}">R$ ${metricas.saldoSemanalRestante.toFixed(2)}</strong></span>
                    </div>
                </div>
            </section>

            <!-- Formulário de Configurações -->
            <section class="card">
                <h2>Planejamento Mensal</h2>
                <form id="form-config" class="flex-form">
                    <div class="form-group">
                        <label for="renda">Renda Mensal (R$)</label>
                        <input type="number" id="renda" step="0.01" value="${state.config.renda_mensal}" required>
                    </div>
                    <div class="form-group">
                        <label for="poupanca">Meta de Poupança (R$)</label>
                        <input type="number" id="poupanca" step="0.01" value="${state.config.meta_poupanca}" required>
                    </div>
                    <button type="submit" class="btn">Salvar Planejamento</button>
                </form>
            </section>

            <!-- Adicionar Gasto Diário -->
            <section class="card">
                <h2>Registrar Gasto Diário</h2>
                <form id="form-gasto">
                    <div class="grid-form">
                        <div class="form-group">
                            <label for="gasto-valor">Valor (R$)</label>
                            <input type="number" id="gasto-valor" step="0.01" required>
                        </div>
                        <div class="form-group">
                            <label for="gasto-categoria">Categoria Kakeibo</label>
                            <select id="gasto-categoria" required>
                                ${state.categorias.map(c => `<option value="${c.id}">${c.icone} ${c.nome}</option>`).join('')}
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="gasto-data">Data</label>
                            <input type="date" id="gasto-data" value="${new Date().toISOString().split('T')[0]}" required>
                        </div>
                        <div class="form-group">
                            <label for="gasto-nota">Nota / Descrição</label>
                            <input type="text" id="gasto-nota" placeholder="Ex: Almoço de terça" required>
                        </div>
                    </div>
                    <button type="submit" class="btn btn-block">Adicionar Gasto</button>
                </form>
            </section>

            <!-- Gastos Fixos -->
            <section class="card">
                <h2>Gastos Fixos Mensais</h2>
                <form id="form-gasto-fixo" class="flex-form">
                    <div class="form-group">
                        <label for="fixo-desc">Descrição</label>
                        <input type="text" id="fixo-desc" required>
                    </div>
                    <div class="form-group">
                        <label for="fixo-valor">Valor (R$)</label>
                        <input type="number" id="fixo-valor" step="0.01" required>
                    </div>
                    <div class="form-group">
                        <label for="fixo-cat">Categoria</label>
                        <select id="fixo-cat" required>
                            ${state.categorias.map(c => `<option value="${c.id}">${c.icone} ${c.nome}</option>`).join('')}
                        </select>
                    </div>
                    <button type="submit" class="btn">Adicionar Fixo</button>
                </form>

                <ul class="list-items">
                    ${state.gastosFixos.map(gf => {
                        const cat = state.categorias.find(c => c.id === Number(gf.categoria_id));
                        return `
                            <li class="flex-between">
                                <span>${cat ? cat.icone : '❓'} <strong>${gf.descricao}</strong></span>
                                <span>R$ ${Number(gf.valor).toFixed(2)} <button class="btn-delete" data-id="${gf.id}" data-type="fixo">×</button></span>
                            </li>
                        `;
                    }).join('')}
                </ul>
            </section>

            <!-- Gastos da Semana -->
            <section class="card">
                <h2>Gastos desta Semana</h2>
                <ul class="list-items">
                    ${state.gastosSemana.length === 0 ? '<p class="empty-msg">Nenhum gasto registrado nesta semana.</p>' : ''}
                    ${state.gastosSemana.map(g => {
                        const cat = state.categorias.find(c => c.id === Number(g.categoria_id));
                        return `
                            <li class="flex-between">
                                <div>
                                    <span class="tag">${cat ? cat.icone + ' ' + cat.nome : 'Geral'}</span>
                                    <strong>${g.nota}</strong>
                                    <span class="date-label">${new Date(g.data).toLocaleDateString('pt-BR')}</span>
                                </div>
                                <span>R$ ${Number(g.valor).toFixed(2)} <button class="btn-delete" data-id="${g.id}" data-type="gasto">×</button></span>
                            </li>
                        `;
                    }).join('')}
                </ul>
                <button class="btn btn-export" id="btn-export-template">🖨️ Exportar Template da Semana</button>
            </section>
        </main>
    `;
}

export function setupMesaListeners(state, atualizarDados, renderApp) {
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
        renderApp();
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
        renderApp();
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
        renderApp();
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
            renderApp();
        });
    });

    // Botão de exportar template semanal
    const btnExport = document.getElementById('btn-export-template');
    if (btnExport) {
        btnExport.addEventListener('click', () => {
            exportarTemplateSemanal(state);
        });
    }
}
