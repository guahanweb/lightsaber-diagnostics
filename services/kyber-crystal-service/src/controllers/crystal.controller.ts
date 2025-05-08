import { Router, Request, Response } from 'express';
import { activateCrystal, getCrystalStats } from '../services/crystal.service';

export const crystalRoutes = Router();

// Activate a kyber crystal
crystalRoutes.post('/activate', async (req: Request, res: Response) => {
  try {
    const { crystalId, ownerName, type, mode, powerLevel } = req.body;
    
    if (!crystalId || !ownerName || !type || !mode || !powerLevel) {
      res.status(400).json({ 
        error: 'Missing required parameters',
        message: 'All parameters (crystalId, ownerName, type, mode, powerLevel) are required'
      });
      return;
    }
    
    const result = await activateCrystal({
      crystalId,
      ownerName,
      type,
      mode,
      powerLevel
    });
    
    res.status(200).json(result);
  } catch (error: any) {
    console.error('Error activating kyber crystal:', error);
    res.status(500).json({ 
      error: 'Failed to activate kyber crystal',
      message: error.message 
    });
  }
});

// Get crystal activation statistics
crystalRoutes.get('/stats', async (req: Request, res: Response) => {
  try {
    const stats = await getCrystalStats();
    res.status(200).json(stats);
  } catch (error: any) {
    console.error('Error retrieving crystal stats:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve crystal statistics',
      message: error.message 
    });
  }
});
