import React from 'react';
import PageHeader from '../../components/admin/PageHeader';
import StatCard from '../../components/admin/StatCard';
import DataTable from '../../components/admin/DataTable';
import StatusBadge from '../../components/admin/StatusBadge';

const Dashboard = () => {
  // Dummy data as per version 1 scope
  const stats = [
    { title: 'Total Clients', value: '124', icon: '👥', color: '#2563eb' },
    { title: 'Total Trainers', value: '32', icon: '🏋️', color: '#16a34a' },
    { title: 'Specializations', value: '5', icon: '⭐', color: '#d97706' },
    { title: 'Active Trainers', value: '18', icon: '✅', color: '#9333ea' }
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
    <div>
      <PageHeader 
        title="Admin Dashboard" 
        description="Overview of FitNexa platform metrics."
      />

      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
        {stats.map((stat, idx) => (
          <StatCard 
            key={idx}
            title={stat.title}
            value={stat.value}
            icon={stat.icon}
            color={stat.color}
          />
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' }}>
        {/* Recent Trainers */}
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#111827', marginBottom: '1rem' }}>
            Recent Trainer Applications
          </h2>
          <DataTable 
            columns={[
              { header: 'Name', accessor: 'name' },
              { header: 'Specialization', accessor: 'specialization' },
              { 
                header: 'Status', 
                accessor: 'status',
                render: (row) => <StatusBadge status={row.status} /> 
              }
            ]}
            data={recentTrainers}
          />
        </div>

        {/* Recent Clients */}
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#111827', marginBottom: '1rem' }}>
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
