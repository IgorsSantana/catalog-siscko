exports.handler = async (event, context) => {
    // Adiciona headers de CORS para permitir requisições do front-end
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
    };

    // Responde ao preflight request (OPTIONS) exigido pelo navegador
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: ''
        };
    }

    // Permite apenas requisições POST
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method Not Allowed' })
        };
    }

    try {
        const payload = JSON.parse(event.body);

        // Faz a requisição de servidor para servidor (sem restrição de CORS) para a InfinitePay
        const response = await fetch('https://api.checkout.infinitepay.io/links', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        // Devolve a resposta da InfinitePay para o nosso front-end
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
