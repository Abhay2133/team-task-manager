import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { CheckCircle2, Clock, AlertTriangle, ListTodo } from 'lucide-react';
import client from '@/api/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const statCard = (title, value, icon, colorClass) => ({ title, value, icon, colorClass });

export default function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => client.get('/dashboard/stats').then((r) => r.data),
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}><CardContent className="p-6"><div className="h-12 bg-muted animate-pulse rounded" /></CardContent></Card>
          ))}
        </div>
      </div>
    );
  }

  const stats = data || {};
  const { totalTasks = 0, tasksByStatus = {}, overdueTasks = 0, tasksPerUser = [] } = stats;

  const cards = [
    { title: 'Total Tasks', value: totalTasks, icon: ListTodo, color: 'text-blue-600' },
    { title: 'Completed', value: tasksByStatus.DONE || 0, icon: CheckCircle2, color: 'text-green-600' },
    { title: 'In Progress', value: tasksByStatus.IN_PROGRESS || 0, icon: Clock, color: 'text-yellow-600' },
    { title: 'Overdue', value: overdueTasks, icon: AlertTriangle, color: 'text-red-600' },
  ];

  const statusChartData = [
    { name: 'To Do', count: tasksByStatus.TODO || 0, fill: '#94a3b8' },
    { name: 'In Progress', count: tasksByStatus.IN_PROGRESS || 0, fill: '#f59e0b' },
    { name: 'Done', count: tasksByStatus.DONE || 0, fill: '#22c55e' },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map(({ title, value, icon: Icon, color }) => (
          <Card key={title}>
            <CardContent className="p-6 flex items-center gap-4">
              <Icon className={`h-8 w-8 ${color}`} />
              <div>
                <p className="text-sm text-muted-foreground">{title}</p>
                <p className="text-3xl font-bold">{value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Tasks by Status</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={statusChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {statusChartData.map((entry, i) => (
                    <rect key={i} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Tasks per Member</CardTitle></CardHeader>
          <CardContent>
            {tasksPerUser.length === 0 ? (
              <p className="text-muted-foreground text-sm py-8 text-center">No assigned tasks yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={tasksPerUser} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} width={80} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
