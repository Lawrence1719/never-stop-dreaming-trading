'use client';

import { useState } from 'react';
import { ArrowDown, ArrowUp, DollarSign, ShoppingCart, Users, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/context/auth-context';

const salesData = [
  { date: 'Mon', sales: 4000, revenue: 2400 },
  { date: 'Tue', sales: 3000, revenue: 1398 },
  { date: 'Wed', sales: 2000, revenue: 9800 },
  { date: 'Thu', sales: 2780, revenue: 3908 },
  { date: 'Fri', sales: 1890, revenue: 4800 },
  { date: 'Sat', sales: 2390, revenue: 3800 },
  { date: 'Sun', sales: 3490, revenue: 4300 },
];

const categoryData = [
  { name: 'Electronics', value: 35 },
  { name: 'Clothing', value: 25 },
  { name: 'Books', value: 20 },
  { name: 'Other', value: 20 },
];

const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b'];

const recentOrders = [
  { id: '#1024', customer: 'John Doe', amount: '$124.50', status: 'Delivered', date: '2 min ago' },
  { id: '#1023', customer: 'Jane Smith', amount: '$89.99', status: 'Shipped', date: '15 min ago' },
  { id: '#1022', customer: 'Bob Johnson', amount: '$245.00', status: 'Processing', date: '1 hour ago' },
  { id: '#1021', customer: 'Alice Williams', amount: '$156.75', status: 'Pending', date: '2 hours ago' },
];

export default function AdminDashboard() {
  const { user } = useAuth();
  const [dateRange, setDateRange] = useState('week');

  const stats = [
    {
      title: 'Total Revenue',
      value: '$45,231.89',
      change: '+20.1%',
      isPositive: true,
      icon: DollarSign,
    },
    {
      title: 'Total Orders',
      value: '1,234',
      change: '+15.3%',
      isPositive: true,
      icon: ShoppingCart,
    },
    {
      title: 'Total Customers',
      value: '892',
      change: '+8.2%',
      isPositive: true,
      icon: Users,
    },
    {
      title: 'Avg Order Value',
      value: '$52.89',
      change: '-2.5%',
      isPositive: false,
      icon: TrendingUp,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            {user ? `Welcome back, ${user.name}! Here's your sales overview.` : "Welcome back! Here's your sales overview."}
          </p>
          {user && (
            <p className="text-xs text-muted-foreground mt-1">
              Logged in as: {user.email} | Role: {user.role}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {['day', 'week', 'month'].map((range) => (
            <Button
              key={range}
              variant={dateRange === range ? 'default' : 'outline'}
              onClick={() => setDateRange(range)}
            >
              {range.charAt(0).toUpperCase() + range.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <Card key={idx}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className={`text-xs flex items-center gap-1 mt-1 ${stat.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                  {stat.isPositive ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                  {stat.change} from last period
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Sales Overview</CardTitle>
            <CardDescription>Your sales performance over the week</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={salesData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--color-border))" />
                <XAxis stroke="rgb(var(--color-muted-foreground))" />
                <YAxis stroke="rgb(var(--color-muted-foreground))" />
                <Tooltip contentStyle={{ backgroundColor: 'rgb(var(--color-card))', border: '1px solid rgb(var(--color-border))' }} />
                <Legend />
                <Line type="monotone" dataKey="sales" stroke="#3b82f6" strokeWidth={2} />
                <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sales by Category</CardTitle>
            <CardDescription>Distribution breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent Orders</CardTitle>
              <CardDescription>Latest 4 orders from your store</CardDescription>
            </div>
            <Button variant="outline" size="sm">View All</Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentOrders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">{order.id}</TableCell>
                  <TableCell>{order.customer}</TableCell>
                  <TableCell>{order.amount}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        order.status === 'Delivered'
                          ? 'default'
                          : order.status === 'Shipped'
                          ? 'secondary'
                          : order.status === 'Processing'
                          ? 'outline'
                          : 'destructive'
                      }
                    >
                      {order.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{order.date}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
