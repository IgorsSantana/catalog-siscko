exports.handler = async (event, context) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, OPTIONS'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    if (event.httpMethod !== 'GET') {
        return { statusCode: 405, headers, body: 'Method Not Allowed' };
    }

    // O Netlify injeta o usuário autenticado no context.clientContext se o JWT for válido
    const user = context.clientContext && context.clientContext.user;
    
    // Proteção rigorosa: Somente usuários com a role 'admin'
    const roles = user?.app_metadata?.roles || [];
    if (!user || !roles.includes('admin')) {
        return {
            statusCode: 403,
            headers,
            body: JSON.stringify({ error: 'Acesso negado. Apenas administradores podem ver estes dados.' })
        };
    }

    try {
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_KEY;

        if (!supabaseUrl || !supabaseKey) {
             return { statusCode: 200, headers, body: JSON.stringify({ pedidos: [], carrinhos: [] }) };
        }

        // Busca todos os pedidos (para produção alta escalar para paginação)
        const resPedidos = await fetch(`${supabaseUrl}/rest/v1/pedidos?select=*`, {
            method: 'GET',
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`,
                'Content-Type': 'application/json'
            }
        });

        // Busca os carrinhos abandonados
        const resCarrinhos = await fetch(`${supabaseUrl}/rest/v1/carrinhos?select=*`, {
            method: 'GET',
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`,
                'Content-Type': 'application/json'
            }
        });

        if (!resPedidos.ok || !resCarrinhos.ok) {
            throw new Error(`Erro Supabase: ${resPedidos.status} / ${resCarrinhos.status}`);
        }

        const pedidos = await resPedidos.json();
        const carrinhos = await resCarrinhos.json();

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ pedidos, carrinhos })
        };
    } catch (error) {
        console.error('Erro ao buscar estatísticas:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Internal Server Error' })
        };
    }
};
