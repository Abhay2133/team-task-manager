import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Users, Settings, ArrowLeft, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import client from '@/api/client';
import useAuthStore from '@/store/authStore';
import TaskCard from '@/components/TaskCard';
import TaskForm from '@/components/TaskForm';
import MemberManager from '@/components/MemberManager';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const COLUMNS = [
  { key: 'TODO', label: 'To Do', color: 'bg-slate-100' },
  { key: 'IN_PROGRESS', label: 'In Progress', color: 'bg-amber-50' },
  { key: 'DONE', label: 'Done', color: 'bg-green-50' },
];

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuthStore();

  const [taskFormOpen, setTaskFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [membersOpen, setMembersOpen] = useState(false);

  const { data: projectData, isLoading: projLoading } = useQuery({
    queryKey: ['project', id],
    queryFn: () => client.get(`/projects/${id}`).then((r) => r.data.project),
  });

  const { data: tasksData, isLoading: tasksLoading } = useQuery({
    queryKey: ['tasks', id],
    queryFn: () => client.get(`/projects/${id}/tasks`).then((r) => r.data.tasks),
  });

  const myRole = projectData?.members?.find((m) => m.userId === user?.id)?.role;
  const isAdmin = myRole === 'ADMIN';

  const createTask = useMutation({
    mutationFn: (data) => client.post(`/projects/${id}/tasks`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tasks', id] }); toast.success('Task created'); setTaskFormOpen(false); },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to create task'),
  });

  const updateTask = useMutation({
    mutationFn: ({ taskId, data }) => client.put(`/projects/${id}/tasks/${taskId}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tasks', id] }); toast.success('Task updated'); setEditingTask(null); },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to update task'),
  });

  const patchStatus = useMutation({
    mutationFn: ({ taskId, status }) => client.patch(`/projects/${id}/tasks/${taskId}/status`, { status }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tasks', id] }); qc.invalidateQueries({ queryKey: ['dashboard-stats'] }); },
    onError: (err) => toast.error(err.response?.data?.error || 'Cannot update status'),
  });

  const deleteTask = useMutation({
    mutationFn: (taskId) => client.delete(`/projects/${id}/tasks/${taskId}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tasks', id] }); toast.success('Task deleted'); },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to delete task'),
  });

  const deleteProject = useMutation({
    mutationFn: () => client.delete(`/projects/${id}`),
    onSuccess: () => { toast.success('Project deleted'); navigate('/projects'); },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to delete project'),
  });

  if (projLoading) return <div className="text-muted-foreground p-4">Loading project…</div>;
  if (!projectData) return <div className="text-muted-foreground p-4">Project not found.</div>;

  const tasks = tasksData || [];

  return (
    <div className="space-y-4">
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
        <div className="flex gap-2">
          {isAdmin && (
            <>
              <Button variant="outline" size="sm" onClick={() => setMembersOpen(true)}>
                <Users className="h-4 w-4 mr-1" />Members ({projectData.members.length})
              </Button>
              <Button size="sm" onClick={() => { setEditingTask(null); setTaskFormOpen(true); }}>
                <Plus className="h-4 w-4 mr-1" />Add Task
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => { if (confirm('Delete this project?')) deleteProject.mutate(); }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {COLUMNS.map(({ key, label, color }) => {
          const col = tasks.filter((t) => t.status === key);
          return (
            <div key={key} className={`${color} rounded-lg p-3 min-h-[200px]`}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-sm">{label}</h3>
                <span className="text-xs bg-white rounded-full px-2 py-0.5 font-medium">{col.length}</span>
              </div>
              <div className="space-y-2">
                {tasksLoading
                  ? [...Array(2)].map((_, i) => <div key={i} className="h-20 bg-white/60 animate-pulse rounded-lg" />)
                  : col.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={{ ...task, _currentUserId: user?.id }}
                      isAdmin={isAdmin}
                      onEdit={(t) => { setEditingTask(t); setTaskFormOpen(true); }}
                      onDelete={(taskId) => { if (confirm('Delete this task?')) deleteTask.mutate(taskId); }}
                      onStatusChange={(taskId, status) => patchStatus.mutate({ taskId, status })}
                    />
                  ))
                }
              </div>
            </div>
          );
        })}
      </div>

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
