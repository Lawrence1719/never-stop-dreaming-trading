'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Search, 
  Loader2, 
  ShoppingCart, 
  Package, 
  Users, 
  Tag, 
  Bell, 
  FileText, 
  HelpCircle, 
  Star, 
  Mail, 
  Layout, 
  Settings,
  ChevronRight,
  Clock,
  Command,
  X,
  Plus,
  Home,
  BarChart3,
  Gift
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import Link from 'next/link';

// Static admin pages
const ADMIN_PAGES = [
  { label: 'Dashboard', route: '/admin/dashboard', keywords: 'home main', entity: 'Admin' },
  { label: 'All Products', route: '/admin/products', keywords: 'items catalog', entity: 'Product' },
  { label: 'Categories', route: '/admin/products/categories', keywords: 'groups types tags', entity: 'Category' },
  { label: 'Inventory', route: '/admin/inventory', keywords: 'stock supply', entity: 'Admin' },
  { label: 'Reviews', route: '/admin/products/reviews', keywords: 'ratings comments', entity: 'Product' },
  { label: 'Orders', route: '/admin/orders', keywords: 'sales transactions', entity: 'Order' },
  { label: 'Customers', route: '/admin/customers', keywords: 'profiles users', entity: 'Customer' },
  { label: 'Customer Groups', route: '/admin/customer-groups', keywords: 'segments', entity: 'Customer' },
  { label: 'Notifications', route: '/admin/notifications', keywords: 'alerts messages', entity: 'Admin' },
  { label: 'Sales Reports', route: '/admin/reports/sales', keywords: 'analytics', entity: 'Report' },
  { label: 'Inventory Reports', route: '/admin/reports/inventory', keywords: 'stock analytics', entity: 'Report' },
  { label: 'Customer Reports', route: '/admin/reports/customers', keywords: 'user analytics', entity: 'Report' },
  { label: 'Banners', route: '/admin/marketing/banners', keywords: 'ads promotions', entity: 'Marketing' },
  { label: 'Newsletters', route: '/admin/marketing/newsletters', keywords: 'campaigns email', entity: 'Marketing' },
  { label: 'CMS Pages', route: '/admin/cms/pages', keywords: 'content', entity: 'CMS' },
  { label: 'CMS FAQs', route: '/admin/cms/faqs', keywords: 'questions help', entity: 'CMS' },
  { label: 'CMS Testimonials', route: '/admin/cms/testimonials', keywords: 'feedback', entity: 'CMS' },
  { label: 'Settings', route: '/admin/settings', keywords: 'configuration admin', entity: 'Admin' },
];

const QUICK_ACCESS_ITEMS = [
  { label: 'Dashboard', route: '/admin/dashboard', icon: Home },
  { label: 'Products', route: '/admin/products', icon: Package },
  { label: 'Orders', route: '/admin/orders', icon: ShoppingCart },
  { label: 'Customers', route: '/admin/customers', icon: Users },
  { label: 'Reports', route: '/admin/reports/sales', icon: BarChart3 },
  { label: 'Marketing', route: '/admin/marketing/banners', icon: Gift },
  { label: 'CMS', route: '/admin/cms/pages', icon: FileText },
  { label: 'Settings', route: '/admin/settings', icon: Settings },
];

interface SearchResultItem {
  id: string;
  title: string;
  subtitle?: string;
  route: string;
  entity: string;
  icon?: any;
}

interface SearchResultGroup {
  group: string;
  items: SearchResultItem[];
  viewAllRoute?: string;
}

