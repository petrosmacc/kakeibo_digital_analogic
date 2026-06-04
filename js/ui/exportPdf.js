// Função auxiliar para formatar valor em reais (mantida para balanço mensal)
function formatarValor(valor) {
    return 'R$ ' + valor.toFixed(2).replace('.', ',');
}

// Exporta template semanal em PDF (paisagem A4) – modelo em branco para preenchimento manual
export function exportarTemplateSemanal(state) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Título
    doc.setFontSize(14);
    doc.setFont('Courier', 'bold');
    doc.text(`Kakebo Digital – Template Semanal (Semana ${state.semanaAtual} de ${state.anoAtual})`, pageWidth / 2, 15, { align: 'center' });

    // Subtítulo
    doc.setFontSize(10);
    doc.setFont('Courier', 'italic');
    doc.text('Preencha ao longo do dia e transfira para o digital ao final do dia.', pageWidth / 2, 22, { align: 'center' });

    // Categorias (4 linhas)
    const categorias = state.categorias; // array de objetos { id, nome, icone }
    const diasSemana = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

    // Tabela
    const startX = 15;
    const startY = 32;
    const colWidth = (pageWidth - 30) / 8; // 7 dias + coluna de categoria
    const rowHeight = 18; // altura confortável ~2cm

    // Cabeçalho
    doc.setFontSize(10);
    doc.setFont('Courier', 'bold');
    doc.text('Categoria', startX, startY);
    diasSemana.forEach((dia, idx) => {
        doc.text(dia, startX + colWidth * (idx + 1), startY);
    });

    // Linhas de categorias (células vazias)
    doc.setFont('Courier', 'normal');
    categorias.forEach((cat, catIdx) => {
        const y = startY + rowHeight * (catIdx + 1);
        doc.text(`${cat.icone} ${cat.nome}`, startX, y);
        // Desenha bordas das células
        diasSemana.forEach((_, diaIdx) => {
            const x = startX + colWidth * (diaIdx + 1);
            doc.rect(x - 2, y - 10, colWidth - 2, rowHeight);
        });
        // Borda da coluna de categoria
        doc.rect(startX - 2, y - 10, colWidth - 2, rowHeight);
    });

    // Linha de totais diários
    const yTotal = startY + rowHeight * (categorias.length + 1);
    doc.setFont('Courier', 'bold');
    doc.text('Total do dia', startX, yTotal);
    diasSemana.forEach((_, diaIdx) => {
        const x = startX + colWidth * (diaIdx + 1);
        doc.rect(x - 2, yTotal - 10, colWidth - 2, rowHeight);
    });
    doc.rect(startX - 2, yTotal - 10, colWidth - 2, rowHeight);

    // Linha de total da semana por categoria
    const yTotalCat = yTotal + rowHeight;
    doc.setFont('Courier', 'bold');
    doc.text('Total da semana por categoria', startX, yTotalCat);
    // Célula mesclada para cada categoria (apenas uma célula grande)
    const larguraMesclada = colWidth * 7;
    doc.rect(startX + colWidth - 2, yTotalCat - 10, larguraMesclada, rowHeight);

    // Espaço para reflexão
    const yReflexao = yTotalCat + rowHeight + 10;
    doc.setFont('Courier', 'bold');
    doc.setFontSize(11);
    doc.text('Reflexão da semana:', startX, yReflexao);
    doc.setFont('Courier', 'normal');
    doc.setFontSize(10);
    // Linhas pautadas
    const lineHeight = 6;
    const numLinhas = 6;
    for (let i = 0; i < numLinhas; i++) {
        const y = yReflexao + 8 + i * lineHeight;
        doc.line(startX, y, pageWidth - 15, y);
    }

    // Rodapé
    doc.setFontSize(8);
    doc.setFont('Courier', 'italic');
    doc.text('Dica: use cores diferentes para totais – vermelho para totais diários, azul para gastos normais. Isso ajuda na visualização.', pageWidth / 2, pageHeight - 10, { align: 'center' });

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
