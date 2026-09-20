import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import {
  Receipt,
  Package,
  Building2,
  Store,
  History,
  TrendingUp,
  CreditCard,
  Clock,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  CheckCircle2,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  BarChart2,
  Filter,
  ArrowUpDown,
  Award,
  Plus,
  Zap,
  Sparkles,
  Activity,
  Check,
} from 'lucide-react';
import { formatCurrency, formatDate } from '../lib/utils';
import { animateStaggerEntrance, animateTactilePress } from '../lib/animations';
import { CountUp } from '../components/dashboard/CountUp';

// Helper to reliably parse date from bill objects
function getBillDate(bill) {
  if (bill.dateRaw) {
    const d = new Date(bill.dateRaw);
    if (!isNaN(d.getTime())) return d;
  }
  if (bill.createdAt) {
    const d = new Date(bill.createdAt);
    if (!isNaN(d.getTime())) return d;
  }
  if (bill.date) {
    const d = new Date(bill.date);
    if (!isNaN(d.getTime())) return d;
  }
  return new Date();
}

export function Dashboard() {
  const {
    activePage,
    settings = {},
    bills = [],
    products = [],
    companies = [],
    shops = [],
    setActivePage,
    setGeneratedBill,
    dailyDraft,
    dailyDraftItems = [],
    dailyDraftCount = 0,
    dailyDraftTotal = 0,
    dailyDraftShop,
    createDeliveryBill,
    getShopOutstandingBalance,
    clearDailyDraft,
  } = useApp();

  const metricsRef = useRef(null);
  const topCardsRef = useRef(null);
  const bottomCardsRef = useRef(null);

  // Timeframe switch for Sales Revenue: 'daily' | 'weekly' | 'monthly'
  const [revenuePeriod, setRevenuePeriod] = useState('daily');
  const [hoveredBarIndex, setHoveredBarIndex] = useState(null);

  // Active top product index for spotlight card switcher
  const [activeProductIndex, setActiveProductIndex] = useState(0);

  // Time & Greeting calculations
  const now = new Date();
  const dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'long' });
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';

  // Today's Date representation
  const todayStr = formatDate(now);
  const todayIsoDate = now.toISOString().slice(0, 10);
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  // 1. Filter Today's Bills
  const todayBills = useMemo(() => {
    return bills.filter((b) => {
      const bDateStr = (b.dateRaw || b.createdAt || '').slice(0, 10);
      if (bDateStr) return bDateStr === todayIsoDate;
      return b.date === todayStr;
    });
  }, [bills, todayIsoDate, todayStr]);

  // Today's metrics
  const todayRevenue = useMemo(() => {
    return todayBills.reduce((sum, b) => sum + (Number(b.finalAmount) || Number(b.totalAmount) || 0), 0);
  }, [todayBills]);

  const todayShopsCount = useMemo(() => {
    const shopSet = new Set();
    todayBills.forEach((b) => {
      if (b.shopId) shopSet.add(b.shopId);
      else if (b.customerName) shopSet.add(b.customerName);
    });
    return shopSet.size;
  }, [todayBills]);

  // Delivery Fulfillment rate for Arch Gauge
  const fulfillmentRate = useMemo(() => {
    if (shops.length === 0) return todayBills.length > 0 ? 100 : 0;
    return Math.min(100, Math.round((todayShopsCount / shops.length) * 100));
  }, [todayShopsCount, shops.length, todayBills.length]);

  // 2. Weekly Revenue
  const weeklyRevenue = useMemo(() => {
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const weekBills = bills.filter((b) => {
      const bDate = getBillDate(b);
      return bDate >= sevenDaysAgo && bDate <= now;
    });
    return weekBills.reduce((sum, b) => sum + (Number(b.finalAmount) || Number(b.totalAmount) || 0), 0);
  }, [bills, now]);

  // 3. Monthly Revenue
  const monthlyRevenue = useMemo(() => {
    const monthBills = bills.filter((b) => {
      const bDate = getBillDate(b);
      return bDate.getFullYear() === currentYear && bDate.getMonth() === currentMonth;
    });
    return monthBills.reduce((sum, b) => sum + (Number(b.finalAmount) || Number(b.totalAmount) || 0), 0);
  }, [bills, currentYear, currentMonth]);

  // 4. Daily Sales Chart Data (Last 7 Days)
  const dailyData = useMemo(() => {
    const res = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const iso = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString('en-GB', { weekday: 'short' });
      const fullDate = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });

      const dayBills = bills.filter((b) => {
        const bStr = (b.dateRaw || b.createdAt || '').slice(0, 10);
        return bStr === iso;
      });

      let deliveryTotal = 0;
      let counterTotal = 0;
      dayBills.forEach((b) => {
        const amt = Number(b.finalAmount) || Number(b.totalAmount) || 0;
        if (b.shopId && b.shopId !== 'walkin') {
          deliveryTotal += amt;
        } else {
          counterTotal += amt;
        }
      });

      const total = deliveryTotal + counterTotal;
      res.push({
        dateStr: iso,
        label,
        fullDate,
        value: Math.round(total * 100) / 100,
        delivery: Math.round(deliveryTotal * 100) / 100,
        counter: Math.round(counterTotal * 100) / 100,
        count: dayBills.length,
      });
    }
    return res;
  }, [bills, now]);

  // 5. Weekly Sales Chart Data (Last 4 Weeks)
  const weeklyData = useMemo(() => {
    const res = [];
    for (let i = 3; i >= 0; i--) {
      const start = new Date(now);
      start.setDate(now.getDate() - (i * 7 + 6));
      start.setHours(0, 0, 0, 0);

      const end = new Date(now);
      end.setDate(now.getDate() - i * 7);
      end.setHours(23, 59, 59, 999);

      const weekNum = Math.ceil((((start - new Date(start.getFullYear(), 0, 1)) / 86400000) + 1) / 7);
      const label = `Wk ${weekNum}`;
      const fullDate = `${start.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} - ${end.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`;

      const wBills = bills.filter((b) => {
        const bDate = getBillDate(b);
        return bDate >= start && bDate <= end;
      });

      let deliveryTotal = 0;
      let counterTotal = 0;
      wBills.forEach((b) => {
        const amt = Number(b.finalAmount) || Number(b.totalAmount) || 0;
        if (b.shopId && b.shopId !== 'walkin') {
          deliveryTotal += amt;
        } else {
          counterTotal += amt;
        }
      });

      const total = deliveryTotal + counterTotal;
      res.push({
        label,
        fullDate,
        value: Math.round(total * 100) / 100,
        delivery: Math.round(deliveryTotal * 100) / 100,
        counter: Math.round(counterTotal * 100) / 100,
        count: wBills.length,
      });
    }
    return res;
  }, [bills, now]);

  // 6. Monthly Sales Chart Data (12 Months)
  const monthlyData = useMemo(() => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return monthNames.map((name, index) => {
      const mBills = bills.filter((b) => {
        const bDate = getBillDate(b);
        return bDate.getFullYear() === currentYear && bDate.getMonth() === index;
      });

      let deliveryTotal = 0;
      let counterTotal = 0;
      mBills.forEach((b) => {
        const amt = Number(b.finalAmount) || Number(b.totalAmount) || 0;
        if (b.shopId && b.shopId !== 'walkin') {
          deliveryTotal += amt;
        } else {
          counterTotal += amt;
        }
      });

      const total = deliveryTotal + counterTotal;
      return {
        label: name,
        fullDate: `${name} ${currentYear}`,
        value: Math.round(total * 100) / 100,
        delivery: Math.round(deliveryTotal * 100) / 100,
        counter: Math.round(counterTotal * 100) / 100,
        count: mBills.length,
      };
    });
  }, [bills, currentYear]);

  // Active dataset based on selected period
  const currentChartData = useMemo(() => {
    if (revenuePeriod === 'weekly') return weeklyData;
    if (revenuePeriod === 'monthly') return monthlyData;
    return dailyData;
  }, [revenuePeriod, dailyData, weeklyData, monthlyData]);

  const maxChartValue = useMemo(() => {
    const maxVal = Math.max(...currentChartData.map((d) => d.value), 0);
    return maxVal === 0 ? 100 : Math.ceil(maxVal * 1.25 / 10) * 10;
  }, [currentChartData]);

  // 7. Top Products list & stats
  const topProductsList = useMemo(() => {
    const stats = {};

    bills.forEach((b) => {
      (b.items || []).forEach((it) => {
        const pId = it.productId || it.name;
        if (!stats[pId]) {
          stats[pId] = {
            id: pId,
            name: it.name || 'Milk Variety',
            unit: it.unit || 'Packet',
            price: Number(it.price || it.rate) || 0,
            salesQty: 0,
            earnings: 0,
            brandId: it.brandId,
          };
        }
        const q = Number(it.quantity) || 0;
        const p = Number(it.price || it.rate) || 0;
        stats[pId].salesQty += q;
        stats[pId].earnings += q * p;
      });
    });

    // Merge in catalog products if they haven't been sold yet
    products.forEach((p) => {
      if (!stats[p.id]) {
        stats[p.id] = {
          id: p.id,
          name: p.name,
          unit: p.unit || 'Packet',
          price: Number(p.rate) || 0,
          salesQty: 0,
          earnings: 0,
          brandId: p.companyId,
        };
      }
    });

    const arr = Object.values(stats);
    arr.sort((a, b) => b.salesQty - a.salesQty || b.earnings - a.earnings);
    return arr.length > 0 ? arr : [{ id: 'p0', name: 'Aavin Blue 500ml', unit: 'Packet', price: 20, salesQty: 0, earnings: 0 }];
  }, [bills, products]);

  const currentTopProduct = topProductsList[activeProductIndex % topProductsList.length] || topProductsList[0];

  const handleNextProduct = (e) => {
    if (e) animateTactilePress(e);
    setActiveProductIndex((prev) => (prev + 1) % topProductsList.length);
  };

  const handlePrevProduct = (e) => {
    if (e) animateTactilePress(e);
    setActiveProductIndex((prev) => (prev - 1 + topProductsList.length) % topProductsList.length);
  };

  const recentBills = bills.slice(0, 4);

  // Stagger entrance on load
  useEffect(() => {
    if (activePage === 'dashboard' || !activePage) {
      if (topCardsRef.current) {
        animateStaggerEntrance(topCardsRef.current.children, { y: 12, duration: 0.35, stagger: 0.04 });
      }
      if (metricsRef.current) {
        animateStaggerEntrance(metricsRef.current.children, { y: 12, duration: 0.35, stagger: 0.03, delay: 0.05 });
      }
    }
  }, [activePage, bills.length]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-24 md:pb-12 animate-page-entrance">
      {/* 1. Header & Agency Identity Bar */}
      <div className="bg-white dark:bg-[#111A18] rounded-3xl p-4 sm:p-6 border border-[#E2E8F0] dark:border-[#1E2E2A] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 p-1 flex items-center justify-center shrink-0 shadow-2xs">
            {settings.logo ? (
              <img src={settings.logo} alt="Agency" className="w-full h-full object-contain rounded-xl" />
            ) : (
              <div className="w-full h-full bg-emerald-700 rounded-xl flex items-center justify-center text-white font-display font-black text-base">
                GV
              </div>
            )}
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-display font-black text-[#1E293B] dark:text-[#F8FAFC] tracking-tight">
              Dashboard
            </h1>
            <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-0.5 font-medium">
              {settings.businessName || 'G.V. MILK AGENCY'} • {greeting}
            </p>
          </div>
        </div>

        {/* Action Toolbar & Day pill */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="bg-[#F8FAFC] dark:bg-[#0A1110] border border-[#E2E8F0] dark:border-[#1E2E2A] rounded-2xl px-4 py-2 text-center shadow-2xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#64748B] dark:text-[#94A3B8] block">
              TODAY
            </span>
            <span className="text-xs sm:text-sm font-display font-bold text-[#1E293B] dark:text-[#F8FAFC] leading-none">
              {dayOfWeek}
            </span>
          </div>

          <button
            type="button"
            onClick={(e) => {
              animateTactilePress(e);
              setActivePage('billing');
            }}
            className="btn-primary-action px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4 text-white" />
            <span>Create Bill</span>
          </button>
        </div>
      </div>

      {/* Daily Draft In-Progress Alert Banner */}
      {dailyDraftCount > 0 && (
        <div className="bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 p-4 sm:p-5 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-sm transition-all animate-fade-in">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-600 animate-ping"></span>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-900 dark:text-emerald-300">
                Daily Delivery Entry In Progress
              </span>
            </div>
            <p className="text-xs sm:text-sm font-medium text-[#1E293B] dark:text-[#F8FAFC]">
              {dailyDraftShop
                ? `${dailyDraftShop.name}${dailyDraftShop.area ? ` (${dailyDraftShop.area})` : ''}`
                : 'Customer Entry'}{' '}
              • <span className="font-bold">{dailyDraftCount} item(s)</span> entered • Total:{' '}
              <span className="font-mono font-bold text-[#1E3A5F] dark:text-[#60A5FA]">
                {formatCurrency(dailyDraftTotal, settings.currency)}
              </span>
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={(e) => {
                animateTactilePress(e);
                setActivePage('billing');
              }}
              className="btn-tactile-primary px-3.5 py-1.5 rounded-xl text-xs font-bold"
            >
              Resume Entry
            </button>
            <button
              type="button"
              onClick={async (e) => {
                animateTactilePress(e);
                if (!dailyDraft?.selectedShopId) {
                  setActivePage('billing');
                  return;
                }
                const prevDue = getShopOutstandingBalance(dailyDraft.selectedShopId);
                await createDeliveryBill({
                  shopId: dailyDraft.selectedShopId,
                  shopName: dailyDraftShop
                    ? `${dailyDraftShop.name}${dailyDraftShop.area ? ` (${dailyDraftShop.area})` : ''}`
                    : 'Retail Shop',
                  shopPhone: dailyDraftShop?.phone || '',
                  date: dailyDraft.deliveryDate,
                  items: dailyDraftItems,
                  isPrint: false,
                  paymentStatus: 'PAID',
                  previousDue: prevDue,
                });
              }}
              className="px-3 py-1.5 rounded-xl bg-white dark:bg-[#0A1110] text-[#1E293B] dark:text-[#F8FAFC] border border-[#E2E8F0] dark:border-[#1E2E2A] hover:bg-[#F1F5F9] dark:hover:bg-[#162220] text-xs font-bold cursor-pointer transition-colors"
            >
              Save Now
            </button>
            <button
              type="button"
              onClick={clearDailyDraft}
              className="px-2 py-1.5 text-xs text-[#64748B] dark:text-[#94A3B8] hover:text-[#DC2626] cursor-pointer"
            >
              Discard
            </button>
          </div>
        </div>
      )}

      {/* 2. Top Section: Sales Revenue Flow (Left 65%) + Conversion / Fulfillment Arch Gauge (Right 35%) */}
      <div ref={topCardsRef} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Sales Revenue Card (Inspired by Sales Funnel card in screenshot) */}
        <div className="lg:col-span-8 bg-white dark:bg-[#111A18] rounded-3xl p-5 sm:p-6 border border-[#E2E8F0] dark:border-[#1E2E2A] shadow-xs flex flex-col justify-between space-y-4">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#E2E8F0]/80 dark:border-[#1E2E2A]">
            <div>
              <h2 className="text-xl font-display font-extrabold text-[#1E293B] dark:text-[#F8FAFC] tracking-tight">
                Sales Revenue
              </h2>
              <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-0.5">
                Overview of milk & curd billing volume
              </p>
            </div>

            {/* Timeframe pills */}
            <div className="flex items-center bg-[#F1F5F9] dark:bg-[#0A1110] p-1 rounded-2xl border border-[#E2E8F0] dark:border-[#1E2E2A] self-start sm:self-auto">
              {[
                { id: 'daily', label: 'Daily' },
                { id: 'weekly', label: 'Weekly' },
                { id: 'monthly', label: 'Monthly' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setRevenuePeriod(tab.id);
                    setHoveredBarIndex(null);
                  }}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    revenuePeriod === tab.id
                      ? 'bg-[#059669] text-white shadow-xs'
                      : 'text-[#64748B] dark:text-[#94A3B8] hover:text-[#1E293B] dark:hover:text-[#F8FAFC]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Metric Summary Strip inside Card (Inspired by the step stats in the reference funnel card) */}
          <div className="grid grid-cols-3 gap-3 p-3.5 rounded-2xl bg-[#F8FAFC] dark:bg-[#0A1110] border border-[#E2E8F0] dark:border-[#1E2E2A]">
            <div>
              <span className="text-[10px] font-bold text-[#64748B] dark:text-[#94A3B8] uppercase tracking-wider block">
                Counter Sales
              </span>
              <span className="text-sm sm:text-base font-mono font-bold text-[#1E293B] dark:text-[#F8FAFC]">
                {formatCurrency(
                  currentChartData.reduce((s, d) => s + (d.counter || 0), 0),
                  settings.currency
                )}
              </span>
            </div>
            <div className="border-x border-[#E2E8F0] dark:border-[#1E2E2A] px-3">
              <span className="text-[10px] font-bold text-[#64748B] dark:text-[#94A3B8] uppercase tracking-wider block">
                Shop Deliveries
              </span>
              <span className="text-sm sm:text-base font-mono font-bold text-emerald-700 dark:text-emerald-400">
                {formatCurrency(
                  currentChartData.reduce((s, d) => s + (d.delivery || 0), 0),
                  settings.currency
                )}
              </span>
            </div>
            <div className="pl-1">
              <span className="text-[10px] font-bold text-[#64748B] dark:text-[#94A3B8] uppercase tracking-wider block">
                Total Volume
              </span>
              <span className="text-sm sm:text-base font-mono font-extrabold text-amber-600 dark:text-amber-400">
                {formatCurrency(
                  currentChartData.reduce((s, d) => s + (d.value || 0), 0),
                  settings.currency
                )}
              </span>
            </div>
          </div>

          {/* Glowing Rounded Bar Chart with background track pillars */}
          <div className="relative w-full aspect-[2.4/1] min-h-[190px]">
            <svg viewBox="0 0 700 220" className="w-full h-full overflow-visible">
              <defs>
                <linearGradient id="glowBarEmerald" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10B981" stopOpacity="0.95" />
                  <stop offset="100%" stopColor="#047857" stopOpacity="0.9" />
                </linearGradient>
              </defs>

              {/* Horizontal Gridlines */}
              {[0, 0.33, 0.66, 1].map((ratio, i) => {
                const y = 180 - ratio * 145;
                const val = Math.round(ratio * maxChartValue);
                return (
                  <g key={`grid-${i}`}>
                    <line
                      x1="45"
                      y1={y}
                      x2="685"
                      y2={y}
                      stroke="currentColor"
                      strokeDasharray="4 4"
                      className="text-[#E2E8F0] dark:text-[#334155]/60"
                      strokeWidth="1"
                    />
                    <text
                      x="38"
                      y={y + 3.5}
                      textAnchor="end"
                      className="text-[9px] fill-[#64748B] dark:fill-[#94A3B8] font-mono"
                    >
                      {val > 999 ? `${Math.round(val / 1000)}k` : val}
                    </text>
                  </g>
                );
              })}

              {/* Bar Elements with background track pillars */}
              {currentChartData.map((d, idx) => {
                const totalBars = currentChartData.length;
                const availableW = 640;
                const slotW = availableW / totalBars;
                const barW = Math.min(slotW * 0.52, 38);
                const x = 50 + idx * slotW + (slotW - barW) / 2;

                const barHeight = maxChartValue > 0 ? (d.value / maxChartValue) * 145 : 0;
                const y = 180 - barHeight;
                const isHovered = hoveredBarIndex === idx;

                return (
                  <g
                    key={`bar-group-${idx}`}
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredBarIndex(idx)}
                    onMouseLeave={() => setHoveredBarIndex(null)}
                  >
                    {/* Background soft track pillar (Empty Slot Indicator) */}
                    <rect
                      x={x}
                      y={35}
                      width={barW}
                      height={145}
                      rx="10"
                      className="fill-[#EEF2F0] dark:fill-[#0A1110] stroke-[#E2E8F0]/70 dark:stroke-[#1E2E2A] stroke-1 transition-colors"
                    />

                    {/* Foreground Bar */}
                    {barHeight > 0 && (
                      <rect
                        x={x}
                        y={y}
                        width={barW}
                        height={Math.max(barHeight, 4)}
                        rx="10"
                        fill="url(#glowBarEmerald)"
                        className={`transition-all duration-200 ${
                          isHovered ? 'filter drop-shadow-[0_0_10px_rgba(16,185,129,0.5)]' : ''
                        }`}
                      />
                    )}

                    {/* X-axis label */}
                    <text
                      x={x + barW / 2}
                      y={202}
                      textAnchor="middle"
                      className={`text-[11px] font-bold transition-colors ${
                        isHovered
                          ? 'fill-[#059669] dark:fill-[#10B981]'
                          : 'fill-[#64748B] dark:fill-[#94A3B8]'
                      }`}
                    >
                      {d.label}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Empty Period Helpful Badge */}
            {currentChartData.every((d) => (d.value || 0) === 0) && (
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-7">
                <div className="px-4 py-2 rounded-full bg-white/95 dark:bg-[#0A1110]/95 border border-[#E2E8F0] dark:border-[#1E2E2A] text-slate-500 dark:text-slate-400 text-xs font-medium backdrop-blur-xs shadow-xs flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500/80"></span>
                  <span>No billing records for this period yet</span>
                </div>
              </div>
            )}

            {/* Hover Tooltip Popover */}
            {hoveredBarIndex !== null && currentChartData[hoveredBarIndex] && (
              <div
                className="absolute z-20 pointer-events-none -translate-x-1/2 -translate-y-full bg-white dark:bg-[#111A18] text-[#1E293B] dark:text-[#F8FAFC] text-xs p-3 rounded-2xl border border-[#E2E8F0] dark:border-[#1E2E2A] shadow-xl transition-all duration-150 animate-fade-in min-w-[140px]"
                style={{
                  left: `${((50 + (hoveredBarIndex + 0.5) * (640 / currentChartData.length)) / 700) * 100}%`,
                  top: '38%',
                }}
              >
                <p className="font-bold text-xs pb-1 border-b border-[#E2E8F0] dark:border-[#1E2E2A] mb-1 text-[#1E293B] dark:text-[#F8FAFC]">
                  {currentChartData[hoveredBarIndex].fullDate}
                </p>
                <div className="space-y-1 text-[11px]">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[#64748B] dark:text-[#94A3B8]">One-Time:</span>
                    <span className="font-mono font-bold">
                      {formatCurrency(currentChartData[hoveredBarIndex].counter || 0, settings.currency)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[#64748B] dark:text-[#94A3B8]">Delivery:</span>
                    <span className="font-mono font-bold">
                      {formatCurrency(currentChartData[hoveredBarIndex].delivery || 0, settings.currency)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-[#E2E8F0] dark:border-[#1E2E2A] font-bold">
                    <span>Total:</span>
                    <span className="font-mono text-[#1E3A5F] dark:text-[#60A5FA]">
                      {formatCurrency(currentChartData[hoveredBarIndex].value, settings.currency)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Conversion / Fulfillment Arch Gauge Card (Exact match of "Conversion" card in screenshot) */}
        <div className="lg:col-span-4 bg-white dark:bg-[#111A18] rounded-3xl p-5 sm:p-6 border border-[#E2E8F0] dark:border-[#1E2E2A] shadow-xs flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-display font-extrabold text-[#1E293B] dark:text-[#F8FAFC] tracking-tight">
              Route Progress
            </h2>
            <span className="w-2.5 h-2.5 rounded-full bg-[#14B8A6]"></span>
          </div>

          {/* Speedometer Arch Gauge */}
          <div className="relative flex flex-col items-center justify-center my-2">
            <svg viewBox="0 0 200 115" className="w-56 overflow-visible">
              <defs>
                <linearGradient id="archGaugeGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#0F172A" />
                  <stop offset="50%" stopColor="#059669" />
                  <stop offset="100%" stopColor="#10B981" />
                </linearGradient>
              </defs>

              {/* Background Arch Track (semi-circle radius 70) */}
              <path
                d="M 25 105 A 75 75 0 0 1 175 105"
                fill="none"
                stroke="currentColor"
                strokeWidth="20"
                strokeLinecap="round"
                className="text-[#F1F5F9] dark:text-[#0A1110]"
              />

              {/* Active Foreground Arch (Circumference ~ 235.6) */}
              <path
                d="M 25 105 A 75 75 0 0 1 175 105"
                fill="none"
                stroke="url(#archGaugeGrad)"
                strokeWidth="20"
                strokeLinecap="round"
                strokeDasharray="235.6"
                strokeDashoffset={235.6 * (1 - Math.max(fulfillmentRate, 2) / 100)}
                className="transition-all duration-700 ease-out"
              />
            </svg>

            {/* In-Center Percentage & Metric Badge */}
            <div className="absolute bottom-1 flex flex-col items-center justify-center text-center">
              <span className="text-2xl sm:text-3xl font-display font-black text-[#1E293B] dark:text-[#F8FAFC] tracking-tight">
                <CountUp value={fulfillmentRate} />%
              </span>
              <div className="inline-flex items-center gap-1 mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-[#16A34A] dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40">
                <ArrowUpRight className="w-2.5 h-2.5 stroke-[2.5]" />
                <span>On Track</span>
              </div>
            </div>
          </div>

          {/* Bottom Milestone Banner matching screenshot's "Congratulations!" */}
          <div
            onClick={() => setActivePage('shops')}
            className="p-3 rounded-2xl bg-[#F8FAFC] dark:bg-[#0A1110] border border-[#E2E8F0] dark:border-[#1E2E2A] flex items-center justify-between hover:bg-[#F1F5F9] dark:hover:bg-[#162220] hover:border-emerald-500/40 dark:hover:border-emerald-500/40 cursor-pointer transition-all duration-200 group"
          >
            <div>
              <p className="text-xs font-bold text-[#1E293B] dark:text-[#F8FAFC] group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                {todayShopsCount} of {shops.length} Outlets Delivered
              </p>
              <p className="text-[10px] text-[#64748B] dark:text-[#94A3B8]">
                {fulfillmentRate >= 80 ? "Great delivery pace today!" : "Live outlet delivery count"}
              </p>
            </div>
            <ChevronRight className="w-4 h-4 text-[#64748B] dark:text-[#94A3B8] group-hover:text-emerald-700 dark:group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all" />
          </div>
        </div>
      </div>

      {/* 3. Stat Cards Row (8px rhythm, 16px radius) */}
      <div ref={metricsRef} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Today Revenue */}
        <div className="bg-white dark:bg-[#111A18] rounded-2xl p-4 sm:p-5 border border-[#E2E8F0] dark:border-[#1E2E2A] shadow-xs flex flex-col justify-between space-y-2.5">
          <span className="type-caption block text-slate-500 dark:text-slate-400">
            Today Revenue
          </span>
          <p className="text-2xl font-mono tabular-nums font-black text-[#0F172A] dark:text-[#F8FAFC] tracking-tight">
            <CountUp value={todayRevenue} isCurrency currency={settings.currency} />
          </p>
          <div className="flex items-center gap-1.5 pt-0.5">
            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40">
              <ArrowUpRight className="w-2.5 h-2.5" /> +8.4%
            </span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono tabular-nums">
              vs yesterday
            </span>
          </div>
        </div>

        {/* Card 2: Weekly Revenue */}
        <div className="bg-white dark:bg-[#111A18] rounded-2xl p-4 sm:p-5 border border-[#E2E8F0] dark:border-[#1E2E2A] shadow-xs flex flex-col justify-between space-y-2.5">
          <span className="type-caption block text-slate-500 dark:text-slate-400">
            Weekly Revenue
          </span>
          <p className="text-2xl font-mono tabular-nums font-black text-amber-600 dark:text-amber-400 tracking-tight">
            <CountUp value={weeklyRevenue} isCurrency currency={settings.currency} />
          </p>
          <div className="flex items-center gap-1.5 pt-0.5">
            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40">
              <ArrowUpRight className="w-2.5 h-2.5" /> +14.2%
            </span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono tabular-nums">
              last 7 days
            </span>
          </div>
        </div>

        {/* Card 3: Today's Bills */}
        <div
          onClick={() => setActivePage('history')}
          className="bg-white dark:bg-[#111A18] rounded-2xl p-4 sm:p-5 border border-[#E2E8F0] dark:border-[#1E2E2A] shadow-xs flex flex-col justify-between space-y-2.5 cursor-pointer hover:border-[#D97706]/60 transition-colors"
        >
          <span className="type-caption block text-slate-500 dark:text-slate-400">
            Today's Invoices
          </span>
          <p className="text-2xl font-mono tabular-nums font-black text-[#0F172A] dark:text-[#F8FAFC] tracking-tight">
            <CountUp value={todayBills.length} /> <span className="text-sm font-semibold text-slate-500 font-sans">Bills</span>
          </p>
          <div className="flex items-center gap-1.5 pt-0.5">
            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/40">
              ● Active POS
            </span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400">
              recorded today
            </span>
          </div>
        </div>

        {/* Card 4: Catalog Varieties */}
        <div
          onClick={() => setActivePage('products')}
          className="bg-white dark:bg-[#111A18] rounded-2xl p-4 sm:p-5 border border-[#E2E8F0] dark:border-[#1E2E2A] shadow-xs flex flex-col justify-between space-y-2.5 cursor-pointer hover:border-emerald-500/60 transition-colors"
        >
          <span className="type-caption block text-slate-500 dark:text-slate-400">
            Dairy Varieties
          </span>
          <p className="text-2xl font-mono tabular-nums font-black text-[#0F172A] dark:text-[#F8FAFC] tracking-tight">
            <CountUp value={products.length} /> <span className="text-sm font-semibold text-slate-500 font-sans">Items</span>
          </p>
          <div className="flex items-center gap-1.5 pt-0.5">
            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40">
              <Check className="w-2.5 h-2.5" /> All In Stock
            </span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400">
              ready to bill
            </span>
          </div>
        </div>
      </div>

      {/* 4. Bottom Section: Top Products Spotlight (50%) + Recent Activity (50%) */}
      <div ref={bottomCardsRef} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: 5 Top Products Card (Exact match of "5 Top Products" spotlight card in screenshot) */}
        <div className="lg:col-span-6 bg-white dark:bg-[#111A18] rounded-3xl p-5 sm:p-6 border border-[#E2E8F0] dark:border-[#1E2E2A] shadow-xs flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[#E2E8F0]/80 dark:border-[#1E2E2A]">
            <h2 className="text-xl font-display font-extrabold text-[#1E293B] dark:text-[#F8FAFC] tracking-tight">
              5 Top Products
            </h2>
            <span className="text-xs text-[#64748B] dark:text-[#94A3B8] font-medium">
              #{activeProductIndex + 1} of {topProductsList.length}
            </span>
          </div>

          {/* Elevated Inner Card Spotlight with Stepper buttons (matching the screenshot) */}
          <div className="p-4 sm:p-5 rounded-2xl bg-[#F8FAFC] dark:bg-[#0A1110] border border-[#E2E8F0] dark:border-[#1E2E2A] shadow-sm flex items-center justify-between gap-4 transition-all">
            <div className="flex items-center gap-3.5 min-w-0">
              {/* Product Thumbnail / Icon box */}
              <div className="w-14 h-14 rounded-2xl bg-white dark:bg-[#111A18] border border-[#E2E8F0] dark:border-[#1E2E2A] flex items-center justify-center shrink-0 shadow-2xs">
                <Package className="w-7 h-7 text-[#1E3A5F] dark:text-[#60A5FA]" />
              </div>

              {/* Product Details & Sold Qty */}
              <div className="min-w-0">
                <p className="text-lg sm:text-2xl font-mono font-black text-[#1E293B] dark:text-[#F8FAFC] leading-tight">
                  {currentTopProduct.salesQty} Sold
                </p>
                <p className="text-xs font-bold text-[#64748B] dark:text-[#94A3B8] truncate mt-0.5">
                  {currentTopProduct.name} • {formatCurrency(currentTopProduct.price, settings.currency)}
                </p>
                <div className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-[#16A34A] dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40">
                  <ArrowUpRight className="w-2.5 h-2.5" /> High Demand
                </div>
              </div>
            </div>

            {/* Interactive Up & Down chevron buttons matching screenshot */}
            <div className="flex flex-col gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handlePrevProduct}
                className="w-8 h-8 rounded-full bg-white dark:bg-[#111A18] border border-[#E2E8F0] dark:border-[#1E2E2A] hover:bg-emerald-50 dark:hover:bg-[#162220] text-slate-800 dark:text-[#F8FAFC] flex items-center justify-center cursor-pointer shadow-2xs transition-colors"
                title="Previous Top Product"
              >
                <ChevronUp className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleNextProduct}
                className="w-8 h-8 rounded-full bg-white dark:bg-[#111A18] border border-[#E2E8F0] dark:border-[#1E2E2A] hover:bg-emerald-50 dark:hover:bg-[#162220] text-slate-800 dark:text-[#F8FAFC] flex items-center justify-center cursor-pointer shadow-2xs transition-colors"
                title="Next Top Product"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Bottom Link: "See All Products >" */}
          <button
            type="button"
            onClick={() => setActivePage('products')}
            className="w-full pt-2 flex items-center justify-between text-xs font-bold text-[#64748B] dark:text-[#94A3B8] hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors cursor-pointer group"
          >
            <span>See All Products</span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {/* Right: Recent Activity Feed */}
        <div className="lg:col-span-6 bg-white dark:bg-[#111A18] rounded-3xl p-5 sm:p-6 border border-[#E2E8F0] dark:border-[#1E2E2A] shadow-xs flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[#E2E8F0]/80 dark:border-[#1E2E2A]">
            <h2 className="text-xl font-display font-extrabold text-[#1E293B] dark:text-[#F8FAFC] tracking-tight">
              Recent Activity
            </h2>
            <button
              type="button"
              onClick={() => setActivePage('history')}
              className="text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer"
            >
              See All
            </button>
          </div>

          {/* Activity items */}
          <div className="divide-y divide-[#E2E8F0]/80 dark:divide-[#1E2E2A]">
            {recentBills.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#64748B] dark:text-[#94A3B8]">
                No recent billing transactions found.
              </div>
            ) : (
              recentBills.map((bill) => (
                <div
                  key={bill.id}
                  onClick={() => setGeneratedBill(bill)}
                  className="py-3 flex items-center justify-between hover:bg-[#F8FAFC] dark:hover:bg-[#0F172A] rounded-2xl px-2 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
                      <Receipt className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-xs sm:text-sm text-[#1E293B] dark:text-[#F8FAFC] group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                        Bill #{bill.billNumber}
                      </p>
                      <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8] truncate">
                        {bill.customerName || 'Walk-in Retail Customer'} • {bill.date}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-mono font-bold text-xs text-[#1E293B] dark:text-[#F8FAFC]">
                      {formatCurrency(bill.finalAmount || bill.totalAmount, settings.currency)}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-[#16A34A] dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40">
                      Delivered
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          <button
            type="button"
            onClick={() => setActivePage('history')}
            className="w-full pt-2 flex items-center justify-between text-xs font-bold text-[#64748B] dark:text-[#94A3B8] hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors cursor-pointer group"
          >
            <span>View Full Ledger Records</span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  );
}
