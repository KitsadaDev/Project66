const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Get all maintenance requests (filtered by role)
const getAllRequests = async (req, res, next) => {
  try {
    const { status, slot_id } = req.query;
    const where = {};

    if (req.user.role === 'TENANT') {
      where.tenant_id = req.user.user_id;
    } else if (req.user.role === 'MAINTENANCE') {
      where.assignments = { some: { assigned_to: req.user.user_id } };
    }

    if (status) where.status = status;
    if (slot_id) where.slot_id = parseInt(slot_id);

    const requests = await prisma.maintenanceRequest.findMany({
      where,
      include: {
        slot: { select: { slot_id: true, slot_number: true, food_court_id: true } },
        tenant: { select: { user_id: true, first_name: true, last_name: true, email: true, phone: true } },
        images: true,
        assignments: {
          include: {
            assignee: { select: { user_id: true, first_name: true, last_name: true, phone: true } }
          }
        }
      },
      orderBy: { requested_at: 'desc' }
    });

    res.json({ success: true, data: requests });
  } catch (error) {
    next(error);
  }
};

// Get request by ID
const getRequestById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const request = await prisma.maintenanceRequest.findUnique({
      where: { request_id: parseInt(id) },
      include: {
        slot: { select: { slot_id: true, slot_number: true, food_court_id: true } },
        tenant: { select: { user_id: true, first_name: true, last_name: true, email: true, phone: true } },
        images: true,
        assignments: {
          include: {
            assignee: { select: { user_id: true, first_name: true, last_name: true, phone: true } },
            assigner: { select: { user_id: true, first_name: true, last_name: true } }
          }
        },
        updates: {
          include: {
            updater: { select: { user_id: true, first_name: true, last_name: true } }
          },
          orderBy: { updated_at: 'desc' }
        }
      }
    });

    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found.' });
    }

    if (req.user.role === 'TENANT' && request.tenant_id !== req.user.user_id) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    res.json({ success: true, data: request });
  } catch (error) {
    next(error);
  }
};

// Create maintenance request (Tenant)
const createRequest = async (req, res, next) => {
  try {
    const { title, description, category } = req.body;

    // Find tenant's active slot via contract
    const contract = await prisma.rentalContract.findFirst({
      where: { tenant_id: req.user.user_id, status: 'ACTIVE' }
    });

    if (!contract) {
      return res.status(400).json({ success: false, message: 'You do not have an active rental contract.' });
    }

    const request = await prisma.maintenanceRequest.create({
      data: {
        slot_id: contract.slot_id,
        tenant_id: req.user.user_id,
        title,
        description: description || null,
        category: category || null,
        status: 'PENDING'
      }
    });

    // Save uploaded images
    if (req.files && req.files.length > 0) {
      await prisma.maintenanceImage.createMany({
        data: req.files.map(file => ({
          request_id: request.request_id,
          image_url: `/uploads/maintenance/${file.filename}`,
          image_type: 'request'
        }))
      });
    }

    res.status(201).json({ success: true, message: 'Request submitted successfully.', data: request });
  } catch (error) {
    next(error);
  }
};

// Update request details (Tenant, only PENDING)
const updateRequest = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, description, category } = req.body;

    const request = await prisma.maintenanceRequest.findUnique({ where: { request_id: parseInt(id) } });
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found.' });
    }

    if (req.user.role === 'TENANT' && request.tenant_id !== req.user.user_id) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    if (req.user.role === 'TENANT' && request.status !== 'PENDING') {
      return res.status(400).json({ success: false, message: 'Cannot edit request that is already in progress.' });
    }

    const updated = await prisma.maintenanceRequest.update({
      where: { request_id: parseInt(id) },
      data: {
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(category !== undefined && { category })
      }
    });

    if (req.files && req.files.length > 0) {
      await prisma.maintenanceImage.createMany({
        data: req.files.map(file => ({
          request_id: request.request_id,
          image_url: `/uploads/maintenance/${file.filename}`,
          image_type: 'request'
        }))
      });
    }

    res.json({ success: true, message: 'Request updated.', data: updated });
  } catch (error) {
    next(error);
  }
};

