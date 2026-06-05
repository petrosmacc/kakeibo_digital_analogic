// Função auxiliar para formatar valor em reais (não utilizada atualmente, mantida para compatibilidade)
function formatarValor(valor) {
    return 'R$ ' + valor.toFixed(2).replace('.', ',');
}

// Exporta template semanal em PDF (retrato A4) – 4 folhas para o mês, cada uma com cabeçalho
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

    // Categorias
    const categorias = [
        'Essencial',
        'Lazer',
        'Cultura',
        'Extra'
    ];
    const diasSemana = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

    // Gera 4 páginas (uma para cada semana do mês)
    for (let i = 0; i < 4; i++) {
        if (i > 0) {
            doc.addPage();
        }

        // Título centralizado
        doc.setFontSize(14);
        doc.setFont('Courier', 'bold');
        doc.text(`Kakebo – Semana ${state.semanaAtual + i} de ${state.anoAtual}`, pageWidth / 2, margin + 8, { align: 'center' });

        // Linhas de instrução
        doc.setFontSize(9);
        doc.setFont('Courier', 'italic');
        doc.text('Preencha ao longo do dia e transfira para o digital ao final do dia.', pageWidth / 2, margin + 16, { align: 'center' });
        doc.text('Dica: use cores – vermelho para totais, azul/preto para gastos normais.', pageWidth / 2, margin + 22, { align: 'center' });

        // Espaço para data em branco (preenchimento manual)
        doc.setFont('Courier', 'normal');
        doc.text('Data: ____/____ a ____/____', pageWidth / 2, margin + 29, { align: 'center' });

        // Tabela ocupando ~80% da altura útil
        const startX = margin;
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
        categorias.forEach((nome, catIdx) => {
            const y = startY + rowHeight * (catIdx + 1);
            doc.setFont('Courier', 'bold');
            doc.setFontSize(9);
            doc.text(nome, startX + 2, y - 2);
            // Células vazias para cada dia
            diasSemana.forEach((_, diaIdx) => {
                const x = startX + colWidthCategoria + colWidthDia * diaIdx;
                doc.rect(x, y - 10, colWidthDia, rowHeight);
            });
            // Borda da coluna de nomes
            doc.rect(startX, y - 10, colWidthCategoria, rowHeight);
        });

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
    }

    // Salvar
    doc.save(`kakebo-template-semana-${state.semanaAtual}-${state.anoAtual}.pdf`);
}