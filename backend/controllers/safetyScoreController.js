const safetyScoreService = require('../services/safetyScoreService');

class SafetyScoreController {
  /**
   * Get safety data for a specific bus
   * GET /api/bus/:busId/safety
   */
  async getBusSafetyData(req, res) {
    try {
      const { busId } = req.params;
      if (!busId) return res.status(400).json({ error: 'Bus ID is required' });

      const safetyData = await safetyScoreService.getBusSafetyData(busId);
      res.status(200).json(safetyData);
    } catch (error) {
      console.error('Error in getBusSafetyData:', error.message);
      // Return a default safe response so the card still renders on the phone
      res.status(200).json({
        busId: req.params.busId,
        busNumber: req.params.busId,
        route: 'Unavailable',
        safetyScore: 100,
        safetyRating: 'Good',
        safetyColor: '#8BC34A',
        warnings: {},
        driverName: 'N/A',
        currentSpeed: 0,
        status: 'active',
        lastUpdated: new Date().toISOString(),
        _error: error.message,
      });
    }
  }

  /**
   * Get recent warnings for a bus
   * GET /api/bus/:busId/safety/warnings
   */
  async getRecentWarnings(req, res) {
    try {
      const { busId } = req.params;
      const { minutes = 10 } = req.query;
      
      if (!busId) {
        return res.status(400).json({ error: 'Bus ID is required' });
      }

      const warnings = await safetyScoreService.getRecentWarnings(
        busId, 
        parseInt(minutes)
      );
      
      res.status(200).json({
        busId,
        warnings,
        count: warnings.length,
        timeWindow: `${minutes} minutes`
      });
    } catch (error) {
      console.error('Error in getRecentWarnings:', error);
      res.status(500).json({ 
        error: 'Failed to get recent warnings',
        message: error.message 
      });
    }
  }

  /**
   * Update safety score when new violation is detected
   * POST /api/bus/:busId/safety/update
   */
  async updateSafetyScore(req, res) {
    try {
      const { busId } = req.params;
      const { violationType } = req.body;
      
      if (!busId) {
        return res.status(400).json({ error: 'Bus ID is required' });
      }

      if (!violationType) {
        return res.status(400).json({ error: 'Violation type is required' });
      }

      const safetyData = await safetyScoreService.updateSafetyScoreRealtime(
        busId, 
        violationType
      );
      
      res.status(200).json({
        message: 'Safety score updated successfully',
        data: safetyData
      });
    } catch (error) {
      console.error('Error in updateSafetyScore:', error);
      res.status(500).json({ 
        error: 'Failed to update safety score',
        message: error.message 
      });
    }
  }

  /**
   * Get safety scores for multiple buses
   * POST /api/buses/safety/batch
   */
  async getBatchSafetyData(req, res) {
    try {
      const { busIds } = req.body;
      
      if (!busIds || !Array.isArray(busIds)) {
        return res.status(400).json({ error: 'busIds array is required' });
      }

      const safetyDataPromises = busIds.map(busId => 
        safetyScoreService.getBusSafetyData(busId)
          .catch(error => ({
            busId,
            error: error.message,
            safetyScore: null
          }))
      );

      const safetyDataArray = await Promise.all(safetyDataPromises);
      
      res.status(200).json({
        buses: safetyDataArray,
        count: safetyDataArray.length
      });
    } catch (error) {
      console.error('Error in getBatchSafetyData:', error);
      res.status(500).json({ 
        error: 'Failed to get batch safety data',
        message: error.message 
      });
    }
  }

  /**
   * Calculate safety score from warnings object
   * POST /api/safety/calculate
   */
  calculateScore(req, res) {
    try {
      const { warnings } = req.body;
      
      if (!warnings || typeof warnings !== 'object') {
        return res.status(400).json({ error: 'warnings object is required' });
      }

      const safetyScore = safetyScoreService.calculateSafetyScore(warnings);
      const { rating, color } = safetyScoreService.getSafetyRating(safetyScore);
      
      res.status(200).json({
        safetyScore,
        rating,
        color,
        warnings
      });
    } catch (error) {
      console.error('Error in calculateScore:', error);
      res.status(500).json({ 
        error: 'Failed to calculate safety score',
        message: error.message 
      });
    }
  }

  /**
   * Get live DMS state + recent events for a specific bus
   * GET /api/bus/:busId/dms
   */
  async getBusDMSData(req, res) {
    try {
      const { busId } = req.params;
      if (!busId) return res.status(400).json({ error: 'Bus ID is required' });

      const dmsData = await safetyScoreService.getBusDMSData(busId);
      res.status(200).json(dmsData);
    } catch (error) {
      console.error('Error in getBusDMSData:', error.message);
      res.status(200).json({
        busId: req.params.busId,
        dmsState: null,
        recentEvents: [],
        deviceKey: null,
        _error: error.message,
      });
    }
  }
}

module.exports = new SafetyScoreController();
