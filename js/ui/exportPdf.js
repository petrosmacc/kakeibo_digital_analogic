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

    // Margens de 1cm
    const margin = 10;
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

    // Categorias (a quarta será escrita em três linhas)
    const categorias = [
        'Essencial',
        'Lazer',
        'Cultura',
        null // será tratado separadamente
    ];
    const diasSemana = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

    // Tabela ocupando ~80% da altura útil
    const startX = margin;
    // Nomes dos dias começam 1,5 cm abaixo da última linha do cabeçalho (linha 22 + 15mm = 37mm)
    const startY = margin + 37; // 1,5 cm abaixo do subtítulo
    const colWidthCategoria = 40; // largura fixa para coluna de categorias
    const colWidthDia = (contentWidth - colWidthCategoria) / 7; // largura para cada dia
    const rowHeight = 25; // 2,5 cm para cada linha de categoria
    const totalRowHeight = 15; // 1,5 cm para linha de Total do Dia

    // Cabeçalho dos dias (alinhado centralmente sobre as células)
    doc.setFontSize(9);
    doc.setFont('Courier', 'bold');
    doc.text('', startX, startY); // célula vazia para nomes
    diasSemana.forEach((dia, idx) => {
        const x = startX + colWidthCategoria + colWidthDia * idx + colWidthDia / 2;
        doc.text(dia, x, startY, { align: 'center' });
    });

    // Linhas de categorias
    // As três primeiras categorias com nome normal
    for (let catIdx = 0; catIdx < 3; catIdx++) {
        const y = startY + rowHeight * (catIdx + 1);
        doc.setFont('Courier', 'bold');
        doc.setFontSize(9);
        doc.text(categorias[catIdx], startX + 2, y - 2);
        // Células vazias para cada dia
        diasSemana.forEach((_, diaIdx) => {
            const x = startX + colWidthCategoria + colWidthDia * diaIdx;
            doc.rect(x, y - 10, colWidthDia, rowHeight);
        });
        // Borda da coluna de nomes
        doc.rect(startX, y - 10, colWidthCategoria, rowHeight);
    }

    // Quarta categoria em três linhas
    const catIdx4 = 3;
    const y4 = startY + rowHeight * (catIdx4 + 1);
    doc.setFont('Courier', 'bold');
    doc.setFontSize(8);
    doc.text('Presentes', startX + 2, y4 - 6);
    doc.text('&', startX + 2, y4 - 1);
    doc.text('Imprevistos', startX + 2, y4 + 4);
    // Células vazias para cada dia
    diasSemana.forEach((_, diaIdx) => {
        const x = startX + colWidthCategoria + colWidthDia * diaIdx;
        doc.rect(x, y4 - 10, colWidthDia, rowHeight);
    });
    doc.rect(startX, y4 - 10, colWidthCategoria, rowHeight);

    // Linha de totais diários (borda mais escura)
    const yTotal = startY + rowHeight * (categorias.length + 1);
    doc.setFont('Courier', 'bold');
    doc.setFontSize(9);
    doc.text('Total', startX + 2, yTotal - 2);
    diasSemana.forEach((_, diaIdx) => {
        const x = startX + colWidthCategoria + colWidthDia * diaIdx;
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.8);
        doc.rect(x, yTotal - 10, colWidthDia, totalRowHeight);
    });
    doc.rect(startX, yTotal - 10, colWidthCategoria, totalRowHeight);

    // Espaço "Anotações" começa 2,0 cm abaixo da última linha da tabela
    const yAnotacoes = yTotal + totalRowHeight + 20; // 2,0 cm
    doc.setFontSize(11);
    doc.setFont('Courier', 'bold');
    doc.text('Anotações', startX, yAnotacoes);
    // Não desenha retângulo nem grade

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
