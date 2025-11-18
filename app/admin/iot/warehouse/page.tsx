'use client';

import { Gauge, Droplets, AlertCircle, Wifi } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const temperatureData = [
  { time: '00:00', temp: 22 },
  { time: '04:00', temp: 20 },
  { time: '08:00', temp: 21 },
  { time: '12:00', temp: 24 },
  { time: '16:00', temp: 26 },
  { time: '20:00', temp: 23 },
];

const devices = [
  { id: 'TEMP-01', name: 'Temperature Sensor', location: 'Zone A', status: 'online', battery: 95 },
  { id: 'HUM-01', name: 'Humidity Sensor', location: 'Zone B', status: 'online', battery: 87 },
  { id: 'RFID-01', name: 'RFID Reader', location: 'Gate 1', status: 'online', battery: 100 },
  { id: 'GPS-01', name: 'GPS Tracker', location: 'Delivery 1', status: 'offline', battery: 45 },
];

export default function WarehousePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Warehouse Monitoring</h1>
        <p className="text-muted-foreground mt-1">Real-time warehouse environmental monitoring</p>
      </div>

      {/* Environmental Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Temperature</CardTitle>
            <Gauge className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">23.5°C</div>
            <p className="text-xs text-muted-foreground mt-1">Normal range</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Humidity</CardTitle>
            <Droplets className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">45%</div>
            <p className="text-xs text-muted-foreground mt-1">Normal range</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alerts</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2</div>
            <p className="text-xs text-muted-foreground mt-1">Requires attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Temperature Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Temperature Trend (24 Hours)</CardTitle>
          <CardDescription>Temperature readings over the last 24 hours</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={temperatureData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--color-border))" />
              <XAxis stroke="rgb(var(--color-muted-foreground))" />
              <YAxis stroke="rgb(var(--color-muted-foreground))" />
              <Tooltip contentStyle={{ backgroundColor: 'rgb(var(--color-card))', border: '1px solid rgb(var(--color-border))' }} />
              <Legend />
              <Line type="monotone" dataKey="temp" stroke="#3b82f6" strokeWidth={2} name="Temperature (°C)" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Devices */}
      <Card>
        <CardHeader>
          <CardTitle>Connected Devices</CardTitle>
          <CardDescription>IoT devices connected to the warehouse</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {devices.map((device) => (
              <div key={device.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">{device.name}</p>
                  <p className="text-sm text-muted-foreground">{device.id} • {device.location}</p>
                </div>
                <div className="flex items-center gap-4">
                  <Badge variant={device.status === 'online' ? 'default' : 'destructive'}>
                    {device.status}
                  </Badge>
                  <p className="text-sm font-medium">Battery: {device.battery}%</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
