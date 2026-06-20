exports.handler = async (event, context) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const payload = JSON.parse(event.body);

        // A InfinityPay envia o status da transação. 
        // Verifique a documentação para o payload exato. 
        // Exemplo fictício baseado em padrões de mercado:
        const status = payload.status; 
        const metadata = payload.metadata; // Dados que enviamos na criação do link

        if (status === 'approved' && metadata && metadata.pedido_id) {
            const supabaseUrl = process.env.SUPABASE_URL;
            const supabaseKey = process.env.SUPABASE_KEY;

            if (supabaseUrl && supabaseKey) {
                // Atualiza o status do pedido no Supabase
                await fetch(`${supabaseUrl}/rest/v1/pedidos?id=eq.${metadata.pedido_id.replace('P-', '')}`, {
                    method: 'PATCH',
                    headers: {
                        'apikey': supabaseKey,
                        'Authorization': `Bearer ${supabaseKey}`,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=minimal'
                    },
                    body: JSON.stringify({
                        status: 'pago',
                        updated_at: new Date().toISOString()
                    })
                });
            }
        }

        return {
            statusCode: 200,
            body: JSON.stringify({ received: true })
        };
    } catch (error) {
        console.error('Erro ao processar webhook:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Internal Server Error' })
        };
    }
};
