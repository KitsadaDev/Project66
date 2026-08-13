const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Get all ShopTypes
const getAllShopTypes = async (req, res, next) => {
  try {
    const shopTypes = await prisma.shopType.findMany({
      orderBy: { shop_type_id: 'asc' }
    });
    res.json({ success: true, data: shopTypes });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAllShopTypes };
