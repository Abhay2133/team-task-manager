import { render, screen } from '@testing-library/react';
import { DndContext } from '@dnd-kit/core';
import TaskCard from '../components/TaskCard';

const baseTask = {
  id: 'task-1',
  title: 'Fix the login bug',
  description: 'Users cannot login on mobile',
  status: 'TODO',
  priority: 'HIGH',
  dueDate: null,
  assignedTo: { id: 'u1', name: 'Alice' },
  assignedToId: 'u1',
};

const wrap = (ui) => <DndContext>{ui}</DndContext>;

describe('TaskCard', () => {
  it('renders title', () => {
    render(wrap(<TaskCard task={baseTask} isAdmin={true} onEdit={() => {}} onDelete={() => {}} />));
    expect(screen.getByText('Fix the login bug')).toBeInTheDocument();
  });

  it('renders description', () => {
    render(wrap(<TaskCard task={baseTask} isAdmin={true} onEdit={() => {}} onDelete={() => {}} />));
    expect(screen.getByText('Users cannot login on mobile')).toBeInTheDocument();
  });

  it('renders priority badge', () => {
    render(wrap(<TaskCard task={baseTask} isAdmin={true} onEdit={() => {}} onDelete={() => {}} />));
    expect(screen.getByText('High')).toBeInTheDocument();
  });

  it('renders assignee name', () => {
    render(wrap(<TaskCard task={baseTask} isAdmin={true} onEdit={() => {}} onDelete={() => {}} />));
    expect(screen.getByText('Alice')).toBeInTheDocument();
  });

  it('shows edit and delete buttons for admin', () => {
    render(wrap(<TaskCard task={baseTask} isAdmin={true} onEdit={() => {}} onDelete={() => {}} />));
    expect(screen.getAllByRole('button').length).toBeGreaterThanOrEqual(2);
  });

  it('hides edit and delete buttons for non-admin', () => {
    render(wrap(<TaskCard task={baseTask} isAdmin={false} onEdit={() => {}} onDelete={() => {}} />));
    // Only grip handle button visible
    const buttons = screen.queryAllByRole('button');
    // No pencil/trash buttons
    expect(buttons.filter(b => b.querySelector('svg'))).toHaveLength(1);
  });

  it('shows syncing overlay when isSyncing', () => {
    const { container } = render(wrap(
      <TaskCard task={baseTask} isAdmin={true} onEdit={() => {}} onDelete={() => {}} isSyncing={true} />
    ));
    // Loader spinner should be present
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('shows overdue indicator for past due date on non-done task', () => {
    const overdueTask = { ...baseTask, dueDate: '2020-01-01T00:00:00.000Z', status: 'TODO' };
    render(wrap(<TaskCard task={overdueTask} isAdmin={false} onEdit={() => {}} onDelete={() => {}} />));
    expect(screen.getByText(/Jan 1/)).toBeInTheDocument();
  });
});
