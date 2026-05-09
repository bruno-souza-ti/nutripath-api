// routes/chat.js
const express = require('express');
const router = express.Router();
const https = require('https');
const auth = require('../middleware/auth');

/**
 * @swagger
 * /chat/message:
 *   post:
 *     summary: Envia mensagem para a IA nutricionista
 *     tags: [Chat]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - mensagem
 *             properties:
 *               mensagem:
 *                 type: string
 *                 example: "O que devo comer no almoço?"
 *               usuario_id:
 *                 type: integer
 *                 example: 1
 *     responses:
 *       200:
 *         description: Resposta da IA
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 resposta:
 *                   type: string
 *       400:
 *         description: Mensagem não fornecida
 *       401:
 *         description: Não autorizado
 *       500:
 *         description: Erro ao contatar a IA
 */
router.post('/message', auth, async (req, res) => {
  const { mensagem } = req.body;

  if (!mensagem || typeof mensagem !== 'string' || mensagem.trim() === '')
    return res.status(400).json({ erro: 'O campo "mensagem" é obrigatório.' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey)
    return res.status(500).json({ erro: 'Chave da IA não configurada no servidor.' });

  const systemPrompt = `Você é a NutriPath IA, uma nutricionista virtual especializada em saúde e nutrição.
Suas respostas devem ser:
- Claras, práticas e baseadas em evidências científicas
- Em português brasileiro
- Focadas em nutrição, alimentação saudável, hidratação e bem-estar
- Empáticas e motivadoras
- Concisas (máximo 3 parágrafos)

Se o usuário perguntar algo fora do escopo de nutrição e saúde, redirecione gentilmente para tópicos relacionados.
Nunca substitua consultas médicas presenciais para casos clínicos sérios.`;

  const body = JSON.stringify({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1000,
    system: systemPrompt,
    messages: [{ role: 'user', content: mensagem.trim() }],
  });

  try {
    const resposta = await callAnthropicAPI(apiKey, body);
    return res.json({ resposta });
  } catch (err) {
    console.error('[Chat] Erro ao chamar Anthropic:', err.message);
    return res.status(500).json({ erro: 'Não foi possível obter resposta da IA. Tente novamente.' });
  }
});

function callAnthropicAPI(apiKey, body) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (response) => {
      let data = '';
      response.on('data', (chunk) => (data += chunk));
      response.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (response.statusCode !== 200)
            return reject(new Error(parsed?.error?.message || `Status ${response.statusCode}`));
          const text = parsed?.content?.[0]?.text;
          if (!text) return reject(new Error('Resposta inesperada da API.'));
          resolve(text);
        } catch (e) {
          reject(new Error('Falha ao parsear resposta da Anthropic.'));
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(20000, () => { req.destroy(); reject(new Error('Timeout.')); });
    req.write(body);
    req.end();
  });
}

module.exports = router;
