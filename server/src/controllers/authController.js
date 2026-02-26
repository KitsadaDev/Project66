const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Register new user
const register = async (req, res, next) => {
  try {
    const { username, password, first_name, last_name, email, phone, role, title,
            address_line, subdistrict, district, province, postal_code } = req.body;

    // Check duplicate username
    const existingUsername = await prisma.user.findUnique({ where: { username } });
    if (existingUsername) {
      return res.status(400).json({ success: false, message: 'Username already taken.' });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    const user = await prisma.user.create({
      data: {
        username,
        password_hash,
        first_name,
        last_name: last_name || undefined,
        email: email || null,
        phone: phone || null,
        role: role || 'TENANT',
        title: title || null,
        address_line: address_line || null,
        subdistrict: subdistrict || null,
        district: district || null,
        province: province || null,
        postal_code: postal_code || null
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

    const token = jwt.sign(
      { user_id: user.user_id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.status(201).json({
      success: true,
      message: 'User registered successfully.',
      data: { user, token }
    });
  } catch (error) {
    next(error);
  }
};

// Login user (ด้วย email หรือ username)
const login = async (req, res, next) => {
  try {
    const { login: loginField, password } = req.body;

    // หา user ด้วย email หรือ username
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: loginField },
          { username: loginField }
        ]
      }
    });

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    const token = jwt.sign(
      { user_id: user.user_id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      success: true,
      message: 'Login successful.',
      data: {
        user: {
          user_id: user.user_id,
          username: user.username,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          role: user.role,
          phone: user.phone
        },
        token
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get current user profile
const getProfile = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { user_id: req.user.user_id },
      select: {
        user_id: true,
        username: true,
        email: true,
        first_name: true,
        last_name: true,
        role: true,
        phone: true,
        address_line: true,
        subdistrict: true,
        district: true,
        province: true,
        postal_code: true
      }
    });

    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

// Update profile
const updateProfile = async (req, res, next) => {
  try {
    const { first_name, last_name, phone, currentPassword, newPassword,
            address_line, subdistrict, district, province, postal_code } = req.body;

    const updateData = {};

    if (first_name) updateData.first_name = first_name;
    if (last_name) updateData.last_name = last_name;
    if (phone !== undefined) updateData.phone = phone;
    if (address_line !== undefined) updateData.address_line = address_line;
    if (subdistrict !== undefined) updateData.subdistrict = subdistrict;
    if (district !== undefined) updateData.district = district;
    if (province !== undefined) updateData.province = province;
    if (postal_code !== undefined) updateData.postal_code = postal_code;

    if (currentPassword && newPassword) {
      const user = await prisma.user.findUnique({ where: { user_id: req.user.user_id } });
      const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
      if (!isMatch) {
        return res.status(400).json({ success: false, message: 'Current password is incorrect.' });
      }
      const salt = await bcrypt.genSalt(10);
      updateData.password_hash = await bcrypt.hash(newPassword, salt);
    }

    const updatedUser = await prisma.user.update({
      where: { user_id: req.user.user_id },
      data: updateData,
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

    res.json({ success: true, message: 'Profile updated successfully.', data: updatedUser });
  } catch (error) {
    next(error);
  }
};

module.exports = { register, login, getProfile, updateProfile };
