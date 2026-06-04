export function renderSalaReflexao(state) {
    return `
        <section class="card">
            <h2>Reflexão da Semana</h2>
            <form id="form-reflexao">
                <div class="form-group">
                    <label for="reflexao-texto">Como foi sua relação com o dinheiro esta semana? O que pode melhorar?</label>
                    <textarea id="reflexao-texto" rows="3" required placeholder="Escreva suas reflexões aqui..."></textarea>
                </div>
                <button type="submit" class="btn">Salvar Reflexão</button>
            </form>

            <div class="reflexoes-list">
                ${state.reflexoes.map(r => `
                    <div class="reflexao-item">
                        <p>"${r.texto}"</p>
                        <span class="date-label">Registrado em: ${new Date(r.criado_em).toLocaleDateString('pt-BR')}</span>
                    </div>
                `).join('')}
            </div>
        </section>
    `;
}
