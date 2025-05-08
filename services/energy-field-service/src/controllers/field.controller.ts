import { Router, Request, Response } from 'express';
import { generateField, getFieldStatus } from '../services/field.service';
import { forceDisturbanceMiddleware } from '../middleware/force-disturbance.middleware';

export const fieldRoutes = Router();

// Generate an energy field
fieldRoutes.post('/generate', forceDisturbanceMiddleware, async (req: Request, res: Response) => {
  try {
    const { crystalId, mode, powerLevel, duration } = req.body;
    
    if (!crystalId || !mode || !powerLevel) {
      res.status(400).json({ 
        error: 'Missing required parameters',
        message: 'Parameters crystalId, mode, and powerLevel are required'
      });
      return;
    }
    
    const result = await generateField({
      crystalId,
      mode,
      powerLevel,
      duration: duration || 30
    });
    
    res.status(200).json(result);
  } catch (error: any) {
    console.error('Error generating energy field:', error);
    res.status(500).json({ 
      error: 'Failed to generate energy field',
      message: error.message 
    });
  }
});

// Get energy field status
fieldRoutes.get('/status', async (req: Request, res: Response) => {
  try {
    const { crystalId } = req.query;
    
    if (!crystalId) {
      res.status(400).json({ 
        error: 'Missing required parameter',
        message: 'Parameter crystalId is required'
      });
      return;
    }
    
    const status = await getFieldStatus(crystalId as string);
    res.status(200).json(status);
  } catch (error: any) {
    console.error('Error retrieving field status:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve field status',
      message: error.message 
    });
  }
});
