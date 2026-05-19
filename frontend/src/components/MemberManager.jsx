import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { UserPlus, X, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import client from '@/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import useAuthStore from '@/store/authStore';

export default function MemberManager({ projectId, members = [] }) {
  const [email, setEmail] = useState('');
  const [removingIds, setRemovingIds] = useState(new Set());
  const qc = useQueryClient();
  const { user } = useAuthStore();

  const addMutation = useMutation({
    mutationFn: (email) => client.post(`/projects/${projectId}/members`, { email }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project', projectId] });
      toast.success('Member added');
      setEmail('');
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to add member'),
  });

  const removeMutation = useMutation({
    mutationFn: (userId) => client.delete(`/projects/${projectId}/members/${userId}`),
    onMutate: async (userId) => {
      setRemovingIds((s) => new Set(s).add(userId));
      await qc.cancelQueries({ queryKey: ['project', projectId] });
      const previous = qc.getQueryData(['project', projectId]);
      // Optimistic remove from member list
      qc.setQueryData(['project', projectId], (old) =>
        old ? { ...old, members: old.members.filter((m) => m.userId !== userId) } : old
      );
      return { previous, userId };
    },
    onError: (err, _, ctx) => {
      if (ctx?.previous) qc.setQueryData(['project', projectId], ctx.previous);
      toast.error(err.response?.data?.error || 'Failed to remove member');
    },
    onSuccess: () => toast.success('Member removed'),
    onSettled: (_, __, ___, ctx) => {
      if (ctx?.userId) setRemovingIds((s) => { const n = new Set(s); n.delete(ctx.userId); return n; });
      qc.invalidateQueries({ queryKey: ['project', projectId] });
    },
  });

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input
          placeholder="member@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && email && addMutation.mutate(email)}
          disabled={addMutation.isPending}
        />
        <Button
          size="sm"
          onClick={() => addMutation.mutate(email)}
          disabled={!email || addMutation.isPending}
        >
          {addMutation.isPending
            ? <Loader2 className="h-4 w-4 animate-spin" />
            : <UserPlus className="h-4 w-4" />}
        </Button>
      </div>

      <div className="space-y-2">
        {members.map((m) => {
          const isRemoving = removingIds.has(m.userId);
          return (
            <div
              key={m.userId}
              className={`flex items-center justify-between py-1 transition-opacity duration-150 ${isRemoving ? 'opacity-40' : ''}`}
            >
              <div>
                <span className="text-sm font-medium">{m.user.name}</span>
                <span className="text-xs text-muted-foreground ml-2">{m.user.email}</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={m.role === 'ADMIN' ? 'default' : 'secondary'} className="text-xs">
                  {m.role}
                </Badge>
                {m.userId !== user?.id && (
                  <Button
                    variant="ghost" size="icon"
                    className="h-6 w-6 text-muted-foreground hover:text-destructive transition-colors"
                    onClick={() => removeMutation.mutate(m.userId)}
                    disabled={isRemoving}
                  >
                    {isRemoving
                      ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      : <X className="h-3.5 w-3.5" />}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
