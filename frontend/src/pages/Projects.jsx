import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus, FolderKanban, Users, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import client from '@/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import useAuthStore from '@/store/authStore';

function CreateProjectDialog() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });
  const qc = useQueryClient();
  const { user } = useAuthStore();

  const { mutate, isPending } = useMutation({
    mutationFn: (data) => client.post('/projects', data),
    onMutate: async (data) => {
      await qc.cancelQueries({ queryKey: ['projects'] });
      const previous = qc.getQueryData(['projects']);
      // Optimistic new project card
      const optimistic = {
        id: `optimistic-${Date.now()}`,
        name: data.name,
        description: data.description,
        members: [{ userId: user?.id, user: { id: user?.id, name: user?.name }, role: 'ADMIN' }],
        _count: { tasks: 0 },
        _optimistic: true,
      };
      qc.setQueryData(['projects'], (old) => [optimistic, ...(old || [])]);
      setOpen(false);
      setForm({ name: '', description: '' });
      return { previous };
    },
    onSuccess: () => toast.success('Project created'),
    onError: (err, _, ctx) => {
      if (ctx?.previous) qc.setQueryData(['projects'], ctx.previous);
      toast.error(err.response?.data?.error || 'Failed to create project');
      setOpen(true);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="h-4 w-4 mr-1" />New Project</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Create Project</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input
              placeholder="Project name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Description (optional)</Label>
            <Input
              placeholder="What's this project about?"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={() => mutate(form)} disabled={isPending || !form.name.trim()}>
            {isPending ? <><Loader2 className="h-4 w-4 animate-spin mr-1" />Creating…</> : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function Projects() {
  const { data, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => client.get('/projects').then((r) => r.data.projects),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Projects</h1>
        <CreateProjectDialog />
      </div>

      {isLoading && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i}><CardContent className="p-6"><div className="h-24 bg-muted animate-pulse rounded" /></CardContent></Card>
          ))}
        </div>
      )}

      {!isLoading && data?.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <FolderKanban className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>No projects yet. Create your first one!</p>
        </div>
      )}

      {!isLoading && data?.length > 0 && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.map((project) => (
            <Card
              key={project.id}
              className={`hover:shadow-md transition-all duration-200 ${project._optimistic ? 'opacity-60 pointer-events-none' : ''}`}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{project.name}</CardTitle>
                  {project._optimistic && <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0 mt-0.5" />}
                </div>
                <CardDescription className="line-clamp-2">{project.description || 'No description'}</CardDescription>
              </CardHeader>
              <CardContent className="pb-2">
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />{project.members.length} members
                  </span>
                  <span>{project._count.tasks} tasks</span>
                </div>
              </CardContent>
              <CardFooter>
                <Button asChild variant="outline" size="sm" className="w-full">
                  <Link to={`/projects/${project.id}`}>Open Board</Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
