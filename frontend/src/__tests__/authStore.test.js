import useAuthStore from '../store/authStore';

// Reset store between tests
beforeEach(() => {
  useAuthStore.setState({ user: null, token: null });
});

describe('authStore', () => {
  it('starts with null user and token', () => {
    const { user, token } = useAuthStore.getState();
    expect(user).toBeNull();
    expect(token).toBeNull();
  });

  it('setAuth stores user and token', () => {
    const { setAuth } = useAuthStore.getState();
    setAuth({ id: '1', name: 'Alice', email: 'alice@example.com' }, 'tok_abc');
    const { user, token } = useAuthStore.getState();
    expect(user.name).toBe('Alice');
    expect(token).toBe('tok_abc');
  });

  it('clearAuth resets to null', () => {
    const store = useAuthStore.getState();
    store.setAuth({ id: '1', name: 'Alice' }, 'tok');
    store.clearAuth();
    const { user, token } = useAuthStore.getState();
    expect(user).toBeNull();
    expect(token).toBeNull();
  });
});
