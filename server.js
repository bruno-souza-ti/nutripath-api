require('dotenv').config();
const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use('/auth', authRoutes);

app.get('/', (_, res) => res.json({ status: 'NutriPath API rodando ✅' }));

app.listen(PORT, () => console.log(`🚀 API rodando em http://localhost:${PORT}`));