// Assign staff (Admin only)
const assignStaff = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { staffId, scheduleDate, estimatedCost } = req.body;

    const request = await prisma.maintenanceRequest.findUnique({ where: { request_id: parseInt(id) } });
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found.' });
    }

    const staff = await prisma.user.findUnique({ where: { user_id: parseInt(staffId) } });
    if (!staff || staff.role !== 'MAINTENANCE') {
      return res.status(400).json({ success: false, message: 'Invalid maintenance staff.' });
    }

    const [assignment] = await prisma.$transaction([
      prisma.maintenanceAssignment.create({
        data: {
          request_id: parseInt(id),
          assigned_to: parseInt(staffId),
          assigned_by: req.user.user_id,
          scheduled_date: scheduleDate ? new Date(scheduleDate) : null,
          estimated_completion: scheduleDate ? new Date(scheduleDate) : null,
          notes: estimatedCost ? `Estimated Cost: ${estimatedCost}` : null
        }
      }),
      prisma.maintenanceRequest.update({
        where: { request_id: parseInt(id) },
        data: { status: 'IN_PROGRESS' }
      })
    ]);

    res.json({ success: true, message: 'Staff assigned successfully.', data: assignment });
  } catch (error) {
    next(error);
  }
};

// Update status (Maintenance staff / Admin)
const updateStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, comment } = req.body;

    const request = await prisma.maintenanceRequest.findUnique({ where: { request_id: parseInt(id) } });
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found.' });
    }

    const [update] = await prisma.$transaction([
      prisma.maintenanceUpdate.create({
        data: {
          request_id: parseInt(id),
          updated_by: req.user.user_id,
          status,
          comment: comment || null
        }
      }),
      prisma.maintenanceRequest.update({
        where: { request_id: parseInt(id) },
        data: { status }
      })
    ]);

    res.json({ success: true, message: 'Status updated.', data: update });
  } catch (error) {
    next(error);
  }
};

// Upload completion proof images (Maintenance staff)
const uploadCompletionProof = async (req, res, next) => {
  try {
    const { id } = req.params;

    const request = await prisma.maintenanceRequest.findUnique({ where: { request_id: parseInt(id) } });
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found.' });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: 'No files uploaded.' });
    }

    const images = await prisma.maintenanceImage.createMany({
      data: req.files.map(file => ({
        request_id: parseInt(id),
        image_url: `/uploads/maintenance/${file.filename}`,
        image_type: 'completion'
      }))
    });

    await prisma.maintenanceRequest.update({
      where: { request_id: parseInt(id) },
      data: { status: 'COMPLETED' }
    });

    res.json({ success: true, message: 'Completion proof uploaded.', data: images });
  } catch (error) {
    next(error);
  }
};

// Delete request (Admin only, or Tenant for PENDING)
const deleteRequest = async (req, res, next) => {
  try {
    const { id } = req.params;

    const request = await prisma.maintenanceRequest.findUnique({ where: { request_id: parseInt(id) } });
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found.' });
    }

    if (req.user.role === 'TENANT') {
      if (request.tenant_id !== req.user.user_id) {
        return res.status(403).json({ success: false, message: 'Access denied.' });
      }
      if (request.status !== 'PENDING') {
        return res.status(400).json({ success: false, message: 'Can only delete pending requests.' });
      }
    }

    await prisma.maintenanceRequest.delete({ where: { request_id: parseInt(id) } });
    res.json({ success: true, message: 'Request deleted.' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllRequests,
  getRequestById,
  createRequest,
  updateRequest,
  assignStaff,
  updateStatus,
  uploadCompletionProof,
  deleteRequest
};
