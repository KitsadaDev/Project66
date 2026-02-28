const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcryptjs');

async function main() {
  try {
    const username = 'ผู้เช่า';
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: username },
          { username: username }
        ]
      }
    });

    console.log('Query for "ผู้เช่า" user returned:', user ? 'Found' : 'Not Found');
    if (user) {
      console.log(user);
    } else {
      console.log('No user found matching that username/email.');
      const allUsers = await prisma.user.findMany();
      console.log('All users in DB:', allUsers.map(u => ({ id: u.user_id, username: u.username, email: u.email })));
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
