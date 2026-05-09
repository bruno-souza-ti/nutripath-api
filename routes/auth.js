const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database/db');

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Cria uma nova conta
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nome:
 *                 type: string
 *               email:
 *                 type: string
 *               senha:
 *                 type: string
 *     responses:
 *       201:
 *         description: Conta criada com sucesso
 *       409:
 *         description: E-mail já cadastrado
 */
router.post('/register', async (req, res) => {
  const { nome, email, senha } = req.body;

  if (!nome || !email || !senha)
    return res.status(400).json({ erro: 'Preencha todos os campos.' });

  const existe = db.prepare('SELECT id FROM usuarios WHERE email = ?').get(email);
  if (existe)
    return res.status(409).json({ erro: 'E-mail já cadastrado.' });

  const hash = await bcrypt.hash(senha, 10);

  const result = db.prepare(
    'INSERT INTO usuarios (nome, email, senha, criado_em) VALUES (?, ?, ?, ?)'
  ).run(nome, email, hash, new Date().toISOString());

  const token = jwt.sign(
    { id: result.lastInsertRowid, nome, email },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  return res.status(201).json({
    mensagem: 'Conta criada com sucesso!',
    token,
    usuario: { id: result.lastInsertRowid, nome, email }
  });
});

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Realiza login e retorna JWT
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               senha:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login realizado com sucesso
 *       401:
 *         description: Credenciais inválidas
 */
router.post('/login', async (req, res) => {
  const { email, senha } = req.body;

  if (!email || !senha)
    return res.status(400).json({ erro: 'Informe e-mail e senha.' });

  const usuario = db.prepare('SELECT * FROM usuarios WHERE email = ?').get(email);
  if (!usuario)
    return res.status(401).json({ erro: 'E-mail ou senha incorretos.' });

  const senhaCorreta = await bcrypt.compare(senha, usuario.senha);
  if (!senhaCorreta)
    return res.status(401).json({ erro: 'E-mail ou senha incorretos.' });

  const token = jwt.sign(
    { id: usuario.id, nome: usuario.nome, email: usuario.email },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  return res.json({
    mensagem: 'Login realizado com sucesso!',
    token,
    usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email }
  });
});

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Retorna dados do usuário autenticado
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dados do usuário
 *       401:
 *         description: Token não fornecido
 *       403:
 *         description: Token inválido
 */
router.get('/me', (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader?.split(' ')[1];

  if (!token)
    return res.status(401).json({ erro: 'Token não fornecido.' });

  try {
    const dados = jwt.verify(token, process.env.JWT_SECRET);
    const usuario = db.prepare(
      'SELECT id, nome, email FROM usuarios WHERE id = ?'
    ).get(dados.id);
    return res.json({ usuario });
  } catch {
    return res.status(403).json({ erro: 'Token inválido ou expirado.' });
  }
});

/**
 * @swagger
 * /auth/usuarios:
 *   get:
 *     summary: Lista todos os usuários
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Lista de usuários
 */
router.get('/usuarios', (req, res) => {
  const usuarios = db.prepare(
    'SELECT id, nome, email, criado_em FROM usuarios'
  ).all();
  return res.json({ usuarios });
});

module.exports = router;