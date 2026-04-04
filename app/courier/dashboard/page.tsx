'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/context/auth-context';
import { DeliveryCard } from './DeliveryCard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Package, History, LogOut, User, Bell, LayoutDashboard, CheckCircle2, PackageCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Logo } from '@/components/ui/logo';

export default function CourierDashboard() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  
  const [deliveries, setDeliveries] = useState<any[]>([]);
  const [orderSequences, setOrderSequences] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('active');

  useEffect(() => {
    if (user) {
      fetchDeliveries();
      fetchOrderSequences();
    }
  }, [user]);

  const fetchOrderSequences = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const res = await fetch('/api/courier/order-numbers', {
        headers: session?.access_token ? {
          Authorization: `Bearer ${session.access_token}`
        } : {}
      });

      if (!res.ok) throw new Error('Failed to fetch global sequences');
      
      const payload = await res.json();
      setOrderSequences(payload.data || {});
    } catch (err) {
      console.error('[Courier] Failed to sync order sequences:', err);
    }
  };

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
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b shadow-sm">
        <div className="container mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Logo variant="square" width={48} height={48} priority />
            <div className="hidden sm:block">
              <h1 className="text-xl font-black tracking-tight leading-tight">NSD LOGISTICS</h1>
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-[0.2em]">Management Center</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="hidden md:flex flex-col items-end pr-4 border-r">
               <span className="text-sm font-bold text-foreground capitalize tracking-tight">{user.name || 'Courier'}</span>
               <div className="flex items-center gap-1.5 mt-0.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  <span className="text-[9px] text-muted-foreground font-black uppercase tracking-wider">Official Courier</span>
               </div>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleLogout} 
              title="Logout" 
              className="text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 rounded-full transition-colors"
            >
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="space-y-6 mb-10">
           <div>
             <h2 className="text-4xl font-black tracking-tighter text-foreground">
               Hey, {user.name?.split(' ')[0]} 👋
             </h2>
             <p className="text-muted-foreground mt-2 text-lg font-medium opacity-80">
               Ready for your next assignment?
             </p>
           </div>
           
           <div className="flex flex-wrap items-center gap-4">
              <div className="bg-background/50 border border-border/50 backdrop-blur-sm rounded-2xl p-4 flex items-center gap-4 shadow-sm hover:shadow-md transition-all group">
                 <div className="bg-cyan-500/10 p-3 rounded-xl group-hover:bg-cyan-500/20 transition-colors">
                    <Package className="w-5 h-5 text-cyan-400" />
                 </div>
                 <div>
                    <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest mb-0.5">Active Tasks</p>
                    <p className="text-2xl font-black tracking-tighter leading-none">{activeDeliveries.length}</p>
                 </div>
              </div>

              <div className="bg-background/50 border border-border/50 backdrop-blur-sm rounded-2xl p-4 flex items-center gap-4 shadow-sm hover:shadow-md transition-all group">
                 <div className="bg-emerald-500/10 p-3 rounded-xl group-hover:bg-emerald-500/20 transition-colors">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                 </div>
                 <div>
                    <p className="text-[10px] text-muted-foreground uppercase font-black tracking-widest mb-0.5">Completed</p>
                    <p className="text-2xl font-black tracking-tighter leading-none">{finishedDeliveries.length}</p>
                 </div>
              </div>
           </div>
        </div>

        <Tabs defaultValue="active" onValueChange={setActiveTab} className="space-y-8">
          <TabsList className="bg-muted/30 p-1.5 border backdrop-blur-sm rounded-full max-w-sm">
            <TabsTrigger 
              value="active" 
              className="rounded-full data-[state=active]:bg-cyan-400 data-[state=active]:text-black font-black uppercase text-[11px] tracking-widest py-2.5 px-6 transition-all"
            >
              <Package className="w-3.5 h-3.5 mr-2" />
              Active Orders
            </TabsTrigger>
            <TabsTrigger 
              value="history" 
              className="rounded-full data-[state=active]:bg-cyan-400 data-[state=active]:text-black font-black uppercase text-[11px] tracking-widest py-2.5 px-6 transition-all"
            >
              <History className="w-3.5 h-3.5 mr-2" />
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
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6 content-start">
                {activeDeliveries.map((delivery) => (
                  <DeliveryCard 
                    key={delivery.id} 
                    delivery={delivery} 
                    courierId={user.id} 
                    onUpdate={fetchDeliveries} 
                    orderNumber={orderSequences[delivery.order_id] || 0}
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
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6 content-start">
                {finishedDeliveries.map((delivery) => (
                  <DeliveryCard 
                    key={delivery.id} 
                    delivery={delivery} 
                    courierId={user.id} 
                    onUpdate={fetchDeliveries} 
                    orderNumber={orderSequences[delivery.order_id] || 0}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
      
      <footer className="container mx-auto px-4 py-12 text-center mt-auto border-t">
        <div className="flex flex-col items-center gap-6">
          <Logo variant="long" className="h-10 w-auto opacity-70 grayscale hover:grayscale-0 transition-all duration-500" width={180} />
          <div className="space-y-1">
            <p className="text-[10px] uppercase font-black tracking-widest text-muted-foreground/60">Never Stop Dreaming Logistics Division</p>
            <p className="text-[10px] text-muted-foreground/40 font-medium">© {new Date().getFullYear()} Protected Delivery Channel. All operations are logged.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
