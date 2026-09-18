// ======================================================
// settings.js - Router จัดการการตั้งค่าระบบ (System Settings)
// รับผิดชอบ:
//   - การดึงค่าและอัปเดตการตั้งค่าระบบทั่วไป (Key-Value)
//   - การดึงและอัปเดตอัตราค่าสาธารณูปโภค (ค่าน้ำ, ค่าไฟ, ค่าดักไขมัน, ค่าปรับจ่ายล่าช้า)
//   - ป้องกันสิทธิ์การแก้ไข ให้เฉพาะผู้ใช้ระดับ 'ADMIN' เท่านั้น
// ======================================================

const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// -------------------------------------------------------
// Route: GET /api/settings
// หน้าที่: ดึงการตั้งค่าทั้งหมดในระบบ
// การเข้าถึง: ผู้ใช้ที่ล็อกอินแล้วทุกคน (authenticate)
// -------------------------------------------------------
router.get('/', authenticate, async (req, res) => {
  try {
    const settings = await prisma.systemSetting.findMany();

    // แปลง array ของ settings เป็น object เพื่อให้ frontend เรียกใช้ง่ายผ่าน key
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

// -------------------------------------------------------
// Route: GET /api/settings/utility-rates
// หน้าที่: ดึงอัตราค่าสาธารณูปโภคและค่าปรับล่าช้าปัจจุบัน
//   - WATER_RATE_PER_UNIT: ค่าน้ำต่อหน่วย (default: 14 บาท)
//   - ELECTRIC_RATE_PER_UNIT: ค่าไฟต่อหน่วย (default: 6 บาท)
//   - GREASE_TRAP_FEE: ค่าดักไขมันรายเดือน (default: 500 บาท)
//   - LATE_RENT_FINE: ค่าปรับจ่ายค่าเช่าล่าช้า (default: 100 บาท/วัน)
//   - LATE_UTILITY_FINE: ค่าปรับจ่ายค่าน้ำไฟล่าช้า (default: 50 บาท/วัน)
// การเข้าถึง: ผู้ใช้ที่ล็อกอินแล้วทุกคน (authenticate)
// -------------------------------------------------------
router.get('/utility-rates', authenticate, async (req, res) => {
  try {
    const waterRate = await prisma.systemSetting.findUnique({ where: { setting_key: 'WATER_RATE_PER_UNIT' } });
    const electricRate = await prisma.systemSetting.findUnique({ where: { setting_key: 'ELECTRIC_RATE_PER_UNIT' } });
    const greaseTrap = await prisma.systemSetting.findUnique({ where: { setting_key: 'GREASE_TRAP_FEE' } });
    const lateRent = await prisma.systemSetting.findUnique({ where: { setting_key: 'LATE_RENT_FINE' } });
    const lateUtility = await prisma.systemSetting.findUnique({ where: { setting_key: 'LATE_UTILITY_FINE' } });

    res.json({
      success: true,
      data: {
        waterRatePerUnit: parseFloat(waterRate?.setting_value || '14'),
        electricRatePerUnit: parseFloat(electricRate?.setting_value || '6'),
        greaseTrapFee: parseFloat(greaseTrap?.setting_value || '500'),
        lateRentFine: parseFloat(lateRent?.setting_value || '100'),
        lateUtilityFine: parseFloat(lateUtility?.setting_value || '50'),
        lateFineDelayDays: 0  // คงที่: ปรับทันทีหลังเกินวันที่ 10
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to get utility rates' });
  }
});

// -------------------------------------------------------
// Route: PUT /api/settings
// หน้าที่: ปรับปรุงการตั้งค่าระบบหลายรายการพร้อมกัน
// การเข้าถึง: เฉพาะผู้ดูแลระบบ (ADMIN)
// -------------------------------------------------------
router.put('/', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const { settings } = req.body;

    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({ success: false, message: 'Invalid settings format' });
    }

    // สร้างรายการ query upsert (มีอยู่แล้วให้อัปเดต ถ้ายังไม่มีให้สร้างใหม่)
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

    // ทำงานพร้อมกันผ่าน Transaction เพื่อความสมบูรณ์ของข้อมูล
    await prisma.$transaction(updates);
    res.json({ success: true, message: 'Settings updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update settings' });
  }
});

// -------------------------------------------------------
// Route: PUT /api/settings/utility-rates
// หน้าที่: บันทึกอัตราค่าสาธารณูปโภคและค่าปรับใหม่
// การเข้าถึง: เฉพาะผู้ดูแลระบบ (ADMIN)
// -------------------------------------------------------
router.put('/utility-rates', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const { waterRatePerUnit, electricRatePerUnit, greaseTrapFee, lateRentFine, lateUtilityFine, lateFineDelayDays } = req.body;

    const updates = [];

    // อัปเดตค่าน้ำต่อหน่วย
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

    // อัปเดตค่าไฟฟ้าต่อหน่วย
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

    // อัปเดตค่าดักไขมัน
    if (greaseTrapFee !== undefined) {
      updates.push(
        prisma.systemSetting.upsert({
          where: { setting_key: 'GREASE_TRAP_FEE' },
          update: { setting_value: String(greaseTrapFee), updated_by: req.user.user_id },
          create: {
            setting_key: 'GREASE_TRAP_FEE',
            setting_value: String(greaseTrapFee),
            description: 'ค่าดักไขมันรายเดือน (บาท)',
            data_type: 'number',
            updated_by: req.user.user_id
          }
        })
      );
    }

    // อัปเดตค่าปรับค่าเช่าล่าช้า
    if (lateRentFine !== undefined) {
      updates.push(
        prisma.systemSetting.upsert({
          where: { setting_key: 'LATE_RENT_FINE' },
          update: { setting_value: String(lateRentFine), updated_by: req.user.user_id },
          create: {
            setting_key: 'LATE_RENT_FINE',
            setting_value: String(lateRentFine),
            description: 'ค่าปรับจ่ายค่าเช่าล่าช้า (บาท/วัน)',
            data_type: 'number',
            updated_by: req.user.user_id
          }
        })
      );
    }

    // อัปเดตค่าปรับค่าน้ำไฟล่าช้า
    if (lateUtilityFine !== undefined) {
      updates.push(
        prisma.systemSetting.upsert({
          where: { setting_key: 'LATE_UTILITY_FINE' },
          update: { setting_value: String(lateUtilityFine), updated_by: req.user.user_id },
          create: {
            setting_key: 'LATE_UTILITY_FINE',
            setting_value: String(lateUtilityFine),
            description: 'ค่าปรับจ่ายค่าน้ำไฟล่าช้า (บาท/วัน)',
            data_type: 'number',
            updated_by: req.user.user_id
          }
        })
      );
    }

    // บันทึกทั้งหมดลงฐานข้อมูลพร้อมกัน
    await prisma.$transaction(updates);
    res.json({ success: true, message: 'Utility rates updated successfully', data: { waterRatePerUnit, electricRatePerUnit, greaseTrapFee, lateRentFine, lateUtilityFine } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update utility rates' });
  }
});

module.exports = router;
