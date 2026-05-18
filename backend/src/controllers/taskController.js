const { validationResult } = require('express-validator');
const prisma = require('../config/db');
const { AppError, asyncHandler } = require('../utils/errors');

const taskInclude = {
  assignedTo: { select: { id: true, name: true, email: true } },
  createdBy: { select: { id: true, name: true } },
};

exports.listTasks = asyncHandler(async (req, res) => {
  const tasks = await prisma.task.findMany({
    where: { projectId: req.params.id },
    include: taskInclude,
    orderBy: { createdAt: 'desc' },
  });
  res.json({ tasks });
});

exports.createTask = asyncHandler(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return next(new AppError(errors.array()[0].msg, 400));

  const { title, description, dueDate, priority, assignedToId } = req.body;
  const task = await prisma.task.create({
    data: {
      title,
      description,
      dueDate: dueDate ? new Date(dueDate) : null,
      priority,
      projectId: req.params.id,
      createdById: req.user.id,
      assignedToId: assignedToId || null,
    },
    include: taskInclude,
  });
  res.status(201).json({ task });
});

exports.updateTask = asyncHandler(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return next(new AppError(errors.array()[0].msg, 400));

  const { title, description, dueDate, priority, assignedToId, status } = req.body;
  const task = await prisma.task.update({
    where: { id: req.params.taskId },
    data: {
      title,
      description,
      dueDate: dueDate ? new Date(dueDate) : null,
      priority,
      assignedToId: assignedToId || null,
      status,
    },
    include: taskInclude,
  });
  res.json({ task });
});

exports.patchStatus = asyncHandler(async (req, res, next) => {
  const { status } = req.body;
  if (!status) return next(new AppError('Status is required', 400));

  const task = await prisma.task.findUnique({ where: { id: req.params.taskId } });
  if (!task) return next(new AppError('Task not found', 404));

  // Members can only update tasks assigned to them
  if (req.member.role === 'MEMBER' && task.assignedToId !== req.user.id) {
    return next(new AppError('You can only update your own assigned tasks', 403));
  }

  const updated = await prisma.task.update({
    where: { id: req.params.taskId },
    data: { status },
    include: taskInclude,
  });
  res.json({ task: updated });
});

exports.deleteTask = asyncHandler(async (req, res) => {
  await prisma.task.delete({ where: { id: req.params.taskId } });
  res.json({ message: 'Task deleted' });
});
