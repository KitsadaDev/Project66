const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// Get all users (Admin only)
const getAllUsers = async (req, res, next) => {
  try {
    const { role, search } = req.query;

    const where = {};

    if (role) {
      where.role = role;
    }

    if (search) {
      where.OR = [
        { first_name: { contains: search, mode: 'insensitive' } },
        { last_name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { username: { contains: search, mode: 'insensitive' } }
      ];
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        user_id: true,
        username: true,
        email: true,
        first_name: true,
        last_name: true,
        role: true,
        phone: true,
        title: true,
        address_line: true,
        subdistrict: true,
        district: true,
        province: true,
        postal_code: true,
        rental_contracts: {
          where: { status: 'ACTIVE' },
          select: {
            slot: {
              select: {
                slot_id: true,
                slot_number: true,
                rent: true,
                status: true,
                food_court_id: true
              }
            }
          }
        }
      },
      orderBy: { first_name: 'asc' }
    });

    const formattedUsers = users.map(user => {
      const { rental_contracts, ...rest } = user;
      const stall = rental_contracts?.length > 0 ? rental_contracts[0].slot : null;
      return { ...rest, stall };
    });

    res.json({ success: true, data: formattedUsers });
  } catch (error) {
    next(error);
  }
};

// Get user by ID
const getUserById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { user_id: parseInt(id) },
      select: {
        user_id: true,
        username: true,
        email: true,
        first_name: true,
        last_name: true,
        role: true,
        phone: true,
        title: true,
        address_line: true,
        subdistrict: true,
        district: true,
        province: true,
        postal_code: true,
        rental_contracts: {
          where: { status: 'ACTIVE' },
          select: {
            contract_id: true,
            contract_number: true,
            start_date: true,
            end_date: true,
            monthly_rent: true,
            slot: {
              select: {
                slot_id: true,
                slot_number: true,
                food_court_id: true
              }
            }
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

// Update user (Admin only)
const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { first_name, last_name, phone, role, email, title,
            address_line, subdistrict, district, province, postal_code } = req.body;

    const existingUser = await prisma.user.findUnique({ where: { user_id: parseInt(id) } });
    if (!existingUser) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const updatedUser = await prisma.user.update({
      where: { user_id: parseInt(id) },
      data: {
        ...(first_name && { first_name }),
        ...(last_name && { last_name }),
        ...(phone !== undefined && { phone }),
        ...(role && { role }),
        ...(email && { email }),
        ...(title !== undefined && { title }),
        ...(address_line !== undefined && { address_line }),
        ...(subdistrict !== undefined && { subdistrict }),
        ...(district !== undefined && { district }),
        ...(province !== undefined && { province }),
        ...(postal_code !== undefined && { postal_code })
      },
      select: {
        user_id: true,
        username: true,
        email: true,
        first_name: true,
        last_name: true,
        role: true,
        phone: true
      }
    });

    res.json({ success: true, message: 'User updated successfully.', data: updatedUser });
  } catch (error) {
    next(error);
  }
};

// Delete user (Admin only)
const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    const existingUser = await prisma.user.findUnique({ where: { user_id: parseInt(id) } });
    if (!existingUser) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    if (existingUser.role === 'ADMIN') {
      return res.status(400).json({ success: false, message: 'Cannot delete admin users.' });
    }

    await prisma.user.delete({ where: { user_id: parseInt(id) } });
    res.json({ success: true, message: 'User deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

// Reset user password (Admin only)
const resetPassword = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    const existingUser = await prisma.user.findUnique({ where: { user_id: parseInt(id) } });
    if (!existingUser) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(newPassword, salt);

    await prisma.user.update({
      where: { user_id: parseInt(id) },
      data: { password_hash }
    });

    res.json({ success: true, message: 'Password reset successfully.' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAllUsers, getUserById, updateUser, deleteUser, resetPassword };
