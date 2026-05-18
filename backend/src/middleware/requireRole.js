const prisma = require('../config/db');
const { AppError } = require('../utils/errors');

const requireRole = (minRole) => async (req, res, next) => {
  try {
    const projectId = req.params.id || req.params.projectId;
    const member = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: req.user.id } },
    });
    if (!member) return next(new AppError('Not a member of this project', 403));
    if (minRole === 'ADMIN' && member.role !== 'ADMIN') {
      return next(new AppError('Admin access required', 403));
    }
    req.member = member;
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = requireRole;
