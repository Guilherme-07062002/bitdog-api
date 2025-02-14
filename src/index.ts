export interface Env {
	API_TOKEN: string;
	API_URL: string;
	WHISPER_API_URL: string;
	PASSWORD: string;
}

const systemInstructions = {
    role: "system",
    content: "Você é um assistente amigável que recebe tópicos de perguntas em português brasileiro e os transforma em perguntas detalhadas. As respostas devem ser adequadas para exibição em um display OLED com espaço limitado. Seja conciso e direto na formulação das perguntas."
}

const prompt = {
	messages: [ systemInstructions ]
}

const adjustMessage = (message: string) => {
    prompt.messages = [systemInstructions, {
        role: 'user',
        content: message
    }];
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
				console.log("🚀 ~ fetch ~ message:", message)

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
				console.log("🚀 ~ fetch ~ result:", result)

				const jsonResponse = await result.json() as any;
				console.log("🚀 ~ fetch ~ jsonResponse:", jsonResponse)

				const responseMessage = jsonResponse.result.response;

				const responseMessageClean = responseMessage
					.normalize('NFD')
					.replace(/[\u0300-\u036f]/g, "") // Remove acentos
					.replace(/[^\w\s,/]/gi, ""); // Remove caracteres especiais, exceto a vírgula e a barra

				return new Response(responseMessageClean, { status: 200 });
			} catch (error) {
				console.log(error);
				return new Response(`Erro ao enviar mensagem para IA, reveja os dados enviados: ${error}`, { status: 500 });
			}
		}

		// Endpoint para conversão de voz para texto
		if (request.method === 'POST' && pathname === '/voice-to-text') {
			try {
			const url = new URL(request.url);

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
			console.log("🚀 ~ fetch ~ requestBody:", requestBody)

			if (!requestBody.audioBase64) {
				return new Response('Não foi possível determinar o áudio', { status: 400 });
			}

			const audioBase64 = requestBody.audioBase64;
			console.log("🚀 ~ fetch ~ audioBase64:", audioBase64)

			// Converte a string Base64 para Uint8Array usando atob
			const binaryString = atob(audioBase64);
			const len = binaryString.length;
			const audioArray = new Uint8Array(len);
			for (let i = 0; i < len; i++) {
				audioArray[i] = binaryString.charCodeAt(i);
			}

			const input = {
				audio: Array.from(audioArray),
			};
			console.log("🚀 ~ fetch ~ input.audioArray:", audioArray)

			console.log("🚀 ~ fetch ~ input:", JSON.stringify(input));

			const result = await fetch(env.WHISPER_API_URL, {
				method: 'POST',
				headers: {
				'Content-Type': 'application/json',
				'Authorization': `Bearer ${env.API_TOKEN}`,
				},
				body: JSON.stringify(input),
			});

			console.log("🚀 ~ fetch ~ result:", result);
			const data = await result.json();

			return new Response(JSON.stringify({ input: { audio: [] }, response: data }), {
				headers: { 'Content-Type': 'application/json' },
			});

			} catch (error) {
			console.log(error);
			return new Response(`Erro ao converter áudio para texto, reveja os dados enviados: ${error}`, { status: 500 });
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
