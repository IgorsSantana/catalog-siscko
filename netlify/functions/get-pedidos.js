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
    
    if (!user) {
        return {
            statusCode: 401,
            headers,
            body: JSON.stringify({ error: 'Não autorizado. Faça login.' })
        };
    }

    try {
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_KEY;

        if (!supabaseUrl || !supabaseKey) {
             return {
                 statusCode: 200,
                 headers,
                 body: JSON.stringify([]) // Retorna vazio se não tiver configurado o banco ainda
             };
        }

        // Busca os pedidos filtrando pelo ID do usuário
        // Ordena por data de criação decrescente
        const response = await fetch(`${supabaseUrl}/rest/v1/pedidos?user_id=eq.${user.sub}&select=*&order=created_at.desc`, {
            method: 'GET',
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Erro Supabase: ${response.status}`);
        }

        const pedidos = await response.json();

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(pedidos)
        };
    } catch (error) {
        console.error('Erro ao buscar pedidos:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Internal Server Error' })
        };
    }
};
