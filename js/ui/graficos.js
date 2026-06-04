// Função auxiliar para formatar valor em reais
function formatarValor(valor) {
    return 'R$ ' + valor.toFixed(2).replace('.', ',');
}

// Desenha barras horizontais no canvas
export function desenharBarras(canvasId, dados) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Ajusta tamanho ao container
    const container = canvas.parentElement;
    canvas.width = container ? container.offsetWidth : 400;
    canvas.height = dados.length * 40 + 20; // 30px barra + 10px gap + margem

    const margemEsquerda = 150;
    const larguraUtil = canvas.width - margemEsquerda - 20;
    const maiorValor = Math.max(...dados.map(d => d.valor), 1);

    // Fundo
    ctx.fillStyle = '#F5F0E8';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    dados.forEach((d, idx) => {
        const y = idx * 40 + 10;
        const larguraBarra = (d.valor / maiorValor) * larguraUtil;

        // Rótulo
        ctx.fillStyle = '#4A3B32';
        ctx.font = '16px "Courier New", monospace';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillText(d.rotulo, margemEsquerda - 10, y + 15);

        // Barra
        ctx.fillStyle = d.cor || '#8B7355';
        ctx.fillRect(margemEsquerda, y, larguraBarra, 30);

        // Valor dentro da barra
        ctx.fillStyle = '#4A3B32';
        ctx.font = 'bold 14px "Courier New", monospace';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        const textoValor = formatarValor(d.valor);
        const xTexto = margemEsquerda + 8;
        ctx.fillText(textoValor, xTexto, y + 15);
    });
}

// Desenha gráfico de linha de evolução
export function desenharLinhaEvolucao(canvasId, dados) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const container = canvas.parentElement;
    canvas.width = container ? container.offsetWidth : 400;
    canvas.height = 250;

    const margemEsquerda = 60;
    const margemDireita = 20;
    const margemSuperior = 30;
    const margemInferior = 40;
    const larguraUtil = canvas.width - margemEsquerda - margemDireita;
    const alturaUtil = canvas.height - margemSuperior - margemInferior;

    // Fundo
    ctx.fillStyle = '#F5F0E8';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (dados.length === 0) return;

    const maiorValor = Math.max(...dados.map(d => d.valor), 1);
    // Arredonda para cima para escala
    const escalaMax = Math.ceil(maiorValor / 100) * 100 || 100;

    // Grade horizontal
    ctx.strokeStyle = '#E0D5C5';
    ctx.lineWidth = 1;
    const numLinhas = 5;
    for (let i = 0; i <= numLinhas; i++) {
        const y = margemSuperior + (alturaUtil / numLinhas) * i;
        ctx.beginPath();
        ctx.moveTo(margemEsquerda, y);
        ctx.lineTo(canvas.width - margemDireita, y);
        ctx.stroke();

        // Rótulo do eixo Y
        ctx.fillStyle = '#4A3B32';
        ctx.font = '14px "Courier New", monospace';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        const valorY = escalaMax - (escalaMax / numLinhas) * i;
        ctx.fillText(formatarValor(valorY), margemEsquerda - 8, y);
    }

    // Pontos e linha
    const stepX = dados.length > 1 ? larguraUtil / (dados.length - 1) : larguraUtil / 2;
    ctx.strokeStyle = '#6B8E6B';
    ctx.lineWidth = 3;
    ctx.beginPath();
    dados.forEach((d, idx) => {
        const x = margemEsquerda + idx * stepX;
        const y = margemSuperior + alturaUtil - (d.valor / escalaMax) * alturaUtil;
        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Pontos circulares
    dados.forEach((d, idx) => {
        const x = margemEsquerda + idx * stepX;
        const y = margemSuperior + alturaUtil - (d.valor / escalaMax) * alturaUtil;
        ctx.fillStyle = '#6B8E6B';
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fill();
    });

    // Rótulos do eixo X
    ctx.fillStyle = '#4A3B32';
    ctx.font = '14px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    dados.forEach((d, idx) => {
        const x = margemEsquerda + idx * stepX;
        ctx.fillText(d.rotulo, x, canvas.height - margemInferior + 8);
    });
}
