"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase/client";
import {
  Cog6ToothIcon,
  XMarkIcon,
  CircleStackIcon,
} from "@heroicons/react/24/solid";

// ================= TYPES =================
type InventoryState = { quantity: number; weight: number };
type ConfigState = { product_name: string; unit_weight: number };

const OFFLINE_THRESHOLD_SECONDS = 8;

// ================= COMPONENT =================
export default function Dashboard() {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [liveStock, setLiveStock] = useState<InventoryState>({
    quantity: 0,
    weight: 0,
  });

  const [config, setConfig] = useState<ConfigState>({
    product_name: "",
    unit_weight: 0,
  });

  const [editName, setEditName] = useState("");
  const [editWeight, setEditWeight] = useState(0);

  const [isOnline, setIsOnline] = useState(false);
  const lastSeenRef = useRef<Date | null>(null);
  const [lastSeen, setLastSeen] = useState<Date | null>(null);

  // ================= STALE CHECK =================
  useEffect(() => {
    const interval = setInterval(() => {
      if (!lastSeenRef.current) { setIsOnline(false); return; }
      const secondsAgo = (Date.now() - lastSeenRef.current.getTime()) / 1000;
      if (secondsAgo > OFFLINE_THRESHOLD_SECONDS) setIsOnline(false);
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  // ================= INITIAL LOAD =================
  useEffect(() => {
    loadSettings();
    fetchDeviceStatus();
  }, []);

  // ================= REALTIME: DEVICE STATUS =================
  useEffect(() => {
    const channel = supabase
      .channel("device-status-realtime")
      .on("postgres_changes",
        { event: "*", schema: "public", table: "device_status" },
        (payload: any) => {
          if (payload.new) {
            const newDate = new Date(payload.new.last_seen);
            lastSeenRef.current = newDate;
            setLastSeen(newDate);
            setIsOnline(payload.new.is_online ?? false);
          }
        }
      ).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // ================= REALTIME: INVENTORY =================
  useEffect(() => {
    if (!config.product_name) return;

    const channel = supabase
      .channel("inventory-realtime")
      .on("postgres_changes",
        { event: "*", schema: "public", table: "inventory" },
        (payload: any) => {
          if (payload.new && payload.new.item_name === config.product_name) {
            setLiveStock({
              quantity: payload.new.quantity ?? 0,
              weight: payload.new.weight ?? 0,
            });
          }
        }
      ).subscribe();

    const interval = setInterval(() => fetchInventory(config.product_name), 3000);
    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [config.product_name]);

  // ================= DATA FUNCTIONS =================
  async function loadSettings() {
    const { data, error } = await supabase
      .from("device_settings").select("*").eq("id", 1).maybeSingle();
    if (!error && data) {
      setConfig(data);
      setEditName(data.product_name);
      setEditWeight(data.unit_weight);
      fetchInventory(data.product_name);
    }
  }

  async function fetchDeviceStatus() {
    const { data } = await supabase
      .from("device_status").select("is_online, last_seen").eq("id", 1).maybeSingle();
    if (data) {
      const newDate = data.last_seen ? new Date(data.last_seen) : null;
      lastSeenRef.current = newDate;
      setLastSeen(newDate);
      setIsOnline(data.is_online ?? false);
    }
  }

  async function fetchInventory(name: string) {
    if (!name) return;
    const { data } = await supabase
      .from("inventory").select("quantity, weight").eq("item_name", name).maybeSingle();
    if (data) {
      setLiveStock({ quantity: data.quantity ?? 0, weight: data.weight ?? 0 });
    }
  }

  // ================= FORMAT TIMESTAMP =================
  function formatTime(ts: string) {
    const date = new Date(ts);
    return date.toLocaleString("en-PH", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  }

  // ================= SAVE SETTINGS =================
  const handleSave = async () => {
    setLoading(true);
    const { error } = await supabase
      .from("device_settings")
      .update({ product_name: editName, unit_weight: editWeight })
      .eq("id", 1);

    if (!error) {
      await supabase.from("inventory").upsert(
        { item_name: editName, quantity: 0, weight: 0 },
        { onConflict: "item_name" }
      );
      setConfig({ product_name: editName, unit_weight: editWeight });
      setIsSettingsOpen(false);
    } else {
      alert("Save failed: " + error.message);
    }
    setLoading(false);
  };

// ================= UI =================
return (
  <div className="bg-background min-h-screen text-foreground p-6">

    {/* ── TOP BAR ── */}
    <div className="flex items-center justify-between mb-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-xl font-black tracking-tight">NSD SmartWeigh</h1>
        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-0.5">
          Automatic Inventory System
        </p>
      </div>

      {/* ✅ Online indicator — top, outside cards */}
      <div className="flex items-center gap-2 bg-card border border-border rounded-2xl px-4 py-2.5 shadow-sm">
        <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 transition-colors duration-500 ${isOnline
            ? "bg-green-500 shadow-[0_0_8px_2px_rgba(34,197,94,0.5)] animate-pulse"
            : "bg-muted-foreground"
          }`} />
        <div className="flex flex-col">
          <span className={`text-[10px] font-black uppercase tracking-widest leading-none ${isOnline ? "text-green-500" : "text-muted-foreground"
            }`}>
            {isOnline ? "Device Online" : "Device Offline"}
          </span>
          {lastSeen && (
            <span className="text-[9px] text-muted-foreground mt-0.5 leading-none">
              Last seen {formatTime(lastSeen.toISOString())}
            </span>
          )}
        </div>
      </div>
    </div>

    {/* ── MAIN LAYOUT ── */}
    <div className="flex flex-col gap-6 max-w-6xl mx-auto">

      {/* ── INVENTORY CARDS ROW — side by side ── */}
      <div className="flex gap-6">

        {/* ── SLOT #1 — ACTIVE ── */}
        <div className="flex-1 bg-card text-card-foreground border border-border rounded-[2.5rem] shadow-2xl overflow-hidden shadow-black/5 dark:shadow-black/50">
          <div className="p-5 border-b border-border flex justify-between items-center">
            <div className="flex items-center gap-2 text-muted-foreground">
              <CircleStackIcon className="h-4 w-4" />
              <span className="text-[10px] font-bold uppercase tracking-widest">
                Inventory Slot #1
              </span>
            </div>
            <button
              onClick={() => setIsSettingsOpen(!isSettingsOpen)}
              className="p-2 hover:bg-accent hover:text-accent-foreground transition-colors rounded-full"
            >
              {isSettingsOpen
                ? <XMarkIcon className="h-6 w-6" />
                : <Cog6ToothIcon className="h-6 w-6 text-muted-foreground" />
              }
            </button>
          </div>

          <div className="p-10">
            {!isSettingsOpen ? (
              <div className="text-center animate-in fade-in zoom-in duration-300">
                <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest mb-2">
                  Currently Storing
                </p>
                <h2 className="text-2xl font-black mb-8 truncate tracking-wide">
                  {config.product_name || "—"}
                </h2>
                <div className="relative inline-block mb-8">
                  <span className="text-9xl font-black tabular-nums tracking-tighter">
                    {liveStock.quantity}
                  </span>
                  <span className="absolute -right-8 bottom-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                    pcs
                  </span>
                </div>
                <div className="bg-muted/50 rounded-2xl p-4 border border-border mt-4 shadow-inner">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground font-medium">Total Weight</span>
                    <span className="text-primary font-mono font-bold text-lg tracking-wider">
                      {liveStock.weight.toFixed(1)}g
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">
                    Product Name
                  </label>
                  <input
                    className="w-full mt-1 p-4 bg-background border border-input text-foreground rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-1">
                    Weight Per Unit (g)
                  </label>
                  <input
                    type="number"
                    className="w-full mt-1 p-4 bg-background border border-input text-foreground rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-mono"
                    value={editWeight}
                    onChange={(e) => setEditWeight(Number(e.target.value))}
                  />
                </div>
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-black tracking-widest py-4 rounded-2xl transition-all shadow-lg active:scale-95 disabled:opacity-50"
                >
                  {loading ? "SAVING..." : "UPDATE SLOT"}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── SLOT #2 — STATIC / COMING SOON ── */}
        <div className="flex-1 relative bg-card text-card-foreground border border-border rounded-[2.5rem] overflow-hidden shadow-black/5 dark:shadow-black/50 opacity-50 pointer-events-none select-none">

          {/* Disabled overlay */}
          <div className="absolute inset-0 z-10 flex items-center justify-center">
            <div className="bg-card/90 backdrop-blur-sm border border-border rounded-2xl px-5 py-3 shadow-lg">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Coming Soon
              </p>
            </div>
          </div>

          <div className="p-5 border-b border-border flex justify-between items-center">
            <div className="flex items-center gap-2 text-muted-foreground">
              <CircleStackIcon className="h-4 w-4" />
              <span className="text-[10px] font-bold uppercase tracking-widest">
                Inventory Slot #2
              </span>
            </div>
            <Cog6ToothIcon className="h-6 w-6 text-muted-foreground m-2" />
          </div>

          <div className="p-10 text-center">
            <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest mb-2">
              Currently Storing
            </p>
            <h2 className="text-2xl font-black mb-8 tracking-wide">—</h2>
            <div className="relative inline-block mb-8">
              <span className="text-9xl font-black tabular-nums tracking-tighter">0</span>
              <span className="absolute -right-8 bottom-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                pcs
              </span>
            </div>
            <div className="bg-muted/50 rounded-2xl p-4 border border-border mt-4 shadow-inner">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground font-medium">Total Weight</span>
                <span className="text-primary font-mono font-bold text-lg tracking-wider">0.0g</span>
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>

    {/* ── FOOTER ── */}
    <p className="text-center text-muted-foreground text-[10px] mt-8 font-bold uppercase tracking-widest">
      NSD SmartWeigh · Capstone Project 2026
    </p>

  </div>
);
}