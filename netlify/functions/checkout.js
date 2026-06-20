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
        return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }

    // Tenta identificar o usuário autenticado (JWT)
    const user = context.clientContext && context.clientContext.user;

    try {
        const payload = JSON.parse(event.body);
        let pedidoId = `P-${Date.now()}`;

        // Se o usuário estiver logado, tentamos salvar o pedido pendente no Supabase
        if (user) {
            const supabaseUrl = process.env.SUPABASE_URL;
            const supabaseKey = process.env.SUPABASE_KEY;

            if (supabaseUrl && supabaseKey) {
                const res = await fetch(`${supabaseUrl}/rest/v1/pedidos`, {
                    method: 'POST',
                    headers: {
                        'apikey': supabaseKey,
                        'Authorization': `Bearer ${supabaseKey}`,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=representation'
                    },
                    body: JSON.stringify({
                        user_id: user.sub,
                        email: user.email,
                        items: payload.items,
                        status: 'pendente',
                        total_cents: payload.items.reduce((acc, item) => acc + item.price, 0)
                    })
                });

                if (res.ok) {
                    const data = await res.json();
                    if (data && data.length > 0) {
                        pedidoId = `P-${data[0].id}`; // Usa o ID real do banco
                    }
                }
            }
        }

        // Adiciona identificador único do pedido para o Webhook depois saber qual atualizar
        payload.metadata = {
            pedido_id: pedidoId,
            user_id: user ? user.sub : 'guest'
        };

        // Faz a requisição de servidor para servidor para a InfinitePay
        const response = await fetch('https://api.checkout.infinitepay.io/links', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // Aqui entraria o Token da InfinityPay em produção
                // 'Authorization': `Bearer ${process.env.INFINITYPAY_TOKEN}`
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        return {
            statusCode: response.status,
            headers,
            body: JSON.stringify(data)
        };
    } catch (error) {
        console.error('Erro ao gerar link:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Internal Server Error', details: error.message })
        };
    }
};