export default function AdminSearchBar() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResultGroup[]>([]);
  const [recentQueries, setRecentQueries] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const searchResultsFlattened = results.flatMap(group => group.items);
  const quickAccessFlattened = QUICK_ACCESS_ITEMS.map((item, idx) => ({ 
    ...item, 
    id: `qa-${idx}`, 
    entity: 'Quick Access', 
    title: item.label,
    subtitle: item.route
  }));
  const recentQueriesFlattened = recentQueries.map((term, idx) => ({
    id: `rq-${idx}`,
    title: term,
    entity: 'Recent Search',
    route: '#', // Handled by onClick
    icon: Clock
  }));

  const preSearchItemsFlat = [...quickAccessFlattened, ...recentQueriesFlattened];
  const currentItems = query.length > 0 ? searchResultsFlattened : preSearchItemsFlat;

  // Load history from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('admin_recent_queries');
    if (saved) {
      try {
        setRecentQueries(JSON.parse(saved).slice(0, 5));
      } catch (e) {
        setRecentQueries([]);
      }
    }
  }, []);

  const saveQueryToHistory = (term: string) => {
    if (!term || term.length < 2) return;
    const updated = [term, ...recentQueries.filter(q => q !== term)].slice(0, 5);
    setRecentQueries(updated);
    localStorage.setItem('admin_recent_queries', JSON.stringify(updated));
  };

  const removeQueryFromHistory = (term: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const updated = recentQueries.filter(q => q !== term);
    setRecentQueries(updated);
    localStorage.setItem('admin_recent_queries', JSON.stringify(updated));
  };

  const handleShortcut = useCallback((e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      inputRef.current?.focus();
    }
  }, []);

  useEffect(() => {
    document.addEventListener('keydown', handleShortcut);
    return () => document.removeEventListener('keydown', handleShortcut);
  }, [handleShortcut]);

  const fetchResults = useCallback(async (searchTerm: string) => {
    if (searchTerm.length < 2) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      // 1. Static navigation search
      const navResults = ADMIN_PAGES.filter(page => 
        page.label.toLowerCase().includes(searchTerm.toLowerCase()) || 
        page.keywords.toLowerCase().includes(searchTerm.toLowerCase())
      ).slice(0, 3);
      
      const navGroup: SearchResultGroup = {
        group: 'Navigation',
        items: navResults.map(p => ({
          id: p.route,
          title: p.label,
          route: p.route,
          entity: p.entity,
          icon: ChevronRight
        }))
      };

      // 2. Multi-entity API
      const res = await fetch(`/api/admin/search?q=${encodeURIComponent(searchTerm)}`);
      const { data } = await res.json();

      const dbGroups: SearchResultGroup[] = [];
      if (data?.orders?.length) {
        dbGroups.push({ group: 'Orders', items: data.orders.slice(0, 3).map((o: any) => ({
          id: o.id, title: `#${o.id.split('-')[0].toUpperCase()} — ${o.profiles?.name || 'Guest'}`, subtitle: `₱${o.total} — ${o.status}`, route: `/admin/orders/${o.id}`, entity: 'Order', icon: ShoppingCart
        })), viewAllRoute: `/admin/orders?search=${searchTerm}` });
      }
      if (data?.products?.length) {
        dbGroups.push({ group: 'Products', items: data.products.slice(0, 3).map((p: any) => ({
          id: p.id, title: p.name, subtitle: p.category || 'Uncategorized', route: `/admin/products/${p.id}`, entity: 'Product', icon: Package
        })), viewAllRoute: `/admin/products?search=${searchTerm}` });
      }
      if (data?.customers?.length) {
        dbGroups.push({ group: 'Customers', items: data.customers.slice(0, 3).map((c: any) => ({
          id: c.id, title: c.name || 'Unknown', subtitle: c.email || '', route: `/admin/customers/${c.id}`, entity: 'Customer', icon: Users
        })), viewAllRoute: `/admin/customers?search=${searchTerm}` });
      }

      const final = [];
      if (navGroup.items.length) final.push(navGroup);
      final.push(...dbGroups);
      setResults(final);
    } catch (e) {
      console.error('Search error:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim()) fetchResults(query);
      else { setResults([]); setIsLoading(false); }
    }, 300);
    return () => clearTimeout(timer);
  }, [query, fetchResults]);

  useEffect(() => {
    const handleClickOff = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOff);
    return () => document.removeEventListener('mousedown', handleClickOff);
  }, []);

  const handleSelect = (item: any) => {
    if (item.entity === 'Recent Search') {
      setQuery(item.title);
      fetchResults(item.title);
      return;
    }

    if (query.length >= 2 && results.length > 0) {
      saveQueryToHistory(query);
    }

    router.push(item.route);
    setIsOpen(false);
    setQuery('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { setIsOpen(false); inputRef.current?.blur(); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIndex(prev => (prev < currentItems.length - 1 ? prev + 1 : prev)); return; }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIndex(prev => (prev > 0 ? prev - 1 : prev)); return; }
    if (e.key === 'Enter') {
      if (selectedIndex >= 0 && currentItems[selectedIndex]) { e.preventDefault(); handleSelect(currentItems[selectedIndex]); }
      else if (currentItems.length > 0) { e.preventDefault(); handleSelect(currentItems[0]); }
    }
  };

  const highlight = (text: string, term: string) => {
    if (!term.trim()) return text;
    const parts = text.split(new RegExp(`(${term})`, 'gi'));
    return parts.map((p, i) => p.toLowerCase() === term.toLowerCase() ? <span key={i} className="font-bold text-primary">{p}</span> : p );
  };

  return (
    <div ref={containerRef} className="relative flex-1 max-w-sm">
      <div className="relative group">
        <div className="relative h-10 flex items-center">
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setIsOpen(true); setSelectedIndex(-1); }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder="Search everything... (Ctrl+K)"
            className="bg-muted border-muted-foreground/20 pl-9 pr-12 transition-all focus:shadow-md focus:border-primary/50 text-sm"
          />
          <div className="absolute left-3 text-muted-foreground">
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : <Search className="h-4 w-4" />}
          </div>
          <div className="absolute right-3 hidden md:flex items-center gap-1 text-[10px] text-muted-foreground pointer-events-none border border-muted-foreground/20 px-1.5 py-0.5 rounded bg-muted/30">
            <Command className="h-2.5 w-2.5" />
            <span>K</span>
          </div>
        </div>

        {/* Results Dropdown */}
        {isOpen && (
          <div className="absolute top-full left-0 mt-2 w-[600px] max-w-[90vw] max-h-[500px] bg-card border border-border shadow-2xl rounded-xl z-[60] animate-in fade-in slide-in-from-top-2 duration-200 overflow-hidden flex flex-col">
            <div className="flex-1 overflow-y-auto p-2 min-h-0 custom-scrollbar">
              
              {/* Pre-search view */}
              {!query ? (
                <>
                  {/* Quick Access */}
                  <div className="mb-4">
                    <div className="px-3 py-2 text-[10px] uppercase font-bold text-muted-foreground tracking-widest border-b border-border/30 mb-2">
                      Quick Access
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                      {QUICK_ACCESS_ITEMS.map((item, idx) => {
                        const isSelected = selectedIndex === idx;
                        return (
                          <button
                            key={item.label}
                            onClick={() => handleSelect(item)}
                            onMouseEnter={() => setSelectedIndex(idx)}
                            className={cn(
                              "flex items-center justify-between gap-3 px-3 py-2 rounded-lg transition-all text-left",
                              isSelected ? "bg-primary text-primary-foreground shadow-sm" : "hover:bg-muted/80"
                            )}
                          >
                            <div className="flex items-center gap-3">
                              <div className={cn("h-7 w-7 rounded-md flex items-center justify-center shrink-0", isSelected ? "bg-white/20" : "bg-primary/5 text-primary")}>
                                <item.icon className="h-4 w-4" />
                              </div>
                              <span className="text-sm font-semibold">{item.label}</span>
                            </div>
                            <span className={cn("text-[9px] font-mono", isSelected ? "text-primary-foreground/50" : "text-muted-foreground/50")}>
                              {item.route}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Recent Searches */}
                  {recentQueries.length > 0 && (
                    <div className="mb-2">
                       <div className="px-3 py-2 text-[10px] uppercase font-bold text-muted-foreground tracking-widest border-b border-border/30 mb-2">
                        Recent Searches
                      </div>
                      <div className="space-y-0.5">
                        {recentQueries.map((term, idx) => {
                          const isSelected = selectedIndex === idx + QUICK_ACCESS_ITEMS.length;
                          return (
                            <div
                              key={term}
                              className={cn(
                                "group/recent flex items-center gap-3 px-3 py-2 rounded-lg transition-all cursor-pointer relative",
                                isSelected ? "bg-muted/80 text-foreground" : "hover:bg-muted/50"
                              )}
                              onMouseEnter={() => setSelectedIndex(idx + QUICK_ACCESS_ITEMS.length)}
                              onClick={() => handleSelect({ title: term, entity: 'Recent Search' })}
                            >
                              <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                              <span className="text-sm font-medium flex-1 truncate">{term}</span>
                              <button
                                onClick={(e) => removeQueryFromHistory(term, e)}
                                className="h-6 w-6 rounded-md hover:bg-destructive/10 hover:text-destructive flex items-center justify-center opacity-0 group-hover/recent:opacity-100 transition-opacity"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                /* Live Results view */
                <>
                  {isLoading ? (
                    <div className="p-12 text-center space-y-3">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                      <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-[0.2em]">Analyzing everything...</p>
                    </div>
                  ) : results.length > 0 ? (
                    results.map((group) => (
                      <div key={group.group} className="mb-4 last:mb-0">
                        <div className="px-3 py-2 text-[10px] uppercase font-bold text-muted-foreground flex items-center justify-between border-b border-border/30 mb-2">
                          <span className="tracking-widest">{group.group}</span>
                          {group.viewAllRoute && (
                            <Link
                              href={group.viewAllRoute}
                              className="text-[10px] text-primary hover:underline font-bold flex items-center gap-0.5 lowercase"
                              onClick={() => setIsOpen(false)}
                            >
                              View all results <ChevronRight className="h-2.5 w-2.5" />
                            </Link>
                          )}
                        </div>
                        <div className="space-y-0.5 px-1">
                          {group.items.map((item) => {
                            const globalIdx = searchResultsFlattened.findIndex(fi => fi.id === item.id);
                            const isSelected = selectedIndex === globalIdx;
                            const Icon = item.icon || Layout;
                            return (
                              <button
                                key={item.id}
                                onClick={() => handleSelect(item)}
                                onMouseEnter={() => setSelectedIndex(globalIdx)}
                                className={cn(
                                  "w-full text-left flex items-center gap-4 px-3 py-2 rounded-lg transition-all",
                                  isSelected ? "bg-primary text-primary-foreground shadow-lg" : "hover:bg-muted"
                                )}
                              >
                                <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center shrink-0 shadow-sm", isSelected ? "bg-white/20" : "bg-primary/10 text-primary")}>
                                  <Icon className="h-5 w-5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-bold truncate leading-tight mb-1">{highlight(item.title, query)}</p>
                                  {item.subtitle && (
                                    <p className={cn("text-[10px] truncate opacity-70 font-medium", isSelected ? "text-white" : "text-muted-foreground")}>
                                      {item.subtitle}
                                    </p>
                                  )}
                                </div>
                                <Badge variant="outline" className={cn("text-[8px] uppercase tracking-tighter h-4 px-1.5 font-black", isSelected ? "border-white/40 text-white" : "bg-muted text-muted-foreground border-none")}>
                                  {item.entity}
                                </Badge>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-12 text-center space-y-3">
                      <div className="h-12 w-12 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-2">
                        <Search className="h-6 w-6 text-muted-foreground/30" />
                      </div>
                      <p className="text-sm font-semibold text-muted-foreground">No matches found for "{query}"</p>
                      <p className="text-xs text-muted-foreground opacity-60">Check for typos or try a broader term.</p>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Sticky Footer */}
            <div className="sticky bottom-0 bg-card border-t border-border/80 px-4 py-2.5 flex items-center justify-between text-[10px] text-muted-foreground font-medium select-none z-10">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5"><kbd className="bg-muted px-1.5 py-0.5 rounded border border-border/50 text-[9px] tracking-widest text-foreground font-bold">↑↓</kbd> to navigate</span>
                <span className="flex items-center gap-1.5"><kbd className="bg-muted px-1.5 py-0.5 rounded border border-border/50 text-[9px] tracking-widest text-foreground font-bold">↵</kbd> to select</span>
              </div>
              <span className="flex items-center gap-1.5">
                <kbd className="bg-muted px-1.5 py-0.5 rounded border border-border/50 text-[9px] tracking-widest text-foreground font-bold">ESC</kbd> to close
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
