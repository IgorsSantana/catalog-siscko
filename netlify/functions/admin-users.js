exports.handler = async (event, context) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    // 1. Verificar Autenticação e Permissão de Admin
    const user = context.clientContext && context.clientContext.user;
    const roles = user?.app_metadata?.roles || [];
    
    if (!user || !roles.includes('admin')) {
        return {
            statusCode: 403,
            headers,
            body: JSON.stringify({ error: 'Acesso negado. Apenas administradores podem gerenciar usuários.' })
        };
    }

    // 2. Extrair token de administrador e URL da API do Identity
    const identity = context.clientContext.identity;
    if (!identity) {
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'Identity context not available no Netlify.' })
        };
    }

    const identityUrl = identity.url;
    const adminToken = identity.token;

    try {
        if (event.httpMethod === 'GET') {
            // Listar usuários
            const res = await fetch(`${identityUrl}/admin/users`, {
                method: 'GET',
                headers: {
                    Authorization: `Bearer ${adminToken}`
                }
            });

            if (!res.ok) {
                throw new Error(`Erro Identity API: ${res.status} ${await res.text()}`);
            }

            const data = await res.json();
            
            // Retorna a lista de usuários, formatada de forma mais simples
            const users = data.users.map(u => ({
                id: u.id,
                email: u.email,
                created_at: u.created_at,
                roles: u.app_metadata?.roles || []
            }));

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ users })
            };
        } 
        
        else if (event.httpMethod === 'PUT') {
            // Atualizar roles de um usuário
            const body = JSON.parse(event.body);
            const targetUserId = body.userId;
            const newRoles = body.roles || [];

            if (!targetUserId) {
                return { statusCode: 400, headers, body: JSON.stringify({ error: 'userId é obrigatório.' }) };
            }

            // Você não pode remover o próprio cargo de admin, para não perder o acesso!
            if (targetUserId === user.sub && !newRoles.includes('admin')) {
                return { statusCode: 400, headers, body: JSON.stringify({ error: 'Você não pode remover seu próprio cargo de administrador.' }) };
            }

            const res = await fetch(`${identityUrl}/admin/users/${targetUserId}`, {
                method: 'PUT',
                headers: {
                    Authorization: `Bearer ${adminToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    app_metadata: {
                        roles: newRoles
                    }
                })
            });

            if (!res.ok) {
                throw new Error(`Erro Identity API ao atualizar: ${res.status} ${await res.text()}`);
            }

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({ message: 'Permissões atualizadas com sucesso!' })
            };
        } 
        
        else {
            return { statusCode: 405, headers, body: 'Method Not Allowed' };
        }

    } catch (error) {
        console.error('Erro na API de Usuários:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: error ? error.toString() : 'Erro Desconhecido' })
        };
    }
};
