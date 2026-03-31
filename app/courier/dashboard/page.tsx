'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/context/auth-context';
import { DeliveryCard } from './DeliveryCard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Package, History, LogOut, User, Bell, LayoutDashboard } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function CourierDashboard() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('active');

  useEffect(() => {
    if (user) {
      fetchDeliveries();
    }
  }, [user]);

  const fetchDeliveries = async () => {
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('courier_deliveries')
        .select(`
          *,
          order:orders(
            id,
            total,
            items,
            shipping_address:addresses!shipping_address_id(*)
          )
        `)
        .eq('courier_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDeliveries(data || []);
    } catch (err) {
      console.error('Failed to fetch deliveries:', err);
      toast({ title: 'Error', description: 'Failed to load deliveries', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const activeDeliveries = deliveries.filter(d => d.status !== 'delivered' && d.status !== 'failed');
  const finishedDeliveries = deliveries.filter(d => d.status === 'delivered' || d.status === 'failed');

  if (!user) return null;

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background border-b shadow-sm">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-primary p-2 rounded-lg">
              <LayoutDashboard className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold">Courier Dashboard</h1>
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-tighter">Logistics Center</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="hidden md:flex flex-col items-end mr-2">
               <span className="text-sm font-semibold">{user.name || 'Courier'}</span>
               <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full uppercase">Official Courier</span>
            </div>
            <Button variant="ghost" size="icon" onClick={handleLogout} title="Logout" className="text-destructive hover:text-destructive hover:bg-destructive/10">
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
           <div>
             <h2 className="text-3xl font-extrabold tracking-tight">Welcome back, {user.name?.split(' ')[0]}</h2>
             <p className="text-muted-foreground mt-1 text-sm font-medium">You have <span className="text-primary font-bold">{activeDeliveries.length} active</span> deliveries assigned to you.</p>
           </div>
           
           <div className="flex items-center gap-3">
              <div className="bg-background border rounded-lg p-3 flex items-center gap-3 shadow-sm">
                 <div className="bg-green-100 p-2 rounded-full">
                    <History className="w-4 h-4 text-green-600" />
                 </div>
                 <div className="pr-2">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold">Finished</p>
                    <p className="text-lg font-bold leading-none">{finishedDeliveries.length}</p>
                 </div>
              </div>
              <div className="bg-background border rounded-lg p-3 flex items-center gap-3 shadow-sm">
                 <div className="bg-blue-100 p-2 rounded-full">
                    <Package className="w-4 h-4 text-blue-600" />
                 </div>
                 <div className="pr-2">
                    <p className="text-[10px] text-muted-foreground uppercase font-bold">Active</p>
                    <p className="text-lg font-bold leading-none">{activeDeliveries.length}</p>
                 </div>
              </div>
           </div>
        </div>

        <Tabs defaultValue="active" onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-muted/50 p-1 border grid grid-cols-2 max-w-md mx-auto md:mx-0">
            <TabsTrigger value="active" className="data-[state=active]:bg-background data-[state=active]:shadow-sm py-2">
              <Package className="w-4 h-4 mr-2" />
              Active
            </TabsTrigger>
            <TabsTrigger value="history" className="data-[state=active]:bg-background data-[state=active]:shadow-sm py-2">
              <History className="w-4 h-4 mr-2" />
              History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-6 animate-in fade-in-50 duration-500">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 bg-background/50 border rounded-xl border-dashed">
                <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground font-medium">Updating delivery schedule...</p>
              </div>
            ) : activeDeliveries.length === 0 ? (
              <Card className="border-dashed bg-background/50 py-20">
                <CardContent className="flex flex-col items-center justify-center text-center">
                  <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                    <Package className="w-8 h-8 text-muted-foreground/50" />
                  </div>
                  <h3 className="text-xl font-bold">All caught up!</h3>
                  <p className="text-muted-foreground max-w-xs mt-2">No active deliveries assigned to you at the moment. New assignments will appear here.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {activeDeliveries.map((delivery) => (
                  <DeliveryCard 
                    key={delivery.id} 
                    delivery={delivery} 
                    courierId={user.id} 
                    onUpdate={fetchDeliveries} 
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-6 animate-in fade-in-50 duration-500">
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : finishedDeliveries.length === 0 ? (
              <Card className="border-dashed bg-background/50 py-20 text-center">
                <CardContent>
                  <History className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold">No finished deliveries</h3>
                  <p className="text-muted-foreground text-sm mt-1">Your completed delivery history will appear here.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {finishedDeliveries.map((delivery) => (
                  <DeliveryCard 
                    key={delivery.id} 
                    delivery={delivery} 
                    courierId={user.id} 
                    onUpdate={fetchDeliveries} 
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
      
      <footer className="container mx-auto px-4 py-8 text-center text-xs text-muted-foreground mt-auto border-t">
         &copy; {new Date().getFullYear()} Never Stop Dreaming Logistics Division. All deliveries tracked.
      </footer>
    </div>
  );
}
