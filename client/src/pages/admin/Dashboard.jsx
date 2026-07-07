import React from 'react';
import { PageHeader } from '../../components/ui/LayoutComponents';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import DataTable from '../../components/admin/DataTable';
import Badge from '../../components/ui/Badge';
import { Users, UserCheck, Star, ShieldCheck } from 'lucide-react';

const Dashboard = () => {
  // Dummy data as per version 1 scope
  const stats = [
    { title: 'Total Clients', value: '124', icon: Users, colorClass: 'text-blue-500' },
    { title: 'Total Trainers', value: '32', icon: UserCheck, colorClass: 'text-green-500' },
    { title: 'Specializations', value: '5', icon: Star, colorClass: 'text-amber-500' },
    { title: 'Active Trainers', value: '18', icon: ShieldCheck, colorClass: 'text-purple-500' }
  ];

  const recentTrainers = [
    { id: 1, name: 'John Doe', specialization: 'Weight Loss', status: 'PENDING' },
    { id: 2, name: 'Jane Smith', specialization: 'Yoga', status: 'APPROVED' },
    { id: 3, name: 'Mike Johnson', specialization: 'Crossfit', status: 'REJECTED' },
  ];

  const recentClients = [
    { id: 1, name: 'Alice Williams', goal: 'Muscle Gain', joined: '2 days ago' },
    { id: 2, name: 'Bob Brown', goal: 'Weight Loss', joined: '3 days ago' },
  ];

  return (
    <div className="py-6 space-y-8">
      <PageHeader 
        title="Admin Dashboard" 
        description="Overview of FitNexa platform metrics."
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <Card key={idx} className="hover:border-primary/30 transition-colors">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted mb-1">{stat.title}</p>
                    <h3 className="text-3xl font-bold text-gray-100">{stat.value}</h3>
                  </div>
                  <div className={`p-3 rounded-full bg-surface shadow-inner border border-border/10 ${stat.colorClass}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Recent Trainers */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-100 flex items-center gap-2">
            Recent Trainer Applications
          </h2>
          <DataTable 
            columns={[
              { header: 'Name', accessor: 'name' },
              { header: 'Specialization', accessor: 'specialization' },
              { 
                header: 'Status', 
                accessor: 'status',
                render: (row) => (
                  <Badge variant={
                    row.status === 'APPROVED' ? 'success' :
                    row.status === 'PENDING' ? 'warning' :
                    row.status === 'REJECTED' ? 'danger' : 'secondary'
                  }>
                    {row.status}
                  </Badge>
                )
              }
            ]}
            data={recentTrainers}
          />
        </div>

        {/* Recent Clients */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-100 flex items-center gap-2">
            Newest Clients
          </h2>
          <DataTable 
            columns={[
              { header: 'Name', accessor: 'name' },
              { header: 'Fitness Goal', accessor: 'goal' },
              { header: 'Joined', accessor: 'joined' }
            ]}
            data={recentClients}
          />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
