import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fieldRoutes } from './controllers/field.controller';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

app.use('/api/field', fieldRoutes);

// Start server
app.listen(PORT, () => {
  console.log(`Energy Field Service running on port ${PORT}`);
});

export default app;
