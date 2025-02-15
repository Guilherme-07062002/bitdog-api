# Assistente com IA na BitDogLab - API

## Descrição

Esta API foi desenvolvida para integrar a placa BitDogLab com modelos de inteligência artificial e serviços em nuvem. Ela permite a comunicação entre o dispositivo e um ambiente Cloudflare Workers, processando requisições utilizando dois modelos de IA:

- **llama-3-8b-instruct**: Para o processamento de prompts textuais.
- **Whisper**: Para a conversão de áudio (codificado em base64) em texto.

Além disso, a API armazena interações em um banco de dados SQL (Cloudflare D1) para possibilitar o histórico e a análise das requisições.

## Funcionalidades

### `/ai`

Recebe uma mensagem de texto, processa o prompt com o modelo de IA e retorna uma resposta formatada (sem acentos e caracteres especiais).

### `/voice-to-text`

Converte áudio codificado em base64 para texto utilizando o modelo Whisper e, em seguida, processa o texto com o modelo llama-3-8b-instruct.

### `/dashboard`

Retorna um histórico das interações armazenadas no banco de dados, incluindo uma análise resumida dos dados.

### Endpoint padrão (GET)

Responde com "Hello World!" para verificação de funcionamento da API.

## Ambiente e Dependências

A API utiliza as seguintes variáveis de ambiente:

- `API_TOKEN`: Token de autenticação para acessar os serviços de IA.
- `API_URL`: URL do endpoint do modelo de IA (llama-3-8b-instruct).
- `WHISPER_API_URL`: URL do endpoint do modelo de reconhecimento de fala (Whisper).
- `PASSWORD`: Senha de acesso obrigatória para requisições.
- `DB`: Instância do banco de dados Cloudflare D1, baseado no engine SQLite, para armazenamento dos registros.

**Plataforma**: Cloudflare Workers

**Linguagem**: TypeScript

## Endpoints

### POST `/ai`

**Descrição**: Processa um prompt textual, enviando-o para o modelo de IA e retornando uma resposta formatada.

**URL**: `/ai?senha=<PASSWORD>`

**Método**: POST

**Body**:

```json
{
    "message": "Sua pergunta ou prompt de texto"
}
```

### POST `/voice-to-text`

**Descrição**: Converte áudio codificado em base64 para texto e processa o texto com o modelo de IA.

**URL**: `/voice-to-text?senha=<PASSWORD>`

**Método**: POST

**Body**:

```json
{
	"audioBase64": "Base64 do áudio"
}
```

### GET `/dashboard`

**Descrição**: Fornece um histórico das interações armazenadas no banco de dados, incluindo uma análise resumida dos dados.

**URL**: `/dashboard?senha=<PASSWORD>`

**Método**: GET

**Resposta**: Retorna um objeto JSON contendo:

- `registers`: Lista de registros armazenados no banco de dados.
- `analysis`: Análise resumida dos dados, incluindo a quantidade de interações e a média de caracteres por mensagem.
- `count`: Número total de registros.

### GET `/`

**Descrição**: Endpoint padrão para verificação de funcionamento da API.

**URL**: `/`

**Método**: GET

**Resposta**: "Hello World!"

## Tratamento de Erros

A API retorna códigos de status HTTP para indicar o resultado da requisição.

Os principais códigos de erro são:

- **200**: Requisição bem-sucedida.
- **400**: Requisição inválida ou mal formatada.
- **401**: Falha na autenticação ou senha incorreta.
- **404**: Recurso não encontrado.
- **500**: Erro interno no servidor.

## Banco de Dados

A API utiliza um banco de dados SQL (Cloudflare D1) para armazenar os registros das interações.

Cada registro contém os seguintes dados:

`id`: Identificador único do registro.

`question`: Mensagem de entrada.

`answer`: Resposta gerada pelo modelo de IA.

`duration`: Duração do processamento (em segundos).

`timestamp`: Data e hora da interação (Unix timestamp).

## Como Contribuir

Contribuições, sugestões de melhorias ou reportes de bugs são bem-vindos. Sinta-se à vontade para abrir issues ou enviar pull requests.

## Licença

Este projeto é de uso livre para fins acadêmicos e de desenvolvimento.
