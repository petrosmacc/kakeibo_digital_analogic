// Função auxiliar para formatar valor em reais
function formatarValor(valor) {
    return 'R$ ' + valor.toFixed(2).replace('.', ',');
}

// Exporta template semanal em PDF (paisagem A4)
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
    doc.text(`Kakebo Digital – Semana ${state.semanaAtual} de ${state.anoAtual}`, pageWidth / 2, 15, { align: 'center' });

    // Categorias (4 linhas)
    const categorias = state.categorias; // array de objetos { id, nome, icone }
    const diasSemana = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

    // Mapear gastos por data e categoria
    const gastosPorDia = {};
    state.gastosSemana.forEach(g => {
        const data = new Date(g.data);
        const diaSemana = data.getDay(); // 0=Dom,1=Seg...
        const diaIdx = (diaSemana === 0 ? 6 : diaSemana - 1); // 0=Seg..6=Dom
        const catId = Number(g.categoria_id);
        if (!gastosPorDia[diaIdx]) gastosPorDia[diaIdx] = {};
        if (!gastosPorDia[diaIdx][catId]) gastosPorDia[diaIdx][catId] = 0;
        gastosPorDia[diaIdx][catId] += Number(g.valor);
    });

    // Tabela
    const startX = 15;
    const startY = 30;
    const colWidth = (pageWidth - 30) / 8; // 7 dias + coluna de categoria
    const rowHeight = 12;

    // Cabeçalho
    doc.setFontSize(10);
    doc.setFont('Courier', 'bold');
    doc.text('Categoria', startX, startY);
    diasSemana.forEach((dia, idx) => {
        doc.text(dia, startX + colWidth * (idx + 1), startY);
    });

    // Linhas de categorias
    doc.setFont('Courier', 'normal');
    categorias.forEach((cat, catIdx) => {
        const y = startY + rowHeight * (catIdx + 1);
        doc.text(`${cat.icone} ${cat.nome}`, startX, y);
        let totalCat = 0;
        diasSemana.forEach((_, diaIdx) => {
            const valor = gastosPorDia[diaIdx]?.[cat.id] || 0;
            totalCat += valor;
            doc.text(formatarValor(valor), startX + colWidth * (diaIdx + 1), y);
        });
        // Total da categoria
        doc.setFont('Courier', 'bold');
        doc.text(formatarValor(totalCat), startX + colWidth * 7 + colWidth, y);
        doc.setFont('Courier', 'normal');
    });

    // Linha de totais diários
    const yTotal = startY + rowHeight * (categorias.length + 1);
    doc.setFont('Courier', 'bold');
    doc.text('Total', startX, yTotal);
    let totalGeral = 0;
    diasSemana.forEach((_, diaIdx) => {
        let totalDia = 0;
        categorias.forEach(cat => {
            totalDia += gastosPorDia[diaIdx]?.[cat.id] || 0;
        });
        totalGeral += totalDia;
        doc.text(formatarValor(totalDia), startX + colWidth * (diaIdx + 1), yTotal);
    });
    doc.text(formatarValor(totalGeral), startX + colWidth * 7 + colWidth, yTotal);

    // Rodapé
    doc.setFontSize(8);
    doc.setFont('Courier', 'italic');
    doc.text('Use cores diferentes para destacar os totais, se desejar.', pageWidth / 2, pageHeight - 10, { align: 'center' });

    // Salvar
    doc.save(`kakebo-semana-${state.semanaAtual}-${state.anoAtual}.pdf`);
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
