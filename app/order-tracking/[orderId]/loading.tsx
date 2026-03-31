export default function OrderTrackingLoading() {
  return (
    <div className="flex flex-col min-h-screen">
      <div className="h-16 bg-slate-200 dark:bg-slate-700 border-b border-border animate-pulse" />
      
      <main className="flex-1">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="h-8 w-16 bg-slate-200 dark:bg-slate-700 rounded animate-pulse mb-8" />
          
          <div className="h-10 w-64 bg-slate-200 dark:bg-slate-700 rounded animate-pulse mb-8" />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main content skeleton */}
            <div className="lg:col-span-2">
              <div className="bg-card border border-border rounded-lg p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <div className="h-4 w-24 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                    <div className="h-8 w-32 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                  </div>
                  <div className="w-12 h-12 bg-slate-200 dark:bg-slate-700 rounded-full animate-pulse" />
                </div>
                
                <div className="space-y-6">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="w-4 h-4 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse" />
                        {i < 3 && <div className="w-0.5 h-12 bg-border mt-2" />}
                      </div>
                      <div className="flex-1 space-y-2">
                        <div className="h-5 w-32 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                        <div className="h-4 w-48 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                        <div className="h-4 w-40 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                        <div className="h-4 w-64 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Sidebar skeleton */}
            <div className="lg:col-span-1">
              <div className="bg-card border border-border rounded-lg p-6 space-y-6">
                <div className="space-y-2">
                  <div className="h-3 w-32 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                  <div className="h-6 w-40 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                </div>
                
                <div className="space-y-2">
                  <div className="h-3 w-28 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                  <div className="h-5 w-36 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                </div>
                
                <div className="border-t border-border pt-6 space-y-4">
                  <div className="h-3 w-32 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="h-4 w-full bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                  ))}
                </div>
                
                <div className="h-10 w-full bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      </main>

      <div className="h-64 bg-slate-200 dark:bg-slate-700 border-t border-border animate-pulse" />
    </div>
  );
}
