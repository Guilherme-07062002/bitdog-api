export interface Env {
	API_TOKEN: string;
	API_URL: string;
	PASSWORD: string;
}

const systemInstructions = {
    role: "system",
    content: "Você é um assistente amigável que responderá às mensagens de forma concisa, " +
             "considerando que as respostas serão exibidas em um display OLED com espaço limitado. " +
             "Evite respostas longas e forneça informações claras e diretas"
}

const prompt = {
	messages: [ systemInstructions ]
}

const adjustMessage = (message: string) => {
	prompt.messages.push({
		role: 'user',
		content: message
	});

	return prompt;
}

export default {
    async fetch(request, env, ctx): Promise<Response> {
        const url = new URL(request.url);
        const pathname = url.pathname;

		// Mandar para IA
		if (request.method === 'POST' && pathname === '/ai') {
			try {
				// Verifica se foi passado o query params 'senha' contendo a senha de acesso
				const senha = url.searchParams.get('senha');
				if (!senha) {
					return new Response('Senha de acesso não informada', { status: 401 });
				}

				// Verifica se a senha de acesso está correta
				if (senha !== env.PASSWORD) {
					return new Response('Senha de acesso inválida', { status: 401 });
				}

				const requestBody = await request.json() as any;
				if (!requestBody.message) {
					return new Response('Não foi possível determinar a mensagem a ser enviada', { status: 400 });
				}

				const message = requestBody.message;

				// Adicionar mensagem do usuário
				adjustMessage(message);

				const result = await fetch(env.API_URL, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						'Authorization': `Bearer ${env.API_TOKEN}`,
					},
					body: JSON.stringify(prompt),
				});

				const jsonResponse = await result.json() as any;
				return new Response(jsonResponse.result.response, { status: 200 });
			} catch (error) {
				return new Response(`Erro ao enviar mensagem para IA, reveja os dados enviados: ${error}`, { status: 500 });
			}
		}

        if (request.method === 'POST') {
			try {
				const requestBody = await request.json() as any;
				if (!requestBody.message) {
					return new Response('Não foi possível determinar a mensagem', { status: 400 });
				}

				const message = requestBody.message;
				return new Response(`Mensagem recebida: ${message}`, { status: 200 });
			} catch (error) {
				return new Response('Erro ao receber mensagem, reveja os dados enviados', { status: 500 });
			}
        }

        if (request.method === 'GET') {
            return new Response('Hello World!', { status: 200 });
        }

		return new Response('Not found', { status: 404 });
    },
} satisfies ExportedHandler<Env>;
