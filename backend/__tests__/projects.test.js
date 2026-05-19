const request = require('supertest');
const app     = require('../server');
const prisma  = require('../src/config/db');

let adminToken, memberToken, adminId, memberId, projectId;
const ts = Date.now();
const admin  = { name: 'Admin',  email: `admin-${ts}@test-proj.com`,  password: 'password123' };
const member = { name: 'Member', email: `member-${ts}@test-proj.com`, password: 'password123' };

beforeAll(async () => {
  let res = await request(app).post('/api/auth/register').send(admin);
  adminToken = res.body.token;
  adminId    = res.body.user.id;

  res = await request(app).post('/api/auth/register').send(member);
  memberToken = res.body.token;
  memberId    = res.body.user.id;
}, 15000);

afterAll(async () => {
  // Delete projects first (FK: project.createdById → user)
  await prisma.project.deleteMany({
    where: { createdBy: { email: { endsWith: '@test-proj.com' } } },
  });
  await prisma.user.deleteMany({ where: { email: { endsWith: '@test-proj.com' } } });
});

const auth = (token) => ({ Authorization: `Bearer ${token}` });

describe('POST /api/projects', () => {
  it('creates project and auto-assigns creator as ADMIN', async () => {
    const res = await request(app)
      .post('/api/projects')
      .set(auth(adminToken))
      .send({ name: `Proj-${ts}`, description: 'Test' });

    expect(res.status).toBe(201);
    const me = res.body.project.members.find((m) => m.userId === adminId);
    expect(me.role).toBe('ADMIN');
    projectId = res.body.project.id;
  });

  it('rejects missing name', async () => {
    const res = await request(app).post('/api/projects').set(auth(adminToken)).send({});
    expect(res.status).toBe(400);
  });

  it('returns 401 without token', async () => {
    expect((await request(app).post('/api/projects').send({ name: 'X' })).status).toBe(401);
  });
});

describe('GET /api/projects', () => {
  it('lists projects the user belongs to', async () => {
    const res = await request(app).get('/api/projects').set(auth(adminToken));
    expect(res.status).toBe(200);
    expect(res.body.projects.some((p) => p.id === projectId)).toBe(true);
  });

  it('returns 401 without token', async () => {
    expect((await request(app).get('/api/projects')).status).toBe(401);
  });
});

describe('POST /api/projects/:id/members', () => {
  it('admin can add a member by email', async () => {
    const res = await request(app)
      .post(`/api/projects/${projectId}/members`)
      .set(auth(adminToken))
      .send({ email: member.email });
    expect(res.status).toBe(201);
    expect(res.body.member.userId).toBe(memberId);
  });

  it('rejects unknown email', async () => {
    const res = await request(app)
      .post(`/api/projects/${projectId}/members`)
      .set(auth(adminToken))
      .send({ email: 'nobody@test-proj.com' });
    expect(res.status).toBe(404);
  });

  it('member cannot add members', async () => {
    const res = await request(app)
      .post(`/api/projects/${projectId}/members`)
      .set(auth(memberToken))
      .send({ email: 'x@x.com' });
    expect(res.status).toBe(403);
  });
});

describe('GET /api/projects/:id', () => {
  it('member can view the project', async () => {
    const res = await request(app).get(`/api/projects/${projectId}`).set(auth(memberToken));
    expect(res.status).toBe(200);
    expect(res.body.project.id).toBe(projectId);
  });

  it('non-member gets 403', async () => {
    const stranger = await request(app)
      .post('/api/auth/register')
      .send({ name: 'S', email: `stranger-${ts}@test-proj.com`, password: 'password123' });
    const res = await request(app)
      .get(`/api/projects/${projectId}`)
      .set({ Authorization: `Bearer ${stranger.body.token}` });
    expect(res.status).toBe(403);
  });
});

describe('PUT /api/projects/:id', () => {
  it('admin can update project name', async () => {
    const res = await request(app)
      .put(`/api/projects/${projectId}`)
      .set(auth(adminToken))
      .send({ name: 'Updated Name' });
    expect(res.status).toBe(200);
    expect(res.body.project.name).toBe('Updated Name');
  });
});

describe('DELETE /api/projects/:id/members/:userId', () => {
  it('admin can remove a member', async () => {
    const res = await request(app)
      .delete(`/api/projects/${projectId}/members/${memberId}`)
      .set(auth(adminToken));
    expect(res.status).toBe(200);
  });
});

describe('DELETE /api/projects/:id', () => {
  it('admin can delete the project', async () => {
    const res = await request(app)
      .delete(`/api/projects/${projectId}`)
      .set(auth(adminToken));
    expect(res.status).toBe(200);
    projectId = null;
  });
});
