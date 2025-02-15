export interface Env {
	API_TOKEN: string;
	API_URL: string;
	WHISPER_API_URL: string;
	PASSWORD: string;
	DB: D1Database;
}

const systemInstructions = {
    role: "system",
    content: "Você é um assistente amigável que recebe tópicos de perguntas em português brasileiro e os transforma em respostas detalhadas. Exemplo: Ao receber 'Capital da França' você deve retornar uma resposta indicando qual é a capital da frança incluindo outros detalhes. Além disso, pode ser solicitado a você que retorne 3 tópicos a serem abordados de exemplo. Responda de forma objetiva sem muitos detalhes em um único parágrafo."
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

				const startTime = new Date().getTime();

				const result = await fetch(env.API_URL, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						'Authorization': `Bearer ${env.API_TOKEN}`,
					},
					body: JSON.stringify(prompt),
				});
				console.log("🚀 ~ fetch ~ result:", result)

				const endTime = new Date().getTime();
				const durationMs = endTime - startTime;
				const durationSeconds = Math.round(durationMs / 1000); // Arredonda para o segundo mais próximo
				console.log("🚀 ~ fetch ~ duration:", durationSeconds)

				const jsonResponse = await result.json() as any;
				console.log("🚀 ~ fetch ~ jsonResponse:", jsonResponse)

				const responseMessage = jsonResponse.result.response;

				const responseMessageClean = responseMessage
					.normalize('NFD')
					.replace(/[\u0300-\u036f]/g, "") // Remove acentos
					.replace(/[^\w\s,/]/gi, ""); // Remove caracteres especiais, exceto a vírgula e a barra

				// Salvar a mensagem no banco de dados
                try {
                    const stmt = env.DB.prepare(`
                        INSERT INTO registros (question, answer, duration, timestamp)
                        VALUES (?, ?, ?, ?)
                    `);

					// Timestamp como inteiro
					const timestamp = Math.floor(Date.now() / 1000);
                    const info = await stmt.bind(message, responseMessageClean, durationSeconds, timestamp).run();
                    console.log(" ~ fetch ~ info:", info)

                } catch (error) {
                    console.error(" ~ fetch ~ error:", error)
                    return new Response(`Erro ao salvar no banco de dados: ${error}`, { status: 500 });
                }

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
				const data = await result.json() as any;
				const message = data.result.text;
				console.log("🚀 ~ fetch ~ message:", message)

				// Coleta o dado e envia para o endpoint da IA llama para processamento
				adjustMessage(message);

				const llamaResult = await fetch(env.API_URL, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						'Authorization': `Bearer ${env.API_TOKEN}`,
					},
					body: JSON.stringify(prompt),
				});
				console.log("🚀 ~ fetch ~ llamaResult:", llamaResult)

				const llamaJsonResponse = await llamaResult.json() as any;
				console.log("🚀 ~ fetch ~ llamaJsonResponse:", llamaJsonResponse)

				let responseMessage = llamaJsonResponse.result.response;

				responseMessage = `Pergunta: ${message}\n\nResposta: ${responseMessage}`;

				const responseMessageClean = responseMessage
					.normalize('NFD')
					.replace(/[\u0300-\u036f]/g, "") // Remove acentos
					.replace(/[^\w\s,/]/gi, ""); // Remove caracteres especiais, exceto a vírgula e a barra

				return new Response(responseMessageClean, { status: 200 });
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

		// Retornar histórico de interações para o dashboard com análises
		if (request.method === 'GET' && pathname === '/dashboard') {
			try {
				const registers = await env.DB.prepare(`
					SELECT question, answer, duration, timestamp
					FROM registros
				`).all();

				const aiAnalysis = await fetch(env.API_URL, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						'Authorization': `Bearer ${env.API_TOKEN}`,
					},
					body: JSON.stringify({
						messages: [
							{
								role: "system",
								content: `Você terá acesso a um conjunto de dados contendo as seguintes informações sobre cada interação:
									* **id**: Um identificador único para cada interação.
									* **question**: A pergunta feita pelo usuário.
									* **answer**: A resposta fornecida pela IA.
									* **duration**: A duração da interação (em segundos).
									* **timestamp**: O momento em que a interação ocorreu (formato Unix timestamp).

									## Tarefas

									Com base nesses dados, realize as seguintes análises:

									1. **Perguntas mais frequentes:** Identifique as perguntas que foram feitas com mais frequência pelos usuários.
									2. **Tópicos e duração:** Analise a relação entre os tópicos das perguntas e a duração das interações. Quais tópicos tendem a gerar respostas mais longas ou mais curtas?
									3. **Qualidade da resposta e duração:** Verifique se a duração da interação está relacionada à qualidade da resposta. Perguntas que geram respostas mais longas são mais bem respondidas?

									IMPORTANTE: Sua resposta deve conter até 256 tokens no máximo.

									Retorne tudo em um bloco de texto sem formatação markdown ou títulos.
									`
							},
							{
                                role: "user",
								content: `## Dados Disponíveis para Análise (${registers.results.length} registros) \n\n` +
									registers.results.map((register, index) => {
                                        return `**ID**: ${index + 1}\n` +
                                            `**Pergunta**: ${register.question}\n` +
                                            `**Resposta**: ${register.answer}\n` +
                                            `**Duração**: ${register.duration} segundos\n` +
											`**Timestamp**: ${new Date((register.timestamp as number) * 1000).toLocaleString()}\n\n`;
                                    }).join('\n')
                            }
						]
					}),
				});

				const jsonResponse = await aiAnalysis.json() as any;
				console.log("🚀 ~ fetch ~ jsonResponse:", jsonResponse)

				const responseMessage = jsonResponse.result.response;

				const allData = {
					analysis: responseMessage,
					count: registers.results.length,
					registers: registers.results,
				};

				return new Response(JSON.stringify(allData), {
					status: 200,
					headers: { 'Content-Type': 'application/json' }
				});
			}
			catch (error) {
				console.log(error);
				return new Response(`Erro ao buscar registros: ${error}`, { status: 500 });
			}
		}

        if (request.method === 'GET') {
            return new Response('Hello World!', { status: 200 });
        }

		return new Response('Not found', { status: 404 });
    },
} satisfies ExportedHandler<Env>;
