import { addReflexao, getReflexoes } from '../db.js';

function getReferencia(state) {
    const periodo = state.periodoReflexao;
    if (periodo === 'semana') {
        return `${state.anoAtual}-W${String(state.semanaAtual).padStart(2,'0')}`;
    } else if (periodo === 'mes') {
        return `${state.anoAtual}-${String(state.mesAtual).padStart(2,'0')}`;
    } else if (periodo === 'trimestre') {
        return `${state.anoAtual}-T${state.trimestreAtual}`;
    } else if (periodo === 'ano') {
        return `${state.anoAtual}`;
    }
    return '';
}

function renderBarrasCategorias(state, totalGasto, orcamento) {
    const categorias = state.categorias;
    const gastos = state.gastosSemana; // para semana; para mês/trimestre/ano seria outro array
    // Para simplificar, usaremos gastosSemana (ajustar depois)
    const totaisPorCat = {};
    categorias.forEach(c => { totaisPorCat[c.id] = 0; });
    gastos.forEach(g => {
        const catId = Number(g.categoria_id);
        if (totaisPorCat[catId] !== undefined) {
            totaisPorCat[catId] += Number(g.valor);
        }
    });
    const maxValor = Math.max(...Object.values(totaisPorCat), 1);
    // Paleta terrosa para cada categoria (cíclica)
    const cores = ['#8B7355', '#6B8E6B', '#C4A882', '#A0522D'];
    return categorias.map((c, idx) => {
        const valor = totaisPorCat[c.id] || 0;
        const width = (valor / maxValor) * 100;
        const cor = cores[idx % cores.length];
        return `
            <div class="barra-categoria">
                <span class="barra-label-fixo">${c.icone} ${c.nome}</span>
                <div class="barra-container">
                    <div class="barra-preenchimento" style="width:${width}%; background-color:${cor};">
                        <span class="barra-valor-interno">R$ ${valor.toFixed(2)}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function renderFormReflexao(state) {
    const periodo = state.periodoReflexao;
    let label = '';
    if (periodo === 'semana') label = 'Pausa para reflexão. O que você faria diferente na próxima semana?';
    else if (periodo === 'mes') label = 'Como foi seu mês? O que faria diferente?';
    else if (periodo === 'trimestre') label = 'Reflexão do trimestre: o que você percebeu?';
    else if (periodo === 'ano') label = 'Olhando para o ano, o que você aprendeu sobre suas finanças?';
    return `
        <form id="form-reflexao-sala">
            <div class="form-group">
                <label for="reflexao-texto-sala">${label}</label>
                <textarea id="reflexao-texto-sala" rows="3" required placeholder="Escreva suas reflexões aqui..."></textarea>
            </div>
            <button type="submit" class="btn">Salvar Reflexão</button>
        </form>
    `;
}

function renderReflexoesAnteriores(state) {
    const reflexoes = state.reflexoes || [];
    if (reflexoes.length === 0) return '<p class="empty-msg">Nenhuma reflexão registrada neste período.</p>';
    return reflexoes.map(r => `
        <div class="reflexao-item">
            <p>"${r.texto}"</p>
            <span class="date-label">Registrado em: ${new Date(r.criado_em).toLocaleDateString('pt-BR')}</span>
        </div>
    `).join('');
}

export function renderSalaReflexao(state) {
    const periodo = state.periodoReflexao;
    const referencia = getReferencia(state);
    const metricas = window.__metricas || { orcamentoSemanal: 0, totalGastoSemana: 0, liquidoMensal: 0, totalGastosFixos: 0 };
    const orcamentoSemanal = metricas.orcamentoSemanal || 0;
    const totalGastoSemana = metricas.totalGastoSemana || 0;
    const rendaMensal = state.config.renda_mensal || 0;
    const metaPoupanca = state.config.meta_poupanca || 0;
    const totalGastosFixos = metricas.totalGastosFixos || 0;
    const poupado = rendaMensal - totalGastoSemana - totalGastosFixos; // simplificado

    let titulo = '';
    let conteudo = '';

    if (periodo === 'semana') {
        titulo = 'Balanço da Semana';
        const barras = renderBarrasCategorias(state, totalGastoSemana, orcamentoSemanal);
        conteudo = `
            <h3>Totais por Categoria</h3>
            <div class="barras-container">${barras}</div>
            <div class="comparacao-meta">
                <p>Você gastou <strong>R$ ${totalGastoSemana.toFixed(2)}</strong> de <strong>R$ ${orcamentoSemanal.toFixed(2)}</strong> (orçamento semanal)</p>
            </div>
            ${renderFormReflexao(state)}
            <div class="reflexoes-list">${renderReflexoesAnteriores(state)}</div>
        `;
    } else if (periodo === 'mes') {
        titulo = 'Balanço do Mês';
        const barras = renderBarrasCategorias(state, totalGastoSemana, orcamentoSemanal); // placeholder
        const cumpriu = poupado >= metaPoupanca;
        conteudo = `
            <h3>Totais por Categoria (mês)</h3>
            <div class="barras-container">${barras}</div>
            <div class="meta-poupanca">
                <p>Você poupou <strong>R$ ${poupado.toFixed(2)}</strong>. Sua meta era <strong>R$ ${metaPoupanca.toFixed(2)}</strong> ${cumpriu ? '✓' : '✗'}</p>
            </div>
            <canvas id="grafico-mes" width="400" height="200"></canvas>
            ${renderFormReflexao(state)}
            <div class="reflexoes-list">${renderReflexoesAnteriores(state)}</div>
        `;
    } else if (periodo === 'trimestre') {
        titulo = 'Balanço Trimestral';
        conteudo = `
            <p>Resumo dos três meses (em breve)</p>
            <canvas id="grafico-trimestre" width="400" height="200"></canvas>
            ${renderFormReflexao(state)}
            <div class="reflexoes-list">${renderReflexoesAnteriores(state)}</div>
        `;
    } else if (periodo === 'ano') {
        titulo = 'Balanço Anual';
        const totalGastoAno = totalGastoSemana; // placeholder
        const totalPoupadoAno = poupado; // placeholder
        conteudo = `
            <p>Total gasto no ano: <strong>R$ ${totalGastoAno.toFixed(2)}</strong></p>
            <p>Total poupado no ano: <strong>R$ ${totalPoupadoAno.toFixed(2)}</strong></p>
            <canvas id="grafico-ano" width="400" height="200"></canvas>
            ${renderFormReflexao(state)}
            <div class="reflexoes-list">${renderReflexoesAnteriores(state)}</div>
        `;
    }

    return `
        <section class="card">
            <h2>${titulo}</h2>
            <nav class="periodo-nav">
                <button class="btn btn-periodo ${periodo === 'semana' ? 'active' : ''}" data-periodo="semana">Semana</button>
                <button class="btn btn-periodo ${periodo === 'mes' ? 'active' : ''}" data-periodo="mes">Mês</button>
                <button class="btn btn-periodo ${periodo === 'trimestre' ? 'active' : ''}" data-periodo="trimestre">Trimestre</button>
                <button class="btn btn-periodo ${periodo === 'ano' ? 'active' : ''}" data-periodo="ano">Ano</button>
            </nav>
            <div class="periodo-conteudo">
                ${conteudo}
            </div>
        </section>
    `;
}

export function setupSalaListeners(state, atualizarDados, renderApp) {
    // Botões de período
    document.querySelectorAll('.btn-periodo').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const periodo = e.target.dataset.periodo;
            if (periodo && periodo !== state.periodoReflexao) {
                state.periodoReflexao = periodo;
                await atualizarDados();
                renderApp();
            }
        });
    });

    // Formulário de reflexão
    const formReflexao = document.getElementById('form-reflexao-sala');
    if (formReflexao) {
        formReflexao.addEventListener('submit', async (e) => {
            e.preventDefault();
            const texto = document.getElementById('reflexao-texto-sala').value;
            const periodo = state.periodoReflexao;
            const referencia = getReferencia(state);
            await addReflexao({
                semana: state.semanaAtual,
                ano: state.anoAtual,
                texto,
                periodo,
                referencia
            });
            await atualizarDados();
            renderApp();
        });
    }
}
