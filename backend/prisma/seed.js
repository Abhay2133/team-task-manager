const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database…');

  // Users
  const [alice, bob, carol] = await Promise.all([
    prisma.user.upsert({
      where: { email: 'alice@example.com' },
      update: {},
      create: {
        name: 'Alice Admin',
        email: 'alice@example.com',
        passwordHash: await bcrypt.hash('password123', 10),
      },
    }),
    prisma.user.upsert({
      where: { email: 'bob@example.com' },
      update: {},
      create: {
        name: 'Bob Member',
        email: 'bob@example.com',
        passwordHash: await bcrypt.hash('password123', 10),
      },
    }),
    prisma.user.upsert({
      where: { email: 'carol@example.com' },
      update: {},
      create: {
        name: 'Carol Member',
        email: 'carol@example.com',
        passwordHash: await bcrypt.hash('password123', 10),
      },
    }),
  ]);

  console.log('Users created:', alice.email, bob.email, carol.email);

  // Project
  const project = await prisma.project.upsert({
    where: { id: 'seed-project-001' },
    update: {},
    create: {
      id: 'seed-project-001',
      name: 'Website Redesign',
      description: 'Redesign the company website with a modern look and feel.',
      createdById: alice.id,
      members: {
        create: [
          { userId: alice.id, role: 'ADMIN' },
          { userId: bob.id, role: 'MEMBER' },
          { userId: carol.id, role: 'MEMBER' },
        ],
      },
    },
  });

  console.log('Project created:', project.name);

  // Tasks
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);

  const tasks = [
    {
      title: 'Design homepage mockup',
      description: 'Create Figma mockups for the new homepage design.',
      priority: 'HIGH',
      status: 'DONE',
      assignedToId: bob.id,
      dueDate: yesterday,
    },
    {
      title: 'Implement responsive navbar',
      description: 'Build the navigation bar using Tailwind CSS.',
      priority: 'HIGH',
      status: 'IN_PROGRESS',
      assignedToId: bob.id,
      dueDate: nextWeek,
    },
    {
      title: 'Write unit tests for API',
      description: 'Cover all REST endpoints with integration tests.',
      priority: 'MEDIUM',
      status: 'TODO',
      assignedToId: carol.id,
      dueDate: nextWeek,
    },
    {
      title: 'Set up CI/CD pipeline',
      description: 'Configure GitHub Actions for automated deployment to Railway.',
      priority: 'MEDIUM',
      status: 'TODO',
      assignedToId: alice.id,
      dueDate: nextWeek,
    },
    {
      title: 'Overdue: Update dependencies',
      description: 'Upgrade all npm packages to latest stable versions.',
      priority: 'LOW',
      status: 'TODO',
      assignedToId: carol.id,
      dueDate: yesterday,
    },
  ];

  for (const t of tasks) {
    await prisma.task.create({
      data: { ...t, projectId: project.id, createdById: alice.id },
    });
  }

  console.log(`${tasks.length} tasks created.`);
  console.log('\nSeed complete! Login with:');
  console.log('  alice@example.com / password123  (Admin)');
  console.log('  bob@example.com   / password123  (Member)');
  console.log('  carol@example.com / password123  (Member)');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
