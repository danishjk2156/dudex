/**
 * AppContext: Central State Management synchronized with IndexedDB
 * Follows Andrej Karpathy's clean, explicit data-flow principles
 */
import React, { createContext, useContext, useReducer, useEffect, useMemo } from 'react';
import {
  openDB,
  getAllItems,
  getItem,
  setItem,
  deleteItem,
  getNextBillNumber,
  getUserByPhone,
  saveUser,
  getCachedUsers,
  subscribeToRealtime,
  isSupabaseConfigured,
} from '../lib/supabaseService';
import { calculateBillSummary, formatDate, formatTime, padBillNumber, generateId } from '../lib/utils';

const AppContext = createContext();

const LOCAL_STORAGE_DAILY_DRAFT_KEY = 'daily_delivery_entry_draft_v1';
const LOCAL_STORAGE_USER_KEY = 'pos_current_user_v1';

const getInitialUser = () => {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_USER_KEY);
    if (saved) return JSON.parse(saved);
  } catch (e) {}
  return null;
};

const getInitialDailyDraft = () => {
  const getTodayInput = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_DAILY_DRAFT_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed) {
        return {
          deliveryDate: parsed.deliveryDate || getTodayInput(),
          selectedShopId: parsed.selectedShopId || '',
          customCustomerName: parsed.customCustomerName || '',
          productRows: Array.isArray(parsed.productRows) && parsed.productRows.length > 0
            ? parsed.productRows
            : [{ id: generateId(), brandId: '', productId: '', productName: '', price: 0, quantity: 1, unit: '—' }],
        };
      }
    }
  } catch (e) {}
  return {
    deliveryDate: getTodayInput(),
    selectedShopId: '',
    customCustomerName: '',
    productRows: [{ id: generateId(), brandId: '', productId: '', productName: '', price: 0, quantity: 1, unit: '—' }],
  };
};

const getInitialTheme = () => {
  try {
    const saved = localStorage.getItem('pos_theme');
    if (saved) return saved;
  } catch (e) {
    // fallback
  }
  return 'light';
};

const initialState = {
  theme: getInitialTheme(),
  currentUser: getInitialUser(),
  users: [],
  settings: {
    id: 'business_profile',
    businessName: 'G. V. MILK AGENCY',
    address: 'SOLAN NAGAR',
    area: 'SOLAN NAGAR',
    city: 'CHENNAI - 600109',
    phone: '9840865510',
    gstin: '',
    currency: '₹',
    logo: '',
    paperSize: '58mm',
  },
  shops: [],
  companies: [],
  products: [],
  bills: [],
  cart: {
    items: [],
    customerName: '',
    customerPhone: '',
  },
  dailyDraft: getInitialDailyDraft(),
  activePage: 'dashboard', // dashboard | billing | products | companies | shops | history | settings | profile
  isProfileOpen: false, // Right-side Profile Drawer state
  isMobileNavOpen: false, // Left-side Mobile Nav Drawer state (YouTube style)
  generatedBill: null, // Bill object currently being viewed/printed in receipt modal
  isLoading: true,
  toasts: [],
};

