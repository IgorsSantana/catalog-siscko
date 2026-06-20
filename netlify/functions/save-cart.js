exports.handler = async (event, context) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, headers, body: 'Method Not Allowed' };
    }

    // O Netlify injeta o usuário autenticado no context.clientContext se o JWT for válido
    const user = context.clientContext && context.clientContext.user;
    
    if (!user) {
        return {
            statusCode: 401,
            headers,
            body: JSON.stringify({ error: 'Não autorizado. Faça login para salvar o carrinho.' })
        };
    }

    try {
        const payload = JSON.parse(event.body);
        const cart = payload.cart;

        // Aqui integrariamos com o Supabase usando as variáveis de ambiente
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_KEY;

        if (supabaseUrl && supabaseKey) {
            // Chamada para o Supabase (REST API genérica)
            await fetch(`${supabaseUrl}/rest/v1/carrinhos`, {
                method: 'POST',
                headers: {
                    'apikey': supabaseKey,
                    'Authorization': `Bearer ${supabaseKey}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'resolution=merge-duplicates'
                },
                body: JSON.stringify({
                    user_id: user.sub, // ID do usuário no Netlify Identity
                    email: user.email,
                    items: cart,
                    updated_at: new Date().toISOString()
                })
            });
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ message: 'Carrinho salvo com sucesso.' })
        };
    } catch (error) {
        console.error('Erro ao salvar carrinho:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Internal Server Error' })
        };
    }
};
