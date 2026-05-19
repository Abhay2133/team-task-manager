const request = require('supertest');
const app     = require('../server');
const prisma  = require('../src/config/db');

let token;
const ts   = Date.now();
const user = { name: 'Dash User', email: `dash-${ts}@test-dash.com`, password: 'password123' };

beforeAll(async () => {
  const res = await request(app).post('/api/auth/register').send(user);
  token = res.body.token;
}, 15000);

afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { endsWith: '@test-dash.com' } } });
  await prisma.$disconnect();
});

describe('GET /api/dashboard/stats', () => {
  it('returns correct stats shape', async () => {
    const res = await request(app)
      .get('/api/dashboard/stats')
      .set({ Authorization: `Bearer ${token}` });

    expect(res.status).toBe(200);
    expect(typeof res.body.totalTasks).toBe('number');
    expect(res.body.tasksByStatus).toMatchObject({
      TODO: expect.any(Number),
      IN_PROGRESS: expect.any(Number),
      DONE: expect.any(Number),
    });
    expect(typeof res.body.overdueTasks).toBe('number');
    expect(Array.isArray(res.body.tasksPerUser)).toBe(true);
  });

  it('returns 401 without token', async () => {
    expect((await request(app).get('/api/dashboard/stats')).status).toBe(401);
  });
});
