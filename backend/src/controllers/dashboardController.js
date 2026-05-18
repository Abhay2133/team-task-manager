const prisma = require('../config/db');
const { asyncHandler } = require('../utils/errors');

exports.getStats = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  // Projects this user belongs to
  const userProjects = await prisma.projectMember.findMany({
    where: { userId },
    select: { projectId: true },
  });
  const projectIds = userProjects.map((m) => m.projectId);

  const [totalTasks, byStatus, overdue, tasksPerUser] = await Promise.all([
    prisma.task.count({ where: { projectId: { in: projectIds } } }),

    prisma.task.groupBy({
      by: ['status'],
      where: { projectId: { in: projectIds } },
      _count: { status: true },
    }),

    prisma.task.count({
      where: {
        projectId: { in: projectIds },
        dueDate: { lt: new Date() },
        status: { not: 'DONE' },
      },
    }),

    prisma.task.groupBy({
      by: ['assignedToId'],
      where: { projectId: { in: projectIds }, assignedToId: { not: null } },
      _count: { assignedToId: true },
    }),
  ]);

  // Enrich tasksPerUser with names
  const userIds = tasksPerUser.map((t) => t.assignedToId).filter(Boolean);
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true },
  });
  const userMap = Object.fromEntries(users.map((u) => [u.id, u.name]));

  const tasksByStatus = { TODO: 0, IN_PROGRESS: 0, DONE: 0 };
  byStatus.forEach((g) => { tasksByStatus[g.status] = g._count.status; });

  res.json({
    totalTasks,
    tasksByStatus,
    overdueTasks: overdue,
    tasksPerUser: tasksPerUser.map((t) => ({
      userId: t.assignedToId,
      name: userMap[t.assignedToId] || 'Unknown',
      count: t._count.assignedToId,
    })),
  });
});
