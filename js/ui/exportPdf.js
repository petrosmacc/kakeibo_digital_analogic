// Função auxiliar para formatar valor em reais (mantida para balanço mensal)
function formatarValor(valor) {
    return 'R$ ' + valor.toFixed(2).replace('.', ',');
}

// Exporta template semanal em PDF (retrato A4) – modelo minimalista para preenchimento manual
export function exportarTemplateSemanal(state) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Margens de 1,5cm
    const margin = 15;
    const contentWidth = pageWidth - 2 * margin;
    const contentHeight = pageHeight - 2 * margin;

    // Título centralizado
    doc.setFontSize(14);
    doc.setFont('Courier', 'bold');
    doc.text(`Kakebo – Semana ${state.semanaAtual} de ${state.anoAtual}`, pageWidth / 2, margin + 8, { align: 'center' });

    // Linhas de instrução
    doc.setFontSize(9);
    doc.setFont('Courier', 'italic');
    doc.text('Preencha ao longo do dia e transfira para o digital ao final do dia.', pageWidth / 2, margin + 16, { align: 'center' });
    doc.text('Dica: use cores – vermelho para totais, azul/preto para gastos normais.', pageWidth / 2, margin + 22, { align: 'center' });

    // Ícones das categorias (apenas ícones)
    const icones = ['🏠', '☕', '🎭', '🎁'];
    const diasSemana = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

    // Tabela
    const startX = margin;
    const startY = margin + 30;
    const colWidth = contentWidth / 8; // 7 dias + coluna de ícones
    const rowHeight = 18; // ~2cm

    // Cabeçalho dos dias
    doc.setFontSize(10);
    doc.setFont('Courier', 'bold');
    doc.text('', startX, startY); // célula vazia para ícones
    diasSemana.forEach((dia, idx) => {
        doc.text(dia, startX + colWidth * (idx + 1), startY);
    });

    // Linhas de categorias (apenas ícones)
    doc.setFont('Courier', 'normal');
    icones.forEach((icone, catIdx) => {
        const y = startY + rowHeight * (catIdx + 1);
        // Ícone na primeira coluna
        doc.setFontSize(20);
        doc.text(icone, startX + 2, y - 2);
        doc.setFontSize(10);
        // Células vazias para cada dia
        diasSemana.forEach((_, diaIdx) => {
            const x = startX + colWidth * (diaIdx + 1);
            doc.rect(x, y - 10, colWidth, rowHeight);
        });
        // Borda da coluna de ícone
        doc.rect(startX, y - 10, colWidth, rowHeight);
    });

    // Linha de totais diários (borda mais escura)
    const yTotal = startY + rowHeight * (icones.length + 1);
    doc.setFont('Courier', 'bold');
    doc.setFontSize(10);
    doc.text('Total', startX + 2, yTotal - 2);
    diasSemana.forEach((_, diaIdx) => {
        const x = startX + colWidth * (diaIdx + 1);
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.8);
        doc.rect(x, yTotal - 10, colWidth, rowHeight);
    });
    doc.rect(startX, yTotal - 10, colWidth, rowHeight);

    // Espaço "Notas" (retângulo vazio ocupando o restante da folha)
    const yNotas = yTotal + rowHeight + 8;
    const notasHeight = contentHeight - (yNotas - margin);
    doc.setFontSize(11);
    doc.setFont('Courier', 'bold');
    doc.text('Notas', startX, yNotas);
    doc.setDrawColor(150, 150, 150);
    doc.setLineWidth(0.5);
    doc.rect(startX, yNotas + 4, contentWidth, notasHeight - 4);

    // Salvar
    doc.save(`kakebo-template-semana-${state.semanaAtual}-${state.anoAtual}.pdf`);
}

// Exporta balanço mensal em PDF (retrato A4)
export function exportarBalancoMensal(state) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    const mes = state.mesAtual;
    const ano = state.anoAtual;
    const nomeMes = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'][mes - 1] || mes;

    // Título
    doc.setFontSize(14);
    doc.text(`Kakebo Digital – Balanço Mensal (${nomeMes}/${ano})`, pageWidth / 2, 15, { align: 'center' });

    // Totais por categoria
    const categorias = state.categorias;
    const totais = {};
    categorias.forEach(c => { totais[c.id] = 0; });
    state.gastosSemana.forEach(g => {
        const catId = Number(g.categoria_id);
        if (totais[catId] !== undefined) {
            totais[catId] += Number(g.valor);
        }
    });

    doc.setFontSize(10);
    doc.setFont('Courier', 'bold');
    doc.text('Categoria', 15, 30);
    doc.text('Valor', 100, 30);
    doc.setFont('Courier', 'normal');
    let y = 40;
    categorias.forEach(c => {
        const valor = totais[c.id] || 0;
        doc.text(`${c.icone} ${c.nome}`, 15, y);
        doc.text(formatarValor(valor), 100, y);
        y += 10;
    });

    // Meta de poupança
    const meta = state.config.meta_poupanca || 0;
    const renda = state.config.renda_mensal || 0;
    const totalGastosFixos = state.gastosFixos.reduce((acc, g) => acc + Number(g.valor), 0);
    const poupado = renda - totalGastosFixos - Object.values(totais).reduce((a,b)=>a+b,0);
    const cumpriu = poupado >= meta;
    y += 10;
    doc.setFont('Courier', 'bold');
    doc.text(`Meta de poupança: ${formatarValor(meta)}`, 15, y);
    y += 8;
    doc.text(`Poupado: ${formatarValor(poupado)} ${cumpriu ? '✓' : '✗'}`, 15, y);
    y += 12;

    // Capturar canvas do gráfico de barras (se existir)
    const canvas = document.getElementById('grafico-mes');
    if (canvas) {
        try {
            const dataUrl = canvas.toDataURL('image/png');
            const imgWidth = 160;
            const imgHeight = (canvas.height / canvas.width) * imgWidth;
            doc.addImage(dataUrl, 'PNG', 15, y, imgWidth, imgHeight);
            y += imgHeight + 10;
        } catch (e) {
            console.warn('Não foi possível capturar o gráfico:', e);
        }
    }

    // Última reflexão mensal
    const reflexoes = state.reflexoes || [];
    if (reflexoes.length > 0) {
        const ultima = reflexoes[reflexoes.length - 1];
        y += 5;
        doc.setFont('Courier', 'italic');
        doc.setFontSize(9);
        doc.text('Última reflexão:', 15, y);
        y += 6;
        doc.setFont('Courier', 'normal');
        const lines = doc.splitTextToSize(ultima.texto, pageWidth - 30);
        doc.text(lines, 15, y);
    }

    // Salvar
    doc.save(`kakebo-mensal-${nomeMes}-${ano}.pdf`);
}
