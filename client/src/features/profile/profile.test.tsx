import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useAuthStore } from '@/features/auth/store';
import { agentUser, customerUser } from '@/test/fixtures';
import { renderApp, signIn } from '@/test/render';

describe('profile page', () => {
  it("shows the signed-in user's details and role access", async () => {
    signIn(customerUser);
    renderApp('/profile');

    expect(await screen.findByRole('heading', { name: 'Your profile' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Casey Customer' })).toBeInTheDocument();
    expect(screen.getAllByText('customer@queuedesk.test').length).toBeGreaterThan(0);
    expect(screen.getByText('Member since')).toBeInTheDocument();
    expect(screen.getByText('See and reply to your own tickets')).toBeInTheDocument();
  });

  it('is reachable from the header', async () => {
    signIn(agentUser);
    const { user, router } = renderApp('/tickets');

    await user.click(await screen.findByRole('link', { name: 'Your profile' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/profile'));
    expect(
      await screen.findByText('Claim tickets and change their status or priority'),
    ).toBeInTheDocument();
  });

  it('signs the user out', async () => {
    signIn(customerUser);
    const { user, router } = renderApp('/profile');

    await screen.findByRole('heading', { name: 'Your profile' });
    await user.click(within(screen.getByRole('main')).getByRole('button', { name: 'Sign out' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/login'));
    expect(useAuthStore.getState().user).toBeNull();
  });

  it('requires sign-in', async () => {
    const { router } = renderApp('/profile');
    await waitFor(() => expect(router.state.location.pathname).toBe('/login'));
  });
});
