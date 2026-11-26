import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import App from '../App';
import { EXAMPLE_STUDIED } from '../data/constants';
import { resetSwarm } from '../store/useSwarm';

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );

beforeEach(async () => {
  await resetSwarm();
  window.scrollTo = () => {};
});

describe('screens', () => {
  it('opens on the Overview with all nine screens in the rail', () => {
    renderAt('/');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/Research you can check/);
    const nav = screen.getByRole('navigation', { name: 'Main' });
    for (const label of [
      'Overview',
      'Ask a question',
      'Work board',
      'Review desk',
      'Published findings',
      'Budgets',
      'Contributors',
      'Audit trail',
    ]) {
      expect(nav).toHaveTextContent(label);
    }
    expect(screen.getByText('Jobs in progress')).toBeInTheDocument();
  });

  it('deep-links to a job page', () => {
    renderAt('/jobs/J-1043');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Which stop-loss distance works best for 15-minute EURUSD trades?',
    );
    expect(screen.getByText('Run receipt')).toBeInTheDocument();
    expect(screen.getByText(/does not prove the answer is right/)).toBeInTheDocument();
  });

  it('shows "Already studied" for the ECB example', async () => {
    const user = userEvent.setup();
    renderAt('/ask');
    await user.click(screen.getByRole('button', { name: EXAMPLE_STUDIED }));
    await user.click(screen.getByRole('button', { name: /Send to the swarm/ }));
    expect(screen.getByText(/Already studied/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open J-1039' })).toBeInTheDocument();
  });

  it('refuses an over-budget job with a clear message', async () => {
    const user = userEvent.setup();
    renderAt('/ask');
    await user.type(screen.getByLabelText('Your question'), 'A brand new question');
    const cost = screen.getByLabelText('Most it may cost');
    await user.clear(cost);
    await user.type(cost, '40');
    await user.click(screen.getByRole('button', { name: /Send to the swarm/ }));
    expect(screen.getByRole('alert')).toHaveTextContent(/over budget/);
  });

  it('approving on the review desk moves the job to published', async () => {
    const user = userEvent.setup();
    renderAt('/review');
    expect(screen.getAllByRole('button', { name: /Approve and publish/ })).toHaveLength(2);
    await user.click(screen.getAllByRole('button', { name: /Approve and publish/ })[0]);
    expect(screen.getAllByRole('button', { name: /Approve and publish/ })).toHaveLength(1);
  });

  it('runs the tamper demo on the audit trail', async () => {
    const user = userEvent.setup();
    renderAt('/audit');
    await waitFor(() => expect(screen.getAllByText('#17').length).toBeGreaterThan(0));
    await user.click(screen.getByRole('button', { name: /Try changing an old entry/ }));
    await user.click(screen.getByRole('button', { name: /Check the chain/ }));
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('Chain broken at entry 8'),
    );
    await user.click(screen.getByRole('button', { name: /Undo the change/ }));
    await waitFor(() => expect(screen.getByText(/All 17 entries match/)).toBeInTheDocument());
  });
});
