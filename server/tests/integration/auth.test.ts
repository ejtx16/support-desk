import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { api, bearer, createUser, prisma, resetDb, TEST_PASSWORD } from '../helpers';

beforeEach(resetDb);
afterAll(() => prisma.$disconnect());

describe('POST /api/auth/login', () => {
  it('returns a token and the public user for valid credentials', async () => {
    const { user } = await createUser('AGENT', { email: 'agent@test.dev' });

    const res = await api()
      .post('/api/auth/login')
      .send({ email: 'AGENT@test.dev', password: TEST_PASSWORD });

    expect(res.status).toBe(200);
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.user).toMatchObject({ id: user.id, email: 'agent@test.dev', role: 'AGENT' });
    expect(res.body.user.passwordHash).toBeUndefined();
  });

  it('rejects a wrong password with a generic message', async () => {
    await createUser('CUSTOMER', { email: 'c@test.dev' });
    const res = await api().post('/api/auth/login').send({ email: 'c@test.dev', password: 'nope' });
    expect(res.status).toBe(401);
    expect(res.body.error).toMatchObject({
      code: 'INVALID_CREDENTIALS',
      message: 'Invalid email or password',
    });
  });

  it('returns 400 with field errors for an invalid payload', async () => {
    const res = await api().post('/api/auth/login').send({ email: 'not-an-email' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details).toHaveProperty('email');
    expect(res.body.error.details).toHaveProperty('password');
  });
});

describe('POST /api/auth/register', () => {
  it('creates a CUSTOMER account and logs them in', async () => {
    const res = await api()
      .post('/api/auth/register')
      .send({ name: 'New Person', email: 'new@test.dev', password: 'Secret123' });
    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe('CUSTOMER');
    expect(res.body.token).toEqual(expect.any(String));
  });

  it('rejects duplicate emails with 409', async () => {
    await createUser('CUSTOMER', { email: 'dupe@test.dev' });
    const res = await api()
      .post('/api/auth/register')
      .send({ name: 'Dupe', email: 'dupe@test.dev', password: 'Secret123' });
    expect(res.status).toBe(409);
  });
});

describe('GET /api/auth/me', () => {
  it('requires a token', async () => {
    const res = await api().get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('rejects a tampered token', async () => {
    const res = await api().get('/api/auth/me').set(bearer('not.a.jwt'));
    expect(res.status).toBe(401);
  });

  it('returns the current user', async () => {
    const { user, token } = await createUser('CUSTOMER');
    const res = await api().get('/api/auth/me').set(bearer(token));
    expect(res.status).toBe(200);
    expect(res.body.user.id).toBe(user.id);
  });
});

describe('misc routes', () => {
  it('exposes a health check', async () => {
    const res = await api().get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('returns JSON 404 for unknown routes', async () => {
    const res = await api().get('/api/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});
