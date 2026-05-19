const request = require('supertest');
const app     = require('../server');
const prisma  = require('../src/config/db');

let adminToken, memberToken, memberId, projectId, taskId;
const ts = Date.now();
const admin  = { name: 'Admin',  email: `admin-${ts}@test-tasks.com`,  password: 'password123' };
const member = { name: 'Member', email: `member-${ts}@test-tasks.com`, password: 'password123' };

beforeAll(async () => {
  let res = await request(app).post('/api/auth/register').send(admin);
  adminToken = res.body.token;

  res = await request(app).post('/api/auth/register').send(member);
  memberToken = res.body.token;
  memberId    = res.body.user.id;

  res = await request(app)
    .post('/api/projects')
    .set({ Authorization: `Bearer ${adminToken}` })
    .send({ name: `TaskProj-${ts}` });
  projectId = res.body.project.id;

  await request(app)
    .post(`/api/projects/${projectId}/members`)
    .set({ Authorization: `Bearer ${adminToken}` })
    .send({ email: member.email });
}, 20000);

afterAll(async () => {
  await prisma.project.deleteMany({
    where: { createdBy: { email: { endsWith: '@test-tasks.com' } } },
  });
  await prisma.user.deleteMany({ where: { email: { endsWith: '@test-tasks.com' } } });
});

const auth = (token) => ({ Authorization: `Bearer ${token}` });

describe('POST /api/projects/:id/tasks', () => {
  it('admin can create a task', async () => {
    const res = await request(app)
      .post(`/api/projects/${projectId}/tasks`)
      .set(auth(adminToken))
      .send({ title: 'Test task', priority: 'HIGH', assignedToId: memberId });

    expect(res.status).toBe(201);
    expect(res.body.task.title).toBe('Test task');
    expect(res.body.task.status).toBe('TODO');
    taskId = res.body.task.id;
  });

  it('member cannot create a task', async () => {
    const res = await request(app)
      .post(`/api/projects/${projectId}/tasks`)
      .set(auth(memberToken))
      .send({ title: 'Sneaky task' });
    expect(res.status).toBe(403);
  });

  it('rejects missing title', async () => {
    const res = await request(app)
      .post(`/api/projects/${projectId}/tasks`)
      .set(auth(adminToken))
      .send({ priority: 'LOW' });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/projects/:id/tasks', () => {
  it('member can list tasks', async () => {
    const res = await request(app)
      .get(`/api/projects/${projectId}/tasks`)
      .set(auth(memberToken));
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.tasks)).toBe(true);
  });
});

describe('PATCH /api/projects/:id/tasks/:taskId/status', () => {
  it('member can update status of their assigned task', async () => {
    const res = await request(app)
      .patch(`/api/projects/${projectId}/tasks/${taskId}/status`)
      .set(auth(memberToken))
      .send({ status: 'IN_PROGRESS' });
    expect(res.status).toBe(200);
    expect(res.body.task.status).toBe('IN_PROGRESS');
  });

  it('admin can update any task status', async () => {
    const res = await request(app)
      .patch(`/api/projects/${projectId}/tasks/${taskId}/status`)
      .set(auth(adminToken))
      .send({ status: 'DONE' });
    expect(res.status).toBe(200);
    expect(res.body.task.status).toBe('DONE');
  });
});

describe('PUT /api/projects/:id/tasks/:taskId', () => {
  it('admin can edit a task', async () => {
    const res = await request(app)
      .put(`/api/projects/${projectId}/tasks/${taskId}`)
      .set(auth(adminToken))
      .send({ title: 'Updated task', priority: 'LOW' });
    expect(res.status).toBe(200);
    expect(res.body.task.title).toBe('Updated task');
  });

  it('member cannot edit a task', async () => {
    const res = await request(app)
      .put(`/api/projects/${projectId}/tasks/${taskId}`)
      .set(auth(memberToken))
      .send({ title: 'Nope' });
    expect(res.status).toBe(403);
  });
});

describe('DELETE /api/projects/:id/tasks/:taskId', () => {
  it('admin can delete a task', async () => {
    const res = await request(app)
      .delete(`/api/projects/${projectId}/tasks/${taskId}`)
      .set(auth(adminToken));
    expect(res.status).toBe(200);
  });

  it('member cannot delete a task', async () => {
    const { body } = await request(app)
      .post(`/api/projects/${projectId}/tasks`)
      .set(auth(adminToken))
      .send({ title: 'Another' });
    const res = await request(app)
      .delete(`/api/projects/${projectId}/tasks/${body.task.id}`)
      .set(auth(memberToken));
    expect(res.status).toBe(403);
  });
});
