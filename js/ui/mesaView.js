import {
    setConfig,
    addGasto,
    addGastoFixo,
    updateGastoFixo,
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
            <div class="header-row">
                <div class="header-title-wrapper">
                    <h1>Kakebo Digital <span>家計簿</span></h1>
                    <p class="subtitle">Semana ${state.semanaAtual} | ${dataInicioFormatada} a ${dataFimFormatada} de ${state.anoAtual}</p>
                </div>
                <button class="btn btn-export-header" id="btn-export-template">🖨️ Template semanal</button>
            </div>
        </header>

        <main class="container">
            <!-- Painel de Métricas -->
            <section class="card dashboard">
                <h2>Resumo Financeiro</h2>
                <div class="grid-metrics">
                    <div class="metric-box">
                        <span class="label">Renda Mensal</span>
                        <span class="value editable-value" data-key="renda_mensal" data-label="Renda">R$ ${state.config.renda_mensal.toFixed(2)}</span>
                    </div>
                    <div class="metric-box">
                        <span class="label">Meta de Poupança</span>
                        <span class="value editable-value color-save" data-key="meta_poupanca" data-label="Poupança">R$ ${state.config.meta_poupanca.toFixed(2)}</span>
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


            <!-- Adicionar Gasto Diário (colapsável) -->
            <section class="card collapsible">
                <h2 class="collapsible-header" data-target="gasto-content">📝 Registrar Gasto Diário</h2>
                <div id="gasto-content" class="collapsible-content" style="display:${state.gastoSectionOpen ? 'block' : 'none'};">
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

                    <!-- Gastos da Semana (movido para dentro) -->
                    <h3>Gastos desta Semana</h3>
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
                </div>
            </section>

            <!-- Gastos Fixos (colapsável) -->
            <section class="card collapsible">
                <h2 class="collapsible-header" data-target="fixo-content">⚙️ Gastos Fixos</h2>
                <div id="fixo-content" class="collapsible-content" style="display:${state.fixoSectionOpen ? 'block' : 'none'};">
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
                        <div class="form-group">
                            <label for="fixo-dia">Dia Débito</label>
                            <input type="number" id="fixo-dia" min="1" max="31" value="1" required>
                        </div>
                        <div class="form-group">
                            <label for="fixo-pagamento">Meio Pagamento</label>
                            <select id="fixo-pagamento" required>
                                <option value="Automático">Automático</option>
                                <option value="Pix">Pix</option>
                            </select>
                        </div>
                        <button type="submit" class="btn">Adicionar Fixo</button>
                    </form>

                    <table class="tabela-fixos">
                      <thead>
                        <tr>
                          <th></th>
                          <th>Item</th>
                          <th>Dia</th>
                          <th>Pagamento</th>
                          <th>Valor</th>
                          <th>Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                          ${state.gastosFixos.map(gf => {
                            const cat = state.categorias.find(c => c.id === Number(gf.categoria_id));
                            return `
                              <tr>
                                <td>${cat ? cat.icone : '❓'}</td>
                                <td>${gf.descricao}</td>
                                <td>${gf.dia_vencimento || '-'}</td>
                                <td>${gf.meio_pagamento || 'Automático'}</td>
                                <td>R$ ${Number(gf.valor).toFixed(2)}</td>
                                <td>
                                  <button class="btn-edit-fixo" data-id="${gf.id}">Editar</button>
                                  <button class="btn-delete" data-id="${gf.id}" data-type="fixo">×</button>
                                </td>
                              </tr>
                            `;
                          }).join('')}
                        </tbody>
                    </table>
                </div>
            </section>
        </main>
    `;
}

export function setupMesaListeners(state, atualizarDados, renderApp) {
    // Edição inline de valores clicáveis
    document.querySelectorAll('.editable-value').forEach(el => {
        el.addEventListener('click', function(e) {
            // Se já estiver editando, ignora
            if (this.querySelector('input')) return;
            const key = this.dataset.key;
            const label = this.dataset.label;
            const currentValue = state.config[key];
            const input = document.createElement('input');
            input.type = 'number';
            input.step = '0.01';
            input.value = currentValue;
            input.className = 'inline-edit-input';
            this.innerHTML = '';
            this.appendChild(input);
            input.focus();
            input.select();
            const save = async () => {
                const newValue = Number(input.value);
                if (!isNaN(newValue) && newValue !== currentValue) {
                    await setConfig(key, newValue);
                    state.config[key] = newValue;
                    await atualizarDados();
                    renderApp();
                    // Mostra confirmação
                    const confirmMsg = document.createElement('span');
                    confirmMsg.className = 'confirm-msg';
                    confirmMsg.textContent = `${label} atualizada`;
                    const parent = this.parentElement;
                    parent.appendChild(confirmMsg);
                    setTimeout(() => {
                        if (confirmMsg.parentElement) confirmMsg.remove();
                    }, 2000);
                } else {
                    // Re-renderiza para restaurar valor original
                    renderApp();
                }
            };

            input.addEventListener('blur', save);
            input.addEventListener('keydown', (ev) => {
                if (ev.key === 'Enter') {
                    ev.preventDefault();
                    input.blur();
                }
            });
        });
    });

    // Colapsáveis
    document.querySelectorAll('.collapsible-header').forEach(header => {
        header.addEventListener('click', function() {
            const targetId = this.dataset.target;
            const content = document.getElementById(targetId);
            if (content) {
                const isVisible = content.style.display !== 'none';
                content.style.display = isVisible ? 'none' : 'block';
                // Salva estado para persistir após re-render
                if (targetId === 'fixo-content') {
                    state.fixoSectionOpen = !isVisible;
                } else if (targetId === 'gasto-content') {
                    state.gastoSectionOpen = !isVisible;
                }
            }
        });
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


    // Editar gasto fixo via formulário
    document.querySelectorAll('.btn-edit-fixo').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const id = Number(this.dataset.id);
            const gastoFixo = state.gastosFixos.find(gf => gf.id === id);
            if (!gastoFixo) return;

            // Preenche formulário com dados do item
            document.getElementById('fixo-desc').value = gastoFixo.descricao;
            document.getElementById('fixo-valor').value = gastoFixo.valor;
            document.getElementById('fixo-cat').value = gastoFixo.categoria_id;
            document.getElementById('fixo-dia').value = gastoFixo.dia_vencimento || 1;
            document.getElementById('fixo-pagamento').value = gastoFixo.meio_pagamento || 'Automático';

            // Altera botão de submit para "Atualizar" e armazena id
            const submitBtn = document.querySelector('#form-gasto-fixo button[type="submit"]');
            submitBtn.textContent = 'Atualizar';
            submitBtn.dataset.editId = id;
        });
    });

    // Submeter formulário de gasto fixo (criar ou atualizar)
    const formFixo = document.getElementById('form-gasto-fixo');
    const originalSubmit = formFixo.querySelector('button[type="submit"]').textContent;
    formFixo.addEventListener('submit', async (e) => {
        e.preventDefault();
        const descricao = document.getElementById('fixo-desc').value;
        const valor = Number(document.getElementById('fixo-valor').value);
        const categoria_id = Number(document.getElementById('fixo-cat').value);
        const dia_vencimento = Number(document.getElementById('fixo-dia').value);
        const meio_pagamento = document.getElementById('fixo-pagamento').value;

        const submitBtn = formFixo.querySelector('button[type="submit"]');
        const editId = submitBtn.dataset.editId;

        if (editId) {
            // Atualizar existente
            await updateGastoFixo(Number(editId), {
                descricao,
                valor,
                categoria_id,
                dia_vencimento,
                meio_pagamento
            });
            // Limpa estado de edição
            delete submitBtn.dataset.editId;
            submitBtn.textContent = 'Adicionar Fixo';
            formFixo.reset();
        } else {
            // Criar novo
            await addGastoFixo({
                descricao,
                valor,
                categoria_id,
                recorrencia: 'mensal',
                dia_vencimento,
                meio_pagamento
            });
            formFixo.reset();
        }

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
