const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// Get all settings
router.get('/', authenticate, async (req, res) => {
  try {
    const settings = await prisma.systemSetting.findMany();

    const settingsObj = {};
    settings.forEach(s => {
      settingsObj[s.setting_key] = {
        value: s.setting_value,
        description: s.description,
        data_type: s.data_type
      };
    });

    res.json({ success: true, data: settingsObj });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get settings' });
  }
});

// Get utility rates
router.get('/utility-rates', authenticate, async (req, res) => {
  try {
    const waterRate = await prisma.systemSetting.findUnique({ where: { setting_key: 'WATER_RATE_PER_UNIT' } });
    const electricRate = await prisma.systemSetting.findUnique({ where: { setting_key: 'ELECTRIC_RATE_PER_UNIT' } });

    res.json({
      success: true,
      data: {
        waterRatePerUnit: parseFloat(waterRate?.setting_value || '18'),
        electricRatePerUnit: parseFloat(electricRate?.setting_value || '7')
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get utility rates' });
  }
});

// Update settings (Admin only)
router.put('/', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const { settings } = req.body;

    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({ success: false, message: 'Invalid settings format' });
    }

    const updates = Object.entries(settings).map(([key, data]) =>
      prisma.systemSetting.upsert({
        where: { setting_key: key },
        update: {
          setting_value: String(data.value),
          description: data.description || null,
          updated_by: req.user.user_id
        },
        create: {
          setting_key: key,
          setting_value: String(data.value),
          description: data.description || null,
          data_type: data.data_type || 'string',
          updated_by: req.user.user_id
        }
      })
    );

    await prisma.$transaction(updates);
    res.json({ success: true, message: 'Settings updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update settings' });
  }
});

// Update utility rates (Admin only)
router.put('/utility-rates', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const { waterRatePerUnit, electricRatePerUnit } = req.body;

    const updates = [];

    if (waterRatePerUnit !== undefined) {
      updates.push(
        prisma.systemSetting.upsert({
          where: { setting_key: 'WATER_RATE_PER_UNIT' },
          update: { setting_value: String(waterRatePerUnit), updated_by: req.user.user_id },
          create: {
            setting_key: 'WATER_RATE_PER_UNIT',
            setting_value: String(waterRatePerUnit),
            description: 'ราคาต่อหน่วยน้ำ (บาท)',
            data_type: 'number',
            updated_by: req.user.user_id
          }
        })
      );
    }

    if (electricRatePerUnit !== undefined) {
      updates.push(
        prisma.systemSetting.upsert({
          where: { setting_key: 'ELECTRIC_RATE_PER_UNIT' },
          update: { setting_value: String(electricRatePerUnit), updated_by: req.user.user_id },
          create: {
            setting_key: 'ELECTRIC_RATE_PER_UNIT',
            setting_value: String(electricRatePerUnit),
            description: 'ราคาต่อหน่วยไฟฟ้า (บาท)',
            data_type: 'number',
            updated_by: req.user.user_id
          }
        })
      );
    }

    await prisma.$transaction(updates);
    res.json({ success: true, message: 'Utility rates updated successfully', data: { waterRatePerUnit, electricRatePerUnit } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update utility rates' });
  }
});

module.exports = router;
