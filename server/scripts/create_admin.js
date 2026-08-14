require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// --- กำหนด credentials ที่นี่ ---
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'admin1234';
const ADMIN_FIRST_NAME = 'ผู้ดูแล';
// --------------------------------

async function main() {
  console.log('🔧 Creating admin user...');

  const existing = await prisma.user.findUnique({ where: { username: ADMIN_USERNAME } });
  if (existing) {
    console.log(`✅ User "${ADMIN_USERNAME}" already exists (role: ${existing.role})`);
    return;
  }

  const salt = await bcrypt.genSalt(10);
  const password_hash = await bcrypt.hash(ADMIN_PASSWORD, salt);

  const user = await prisma.user.create({
    data: {
      username: ADMIN_USERNAME,
      password_hash,
      first_name: ADMIN_FIRST_NAME,
      role: 'ADMIN',
      must_change_password: false,
      is_active: true,
    },
  });

  console.log(`✅ Admin created: username="${ADMIN_USERNAME}", password="${ADMIN_PASSWORD}", user_id=${user.user_id}`);
}

main()
  .catch((e) => { console.error('❌ Error:', e.message); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
