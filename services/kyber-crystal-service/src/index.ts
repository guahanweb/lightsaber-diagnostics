import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { crystalRoutes } from './controllers/crystal.controller';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

app.use('/api/crystals', crystalRoutes);

// Start server
app.listen(PORT, () => {
  console.log(`Kyber Crystal Service running on port ${PORT}`);
});

export default app;
