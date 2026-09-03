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
        profile_image_url: true,
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

// Create user (Admin only)
const createUser = async (req, res, next) => {
  try {
    const {
      username,
      password,
      first_name,
      last_name,
      email,
      phone,
      role,
      title,
      address_line,
      subdistrict,
      district,
      province,
      postal_code
    } = req.body;

    // Validate required fields
    if (!username || !password || !first_name || !role) {
      return res.status(400).json({ success: false, message: 'กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน' });
    }

    // Check if user exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { username },
          { email: email || undefined }
        ]
      }
    });

    if (existingUser) {
      if (existingUser.username === username) {
        return res.status(400).json({ success: false, message: 'Username นี้ถูกใช้งานแล้ว' });
      }
      if (email && existingUser.email === email) {
        return res.status(400).json({ success: false, message: 'อีเมลนี้ถูกใช้งานแล้ว' });
      }
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);
    let profile_image_url = null;

    if (req.file) {
      profile_image_url = req.file.path;
    }

    const newUser = await prisma.user.create({
      data: {
        username,
        password_hash,
        first_name,
        last_name: last_name || null,
        email: email || null,
        phone: phone || null,
        role,
        title: title || null,
        address_line: address_line || null,
        subdistrict: subdistrict || null,
        district: district || null,
        province: province || null,
        postal_code: postal_code || null,
        profile_image_url,
        must_change_password: true
      },
      select: {
        user_id: true,
        username: true,
        email: true,
        first_name: true,
        last_name: true,
        role: true,
        phone: true,
        profile_image_url: true,
        must_change_password: true
      }
    });

    res.status(201).json({ success: true, message: 'สร้างผู้ใช้งานสำเร็จ', data: newUser });
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
        profile_image_url: true,
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

    // Validate role if provided — only allow known roles
    const ALLOWED_ROLES = ['TENANT', 'ADMIN', 'EXECUTIVE', 'MAINTENANCE'];
    if (role && !ALLOWED_ROLES.includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role specified.' });
    }

    let profile_image_url = undefined;
    if (req.file) {
      profile_image_url = req.file.path;
    } else if (req.body.profile_image_url !== undefined) {
      profile_image_url = req.body.profile_image_url === '' ? null : req.body.profile_image_url;
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
        ...(postal_code !== undefined && { postal_code }),
        ...(profile_image_url !== undefined && { profile_image_url })
      },
      select: {
        user_id: true,
        username: true,
        email: true,
        first_name: true,
        last_name: true,
        role: true,
        phone: true,
        profile_image_url: true
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

    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters long.' });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(newPassword, salt);

    await prisma.user.update({
      where: { user_id: parseInt(id) },
      data: {
        password_hash,
        must_change_password: true
      }
    });

    res.json({ success: true, message: 'Password reset successfully.' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllUsers,
  createUser,
  getUserById,
  updateUser,
  deleteUser,
  resetPassword
};
