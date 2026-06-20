exports.handler = async (event, context) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const payload = JSON.parse(event.body);

        // A InfinitePay envia o payload quando o pagamento é aprovado.
        const orderNsu = payload.order_nsu; // Número do pedido que enviamos na criação
        const captureMethod = payload.capture_method; // ex: 'pix' ou 'credit_card'

        if (orderNsu) {
            const supabaseUrl = process.env.SUPABASE_URL;
            const supabaseKey = process.env.SUPABASE_KEY;

            if (supabaseUrl && supabaseKey) {
                // Atualiza o status do pedido no Supabase buscando pelo order_nsu
                // Lembrando que gravamos o order_nsu com o prefixo 'P-' ou similar
                const pedidoIdLimpo = orderNsu.replace('P-', '');
                
                await fetch(`${supabaseUrl}/rest/v1/pedidos?id=eq.${pedidoIdLimpo}`, {
                    method: 'PATCH',
                    headers: {
                        'apikey': supabaseKey,
                        'Authorization': `Bearer ${supabaseKey}`,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=minimal'
                    },
                    body: JSON.stringify({
                        status: `pago_via_${captureMethod}`,
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
