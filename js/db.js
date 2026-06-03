import Dexie from 'https://unpkg.com/dexie@3.2.3/dist/dexie.mjs';

// Inicializa o banco de dados Dexie
const db = new Dexie('KakeboDB');

// Define o esquema das tabelas
db.version(1).stores({
    categorias: '++id, nome, icone, tipo',
    gastos: '++id, data, categoria_id, valor, nota, semana, ano, criado_em',
    gastos_fixos: '++id, descricao, categoria_id, valor, recorrencia, dia_vencimento',
    reflexoes: '++id, semana, ano, texto, criado_em',
    config: 'chave, valor'
});

// Função de Seed para popular as categorias iniciais do Kakeibo
export async function seedCategorias() {
    const count = await db.categorias.count();
    if (count === 0) {
        const categoriasIniciais = [
            { nome: 'Sobrevivência', icone: '🏠', tipo: 'despesa' },
            { nome: 'Opção', icone: '🍵', tipo: 'despesa' },
            { nome: 'Cultura', icone: '🎭', tipo: 'despesa' },
            { nome: 'Extraordinário', icone: '🎁', tipo: 'despesa' }
        ];
        await db.categorias.bulkAdd(categoriasIniciais);
        console.log('Categorias iniciais do Kakeibo cadastradas com sucesso!');
    }
}

// --- FUNÇÕES EXPORTADAS ---

// Retorna todas as categorias cadastradas
export async function getCategorias() {
    return await db.categorias.toArray();
}

// Retorna o valor de uma configuração específica pela chave
export async function getConfig(chave) {
    const item = await db.config.get(chave);
    return item ? item.valor : null;
}

// Define ou atualiza o valor de uma configuração
export async function setConfig(chave, valor) {
    await db.config.put({ chave, valor });
}

// Adiciona um novo gasto
export async function addGasto(gasto) {
    // Garante que o campo criado_em seja preenchido se não fornecido
    const novoGasto = {
        ...gasto,
        criado_em: gasto.criado_em || new Date()
    };
    return await db.gastos.add(novoGasto);
}

// Retorna os gastos de uma semana e ano específicos
export async function getGastosSemana(semana, ano) {
    return await db.gastos
        .where({ semana: Number(semana), ano: Number(ano) })
        .toArray();
}

// Retorna os gastos dentro de um período de datas (inicio e fim como strings ou objetos Date)
export async function getGastosPeriodo(inicio, fim) {
    const dataInicio = new Date(inicio).toISOString();
    const dataFim = new Date(fim).toISOString();
    
    return await db.gastos
        .where('data')
        .between(dataInicio, dataFim, true, true)
        .toArray();
}

// Adiciona uma nova reflexão semanal
export async function addReflexao(reflexao) {
    const novaReflexao = {
        ...reflexao,
        criado_em: reflexao.criado_em || new Date()
    };
    return await db.reflexoes.add(novaReflexao);
}

// Retorna as reflexões filtradas por semana e ano
export async function getReflexoes(semana, ano) {
    return await db.reflexoes
        .where({ semana: Number(semana), ano: Number(ano) })
        .toArray();
}

// Adiciona um novo gasto fixo
export async function addGastoFixo(gastoFixo) {
    return await db.gastos_fixos.add(gastoFixo);
}

// Retorna todos os gastos fixos cadastrados
export async function getGastosFixos() {
    return await db.gastos_fixos.toArray();
}

// Atualiza um gasto fixo existente pelo ID
export async function updateGastoFixo(id, dados) {
    return await db.gastos_fixos.update(Number(id), dados);
}

// Exporta a instância do banco para uso avançado se necessário
export default db;
