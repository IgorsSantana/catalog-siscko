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

        // Adiciona identificador único do pedido (order_nsu) conforme documentação da InfinitePay
        payload.order_nsu = pedidoId;

        // Configura a URL de webhook dinamicamente baseada no domínio atual
        const host = event.headers.host || 'seusite.com';
        const protocol = host.includes('localhost') ? 'http' : 'https';
        payload.webhook_url = `${protocol}://${host}/.netlify/functions/webhook-infinity`;

        // Se tiver usuário logado, envia os dados para agilizar o preenchimento do checkout
        if (user) {
            payload.customer = {
                name: user.user_metadata?.full_name || user.email.split('@')[0],
                email: user.email
            };
        }

        // Faz a requisição para a InfinitePay (sem necessidade de Token, pois usa a handle)
        const response = await fetch('https://api.checkout.infinitepay.io/links', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
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
