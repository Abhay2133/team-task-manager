import { format } from 'date-fns';
import { Calendar, AlertCircle, Pencil, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const PRIORITY_VARIANT = { LOW: 'secondary', MEDIUM: 'warning', HIGH: 'destructive' };
const PRIORITY_LABEL = { LOW: 'Low', MEDIUM: 'Medium', HIGH: 'High' };

export default function TaskCard({ task, isAdmin, onEdit, onDelete, onStatusChange }) {
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'DONE';
  const canChangeStatus = isAdmin || task.assignedTo?.id === task._currentUserId;

  const nextStatus = { TODO: 'IN_PROGRESS', IN_PROGRESS: 'DONE', DONE: 'TODO' };
  const nextLabel = { TODO: '→ Start', IN_PROGRESS: '→ Done', DONE: '↺ Reopen' };

  return (
    <div className="bg-white border rounded-lg p-3 shadow-sm space-y-2 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium leading-tight flex-1">{task.title}</p>
        {isAdmin && (
          <div className="flex gap-1 shrink-0">
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onEdit(task)}>
              <Pencil className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive" onClick={() => onDelete(task.id)}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>

      {task.description && (
        <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>
      )}

      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant={PRIORITY_VARIANT[task.priority]}>{PRIORITY_LABEL[task.priority]}</Badge>
        {task.assignedTo && (
          <Badge variant="outline" className="text-xs">{task.assignedTo.name}</Badge>
        )}
        {task.dueDate && (
          <span className={`flex items-center gap-1 text-xs ${isOverdue ? 'text-red-600' : 'text-muted-foreground'}`}>
            {isOverdue && <AlertCircle className="h-3 w-3" />}
            <Calendar className="h-3 w-3" />
            {format(new Date(task.dueDate), 'MMM d')}
          </span>
        )}
      </div>

      {canChangeStatus && task.status !== 'DONE' && (
        <Button
          variant="outline"
          size="sm"
          className="w-full h-7 text-xs"
          onClick={() => onStatusChange(task.id, nextStatus[task.status])}
        >
          {nextLabel[task.status]}
        </Button>
      )}
    </div>
  );
}
