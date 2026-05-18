const { validationResult } = require('express-validator');
const prisma = require('../config/db');
const { AppError, asyncHandler } = require('../utils/errors');

exports.listProjects = asyncHandler(async (req, res) => {
  const projects = await prisma.project.findMany({
    where: { members: { some: { userId: req.user.id } } },
    include: {
      members: { include: { user: { select: { id: true, name: true, email: true } } } },
      _count: { select: { tasks: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ projects });
});

exports.createProject = asyncHandler(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return next(new AppError(errors.array()[0].msg, 400));

  const { name, description } = req.body;
  const project = await prisma.project.create({
    data: {
      name,
      description,
      createdById: req.user.id,
      members: { create: { userId: req.user.id, role: 'ADMIN' } },
    },
    include: {
      members: { include: { user: { select: { id: true, name: true, email: true } } } },
      _count: { select: { tasks: true } },
    },
  });
  res.status(201).json({ project });
});

exports.getProject = asyncHandler(async (req, res, next) => {
  const project = await prisma.project.findUnique({
    where: { id: req.params.id },
    include: {
      members: { include: { user: { select: { id: true, name: true, email: true } } } },
      _count: { select: { tasks: true } },
    },
  });
  if (!project) return next(new AppError('Project not found', 404));
  res.json({ project });
});

exports.updateProject = asyncHandler(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return next(new AppError(errors.array()[0].msg, 400));

  const project = await prisma.project.update({
    where: { id: req.params.id },
    data: { name: req.body.name, description: req.body.description },
    include: {
      members: { include: { user: { select: { id: true, name: true, email: true } } } },
      _count: { select: { tasks: true } },
    },
  });
  res.json({ project });
});

exports.deleteProject = asyncHandler(async (req, res) => {
  await prisma.project.delete({ where: { id: req.params.id } });
  res.json({ message: 'Project deleted' });
});

exports.addMember = asyncHandler(async (req, res, next) => {
  const { email, role = 'MEMBER' } = req.body;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return next(new AppError('User not found', 404));

  const existing = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId: req.params.id, userId: user.id } },
  });
  if (existing) return next(new AppError('User is already a member', 409));

  const member = await prisma.projectMember.create({
    data: { projectId: req.params.id, userId: user.id, role },
    include: { user: { select: { id: true, name: true, email: true } } },
  });
  res.status(201).json({ member });
});

exports.removeMember = asyncHandler(async (req, res, next) => {
  const { userId } = req.params;
  if (userId === req.user.id) return next(new AppError('Cannot remove yourself', 400));

  await prisma.projectMember.delete({
    where: { projectId_userId: { projectId: req.params.id, userId } },
  });
  res.json({ message: 'Member removed' });
});
