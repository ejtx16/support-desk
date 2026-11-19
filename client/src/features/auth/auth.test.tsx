import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderApp, signIn } from '@/test/render';
import { customerUser } from '@/test/fixtures';
import { useAuthStore } from './store';

describe('auth store', () => {
  it('stores and clears the session', () => {
    useAuthStore.getState().setSession('abc', customerUser);
    expect(useAuthStore.getState()).toMatchObject({ token: 'abc', user: customerUser });
    useAuthStore.getState().logout();
    expect(useAuthStore.getState()).toMatchObject({ token: null, user: null });
  });
});

describe('login page', () => {
  it('validates required fields before calling the API', async () => {
    const { user } = renderApp('/login');
    await user.click(await screen.findByRole('button', { name: 'Sign in' }));
    expect(await screen.findByText('Email is required')).toBeInTheDocument();
    expect(screen.getByText('Password is required')).toBeInTheDocument();
  });

  it('shows the server error for bad credentials', async () => {
    const { user } = renderApp('/login');
    await user.type(await screen.findByLabelText('Email'), 'agent@queuedesk.test');
    await user.type(screen.getByLabelText('Password'), 'wrong');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password');
    expect(useAuthStore.getState().user).toBeNull();
  });

  it('signs an agent in and lands on the dashboard', async () => {
    const { user, router } = renderApp('/login');
    await user.click(await screen.findByRole('button', { name: 'Agent' })); // demo prefill
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/dashboard'));
    expect(useAuthStore.getState().token).toBe('test-token');
    expect(await screen.findByRole('heading', { name: 'Hi Alex' })).toBeInTheDocument();
  });
});

describe('route guards', () => {
  it('redirects anonymous users to /login', async () => {
    const { router } = renderApp('/tickets');
    await waitFor(() => expect(router.state.location.pathname).toBe('/login'));
    expect(router.state.location.state).toEqual({ from: '/tickets' });
  });

  it('keeps customers out of the agent dashboard', async () => {
    signIn(customerUser);
    const { router } = renderApp('/dashboard');
    await waitFor(() => expect(router.state.location.pathname).toBe('/tickets'));
  });

  it('sends signed-in users away from the login page', async () => {
    signIn(customerUser);
    const { router } = renderApp('/login');
    await waitFor(() => expect(router.state.location.pathname).toBe('/tickets'));
  });
});
