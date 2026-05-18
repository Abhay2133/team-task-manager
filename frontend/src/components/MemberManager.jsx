import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { UserPlus, X } from 'lucide-react';
import toast from 'react-hot-toast';
import client from '@/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import useAuthStore from '@/store/authStore';

export default function MemberManager({ projectId, members = [] }) {
  const [email, setEmail] = useState('');
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['project', projectId] });
      toast.success('Member removed');
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to remove member'),
  });

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input
          placeholder="member@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && email && addMutation.mutate(email)}
        />
        <Button
          size="sm"
          onClick={() => addMutation.mutate(email)}
          disabled={!email || addMutation.isPending}
        >
          <UserPlus className="h-4 w-4" />
        </Button>
      </div>
      <div className="space-y-2">
        {members.map((m) => (
          <div key={m.userId} className="flex items-center justify-between py-1">
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
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground hover:text-destructive"
                  onClick={() => removeMutation.mutate(m.userId)}
                  disabled={removeMutation.isPending}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
