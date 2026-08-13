const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticate, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();
const prisma = new PrismaClient();

// Get all food courts
router.get('/', async (req, res) => {
  try {
    const foodCourts = await prisma.foodCourt.findMany({
      orderBy: { food_court_id: 'asc' }
    });
    res.json({ success: true, data: foodCourts });
  } catch (error) {
    console.error('Error fetching food courts:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch food courts' });
  }
});

// Update food court image (Admin only)
router.put('/:id/image', authenticate, authorize('ADMIN'), upload.single('image'), async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No image uploaded' });
    }

    // Since we use Cloudinary in upload middleware, req.file.path contains the Cloudinary URL
    const image_url = req.file.path;

    // Use executeRawUnsafe to update in case Prisma Client wasn't fully regenerated
    await prisma.$executeRawUnsafe(`
      UPDATE "FoodCourt"
      SET "image_url" = $1
      WHERE "food_court_id" = $2
    `, image_url, parseInt(id));

    // Fetch the updated record
    const updatedFoodCourts = await prisma.$queryRawUnsafe(`
      SELECT * FROM "FoodCourt" WHERE "food_court_id" = $1
    `, parseInt(id));

    res.json({ success: true, message: 'Image updated successfully', data: updatedFoodCourts[0] });
  } catch (error) {
    console.error('Error updating food court image:', error);
    res.status(500).json({ success: false, message: 'Failed to update food court image' });
  }
});

module.exports = router;