function appReducer(state, action) {
  switch (action.type) {
    case 'SET_THEME':
      return { ...state, theme: action.payload };
    case 'SET_INITIAL_DATA':
      return {
        ...state,
        settings: action.payload.settings || state.settings,
        shops: action.payload.shops || [],
        companies: action.payload.companies || [],
        products: action.payload.products || [],
        bills: action.payload.bills || [],
        users: action.payload.users || [],
        isLoading: false,
      };

    case 'SET_CURRENT_USER': {
      try {
        if (action.payload) {
          localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(action.payload));
        } else {
          localStorage.removeItem(LOCAL_STORAGE_USER_KEY);
        }
      } catch (e) {}
      return { ...state, currentUser: action.payload };
    }

    case 'LOGOUT_USER': {
      try {
        localStorage.removeItem(LOCAL_STORAGE_USER_KEY);
      } catch (e) {}
      return { ...state, currentUser: null };
    }

    case 'SET_ACTIVE_PAGE':
      if (action.payload === 'profile') {
        return { ...state, activePage: 'dashboard', isProfileOpen: true, isMobileNavOpen: false };
      }
      return { ...state, activePage: action.payload, isMobileNavOpen: false };

    case 'SET_PROFILE_OPEN':
      return { ...state, isProfileOpen: Boolean(action.payload) };

    case 'TOGGLE_PROFILE':
      return { ...state, isProfileOpen: !state.isProfileOpen };

    case 'SET_MOBILE_NAV_OPEN':
      return { ...state, isMobileNavOpen: Boolean(action.payload) };

    case 'TOGGLE_MOBILE_NAV':
      return { ...state, isMobileNavOpen: !state.isMobileNavOpen };

    case 'SET_GENERATED_BILL':
      return { ...state, generatedBill: action.payload };

    case 'SET_SETTINGS':
      return { ...state, settings: action.payload };

    case 'SET_SHOPS':
      return { ...state, shops: action.payload };

    case 'SET_COMPANIES':
      return { ...state, companies: action.payload };

    case 'SET_PRODUCTS':
      return { ...state, products: action.payload };

    case 'SET_BILLS':
      return { ...state, bills: action.payload };

    // Cart Actions for Billing
    case 'ADD_TO_CART': {
      const product = action.payload;
      const existingIndex = state.cart.items.findIndex((item) => item.productId === product.id);
      let updatedItems;

      if (existingIndex > -1) {
        updatedItems = state.cart.items.map((item, idx) =>
          idx === existingIndex ? { ...item, quantity: item.quantity + 1 } : item
        );
      } else {
        updatedItems = [
          ...state.cart.items,
          {
            id: generateId(),
            productId: product.id,
            companyId: product.companyId,
            name: product.name,
            rate: Number(product.rate),
            unit: product.unit || 'Packet',
            gstRate: product.gstRate !== undefined ? Number(product.gstRate) : 0,
            quantity: 1,
          },
        ];
      }

      return {
        ...state,
        cart: { ...state.cart, items: updatedItems },
      };
    }

    case 'UPDATE_CART_ITEM_QTY': {
      const { productId, quantity } = action.payload;
      let updatedItems;

      if (quantity <= 0) {
        updatedItems = state.cart.items.filter((item) => item.productId !== productId);
      } else {
        updatedItems = state.cart.items.map((item) =>
          item.productId === productId ? { ...item, quantity } : item
        );
      }

      return {
        ...state,
        cart: { ...state.cart, items: updatedItems },
      };
    }

    case 'REMOVE_FROM_CART': {
      return {
        ...state,
        cart: {
          ...state.cart,
          items: state.cart.items.filter((item) => item.productId !== action.payload),
        },
      };
    }

    case 'UPDATE_CART_META': {
      return {
        ...state,
        cart: {
          ...state.cart,
          ...action.payload,
        },
      };
    }

    case 'CLEAR_CART':
      return {
        ...state,
        cart: {
          items: [],
          customerName: '',
          customerPhone: '',
        },
      };

    // Daily Entry Draft Actions
    case 'SET_DAILY_DRAFT': {
      const updatedDraft = { ...state.dailyDraft, ...action.payload };
      try {
        localStorage.setItem(LOCAL_STORAGE_DAILY_DRAFT_KEY, JSON.stringify(updatedDraft));
      } catch (e) {}
      return { ...state, dailyDraft: updatedDraft };
    }

    case 'CLEAR_DAILY_DRAFT': {
      const emptyDraft = {
        deliveryDate: new Date().toISOString().slice(0, 10),
        selectedShopId: '',
        customCustomerName: '',
        productRows: [
          {
            id: generateId(),
            brandId: '',
            productId: '',
            productName: '',
            price: 0,
            quantity: 1,
            unit: '—',
          },
        ],
      };
      try {
        localStorage.removeItem(LOCAL_STORAGE_DAILY_DRAFT_KEY);
      } catch (e) {}
      return { ...state, dailyDraft: emptyDraft };
    }

    // Toasts
    case 'ADD_TOAST':
      return { ...state, toasts: [...state.toasts, action.payload] };

    case 'REMOVE_TOAST':
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.payload),
      };

    default:
      return state;
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Initialize data from IndexedDB
  const refreshData = async () => {
    try {
      const db = await openDB();
      const settings = (await getItem('settings', 'business_profile', db)) || initialState.settings;
      const shops = await getAllItems('shops', db);
      const companies = await getAllItems('companies', db);
      const rawProducts = await getAllItems('products', db);
      const products = (rawProducts || []).map((p) => {
        const gstRate =
          p.gstRate !== undefined && p.gstRate !== null && p.gstRate !== ''
            ? Number(p.gstRate)
            : (/curd|paneer|butter|ghee|cheese/i.test(p.name || '') ? 5 : 0);
        return { ...p, gstRate };
      });
      const bills = await getAllItems('bills', db);
      const dbUsers = await getAllItems('users', db);
      const cachedUsers = getCachedUsers();
      
      // Combine and deduplicate by phone
      const userMap = new Map();
      [...cachedUsers, ...dbUsers].forEach((u) => {
        const p = String(u.phone || '').replace(/\D/g, '').slice(-10);
        if (p && !userMap.has(p)) userMap.set(p, u);
      });
      const users = Array.from(userMap.values());

      // Sort bills newest first
      bills.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      dispatch({
        type: 'SET_INITIAL_DATA',
        payload: { settings, shops, companies, products, bills, users },
      });
    } catch (error) {
      console.error('Failed to load DB data:', error);
      showToast('Error loading local database', 'error');
    }
  };

  useEffect(() => {
    refreshData();

    // Subscribe to real-time events across multiple devices
    const unsubscribe = subscribeToRealtime((table, eventType, data) => {
      console.log(`[Supabase Realtime] Change detected on ${table} (${eventType})`);
      refreshData();
    });

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, []);

  // Authentication Helpers
  const login = async (phone, pin = '') => {
    try {
      const user = await getUserByPhone(phone);
      if (!user) {
        showToast('Phone number not registered. Please sign up.', 'warning');
        return { success: false, error: 'User not found' };
      }

      if (user.pin && pin && user.pin !== pin) {
        showToast('Invalid PIN entered', 'error');
        return { success: false, error: 'Invalid PIN' };
      }

      dispatch({ type: 'SET_CURRENT_USER', payload: user });
      showToast(`Welcome back, ${user.name}!`, 'success');
      return { success: true, user };
    } catch (err) {
      console.error('Login error:', err);
      showToast('Login failed: ' + err.message, 'error');
      return { success: false, error: err.message };
    }
  };

  const signup = async ({ name, phone, pin = '' }) => {
    try {
      const cleanPhone = String(phone || '').replace(/\D/g, '').slice(-10);
      if (cleanPhone.length < 10) {
        showToast('Please enter a valid 10-digit phone number', 'warning');
        return { success: false, error: 'Invalid phone' };
      }

      if (!name || !name.trim()) {
        showToast('Please enter your full name', 'warning');
        return { success: false, error: 'Invalid name' };
      }

      const existing = await getUserByPhone(cleanPhone);
      if (existing) {
        showToast('Phone number already registered. Logging you in...', 'info');
        dispatch({ type: 'SET_CURRENT_USER', payload: existing });
        return { success: true, user: existing };
      }

      const newUser = await saveUser({ name: name.trim(), phone: cleanPhone, pin });
      await refreshData();
      dispatch({ type: 'SET_CURRENT_USER', payload: newUser });
      showToast(`Account created for ${newUser.name}!`, 'success');
      return { success: true, user: newUser };
    } catch (err) {
      console.error('Signup error:', err);
      showToast('Signup failed: ' + err.message, 'error');
      return { success: false, error: err.message };
    }
  };

  const logout = () => {
    dispatch({ type: 'LOGOUT_USER' });
    showToast('Signed out successfully', 'info');
  };

  const switchUser = (user) => {
    dispatch({ type: 'SET_CURRENT_USER', payload: user });
    showToast(`Switched operator to ${user.name}`, 'success');
  };

  // Synchronize Dark / Light theme class with documentElement
  useEffect(() => {
    const applyTheme = (currentTheme) => {
      let activeIsDark = false;
      if (currentTheme === 'system') {
        activeIsDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      } else {
        activeIsDark = currentTheme === 'dark';
      }

      if (activeIsDark) {
        document.documentElement.classList.add('dark');
        document.documentElement.classList.remove('light');
        document.body.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
        document.documentElement.classList.add('light');
        document.body.classList.remove('dark');
      }

      try {
        localStorage.setItem('pos_theme', currentTheme);
      } catch (e) {
        // ignore
      }
    };

    applyTheme(state.theme);

    if (window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleMediaChange = () => {
        if (state.theme === 'system') {
          applyTheme('system');
        }
      };
      mediaQuery.addEventListener('change', handleMediaChange);
      return () => mediaQuery.removeEventListener('change', handleMediaChange);
    }
  }, [state.theme]);

  const isDark =
    state.theme === 'dark' ||
    (state.theme === 'system' &&
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);

  const setTheme = (newTheme) => {
    dispatch({ type: 'SET_THEME', payload: newTheme });
  };

  const toggleTheme = () => {
    dispatch({ type: 'SET_THEME', payload: isDark ? 'light' : 'dark' });
  };

  // Toast Helpers
  const showToast = (message, type = 'info') => {
    const id = generateId();
    dispatch({ type: 'ADD_TOAST', payload: { id, message, type } });
    setTimeout(() => {
      dispatch({ type: 'REMOVE_TOAST', payload: id });
    }, 3500);
  };

  // Shop Management CRUD
  const addShop = async (shopData) => {
    const newShop = {
      id: 'shop_' + generateId(),
      name: shopData.name.trim(),
      owner: shopData.owner ? shopData.owner.trim() : '',
      phone: shopData.phone ? shopData.phone.trim() : '',
      area: shopData.area ? shopData.area.trim() : '',
      address: shopData.address ? shopData.address.trim() : '',
      status: shopData.status || 'ACTIVE',
      createdAt: new Date().toISOString(),
    };
    await setItem('shops', newShop);
    await refreshData();
    showToast(`Shop "${newShop.name}" added successfully`, 'success');
    return newShop;
  };

  const updateShop = async (shop) => {
    await setItem('shops', shop);
    await refreshData();
    showToast(`Shop "${shop.name}" updated`, 'success');
  };

  const deleteShop = async (shopId) => {
    await deleteItem('shops', shopId);
    await refreshData();
    showToast('Shop deleted', 'info');
  };

  // Company / Brand CRUD
  const addCompany = async (companyData) => {
    const newCompany = {
      id: 'cmp_' + generateId(),
      name: companyData.name.trim(),
      description: companyData.description || '',
      color: companyData.color || '#F59E0B',
      image: companyData.image || companyData.logo || '',
      createdAt: new Date().toISOString(),
    };
    await setItem('companies', newCompany);
    await refreshData();
    showToast(`Brand "${newCompany.name}" added successfully`, 'success');
    return newCompany;
  };

  const updateCompany = async (company) => {
    await setItem('companies', company);
    await refreshData();
    showToast(`Brand "${company.name}" updated`, 'success');
  };

  const deleteCompany = async (companyId) => {
    await deleteItem('companies', companyId);
    await refreshData();
    showToast('Brand deleted', 'info');
  };

  // Product CRUD
  const addProduct = async (productData) => {
    const newProduct = {
      id: 'prod_' + generateId(),
      companyId: productData.companyId,
      name: productData.name.trim(),
      rate: Number(productData.rate),
      unit: productData.unit || 'Packet',
      gstRate:
        productData.gstRate !== undefined && !isNaN(Number(productData.gstRate))
          ? Math.max(0, Number(productData.gstRate))
          : 0,
      status: productData.status || 'active',
      createdAt: new Date().toISOString(),
    };
    await setItem('products', newProduct);
    await refreshData();
    showToast(`Product "${newProduct.name}" created`, 'success');
    return newProduct;
  };

  const updateProduct = async (product) => {
    await setItem('products', product);
    await refreshData();
    showToast(`Product "${product.name}" updated`, 'success');
  };

  const updateProductRate = async (productId, newRate) => {
    const product = state.products.find((p) => p.id === productId);
    if (product) {
      const updated = { ...product, rate: Number(newRate) };
      await setItem('products', updated);
      await refreshData();
      showToast(`Rate updated for ${product.name} (₹${newRate})`, 'success');
    }
  };

  const deleteProduct = async (productId) => {
    await deleteItem('products', productId);
    await refreshData();
    showToast('Product removed', 'info');
  };

  // Settings Save
  const updateSettings = async (newSettings) => {
    const merged = { ...state.settings, ...newSettings, id: 'business_profile' };
    await setItem('settings', merged);
    dispatch({ type: 'SET_SETTINGS', payload: merged });
    showToast('Business settings saved', 'success');
  };

  // Create and Save Bill
  const generateAndSaveBill = async () => {
    if (state.cart.items.length === 0) {
      showToast('Please add at least one product to the bill', 'warning');
      return null;
    }

    const nextNumber = await getNextBillNumber();
    const formattedBillNo = padBillNumber(nextNumber);
    const now = new Date();
    const itemsWithGst = state.cart.items.map((item) => {
      const prod = state.products.find((p) => p.id === (item.productId || item.id));
      const itemGst =
        item.gstRate !== undefined && item.gstRate !== null && item.gstRate !== ''
          ? Number(item.gstRate)
          : (prod?.gstRate !== undefined ? Number(prod.gstRate) : 0);
      return { ...item, gstRate: itemGst };
    });
    const summary = calculateBillSummary(itemsWithGst);

    const bill = {
      id: 'bill_' + generateId(),
      billNumber: formattedBillNo,
      date: formatDate(now),
      time: formatTime(now),
      customerName: state.cart.customerName || '',
      customerPhone: state.cart.customerPhone || '',
      items: itemsWithGst,
      totalItems: summary.totalItems,
      totalQty: summary.totalQty,
      subTotal: summary.subTotal,
      taxableAmount: summary.taxableAmount,
      gstRate: summary.gstRate,
      gstAmount: summary.gstAmount,
      cgstAmount: summary.cgstAmount,
      sgstAmount: summary.sgstAmount,
      totalAmount: summary.totalAmount,
      roundOff: summary.roundOff,
      finalAmount: summary.finalAmount,
      createdAt: now.toISOString(),
    };

    // Save to DB
    await setItem('bills', bill);
    await refreshData();

    // Set generated bill in modal view & clear active cart
    dispatch({ type: 'SET_GENERATED_BILL', payload: bill });
    dispatch({ type: 'CLEAR_CART' });
    showToast(`Bill #${formattedBillNo} generated and saved!`, 'success');

    return bill;
  };

  // Get a shop's outstanding balance from previous unpaid bills
  const getShopOutstandingBalance = (shopId) => {
    if (!shopId || shopId === 'walkin') return 0;
    const shop = state.shops.find((s) => s.id === shopId);
    if (shop && typeof shop.outstandingBalance === 'number') {
      return Math.max(0, Math.round(shop.outstandingBalance * 100) / 100);
    }
    const shopBills = (state.bills || [])
      .filter((b) => b.shopId === shopId && b.unpaidAmount !== undefined)
      .sort((a, b) => new Date(b.createdAt || b.dateRaw) - new Date(a.createdAt || a.dateRaw));
    if (shopBills.length > 0) {
      return Math.max(0, Math.round(Number(shopBills[0].unpaidAmount) * 100) / 100);
    }
    return 0;
  };

  // Create and Save Delivery Bill directly from Daily Entry page
  const createDeliveryBill = async ({
    shopId,
    shopName,
    shopPhone,
    date,
    items,
    isPrint = false,
    paymentStatus = 'PAID',
    paidAmount = null,
    unpaidAmount = null,
    previousDue = 0,
  }) => {
    if (!items || items.length === 0) {
      showToast('Please add at least one product row', 'warning');
      return null;
    }

    const nextNumber = await getNextBillNumber();
    const formattedBillNo = padBillNumber(nextNumber);
    const now = new Date();

    const formattedItems = items.map((item) => {
      const prod = state.products.find((p) => p.id === (item.productId || item.id));
      const itemGstRate =
        item.gstRate !== undefined && item.gstRate !== null && item.gstRate !== ''
          ? Number(item.gstRate)
          : (prod?.gstRate !== undefined ? Number(prod.gstRate) : 0);

      const rate = Number(item.price) || Number(item.rate) || 0;
      const qty = Number(item.quantity) || 1;

      return {
        id: item.id || generateId(),
        productId: item.productId,
        companyId: item.brandId || item.companyId,
        name: item.productName || item.name,
        rate,
        quantity: qty,
        unit: item.unit || 'Packet',
        gstRate: itemGstRate,
        total: rate * qty,
      };
    });

    const summary = calculateBillSummary(formattedItems);
    const currentItemsTotal = summary.finalAmount;
    const prevDue = Math.max(0, Number(previousDue) || 0);
    const netPayable = Math.round((currentItemsTotal + prevDue) * 100) / 100;

    let finalPaymentStatus = paymentStatus || 'PAID';
    let finalPaidAmount =
      paidAmount !== null && paidAmount !== undefined
        ? Math.max(0, Number(paidAmount))
        : finalPaymentStatus === 'UNPAID'
        ? 0
        : netPayable;
    let finalUnpaidAmount =
      unpaidAmount !== null && unpaidAmount !== undefined
        ? Math.max(0, Number(unpaidAmount))
        : Math.max(0, Math.round((netPayable - finalPaidAmount) * 100) / 100);

    // Auto-normalize status based on amounts
    if (finalPaidAmount >= netPayable) {
      finalPaymentStatus = 'PAID';
      finalUnpaidAmount = 0;
    } else if (finalPaidAmount <= 0) {
      finalPaymentStatus = 'UNPAID';
      finalPaidAmount = 0;
      finalUnpaidAmount = netPayable;
    } else {
      finalPaymentStatus = 'PARTIAL';
    }

    let formattedDateStr = formatDate(now);
    if (date) {
      try {
        const d = new Date(date);
        if (!isNaN(d.getTime())) {
          formattedDateStr = formatDate(d);
        }
      } catch (e) {}
    }

    const bill = {
      id: 'bill_' + generateId(),
      billNumber: formattedBillNo,
      date: formattedDateStr,
      dateRaw: date || now.toISOString().slice(0, 10),
      time: formatTime(now),
      shopId: shopId || '',
      customerName: shopName || 'Direct Shop Delivery',
      customerPhone: shopPhone || '',
      items: formattedItems,
      totalItems: summary.totalItems,
      totalQty: summary.totalQty,
      subTotal: summary.subTotal,
      taxableAmount: summary.taxableAmount,
      gstRate: summary.gstRate,
      gstAmount: summary.gstAmount,
      cgstAmount: summary.cgstAmount,
      sgstAmount: summary.sgstAmount,
      totalAmount: summary.totalAmount,
      roundOff: summary.roundOff,
      currentAmount: currentItemsTotal,
      previousDue: prevDue,
      finalAmount: netPayable,
      paymentStatus: finalPaymentStatus, // 'PAID' | 'PARTIAL' | 'UNPAID'
      paidAmount: finalPaidAmount,
      unpaidAmount: finalUnpaidAmount,
      type: 'delivery',
      createdAt: now.toISOString(),
    };

    await setItem('bills', bill);

    // Update the shop's persistent outstanding balance
    if (shopId && shopId !== 'walkin') {
      const targetShop = state.shops.find((s) => s.id === shopId);
      if (targetShop) {
        await setItem('shops', {
          ...targetShop,
          outstandingBalance: finalUnpaidAmount,
        });
      }
    }

    await refreshData();
    // Empty delivery items after saving or generating bill
    dispatch({ type: 'CLEAR_DAILY_DRAFT' });

    if (isPrint) {
      dispatch({ type: 'SET_GENERATED_BILL', payload: bill });
    }

    showToast(`Delivery Entry #${formattedBillNo} saved successfully!`, 'success');
    return bill;
  };

  const deleteBill = async (billId) => {
    const targetBill = state.bills.find((b) => b.id === billId);
    await deleteItem('bills', billId);
    if (targetBill && targetBill.shopId && targetBill.shopId !== 'walkin') {
      const remainingBills = (state.bills || [])
        .filter((b) => b.id !== billId && b.shopId === targetBill.shopId && b.unpaidAmount !== undefined)
        .sort((a, b) => new Date(b.createdAt || b.dateRaw) - new Date(a.createdAt || a.dateRaw));
      const newBal = remainingBills.length > 0 ? Number(remainingBills[0].unpaidAmount) || 0 : 0;
      const targetShop = state.shops.find((s) => s.id === targetBill.shopId);
      if (targetShop) {
        await setItem('shops', { ...targetShop, outstandingBalance: newBal });
      }
    }
    await refreshData();
    showToast('Record deleted successfully', 'info');
  };

  const updateBill = async (updatedBillData) => {
    if (!updatedBillData || !updatedBillData.id) {
      showToast('Cannot update invalid bill', 'error');
      return null;
    }

    const items = (updatedBillData.items || []).map((item) => {
      const prod = state.products.find((p) => p.id === (item.productId || item.id));
      const itemGstRate =
        item.gstRate !== undefined && item.gstRate !== null && item.gstRate !== ''
          ? Number(item.gstRate)
          : (prod?.gstRate !== undefined ? Number(prod.gstRate) : 0);

      const rate = Number(item.price) || Number(item.rate) || 0;
      const qty = Number(item.quantity) || 1;

      return {
        id: item.id || generateId(),
        productId: item.productId || '',
        companyId: item.companyId || item.brandId || '',
        name: item.productName || item.name || '',
        rate,
        quantity: qty,
        unit: item.unit || 'Packet',
        gstRate: itemGstRate,
        total: rate * qty,
      };
    });

    const summary = calculateBillSummary(items);
    const currentItemsTotal = summary.finalAmount;
    const prevDue = Math.max(0, Number(updatedBillData.previousDue) || 0);
    const netPayable = Math.round((currentItemsTotal + prevDue) * 100) / 100;

    let finalPaymentStatus = updatedBillData.paymentStatus || 'PAID';
    let finalPaidAmount =
      updatedBillData.paidAmount !== null && updatedBillData.paidAmount !== undefined
        ? Math.max(0, Number(updatedBillData.paidAmount))
        : finalPaymentStatus === 'UNPAID'
        ? 0
        : netPayable;
    let finalUnpaidAmount =
      updatedBillData.unpaidAmount !== null && updatedBillData.unpaidAmount !== undefined
        ? Math.max(0, Number(updatedBillData.unpaidAmount))
        : Math.max(0, Math.round((netPayable - finalPaidAmount) * 100) / 100);

    // Auto-normalize status based on amounts
    if (finalPaidAmount >= netPayable) {
      finalPaymentStatus = 'PAID';
      finalUnpaidAmount = 0;
    } else if (finalPaidAmount <= 0) {
      finalPaymentStatus = 'UNPAID';
      finalPaidAmount = 0;
      finalUnpaidAmount = netPayable;
    } else {
      finalPaymentStatus = 'PARTIAL';
    }

    const existingBill = state.bills.find((b) => b.id === updatedBillData.id);

    const mergedBill = {
      ...(existingBill || {}),
      ...updatedBillData,
      items,
      totalItems: summary.totalItems,
      totalQty: summary.totalQty,
      subTotal: summary.subTotal,
      taxableAmount: summary.taxableAmount,
      gstRate: summary.gstRate,
      gstAmount: summary.gstAmount,
      cgstAmount: summary.cgstAmount,
      sgstAmount: summary.sgstAmount,
      totalAmount: summary.totalAmount,
      roundOff: summary.roundOff,
      currentAmount: currentItemsTotal,
      previousDue: prevDue,
      finalAmount: netPayable,
      paymentStatus: finalPaymentStatus,
      paidAmount: finalPaidAmount,
      unpaidAmount: finalUnpaidAmount,
      updatedAt: new Date().toISOString(),
    };

    // Save to IndexedDB
    await setItem('bills', mergedBill);

    // Update the shop's persistent outstanding balance if applicable
    if (mergedBill.shopId && mergedBill.shopId !== 'walkin') {
      const targetShop = state.shops.find((s) => s.id === mergedBill.shopId);
      if (targetShop) {
        await setItem('shops', {
          ...targetShop,
          outstandingBalance: finalUnpaidAmount,
        });
      }
    }

    await refreshData();

    // If currently viewing this bill in modal, update it
    if (state.generatedBill && state.generatedBill.id === mergedBill.id) {
      dispatch({ type: 'SET_GENERATED_BILL', payload: mergedBill });
    }

    showToast(`Bill #${mergedBill.billNumber} updated successfully!`, 'success');
    return mergedBill;
  };

  // Derived Daily Draft values
  const dailyDraftItems = useMemo(() => {
    return (state.dailyDraft?.productRows || []).filter(
      (r) => r.productId && Number(r.quantity) > 0
    );
  }, [state.dailyDraft?.productRows]);

  const dailyDraftCount = dailyDraftItems.length;

  const dailyDraftTotal = useMemo(() => {
    return dailyDraftItems.reduce(
      (sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.price) || 0),
      0
    );
  }, [dailyDraftItems]);

  const dailyDraftShop = useMemo(() => {
    if (!state.dailyDraft?.selectedShopId) return null;
    return state.shops.find((s) => s.id === state.dailyDraft.selectedShopId) || null;
  }, [state.dailyDraft?.selectedShopId, state.shops]);

  return (
    <AppContext.Provider
      value={{
        ...state,
        theme: state.theme,
        isDark,
        setTheme,
        toggleTheme,
        dispatch,
        isProfileOpen: state.isProfileOpen || false,
        openProfile: () => dispatch({ type: 'SET_PROFILE_OPEN', payload: true }),
        closeProfile: () => dispatch({ type: 'SET_PROFILE_OPEN', payload: false }),
        toggleProfile: () => dispatch({ type: 'TOGGLE_PROFILE' }),
        isMobileNavOpen: state.isMobileNavOpen || false,
        openMobileNav: () => dispatch({ type: 'SET_MOBILE_NAV_OPEN', payload: true }),
        closeMobileNav: () => dispatch({ type: 'SET_MOBILE_NAV_OPEN', payload: false }),
        toggleMobileNav: () => dispatch({ type: 'TOGGLE_MOBILE_NAV' }),
        setActivePage: (page) => dispatch({ type: 'SET_ACTIVE_PAGE', payload: page }),
        setGeneratedBill: (bill) => dispatch({ type: 'SET_GENERATED_BILL', payload: bill }),
        dailyDraft: state.dailyDraft,
        dailyDraftItems,
        dailyDraftCount,
        dailyDraftTotal,
        dailyDraftShop,
        setDailyDraft: (draft) => dispatch({ type: 'SET_DAILY_DRAFT', payload: draft }),
        clearDailyDraft: () => dispatch({ type: 'CLEAR_DAILY_DRAFT' }),
        addToCart: (product) => dispatch({ type: 'ADD_TO_CART', payload: product }),
        updateCartItemQty: (productId, quantity) =>
          dispatch({ type: 'UPDATE_CART_ITEM_QTY', payload: { productId, quantity } }),
        removeFromCart: (productId) => dispatch({ type: 'REMOVE_FROM_CART', payload: productId }),
        updateCartMeta: (meta) => dispatch({ type: 'UPDATE_CART_META', payload: meta }),
        clearCart: () => dispatch({ type: 'CLEAR_CART' }),
        addShop,
        updateShop,
        deleteShop,
        addCompany,
        updateCompany,
        deleteCompany,
        addProduct,
        updateProduct,
        updateProductRate,
        deleteProduct,
        updateSettings,
        generateAndSaveBill,
        createDeliveryBill,
        getShopOutstandingBalance,
        deleteBill,
        updateBill,
        refreshData,
        showToast,
        // Auth functions and state
        currentUser: state.currentUser,
        users: state.users,
        login,
        signup,
        logout,
        switchUser,
        isSupabaseConfigured,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
