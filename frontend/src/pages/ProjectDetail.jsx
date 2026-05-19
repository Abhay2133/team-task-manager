import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
} from '@dnd-kit/core';
import { Plus, Users, ArrowLeft, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import client from '@/api/client';
import useAuthStore from '@/store/authStore';
import TaskCard, { TaskCardContent } from '@/components/TaskCard';
import TaskForm from '@/components/TaskForm';
import MemberManager from '@/components/MemberManager';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const COLUMNS = [
  { key: 'TODO',        label: 'To Do',      color: 'bg-slate-100' },
  { key: 'IN_PROGRESS', label: 'In Progress', color: 'bg-amber-50'  },
  { key: 'DONE',        label: 'Done',        color: 'bg-green-50'  },
];

function DroppableColumn({ col, tasks, isAdmin, onEdit, onDelete, syncingIds, isLoading }) {
  const { setNodeRef, isOver } = useDroppable({ id: col.key });

  return (
    <div
      ref={setNodeRef}
      className={`${col.color} rounded-lg p-3 min-h-[300px] transition-all duration-150
        ${isOver ? 'ring-2 ring-primary ring-inset scale-[1.01]' : ''}
      `}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm">{col.label}</h3>
        <span className="text-xs bg-white rounded-full px-2 py-0.5 font-medium">{tasks.length}</span>
      </div>
      <div className="space-y-2">
        {isLoading
          ? [...Array(2)].map((_, i) => (
              <div key={i} className="h-20 bg-white/60 animate-pulse rounded-lg" />
            ))
          : tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                isAdmin={isAdmin}
                isSyncing={syncingIds.has(task.id)}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
      </div>
    </div>
  );
}

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuthStore();

  const [taskFormOpen, setTaskFormOpen] = useState(false);
  const [editingTask, setEditingTask]   = useState(null);
  const [membersOpen, setMembersOpen]   = useState(false);
  const [activeTask, setActiveTask]     = useState(null);
  const [syncingIds, setSyncingIds]     = useState(new Set());

  const addSyncing    = (id) => setSyncingIds((s) => new Set(s).add(id));
  const removeSyncing = (id) => setSyncingIds((s) => { const n = new Set(s); n.delete(id); return n; });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const { data: projectData, isLoading: projLoading } = useQuery({
    queryKey: ['project', id],
    queryFn: () => client.get(`/projects/${id}`).then((r) => r.data.project),
  });

  const { data: tasksData, isLoading: tasksLoading } = useQuery({
    queryKey: ['tasks', id],
    queryFn: () => client.get(`/projects/${id}/tasks`).then((r) => r.data.tasks),
  });

  const myRole  = projectData?.members?.find((m) => m.userId === user?.id)?.role;
  const isAdmin = myRole === 'ADMIN';
  const tasks   = tasksData || [];

  // ── Create task ────────────────────────────────────────────────────────────
  const createTask = useMutation({
    mutationFn: (data) => client.post(`/projects/${id}/tasks`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks', id] });
      toast.success('Task created');
      setTaskFormOpen(false);
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to create task'),
  });

  // ── Update task ────────────────────────────────────────────────────────────
  const updateTask = useMutation({
    mutationFn: ({ taskId, data }) => client.put(`/projects/${id}/tasks/${taskId}`, data),
    onMutate: async ({ taskId, data }) => {
      await qc.cancelQueries({ queryKey: ['tasks', id] });
      const previous = qc.getQueryData(['tasks', id]);
      qc.setQueryData(['tasks', id], (old) =>
        old?.map((t) => t.id === taskId ? { ...t, ...data } : t)
      );
      addSyncing(taskId);
      return { previous, taskId };
    },
    onSuccess: () => {
      toast.success('Task updated');
      setEditingTask(null);
    },
    onError: (err, _, ctx) => {
      if (ctx?.previous) qc.setQueryData(['tasks', id], ctx.previous);
      toast.error(err.response?.data?.error || 'Failed to update task');
    },
    onSettled: (_, __, ___, ctx) => {
      if (ctx?.taskId) removeSyncing(ctx.taskId);
      qc.invalidateQueries({ queryKey: ['tasks', id] });
    },
  });

  // ── Patch status (drag or button) ─────────────────────────────────────────
  const patchStatus = useMutation({
    mutationFn: ({ taskId, status }) =>
      client.patch(`/projects/${id}/tasks/${taskId}/status`, { status }),
    onMutate: async ({ taskId, status }) => {
      await qc.cancelQueries({ queryKey: ['tasks', id] });
      const previous = qc.getQueryData(['tasks', id]);
      // Optimistic move — UI updates instantly
      qc.setQueryData(['tasks', id], (old) =>
        old?.map((t) => t.id === taskId ? { ...t, status } : t)
      );
      addSyncing(taskId);
      return { previous, taskId };
    },
    onError: (err, _, ctx) => {
      // Revert to previous state
      if (ctx?.previous) qc.setQueryData(['tasks', id], ctx.previous);
      toast.error(err.response?.data?.error || 'Cannot update status');
    },
    onSettled: (_, __, ___, ctx) => {
      if (ctx?.taskId) removeSyncing(ctx.taskId);
      qc.invalidateQueries({ queryKey: ['tasks', id] });
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
  });

  // ── Delete task ────────────────────────────────────────────────────────────
  const deleteTask = useMutation({
    mutationFn: (taskId) => client.delete(`/projects/${id}/tasks/${taskId}`),
    onMutate: async (taskId) => {
      await qc.cancelQueries({ queryKey: ['tasks', id] });
      const previous = qc.getQueryData(['tasks', id]);
      // Optimistic remove
      qc.setQueryData(['tasks', id], (old) => old?.filter((t) => t.id !== taskId));
      return { previous };
    },
    onError: (err, _, ctx) => {
      if (ctx?.previous) qc.setQueryData(['tasks', id], ctx.previous);
      toast.error(err.response?.data?.error || 'Failed to delete task');
    },
    onSuccess: () => toast.success('Task deleted'),
    onSettled: () => qc.invalidateQueries({ queryKey: ['tasks', id] }),
  });

  // ── Delete project ─────────────────────────────────────────────────────────
  const deleteProject = useMutation({
    mutationFn: () => client.delete(`/projects/${id}`),
    onMutate: () => navigate('/projects'), // navigate immediately
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to delete project'),
    onSuccess: () => toast.success('Project deleted'),
  });

  // ── DnD handlers ──────────────────────────────────────────────────────────
  const handleDragStart = ({ active }) => {
    setActiveTask(tasks.find((t) => t.id === active.id) || null);
  };

  const handleDragEnd = ({ active, over }) => {
    setActiveTask(null);
    if (!over) return;
    const targetStatus = over.id;
    const task = tasks.find((t) => t.id === active.id);
    if (!task || task.status === targetStatus) return;
    patchStatus.mutate({ taskId: task.id, status: targetStatus });
  };

  if (projLoading) return <div className="text-muted-foreground p-4">Loading project…</div>;
  if (!projectData) return <div className="text-muted-foreground p-4">Project not found.</div>;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/projects')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">{projectData.name}</h1>
            {projectData.description && (
              <p className="text-sm text-muted-foreground">{projectData.description}</p>
            )}
          </div>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setMembersOpen(true)}>
              <Users className="h-4 w-4 mr-1" />Members ({projectData.members.length})
            </Button>
            <Button size="sm" onClick={() => { setEditingTask(null); setTaskFormOpen(true); }}>
              <Plus className="h-4 w-4 mr-1" />Add Task
            </Button>
            <Button
              variant="destructive" size="sm"
              onClick={() => { if (confirm('Delete this project?')) deleteProject.mutate(); }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Kanban Board */}
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {COLUMNS.map((col) => (
            <DroppableColumn
              key={col.key}
              col={col}
              tasks={tasks.filter((t) => t.status === col.key)}
              isAdmin={isAdmin}
              syncingIds={syncingIds}
              isLoading={tasksLoading}
              onEdit={(t) => { setEditingTask(t); setTaskFormOpen(true); }}
              onDelete={(taskId) => { if (confirm('Delete this task?')) deleteTask.mutate(taskId); }}
            />
          ))}
        </div>

        {/* Full card ghost while dragging */}
        <DragOverlay dropAnimation={{ duration: 200, easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)' }}>
          {activeTask && (
            <div className="bg-white border-2 border-primary rounded-lg p-3 shadow-2xl space-y-2 rotate-1 opacity-95 pointer-events-none">
              <TaskCardContent task={activeTask} isAdmin={false} showGrip={true} />
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {/* Task Form Dialog */}
      <TaskForm
        open={taskFormOpen}
        onClose={() => { setTaskFormOpen(false); setEditingTask(null); }}
        onSubmit={(data) => {
          if (editingTask) updateTask.mutate({ taskId: editingTask.id, data });
          else createTask.mutate(data);
        }}
        members={projectData.members}
        initial={editingTask}
        isPending={createTask.isPending || updateTask.isPending}
      />

      {/* Members Dialog */}
      <Dialog open={membersOpen} onOpenChange={setMembersOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Manage Members</DialogTitle></DialogHeader>
          <MemberManager projectId={id} members={projectData.members} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
