import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import App from '../App';
import { EXAMPLE_RUNNING } from '../data/constants';
import { seedAudit } from '../data/audit';
import { resetSwarm } from '../store/useSwarm';

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );

const ROUTES = [
  '/',
  '/new',
  '/missions',
  '/missions/M-12',
  '/ideas/I-12-40',
  '/council/C-12-1',
  '/approvals',
  '/library',
  '/improvement',
  '/scoreboard',
  '/published',
  '/contributors',
  '/budgets',
  '/audit',
];

beforeEach(async () => {
  await resetSwarm();
  window.scrollTo = () => {};
  class RO {
    observe() {}
    disconnect() {}
  }
  (globalThis as unknown as { ResizeObserver: typeof RO }).ResizeObserver = RO;
});

describe('screens', () => {
  it('opens on the Overview with the grouped rail', () => {
    renderAt('/');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/thinking together/);
    const nav = screen.getByRole('navigation', { name: 'Main' });
    for (const label of [
      'Overview',
      'New mission',
      'Missions',
      'Council approvals',
      'Library',
      'Improvement',
      'Scoreboard',
      'Published',
      'Contributors',
      'Budgets',
      'Audit trail',
    ])
      expect(nav).toHaveTextContent(label);
  });

  it.each(ROUTES)('%s renders, with no agreement percentage anywhere', (path) => {
    const { container, unmount } = renderAt(path);
    expect(screen.getAllByRole('heading', { level: 1 }).length).toBeGreaterThan(0);
    expect(screen.queryByText(/couldn’t find/)).toBeNull();
    expect(container.textContent ?? '').not.toMatch(/agreement|% alike/i);
    unmount();
  });

  it('the mission page shows the idea field, funnel and bar to beat', () => {
    renderAt('/missions/M-12');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Find a better way to handle stop-losses',
    );
    expect(screen.getByText(/Trying to beat the current best/)).toBeInTheDocument();
    expect(screen.getByRole('group', { name: /Idea field/ })).toBeInTheDocument();
    expect(screen.getByText(/Bar to beat/)).toBeInTheDocument();
  });

  it('an idea page shows the gates and a full receipt', () => {
    renderAt('/ideas/I-12-14');
    expect(screen.getByText(/Objection upheld/)).toBeInTheDocument();
    expect(screen.getByText(/does not prove the idea works/)).toBeInTheDocument();
  });

  it('shows "Already running" for the stop-loss example and creates nothing', async () => {
    const user = userEvent.setup();
    renderAt('/new');
    await user.click(screen.getByRole('button', { name: EXAMPLE_RUNNING }));
    await user.click(screen.getByRole('button', { name: /Launch the mission/ }));
    expect(screen.getByText(/Already running/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open M-12' })).toBeInTheDocument();
  });

  it('refuses an over-budget mission with a clear message', async () => {
    const user = userEvent.setup();
    renderAt('/new');
    await user.type(screen.getByLabelText('Goal'), 'A brand new goal about something else');
    const b = screen.getByLabelText('Budget');
    await user.clear(b);
    await user.type(b, '900');
    await user.click(screen.getByRole('button', { name: /Launch the mission/ }));
    expect(screen.getByRole('alert')).toHaveTextContent(/only \$/);
  });

  it('council approvals are watch-only: no approve or reject controls', () => {
    renderAt('/approvals');
    expect(screen.queryByRole('button', { name: /approve|reject|publish/i })).toBeNull();
    expect(screen.getAllByText(/Rule-change panel \(7 seats\)/).length).toBeGreaterThan(0);
  });

  it('runs the tamper demo on the audit trail', async () => {
    const user = userEvent.setup();
    renderAt('/audit');
    const n = seedAudit.length;
    await waitFor(() => expect(screen.getAllByText(`#${n}`).length).toBeGreaterThan(0));
    await user.click(screen.getByRole('button', { name: /Try changing an old entry/ }));
    await user.click(screen.getByRole('button', { name: /Check the chain/ }));
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('Chain broken at entry 8'),
    );
    await user.click(screen.getByRole('button', { name: /Undo the change/ }));
    await waitFor(() =>
      expect(screen.getByText(new RegExp(`All ${n} entries match`))).toBeInTheDocument(),
    );
  });

  it('the emergency stop asks inside the page before stopping', async () => {
    const user = userEvent.setup();
    renderAt('/');
    await user.click(screen.getByRole('button', { name: /Emergency stop/ }));
    await user.click(screen.getByRole('button', { name: 'Yes, stop' }));
    expect(screen.getByRole('button', { name: 'Release the stop' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Release the stop' }));
    expect(screen.queryByRole('button', { name: 'Release the stop' })).toBeNull();
    expect(screen.getByRole('button', { name: /Emergency stop/ })).toBeInTheDocument();
  });
});
