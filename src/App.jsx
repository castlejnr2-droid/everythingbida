import { useState, useEffect, useRef, useCallback } from "react";
import * as api from "./api.js";

const formatPrice = (price) => `₦${Number(price).toLocaleString()}`;

// Deterministic color from category name
const CAT_COLORS = ["#F59E0B","#DC2626","#B45309","#10B981","#6366F1","#EC4899","#8B5CF6","#14B8A6"];
const getCategoryColor = (name) => {
  if (!name) return "#92400E";
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffffff;
  return CAT_COLORS[Math.abs(h) % CAT_COLORS.length];
};

const CAT_EMOJIS = { meat: "🥩", chicken: "🐔", turkey: "🦃", beef: "🥩", fish: "🐟", veg: "🥦", fruit: "🍎", grain: "🌾", spice: "🌶️", oil: "🫙", nut: "🥜", bev: "🥤", snack: "🍿" };
const getCategoryEmoji = (name) => {
  if (!name) return "🛍️";
  const n = name.toLowerCase();
  for (const [k, v] of Object.entries(CAT_EMOJIS)) if (n.includes(k)) return v;
  return "🛍️";
};

// Smart polling hook: runs fetchFn immediately, then every intervalMs.
// Pauses when tab is hidden; resumes (immediate fetch) when visible.
// Backs off to 60 s after 3+ consecutive failures. Never overlaps requests.
function useSmartPoll(fetchFn, intervalMs) {
  const fnRef = useRef(fetchFn);
  fnRef.current = fetchFn;

  useEffect(() => {
    let destroyed = false;
    let inFlight = false;
    let fails = 0;
    let timer = null;

    const doFetch = async () => {
      if (inFlight || destroyed) return;
      inFlight = true;
      try { await fnRef.current(); fails = 0; }
      catch { fails = Math.min(fails + 1, 99); }
      finally { inFlight = false; }
    };

    const schedule = () => {
      if (destroyed) return;
      timer = setTimeout(async () => {
        if (!document.hidden) await doFetch();
        schedule();
      }, fails >= 3 ? 60000 : intervalMs);
    };

    const onVisible = () => { if (!document.hidden) doFetch(); };

    doFetch().then(schedule);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      destroyed = true;
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [intervalMs]);
}

const linkifyText = (text) => {
  if (!text) return "";
  const re = /(https?:\/\/[^\s]+|(?:www\.|(?:vm\.)?tiktok\.com)[^\s]+)/gi;
  return text.split(re).map((part, i) =>
    part.match(re) ? (
      <a key={i} href={/^https?:\/\//i.test(part) ? part : "https://" + part}
        target="_blank" rel="noopener noreferrer"
        style={{ color: "#D97706", textDecoration: "underline", wordBreak: "break-all" }}
        onClick={(e) => e.stopPropagation()}>{part}</a>
    ) : part
  );
};

const VALID_STATUSES = ['pending','confirmed','preparing','out_for_delivery','ready_for_pickup','delivered'];
const STATUS_LABELS = { pending:'Pending', confirmed:'Confirmed', preparing:'Preparing', out_for_delivery:'Out for Delivery', ready_for_pickup:'Ready for Pickup', delivered:'Delivered' };
const STATUS_CSS = { pending:'status-pending', confirmed:'status-confirmed', preparing:'status-processing', out_for_delivery:'status-shipped', ready_for_pickup:'status-ready', delivered:'status-delivered' };

const styles = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, sans-serif; }
  .eb-wrap { background: #FEF3C7; min-height: 100vh; font-family: Arial, sans-serif; }
  .header { background: white; padding: 15px 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); position: sticky; top: 0; z-index: 100; }
  .header-inner { max-width: 1100px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; }
  .logo { display: flex; align-items: center; gap: 10px; }
  .logo-icon { width: 45px; height: 45px; display: flex; align-items: center; justify-content: center; }
  .nav { display: flex; gap: 8px; flex-wrap: wrap; }
  .nav-btn { padding: 8px 16px; border-radius: 8px; border: none; cursor: pointer; font-weight: 500; font-size: 14px; background: #FEF3C7; color: #92400E; transition: all 0.2s; }
  .nav-btn:hover { background: #FDE68A; }
  .nav-btn.active { background: #D97706; color: white; }
  .main { max-width: 1100px; margin: 0 auto; padding: 30px 20px; min-height: calc(100vh - 250px); }
  .card { background: white; border-radius: 16px; padding: 20px; box-shadow: 0 4px 15px rgba(0,0,0,0.08); margin-bottom: 15px; }
  .input { width: 100%; padding: 12px 15px; border-radius: 10px; border: 2px solid #FDE68A; font-size: 16px; margin-bottom: 12px; outline: none; font-family: Arial, sans-serif; }
  .input:focus { border-color: #D97706; }
  .btn { padding: 12px 24px; border-radius: 10px; border: none; background: linear-gradient(135deg, #D97706, #B45309); color: white; font-weight: bold; font-size: 16px; cursor: pointer; display: inline-block; text-align: center; transition: transform 0.2s; }
  .btn:hover { transform: scale(1.02); }
  .btn:active { transform: scale(0.98); }
  .btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
  .btn-outline { background: white; border: 2px solid #FDE68A; color: #92400E; }
  .btn-outline:hover { background: #FEF3C7; transform: scale(1.02); }
  .btn-danger { background: linear-gradient(135deg, #DC2626, #B91C1C); }
  .btn-green { background: linear-gradient(135deg, #10B981, #059669); }
  .products-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 20px; }
  .product-card { overflow: hidden; padding: 0; transition: transform 0.2s; }
  .product-card:hover { transform: translateY(-4px); box-shadow: 0 8px 25px rgba(0,0,0,0.12); }
  .product-img { height: 200px; background-size: cover; background-position: center; display: flex; align-items: center; justify-content: center; position: relative; font-size: 60px; background-color: #FEF3C7; }
  .product-img.no-image { background: linear-gradient(135deg, #FDE68A, #FEF3C7); }
  .product-tag { position: absolute; top: 10px; right: 10px; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: bold; text-transform: uppercase; color: white; box-shadow: 0 2px 8px rgba(0,0,0,0.2); }
  .product-info { padding: 18px; }
  .product-info h3 { color: #78350F; margin-bottom: 6px; font-size: 18px; }
  .product-info p { color: #92400E; font-size: 13px; margin-bottom: 15px; line-height: 1.5; }
  .product-footer { display: flex; justify-content: space-between; align-items: center; }
  .product-price { font-size: 22px; font-weight: bold; color: #78350F; }
  .cart-item { display: flex; align-items: center; gap: 15px; flex-wrap: wrap; padding: 15px; border-bottom: 1px solid #FEF3C7; }
  .cart-item-img { width: 55px; height: 55px; border-radius: 10px; background-size: cover; background-position: center; display: flex; align-items: center; justify-content: center; font-size: 30px; background-color: #FEF3C7; flex-shrink: 0; }
  .qty-btn { width: 32px; height: 32px; border-radius: 8px; border: none; background: #FEF3C7; cursor: pointer; font-weight: bold; font-size: 16px; color: #92400E; transition: background 0.2s; }
  .qty-btn:hover { background: #FDE68A; }
  .delivery-options { display: flex; gap: 12px; margin-bottom: 15px; }
  .delivery-option { flex: 1; padding: 15px; border-radius: 12px; border: 2px solid #FDE68A; text-align: center; cursor: pointer; background: white; transition: all 0.2s; }
  .delivery-option:hover { border-color: #FCD34D; transform: translateY(-2px); }
  .delivery-option.active { border-color: #D97706; background: #FEF3C7; }
  .modal { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 200; padding: 20px; }
  .modal-content { background: white; border-radius: 20px; padding: 30px; max-width: 420px; width: 100%; max-height: 90vh; overflow-y: auto; }
  .text-center { text-align: center; }
  .bank-box { background: #EFF6FF; border-radius: 12px; padding: 15px; margin-bottom: 15px; }
  .order-id-box { background: #FEF3C7; border-radius: 12px; padding: 15px; margin-bottom: 15px; text-align: center; }
  .payment-box { background: #FEF3C7; border-radius: 12px; padding: 15px; margin-bottom: 20px; }
  .chat-header { background: linear-gradient(135deg, #D97706, #B45309); padding: 15px 20px; border-radius: 16px 16px 0 0; color: white; }
  .chat-messages { height: 350px; overflow-y: auto; padding: 15px; background: #FFFBEB; }
  .chat-input-area { padding: 15px; border-top: 2px solid #FDE68A; display: flex; gap: 10px; position: relative; background: white; border-radius: 0 0 16px 16px; }
  .msg { margin-bottom: 15px; }
  .msg-system { text-align: center; }
  .msg-system span { background: #FEF3C7; color: #92400E; padding: 8px 15px; border-radius: 12px; font-size: 13px; display: inline-block; }
  .msg-customer { text-align: right; }
  .msg-customer .bubble { background: #D97706; color: white; }
  .msg-admin .bubble { background: white; border: 2px solid #FDE68A; color: #78350F; }
  .bubble { padding: 12px 16px; border-radius: 16px; display: inline-block; max-width: 75%; text-align: left; word-break: break-word; }
  .msg-time { font-size: 11px; color: #92400E; margin-top: 4px; }
  .order-card { border: 1px solid #FDE68A; }
  .order-header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; padding-bottom: 15px; margin-bottom: 15px; border-bottom: 2px solid #FEF3C7; }
  .order-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 15px; }
  .status-badge { padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: bold; text-transform: uppercase; }
  .status-pending { background: #FEF3C7; color: #92400E; }
  .status-confirmed { background: #DBEAFE; color: #1E40AF; }
  .status-paid { background: #D1FAE5; color: #065F46; }
  .status-processing { background: #FEF3C7; color: #D97706; }
  .status-shipped { background: #E0E7FF; color: #3730A3; }
  .status-ready { background: #DBEAFE; color: #1E40AF; }
  .status-delivered { background: #D1FAE5; color: #065F46; }
  .eb-footer { background: white; padding: 30px 20px; margin-top: 50px; text-align: center; color: #92400E; box-shadow: 0 -2px 10px rgba(0,0,0,0.05); }
  .image-upload-area { border: 2px dashed #FDE68A; border-radius: 12px; padding: 30px; text-align: center; cursor: pointer; background: #FFFBEB; margin-bottom: 15px; transition: all 0.2s; }
  .image-upload-area:hover { border-color: #D97706; }
  .admin-product-item { display: flex; align-items: center; gap: 15px; padding: 15px; border: 1px solid #FDE68A; border-radius: 12px; margin-bottom: 10px; flex-wrap: wrap; }
  .admin-product-img { width: 65px; height: 65px; border-radius: 10px; background-size: cover; background-position: center; display: flex; align-items: center; justify-content: center; background-color: #FEF3C7; flex-shrink: 0; }
  .admin-product-info { flex: 1; min-width: 120px; }
  @keyframes floaty { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-10px); } }
  .tiktok-float { position: fixed; bottom: 30px; right: 30px; width: 60px; height: 60px; background: #010101; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 8px 25px rgba(0,0,0,0.4); z-index: 150; animation: floaty 3s ease-in-out infinite; }
  .tiktok-float:hover { transform: scale(1.15) translateY(-4px); animation: none; }
  select.input { appearance: auto; }
  textarea.input { resize: vertical; }
  .flex { display: flex; }
  .gap-10 { gap: 10px; }
  .flex-1 { flex: 1; }
  .stock-badge { padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: bold; display: inline-block; margin-top: 4px; }
  .stock-ok { background: #D1FAE5; color: #065F46; }
  .stock-out { background: #FEE2E2; color: #DC2626; }
  .out-of-stock-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; }
  .out-of-stock-text { background: #DC2626; color: white; padding: 8px 20px; border-radius: 8px; font-weight: bold; font-size: 16px; transform: rotate(-15deg); }
  .search-bar { display: flex; gap: 10px; margin-bottom: 15px; align-items: center; flex-wrap: wrap; }
  .search-bar input { flex: 1; min-width: 200px; margin-bottom: 0; }
  .category-filters { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 20px; }
  .cat-btn { padding: 6px 16px; border-radius: 20px; border: 2px solid #FDE68A; background: white; color: #92400E; cursor: pointer; font-size: 13px; font-weight: 600; transition: all 0.2s; }
  .cat-btn:hover { border-color: #D97706; background: #FEF3C7; }
  .cat-btn.active { background: linear-gradient(135deg, #D97706, #B45309); color: white; border-color: #D97706; }
  .track-section { max-width: 500px; margin: 0 auto; }
  .track-timeline { position: relative; padding-left: 30px; margin: 20px 0; }
  .track-step { position: relative; padding-bottom: 20px; padding-left: 15px; }
  .track-step::before { content: ''; position: absolute; left: -30px; top: 0; width: 20px; height: 20px; border-radius: 50%; border: 3px solid #FDE68A; background: white; z-index: 1; }
  .track-step.completed::before { background: #D97706; border-color: #D97706; }
  .track-step.current::before { background: #D97706; border-color: #D97706; box-shadow: 0 0 0 4px rgba(217,119,6,0.3); }
  .track-step::after { content: ''; position: absolute; left: -21px; top: 20px; width: 2px; height: calc(100% - 20px); background: #FDE68A; }
  .track-step:last-child::after { display: none; }
  .track-step.completed::after { background: #D97706; }
  .location-card { padding: 13px 16px; border-radius: 10px; border: 2px solid #FDE68A; cursor: pointer; background: white; transition: all 0.2s; display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
  .location-card:hover { border-color: #D97706; background: #FFFBEB; }
  .location-card.loc-selected { border-color: #D97706; background: #FEF3C7; box-shadow: 0 0 0 3px rgba(217,119,6,0.25); }
  .location-card .loc-name { font-weight: bold; color: #78350F; font-size: 15px; }
  .location-card .loc-fee { font-size: 13px; color: #92400E; white-space: nowrap; margin-left: 10px; }
  .delivery-option.disabled-opt { opacity: 0.45; cursor: not-allowed; }
  .delivery-option.disabled-opt:hover { border-color: #FDE68A; transform: none; }
  .inline-error { color: #DC2626; font-size: 13px; margin-bottom: 10px; display: block; }
  .loc-inactive-row { opacity: 0.55; background: #F9FAFB; }
  .order-count-badge { font-size: 11px; background: #E0E7FF; color: #3730A3; padding: 2px 8px; border-radius: 10px; font-weight: 600; white-space: nowrap; }
  .pending-badge { font-size: 11px; background: #FEE2E2; color: #DC2626; padding: 2px 7px; border-radius: 10px; font-weight: 700; margin-left: 4px; }
  .vendor-status-pending { background: #FEF3C7; color: #92400E; }
  .vendor-status-contacted { background: #DBEAFE; color: #1E40AF; }
  .vendor-status-approved { background: #D1FAE5; color: #065F46; }
  .vendor-status-rejected { background: #FEE2E2; color: #DC2626; }
  .vendor-filter-tabs { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 18px; }
  .vendor-filter-tab { padding: 5px 14px; border-radius: 20px; border: 2px solid #FDE68A; background: white; color: #92400E; cursor: pointer; font-size: 13px; font-weight: 600; transition: all 0.15s; }
  .vendor-filter-tab:hover { border-color: #D97706; background: #FEF3C7; }
  .vendor-filter-tab.active { background: linear-gradient(135deg, #D97706, #B45309); color: white; border-color: #D97706; }
  .vendor-card { border: 1px solid #FDE68A; border-radius: 14px; padding: 18px; margin-bottom: 14px; }
  .vendor-photo { width: 80px; height: 80px; border-radius: 10px; background-size: cover; background-position: center; background-color: #FEF3C7; display: flex; align-items: center; justify-content: center; font-size: 36px; flex-shrink: 0; }
  .seller-form-confirm { background: #D1FAE5; border: 2px solid #6EE7B7; border-radius: 14px; padding: 28px; text-align: center; }
  /* --- Landing / Hero --- */
  .hero { background: linear-gradient(135deg, #78350F 0%, #B45309 60%, #D97706 100%); border-radius: 20px; padding: 44px 28px 36px; text-align: center; margin-bottom: 32px; color: white; }
  .hero-title { font-size: clamp(30px, 7vw, 52px); font-weight: 900; letter-spacing: -0.5px; margin-bottom: 10px; line-height: 1.1; }
  .hero-tagline { font-size: clamp(15px, 3.5vw, 19px); color: rgba(255,255,255,0.88); margin-bottom: 28px; line-height: 1.5; }
  .hero-ctas { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
  .hero-cta-primary { padding: 14px 32px; border-radius: 12px; border: none; background: white; color: #92400E; font-weight: 800; font-size: 16px; cursor: pointer; transition: transform 0.15s, box-shadow 0.15s; box-shadow: 0 4px 14px rgba(0,0,0,0.18); }
  .hero-cta-primary:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0,0,0,0.22); }
  .hero-cta-secondary { padding: 14px 28px; border-radius: 12px; border: 2px solid rgba(255,255,255,0.65); background: transparent; color: white; font-weight: 700; font-size: 16px; cursor: pointer; transition: background 0.15s, transform 0.15s; }
  .hero-cta-secondary:hover { background: rgba(255,255,255,0.12); transform: translateY(-2px); }
  .value-props { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 14px; margin-bottom: 24px; }
  .value-prop { background: white; border-radius: 14px; padding: 20px 18px; box-shadow: 0 2px 10px rgba(0,0,0,0.06); border: 1px solid #FDE68A; }
  .value-prop-icon { font-size: 30px; margin-bottom: 8px; }
  .value-prop h4 { color: #78350F; font-size: 15px; margin-bottom: 5px; }
  .value-prop p { color: #92400E; font-size: 13px; line-height: 1.55; }
  .how-it-works { background: white; border-radius: 14px; padding: 20px 24px; border: 1px solid #FDE68A; box-shadow: 0 2px 10px rgba(0,0,0,0.05); margin-bottom: 28px; }
  .how-it-works h3 { color: #78350F; font-size: 16px; font-weight: 700; margin-bottom: 14px; text-align: center; }
  .how-steps { display: flex; gap: 0; flex-wrap: nowrap; align-items: flex-start; justify-content: center; overflow-x: auto; }
  .how-step { text-align: center; flex: 1; min-width: 70px; padding: 0 4px; }
  .how-step-icon { font-size: 26px; display: block; margin-bottom: 5px; }
  .how-step-label { font-size: 12px; color: #92400E; font-weight: 600; line-height: 1.3; }
  .how-arrow { font-size: 18px; color: #D97706; align-self: center; padding: 0 2px; flex-shrink: 0; }
  @media (max-width: 380px) { .hero { padding: 32px 16px 28px; } .hero-cta-primary, .hero-cta-secondary { width: 100%; } .hero-ctas { flex-direction: column; } }
  .eta-msg { background: #FFFBEB; border: 1px solid #FDE68A; border-radius: 10px; padding: 11px 14px; color: #92400E; font-size: 13px; line-height: 1.5; margin: 10px 0; }
  .eta-msg.eta-delivered { background: #D1FAE5; border-color: #6EE7B7; color: #065F46; }
  .status-controls { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
  .next-status-btn { padding: 8px 14px; border-radius: 8px; border: none; background: linear-gradient(135deg, #D97706, #B45309); color: white; font-weight: bold; font-size: 13px; cursor: pointer; white-space: nowrap; transition: opacity 0.15s; }
  .next-status-btn:hover { opacity: 0.88; }
  .toggle-paid-btn { padding: 8px 12px; border-radius: 8px; font-size: 13px; cursor: pointer; border: 2px solid #6EE7B7; background: #D1FAE5; color: #065F46; font-weight: 600; white-space: nowrap; }
  .toggle-unpaid-btn { padding: 8px 12px; border-radius: 8px; font-size: 13px; cursor: pointer; border: 2px solid #FCA5A5; background: #FEE2E2; color: #DC2626; font-weight: 600; white-space: nowrap; }
  .status-select-sm { padding: 7px 10px; border-radius: 8px; border: 2px solid #FDE68A; font-size: 12px; background: white; color: #92400E; cursor: pointer; }
  .track-chat-btn { display: inline-block; margin-top: 16px; padding: 11px 22px; border-radius: 10px; border: none; background: linear-gradient(135deg, #D97706, #B45309); color: white; font-weight: bold; font-size: 15px; cursor: pointer; text-align: center; width: 100%; }
  .track-chat-btn:hover { opacity: 0.9; }
  .status-badge-unpaid { background: #FEF3C7; color: #92400E; }
`;



export default function App() {
  // Deep-link: ?order=EB######## navigates straight to track view
  const [deepLinkOrderId] = useState(() => {
    const p = new URLSearchParams(window.location.search).get('order');
    return p ? p.trim().toUpperCase() : null;
  });

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [locations, setLocations] = useState([]);
  const [bank, setBank] = useState({ name: '', acc_num: '', acc_name: '' });
  const [isAdmin, setIsAdmin] = useState(!!api.getToken());
  const [currentView, setCurrentView] = useState(deepLinkOrderId ? "track" : "shop");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successOrder, setSuccessOrder] = useState(null);
  const [loginError, setLoginError] = useState("");
  const [cart, setCart] = useState([]);
  const [approvedVendors, setApprovedVendors] = useState([]);
  const [pendingVendorCount, setPendingVendorCount] = useState(0);

  useEffect(() => {
    Promise.all([
      api.getProducts().catch(() => []),
      api.getCategories().catch(() => []),
      api.getLocations().catch(() => []),
      api.getBank().catch(() => ({})),
    ]).then(([p, c, l, b]) => {
      setProducts(p);
      setCategories(c);
      setLocations(l);
      setBank(b);
    });
    const onLogout = () => { setIsAdmin(false); setCurrentView("shop"); };
    window.addEventListener('eb:logout', onLogout);
    return () => window.removeEventListener('eb:logout', onLogout);
  }, []);

  const refreshVendorData = useCallback(async () => {
    try {
      const [approved, pending] = await Promise.all([
        api.getAdminVendors('approved'),
        api.getAdminVendors('pending'),
      ]);
      setApprovedVendors(approved);
      setPendingVendorCount(pending.length);
    } catch { /* token may not be set yet */ }
  }, []);

  const handleLogin = async (password) => {
    try {
      const { token } = await api.adminLogin(password);
      api.setToken(token);
      setIsAdmin(true);
      setShowLoginModal(false);
      setLoginError("");
      setCurrentView("admin");
      // Fetch vendor data now that we have a token
      setTimeout(refreshVendorData, 0);
    } catch (err) {
      setLoginError(err.message || "Invalid password");
    }
  };

  // Refresh vendor data if already logged in on page load
  useEffect(() => {
    if (isAdmin) refreshVendorData();
  }, [isAdmin, refreshVendorData]);

  const handleLogout = () => {
    api.clearToken();
    setIsAdmin(false);
    setCurrentView("shop");
    setApprovedVendors([]);
    setPendingVendorCount(0);
  };

  const addToCart = (product) => {
    if (!product.in_stock) return;
    setCart(prev => {
      const existing = prev.find(i => i.id === product.id);
      if (existing) return prev.map(i => i.id === product.id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { ...product, qty: 1 }];
    });
  };
  const updateQty = (id, change) => {
    setCart(prev => {
      const item = prev.find(i => i.id === id);
      if (!item) return prev;
      const newQty = item.qty + change;
      if (newQty <= 0) return prev.filter(i => i.id !== id);
      return prev.map(i => i.id === id ? { ...i, qty: newQty } : i);
    });
  };
  const removeFromCart = (id) => setCart(prev => prev.filter(i => i.id !== id));
  const clearCart = () => setCart([]);

  const placeOrder = async (customerInfo) => {
    const body = {
      customer_name: customerInfo.name,
      phone: customerInfo.phone,
      method: customerInfo.method,
      items: cart.map(i => ({ product_id: i.id, qty: i.qty })),
    };
    if (customerInfo.method === 'delivery') {
      body.location_id = Number(customerInfo.locationId);
      body.specific_address = customerInfo.address;
    }
    if (customerInfo.email && customerInfo.email.trim()) {
      body.email = customerInfo.email.trim();
    }
    const serverOrder = await api.postOrder(body);
    setSuccessOrder(serverOrder);
    setShowSuccessModal(true);
    clearCart();
    api.getProducts().then(setProducts).catch(() => {});
    return serverOrder;
  };

  return (
    <div className="eb-wrap">
      <style>{styles}</style>
      <Header isAdmin={isAdmin} currentView={currentView} setCurrentView={setCurrentView}
        setShowLoginModal={setShowLoginModal} handleLogout={handleLogout} cartCount={cart.length}
        pendingVendorCount={pendingVendorCount} />
      <main className="main">
        {currentView === "shop" && <ShopView products={products} addToCart={addToCart} setCurrentView={setCurrentView} categories={categories} />}
        {currentView === "cart" && <CartView cart={cart} updateQty={updateQty} removeFromCart={removeFromCart} placeOrder={placeOrder} bank={bank} locations={locations} />}
        {currentView === "track" && <TrackOrderView initialOrderId={deepLinkOrderId} setCurrentView={setCurrentView} setSelectedOrder={setSelectedOrder} />}
        {currentView === "chat" && <ChatView isAdmin={isAdmin} selectedOrder={selectedOrder} setSelectedOrder={setSelectedOrder} />}
        {currentView === "become-seller" && <BecomeSellerView />}
        {currentView === "admin" && isAdmin && <AdminView products={products} setProducts={setProducts} categories={categories} setCategories={setCategories} approvedVendors={approvedVendors} />}
        {currentView === "categories" && isAdmin && <CategoriesView setCategories={setCategories} />}
        {currentView === "locations" && isAdmin && <LocationsView setLocations={setLocations} />}
        {currentView === "sellers" && isAdmin && <SellersView onVendorDataChanged={refreshVendorData} />}
        {currentView === "orders" && isAdmin && <OrdersView setSelectedOrder={setSelectedOrder} setCurrentView={setCurrentView} />}
        {currentView === "bank" && isAdmin && <BankView bank={bank} setBank={setBank} />}
      </main>
      <footer className="eb-footer">
        <p style={{ fontSize: "16px", fontWeight: "bold", marginBottom: "8px" }}>© 2026 EverythingBida</p>
      </footer>
      {cart.length > 0 && currentView === "shop" && (
        <div onClick={() => setCurrentView("cart")} style={{
          position: "fixed", bottom: "110px", right: "20px", zIndex: 149,
          background: "linear-gradient(135deg, #D97706, #B45309)",
          color: "white", borderRadius: "30px", padding: "14px 22px",
          display: "flex", alignItems: "center", gap: "10px",
          cursor: "pointer", boxShadow: "0 8px 25px rgba(217,119,6,0.5)",
          animation: "floaty 3s ease-in-out infinite",
          fontWeight: "bold", fontSize: "15px"
        }}>
          <span style={{ background: "rgba(255,255,255,0.25)", borderRadius: "50%", width: "26px", height: "26px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", fontWeight: "bold" }}>{cart.length}</span>
          🛒 Proceed to Order
        </div>
      )}
      <div className="tiktok-float" onClick={() => window.open("https://tiktok.com/@everythingbida", "_blank")} title="Follow us on TikTok">
        <svg viewBox="0 0 24 24" width="28" height="28" fill="none">
          <path d="M19.321 5.562a5.124 5.124 0 0 1-.443-.258 6.228 6.228 0 0 1-1.137-.966c-.849-.971-1.166-1.959-1.282-2.648h.004C16.368 1.308 16.393 1 16.396 1h-3.91v14.801c0 .196 0 .391-.008.583 0 .023-.002.045-.004.07v.012a3.257 3.257 0 0 1-1.67 2.653 3.2 3.2 0 0 1-1.585.417c-1.78 0-3.225-1.452-3.225-3.244 0-1.791 1.445-3.243 3.225-3.243.347 0 .681.057.994.158l.005-3.966a7.12 7.12 0 0 0-.999-.07C6.467 9.171 3.5 12.155 3.5 15.842 3.5 19.529 6.467 22.5 10.219 22.5c3.752 0 6.719-2.97 6.719-6.658v-7.5a10.09 10.09 0 0 0 5.562 1.671V6.059a5.646 5.646 0 0 1-3.179-.497z" fill="white"/>
        </svg>
      </div>
      {showLoginModal && <LoginModal onClose={() => { setShowLoginModal(false); setLoginError(""); }} onLogin={handleLogin} error={loginError} />}
      {showSuccessModal && successOrder && <SuccessModal order={successOrder} bank={bank} onClose={(v) => { setShowSuccessModal(false); setCurrentView(v); }} />}
    </div>
  );
}

function Header({ isAdmin, currentView, setCurrentView, setShowLoginModal, handleLogout, cartCount, pendingVendorCount }) {
  const navItems = isAdmin
    ? [
        { id: "shop", label: "Shop", icon: "🏪" },
        { id: "admin", label: "Products", icon: "📦" },
        { id: "categories", label: "Categories", icon: "🏷️" },
        { id: "locations", label: "Locations", icon: "📍" },
        { id: "sellers", label: "Sellers", icon: "🏬", badge: pendingVendorCount > 0 ? pendingVendorCount : null },
        { id: "orders", label: "Orders", icon: "📋" },
        { id: "bank", label: "Bank", icon: "🏦" },
        { id: "chat", label: "Messages", icon: "💬" },
      ]
    : [
        { id: "shop", label: "Shop", icon: "🏪" },
        { id: "cart", label: `Cart${cartCount > 0 ? ` (${cartCount})` : ""}`, icon: "🛒" },
        { id: "track", label: "Track", icon: "📦" },
        { id: "chat", label: "Chat", icon: "💬" },
        { id: "become-seller", label: "Sell With Us", icon: "🏬" },
      ];
  return (
    <header className="header">
      <div className="header-inner">
        <div className="logo">
          <div className="logo-icon">
            <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIAAAACACAYAAADDPmHLAAAABGdBTUEAALGPC/xhBQAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAABmJLR0QA/wD/AP+gvaeTAAAAB3RJTUUH6AcDABMdW/HCkQAAHkhJREFUeNrtnXmYXEW59n+nqvvsZ/bJTCaTyUZCgBCykIQkQNhBBFkFBVxQFkHZREREUXBDcQFcEBQRBAVFEAQRBGQTZA9ZCCSQhCSTbDOZfe/u01Xv98fp6XQy3dM9Mz1JJ6nu6+rrerr71Knz1FNvvXW/b1WXUkqhKIrioHHEFUVRFAVQFEVRFEVRFEVRFEVRFEVRFEVRFEVRFEVRFEVRFEVRFEVRFEVRFEVRFEVRFEVRFEVRFEVRFEVRFEVRFEVRFEVRFEVRFEVRlPL9H25KUNfVhbXhAAAAJXRFWHRkYXRlOmNyZWF0ZQAyMDI0LTA3LTAzVDAwOjE5OjI5KzAwOjAw7+ZqFgAAACV0RVh0ZGF0ZTptb2RpZnkAMjAyNC0wNy0wM1QwMDoxOToyOSswMDowMJ67FKIAAAAASUVORK5CYII=" alt="EB" style={{width:"45px",height:"45px",objectFit:"contain"}} />
          </div>
          <div>
            <h1 style={{ fontSize: "22px", color: "#92400E" }}>EverythingBida</h1>
            <p style={{ fontSize: "11px", color: "#B45309" }}>your source for everything in bida.</p>
          </div>
        </div>
        <nav className="nav">
          {navItems.map(item => (
            <button key={item.id} className={`nav-btn ${currentView === item.id ? "active" : ""}`} onClick={() => setCurrentView(item.id)}>
              {item.icon} {item.label}
              {item.badge != null && <span className="pending-badge">{item.badge}</span>}
            </button>
          ))}
          {isAdmin
            ? <button className="nav-btn" onClick={handleLogout}>🚪 Logout</button>
            : <button className="nav-btn" onClick={() => setShowLoginModal(true)}>🔐 Admin</button>}
        </nav>
      </div>
    </header>
  );
}

function StockBadge({ inStock }) {
  if (inStock === undefined || inStock === null) return null;
  if (!inStock) return <span className="stock-badge stock-out">Out of Stock</span>;
  return <span className="stock-badge stock-ok">In Stock</span>;
}

function ShopView({ products, addToCart, setCurrentView, categories }) {
  const [searchText, setSearchText] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const catalogRef = useRef(null);

  const scrollToCatalog = () => {
    catalogRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // Only show category pills that have at least one product in the current catalog
  const visibleCategories = categories.filter(c => products.some(p => p.category_name === c.name));

  const filtered = products.filter(p => {
    const matchesSearch = !searchText ||
      p.name.toLowerCase().includes(searchText.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(searchText.toLowerCase()));
    const matchesCategory = selectedCategory === "All" || p.category_name === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <>
      {/* --- Hero / Landing --- */}
      <div className="hero">
        <div className="hero-title">EverythingBida</div>
        <div className="hero-tagline">Hyperlocal same-day delivery in Bida.<br />Order now — at your door in minutes.</div>
        <div className="hero-ctas">
          <button className="hero-cta-primary" onClick={scrollToCatalog}>🛒 Shop Now</button>
          <button className="hero-cta-secondary" onClick={() => setCurrentView("become-seller")}>🏬 Become a Seller</button>
        </div>
      </div>

      {/* --- Value Props --- */}
      <div className="value-props">
        <div className="value-prop">
          <div className="value-prop-icon">⚡</div>
          <h4>Instant Availability</h4>
          <p>Only products in stock and ready in Bida today are listed. What you see is what you can get right now.</p>
        </div>
        <div className="value-prop">
          <div className="value-prop-icon">🚀</div>
          <h4>Delivery in Minutes</h4>
          <p>Order now, receive within 10–60 minutes at your doorstep.</p>
        </div>
        <div className="value-prop">
          <div className="value-prop-icon">🛍️</div>
          <h4>Effortless Selling</h4>
          <p>Vendors list products in seconds and reach customers across Bida instantly. Our team verifies and approves quickly.</p>
        </div>
        <div className="value-prop">
          <div className="value-prop-icon">🏎️</div>
          <h4>Built for Speed</h4>
          <p>We solve the biggest frustration with online shopping: slow delivery.</p>
        </div>
      </div>

      {/* --- How It Works --- */}
      <div className="how-it-works">
        <h3>How it works</h3>
        <div className="how-steps">
          <div className="how-step"><span className="how-step-icon">🔍</span><span className="how-step-label">Browse</span></div>
          <div className="how-arrow">›</div>
          <div className="how-step"><span className="how-step-icon">🛒</span><span className="how-step-label">Order</span></div>
          <div className="how-arrow">›</div>
          <div className="how-step"><span className="how-step-icon">💳</span><span className="how-step-label">Pay by transfer</span></div>
          <div className="how-arrow">›</div>
          <div className="how-step"><span className="how-step-icon">🚚</span><span className="how-step-label">Delivered in 10–60 min</span></div>
        </div>
      </div>

      {/* --- Catalog anchor --- */}
      <div ref={catalogRef}>
      <div className="search-bar">
        <input type="text" className="input" placeholder="🔍 Search products..." value={searchText} onChange={e => setSearchText(e.target.value)} />
        {searchText && (
          <button className="btn btn-outline" style={{ padding: "12px 14px", whiteSpace: "nowrap" }} onClick={() => setSearchText("")}>✕ Clear</button>
        )}
        <button className="btn btn-outline" style={{ padding: "12px 20px", whiteSpace: "nowrap" }} onClick={() => setCurrentView("track")}>📦 Track Order</button>
      </div>
      <div className="category-filters">
        {["All", ...visibleCategories.map(c => c.name)].map(cat => (
          <button key={cat} className={`cat-btn ${selectedCategory === cat ? "active" : ""}`} onClick={() => setSelectedCategory(cat)}>{cat}</button>
        ))}
      </div>
      {filtered.length === 0 ? (
        <div className="card text-center" style={{ padding: "50px" }}>
          <div style={{ fontSize: "60px", marginBottom: "15px" }}>🔍</div>
          <h3 style={{ color: "#78350F" }}>No Products Found</h3>
          <p style={{ color: "#92400E" }}>Try a different search or category.</p>
        </div>
      ) : (
        <div className="products-grid">
          {filtered.map(product => {
            const outOfStock = !product.in_stock;
            const imgSrc = product.image_id ? api.imageUrl(product.image_id) : null;
            return (
              <div key={product.id} className="card product-card">
                <div className={`product-img ${!imgSrc ? "no-image" : ""}`} style={imgSrc ? { backgroundImage: `url(${imgSrc})` } : {}}>
                  {!imgSrc && <span>{getCategoryEmoji(product.category_name)}</span>}
                  <span className="product-tag" style={{ background: getCategoryColor(product.category_name) }}>{product.category_name || 'Other'}</span>
                  {outOfStock && <div className="out-of-stock-overlay"><span className="out-of-stock-text">OUT OF STOCK</span></div>}
                </div>
                <div className="product-info">
                  <h3>{product.name}</h3>
                  <p>{linkifyText(product.description)}</p>
                  <StockBadge inStock={product.in_stock} />
                  <div className="product-footer" style={{ marginTop: "10px" }}>
                    <div className="product-price">{formatPrice(product.price)}/kg</div>
                    <button className="btn" disabled={outOfStock} onClick={() => addToCart(product)}>{outOfStock ? "Sold Out" : "Add to Cart"}</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      </div>{/* /catalogRef */}
    </>
  );
}

const DELIVERY_STEPS = ["pending","confirmed","preparing","out_for_delivery","delivered"];
const PICKUP_STEPS   = ["pending","confirmed","preparing","ready_for_pickup","delivered"];

const ETA_MESSAGES = {
  pending:            "We've received your order and will confirm it shortly.",
  confirmed:          "Your order is confirmed! We're getting it ready for you.",
  preparing:          "Your order is being freshly prepared.",
  out_for_delivery:   "Your order is on its way! Delivery to most locations in Bida typically takes 10–60 minutes.",
  ready_for_pickup:   "Your order is ready for pickup at our store. Please come collect it at your earliest convenience.",
  delivered:          "Your order has been delivered. Thank you for choosing EverythingBida!",
};

function TrackOrderView({ initialOrderId, setCurrentView, setSelectedOrder }) {
  const [trackId, setTrackId] = useState(initialOrderId || "");
  const [foundOrder, setFoundOrder] = useState(null);
  const [currentOrderId, setCurrentOrderId] = useState(null);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const handleTrack = async (id) => {
    const clean = (id !== undefined ? id : trackId).trim().toUpperCase();
    if (!clean) return;
    setLoading(true);
    setSearched(true);
    setNotFound(false);
    try {
      const order = await api.getOrder(clean);
      setFoundOrder(order);
      setCurrentOrderId(clean);
    } catch {
      setFoundOrder(null);
      setCurrentOrderId(null);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  // Auto-load deep-link order on mount
  useEffect(() => {
    if (initialOrderId) handleTrack(initialOrderId);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Poll loaded order every 20 s (smart: visibility-aware, backoff on failures)
  const pollOrder = useCallback(async () => {
    if (!currentOrderId) return;
    const order = await api.getOrder(currentOrderId);
    setFoundOrder(order);
  }, [currentOrderId]);

  useSmartPoll(pollOrder, 20000);

  const goToChat = () => {
    if (!currentOrderId) return;
    if (setSelectedOrder) setSelectedOrder(currentOrderId);
    if (setCurrentView) setCurrentView("chat");
  };

  return (
    <div className="track-section">
      <h2 style={{ fontSize: "26px", fontWeight: "bold", color: "#78350F", marginBottom: "25px", textAlign: "center" }}>📦 Track Your Order</h2>
      <div className="card">
        <p style={{ color: "#92400E", marginBottom: "15px" }}>Enter your Order ID to check the status of your order.</p>
        <div style={{ display: "flex", gap: "10px" }}>
          <input type="text" className="input" placeholder="e.g. EB12345678" value={trackId}
            onChange={e => setTrackId(e.target.value)} onKeyDown={e => e.key === "Enter" && handleTrack()}
            style={{ marginBottom: 0, flex: 1 }} />
          <button className="btn" onClick={() => handleTrack()} disabled={loading}>{loading ? "…" : "Track"}</button>
        </div>
      </div>

      {searched && !loading && notFound && (
        <div className="card text-center" style={{ padding: "30px" }}>
          <div style={{ fontSize: "50px", marginBottom: "10px" }}>❌</div>
          <h3 style={{ color: "#DC2626" }}>Order Not Found</h3>
          <p style={{ color: "#92400E" }}>Please check your Order ID and try again. Order IDs start with EB followed by 8 digits.</p>
        </div>
      )}

      {foundOrder && (() => {
        const steps = foundOrder.method === 'pickup' ? PICKUP_STEPS : DELIVERY_STEPS;
        const currentIdx = steps.indexOf(foundOrder.status);
        const etaMsg = ETA_MESSAGES[foundOrder.status];
        return (
          <div className="card">
            {/* Header: order ID + timestamps */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "10px", marginBottom: "16px" }}>
              <div>
                <h3 style={{ color: "#78350F", fontFamily: "monospace", fontSize: "18px" }}>{foundOrder.id}</h3>
                <p style={{ color: "#92400E", fontSize: "12px", marginTop: "4px" }}>
                  Placed: {new Date(foundOrder.created_at).toLocaleString()}
                </p>
              </div>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <span className={`status-badge ${STATUS_CSS[foundOrder.status] || 'status-pending'}`}>{STATUS_LABELS[foundOrder.status] || foundOrder.status}</span>
                <span className={`status-badge ${foundOrder.paid ? 'status-paid' : 'status-badge-unpaid'}`}>{foundOrder.paid ? "✓ Paid" : "Awaiting Payment"}</span>
              </div>
            </div>

            {/* ETA message */}
            {etaMsg && (
              <div className={`eta-msg${foundOrder.status === 'delivered' ? ' eta-delivered' : ''}`}>
                {foundOrder.status === 'delivered' ? '✅ ' : 'ℹ️ '}{etaMsg}
              </div>
            )}

            {/* Status timeline */}
            <div className="track-timeline">
              {steps.map((step, idx) => {
                const isCompleted = idx < currentIdx;
                const isCurrent = idx === currentIdx;
                return (
                  <div key={step} className={`track-step ${isCompleted ? "completed" : ""} ${isCurrent ? "current" : ""}`}>
                    <div style={{ fontWeight: isCurrent ? "bold" : "normal", color: isCompleted || isCurrent ? "#78350F" : "#B45309" }}>
                      {isCompleted && "✓ "}{STATUS_LABELS[step] || step}{isCurrent && " ← Now"}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Delivery / pickup info */}
            {foundOrder.method === 'delivery' && (foundOrder.location_name || foundOrder.specific_address) && (
              <div style={{ borderTop: "2px solid #FEF3C7", paddingTop: "12px", marginBottom: "12px" }}>
                <p style={{ fontSize: "12px", fontWeight: "bold", color: "#92400E", marginBottom: "4px" }}>📍 Delivery to</p>
                {foundOrder.location_name && <p style={{ color: "#78350F", fontWeight: 600 }}>{foundOrder.location_name}</p>}
                {foundOrder.specific_address && <p style={{ color: "#92400E", fontSize: "13px" }}>{foundOrder.specific_address}</p>}
              </div>
            )}
            {foundOrder.method === 'pickup' && (
              <div style={{ borderTop: "2px solid #FEF3C7", paddingTop: "12px", marginBottom: "12px" }}>
                <p style={{ fontSize: "12px", fontWeight: "bold", color: "#92400E" }}>🏪 Store Pickup</p>
              </div>
            )}

            {/* Items + totals */}
            <div style={{ borderTop: "2px solid #FEF3C7", paddingTop: "15px", marginTop: "4px" }}>
              <h4 style={{ color: "#78350F", marginBottom: "10px" }}>Order Items</h4>
              {(foundOrder.items || []).map((item, idx) => (
                <div key={idx} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", color: "#92400E" }}>
                  <span>{item.qty}× {item.name}</span>
                  <span style={{ fontWeight: "bold" }}>{formatPrice(item.line_total || item.price * item.qty)}</span>
                </div>
              ))}
              <div style={{ borderTop: "1px dashed #FDE68A", marginTop: "8px", paddingTop: "8px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", color: "#92400E" }}>
                  <span>Subtotal</span>
                  <span>{formatPrice(foundOrder.subtotal)}</span>
                </div>
                {foundOrder.delivery_fee > 0 && (
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", color: "#92400E" }}>
                    <span>Delivery fee{foundOrder.location_name ? ` (${foundOrder.location_name})` : ''}</span>
                    <span>{formatPrice(foundOrder.delivery_fee)}</span>
                  </div>
                )}
                <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0 0", borderTop: "2px solid #FDE68A", marginTop: "6px", fontWeight: "bold", color: "#78350F", fontSize: "17px" }}>
                  <span>Total</span>
                  <span>{formatPrice(foundOrder.total)}</span>
                </div>
              </div>
            </div>

            {/* Chat entry */}
            {foundOrder.status !== 'delivered' && setCurrentView && (
              <button className="track-chat-btn" onClick={goToChat}>💬 Chat with Us About This Order</button>
            )}
          </div>
        );
      })()}
    </div>
  );
}

function CartView({ cart, updateQty, removeFromCart, placeOrder, bank, locations }) {
  const [customerInfo, setCustomerInfo] = useState({ name: "", phone: "", email: "", method: "pickup", address: "", locationId: "" });
  const [placing, setPlacing] = useState(false);
  const [locationSearch, setLocationSearch] = useState("");
  const [errors, setErrors] = useState({});
  const [orderError, setOrderError] = useState("");

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const selectedLoc = locations.find(l => l.id === Number(customerInfo.locationId));
  const deliveryFee = customerInfo.method === 'delivery' && selectedLoc ? parseFloat(selectedLoc.delivery_fee) : 0;
  const hasActiveLocations = locations.length > 0;

  const filteredLocations = locationSearch.trim()
    ? locations.filter(l => l.name.toLowerCase().includes(locationSearch.toLowerCase()))
    : locations;

  const selectLocation = (loc) => {
    setCustomerInfo(prev => ({ ...prev, locationId: String(loc.id), address: "" }));
    setErrors(prev => ({ ...prev, location: undefined }));
    setLocationSearch("");
  };

  const handleSubmit = async () => {
    const newErrors = {};
    if (!customerInfo.name.trim()) newErrors.name = "Name is required";
    if (!customerInfo.phone.trim()) newErrors.phone = "Phone number is required";
    if (customerInfo.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerInfo.email.trim())) {
      newErrors.email = "Please enter a valid email address";
    }
    if (customerInfo.method === "delivery") {
      if (!customerInfo.locationId) newErrors.location = "Please select a delivery area";
      if (!customerInfo.address.trim()) newErrors.address = "Please describe your specific location";
    }
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }
    setErrors({});
    setOrderError("");
    setPlacing(true);
    try {
      await placeOrder(customerInfo);
    } catch (err) {
      setOrderError(err.message || 'Order failed. Please try again.');
    } finally {
      setPlacing(false);
    }
  };

  if (cart.length === 0) return (
    <div className="card text-center" style={{ padding: "50px" }}>
      <div style={{ fontSize: "60px", marginBottom: "15px" }}>🛒</div>
      <h3 style={{ color: "#78350F" }}>Your Cart is Empty</h3>
      <p style={{ color: "#92400E" }}>Add some delicious products to get started!</p>
    </div>
  );

  return (
    <>
      <h2 style={{ fontSize: "26px", fontWeight: "bold", color: "#78350F", marginBottom: "25px" }}>Your Cart</h2>
      <div className="card">
        {cart.map(item => {
          const imgSrc = item.image_id ? api.imageUrl(item.image_id) : null;
          return (
            <div key={item.id} className="cart-item">
              <div className="cart-item-img" style={imgSrc ? { backgroundImage: `url(${imgSrc})`, backgroundSize: 'cover' } : {}}>
                {!imgSrc && getCategoryEmoji(item.category_name)}
              </div>
              <div style={{ flex: 1 }}>
                <h4 style={{ color: "#78350F" }}>{item.name}</h4>
                <p style={{ color: "#92400E", fontSize: "14px" }}>{formatPrice(item.price)}/kg</p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <button className="qty-btn" onClick={() => updateQty(item.id, -1)}>−</button>
                <span style={{ fontWeight: "bold", minWidth: "30px", textAlign: "center" }}>{item.qty}kg</span>
                <button className="qty-btn" onClick={() => updateQty(item.id, 1)}>+</button>
              </div>
              <div style={{ fontWeight: "bold", color: "#78350F", minWidth: "100px", textAlign: "right" }}>{formatPrice(item.price * item.qty)}</div>
              <button className="btn btn-outline" style={{ padding: "8px 12px", fontSize: "13px" }} onClick={() => removeFromCart(item.id)}>Remove</button>
            </div>
          );
        })}
        <div style={{ marginTop: "20px", paddingTop: "20px", borderTop: "2px solid #FDE68A" }}>
          <div style={{ display: "flex", justifyContent: "space-between", color: "#92400E", marginBottom: "6px" }}>
            <span>Subtotal</span><span>{formatPrice(subtotal)}</span>
          </div>
          {customerInfo.method === 'delivery' && selectedLoc && (
            <div style={{ display: "flex", justifyContent: "space-between", color: "#92400E", marginBottom: "6px" }}>
              <span>Delivery to {selectedLoc.name}</span><span>{formatPrice(deliveryFee)}</span>
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold", color: "#78350F", fontSize: "18px", borderTop: "1px solid #FDE68A", paddingTop: "10px" }}>
            <span>Est. Total:</span><span>{formatPrice(subtotal + deliveryFee)}</span>
          </div>
        </div>
      </div>

      <div className="card">
        <h3 style={{ color: "#78350F", marginBottom: "20px" }}>Customer Information</h3>
        <input type="text" className="input" placeholder="Name" value={customerInfo.name}
          onChange={e => { setCustomerInfo(prev => ({ ...prev, name: e.target.value })); setErrors(prev => ({ ...prev, name: undefined })); }} />
        {errors.name && <span className="inline-error">{errors.name}</span>}
        <input type="tel" className="input" placeholder="Phone Number" value={customerInfo.phone}
          onChange={e => { setCustomerInfo(prev => ({ ...prev, phone: e.target.value })); setErrors(prev => ({ ...prev, phone: undefined })); }} />
        {errors.phone && <span className="inline-error">{errors.phone}</span>}

        <label style={{ display: "block", fontSize: "13px", color: "#92400E", marginBottom: "4px", marginTop: "6px" }}>
          Email <span style={{ fontWeight: "normal", color: "#B45309" }}>(optional) &mdash; get your order details and tracking link</span>
        </label>
        <input type="email" className="input" placeholder="your@email.com" value={customerInfo.email}
          onChange={e => { setCustomerInfo(prev => ({ ...prev, email: e.target.value })); setErrors(prev => ({ ...prev, email: undefined })); }} />
        {errors.email && <span className="inline-error">{errors.email}</span>}

        <h4 style={{ color: "#78350F", marginBottom: "12px", marginTop: "10px" }}>Delivery Method</h4>
        <div className="delivery-options">
          <div className={`delivery-option ${customerInfo.method === "pickup" ? "active" : ""}`}
            onClick={() => { setCustomerInfo(prev => ({ ...prev, method: "pickup", locationId: "", address: "" })); setErrors({}); setLocationSearch(""); }}>
            <div style={{ fontSize: "28px" }}>🏪</div>
            <div style={{ fontWeight: "bold", color: "#78350F", marginTop: "8px" }}>Store Pickup</div>
          </div>
          <div
            className={`delivery-option ${customerInfo.method === "delivery" ? "active" : ""} ${!hasActiveLocations ? "disabled-opt" : ""}`}
            onClick={() => { if (hasActiveLocations) { setCustomerInfo(prev => ({ ...prev, method: "delivery" })); setErrors({}); } }}>
            <div style={{ fontSize: "28px" }}>🚚</div>
            <div style={{ fontWeight: "bold", color: "#78350F", marginTop: "8px" }}>Home Delivery</div>
            {!hasActiveLocations && <div style={{ fontSize: "11px", color: "#DC2626", marginTop: "4px" }}>Currently unavailable</div>}
          </div>
        </div>

        {customerInfo.method === "delivery" && (
          <>
            {/* Step 1: Location picker */}
            <h4 style={{ color: "#78350F", marginBottom: "10px", marginTop: "4px" }}>Select Delivery Area</h4>
            <input type="text" className="input" placeholder="Search locations…" value={locationSearch}
              onChange={e => setLocationSearch(e.target.value)} style={{ marginBottom: "10px" }} />
            <div style={{ maxHeight: "260px", overflowY: "auto", marginBottom: "10px" }}>
              {filteredLocations.length === 0 && (
                <p style={{ color: "#92400E", fontSize: "14px", padding: "10px 0" }}>No locations match your search.</p>
              )}
              {filteredLocations.map(loc => (
                <div key={loc.id}
                  className={`location-card ${customerInfo.locationId === String(loc.id) ? "loc-selected" : ""}`}
                  onClick={() => selectLocation(loc)}>
                  <span className="loc-name">{loc.name}</span>
                  <span className="loc-fee">{formatPrice(loc.delivery_fee)} delivery</span>
                </div>
              ))}
            </div>
            {errors.location && <span className="inline-error">{errors.location}</span>}

            {/* Step 2: specific address — only shown after a location is chosen */}
            {selectedLoc && (
              <>
                <h4 style={{ color: "#78350F", marginBottom: "8px" }}>
                  Specific place in <span style={{ color: "#D97706" }}>{selectedLoc.name}</span>
                </h4>
                <textarea className="input"
                  placeholder="Street, house number, landmark or directions to reach you…"
                  value={customerInfo.address}
                  onChange={e => { setCustomerInfo(prev => ({ ...prev, address: e.target.value })); setErrors(prev => ({ ...prev, address: undefined })); }}
                  rows="3" />
                {errors.address && <span className="inline-error">{errors.address}</span>}
              </>
            )}
          </>
        )}

        <div className="payment-box">
          <p style={{ fontWeight: "bold", color: "#92400E", marginBottom: "8px" }}>💳 Payment Details:</p>
          <p style={{ color: "#78350F", fontWeight: "bold" }}>{bank.name}</p>
          <p style={{ color: "#92400E" }}>{bank.acc_num}</p>
          <p style={{ color: "#92400E" }}>{bank.acc_name}</p>
        </div>
        {orderError && (
          <div style={{ background: "#FEE2E2", border: "2px solid #FCA5A5", borderRadius: "10px", padding: "14px", marginBottom: "14px", color: "#DC2626", fontWeight: "600" }}>
            ⚠️ {orderError}
          </div>
        )}
        <button className="btn" style={{ width: "100%", padding: "18px", fontSize: "20px" }} onClick={handleSubmit} disabled={placing}>
          {placing ? "Placing Order…" : "Place Order"}
        </button>
      </div>
    </>
  );
}

function AdminView({ products, setProducts, categories, setCategories, approvedVendors }) {
  const initialForm = { name: "", category_id: "", price: "", description: "", image_id: null, in_stock: true, vendor_id: "" };
  const [formData, setFormData] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [imgPreview, setImgPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const [addingCategory, setAddingCategory] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatEmoji, setNewCatEmoji] = useState("");
  const [savingCat, setSavingCat] = useState(false);

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert("Max 5MB"); return; }
    setUploading(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const dataUrl = reader.result;
        const base64 = dataUrl.split(',')[1];
        const { id } = await api.uploadImage(file.type, base64);
        setFormData(f => ({ ...f, image_id: id }));
        setImgPreview(api.imageUrl(id));
      } catch (err) {
        alert('Image upload failed: ' + err.message);
      } finally {
        setUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const startEdit = (product) => {
    setEditingId(product.id);
    setFormData({
      name: product.name,
      category_id: product.category_id ? String(product.category_id) : "",
      price: String(product.price),
      description: product.description || "",
      image_id: product.image_id || null,
      in_stock: product.in_stock,
      vendor_id: product.vendor_id ? String(product.vendor_id) : "",
    });
    setImgPreview(product.image_id ? api.imageUrl(product.image_id) : null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setFormData(initialForm);
    setImgPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleCreateCategory = async () => {
    if (!newCatName.trim()) return;
    setSavingCat(true);
    try {
      const created = await api.createCategory({ name: newCatName.trim(), emoji: newCatEmoji.trim() });
      setCategories(prev => [...prev, created]);
      setFormData(f => ({ ...f, category_id: String(created.id) }));
      setAddingCategory(false);
      setNewCatName(""); setNewCatEmoji("");
    } catch (err) {
      alert('Error creating category: ' + err.message);
    } finally {
      setSavingCat(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.price) { alert("Name and price are required"); return; }
    const body = {
      name: formData.name.trim(),
      price: parseInt(formData.price),
      description: formData.description,
      category_id: formData.category_id ? parseInt(formData.category_id) : null,
      image_id: formData.image_id,
      in_stock: formData.in_stock,
      vendor_id: formData.vendor_id ? parseInt(formData.vendor_id) : null,
    };
    try {
      if (editingId) {
        const updated = await api.updateProduct(editingId, body);
        setProducts(prev => prev.map(p => p.id === editingId ? updated : p));
        alert("Product updated!");
        cancelEdit();
      } else {
        const created = await api.createProduct(body);
        setProducts(prev => [...prev, created]);
        setFormData(initialForm);
        setImgPreview(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        alert("Product added!");
      }
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this product?")) return;
    try {
      await api.deleteProduct(id);
      setProducts(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const toggleStock = async (product) => {
    try {
      const updated = await api.updateProduct(product.id, { in_stock: !product.in_stock });
      setProducts(prev => prev.map(p => p.id === product.id ? { ...p, ...updated } : p));
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  return (
    <>
      <h2 style={{ fontSize: "26px", fontWeight: "bold", color: "#78350F", marginBottom: "25px" }}>Product Management</h2>
      <div className="card">
        <h3 style={{ color: "#78350F", marginBottom: "20px" }}>{editingId ? "✏️ Edit Product" : "➕ Add New Product"}</h3>
        <div className="image-upload-area" onClick={() => !imgPreview && fileInputRef.current?.click()}>
          {uploading ? (
            <p style={{ color: "#D97706" }}>Uploading…</p>
          ) : imgPreview ? (
            <div style={{ position: "relative" }}>
              <img src={imgPreview} alt="Preview" style={{ maxWidth: "100%", maxHeight: "200px", borderRadius: "8px" }} />
              <button onClick={e => { e.stopPropagation(); setFormData(f => ({ ...f, image_id: null })); setImgPreview(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                style={{ position: "absolute", top: "10px", right: "10px", padding: "8px 12px", borderRadius: "8px", border: "none", background: "#DC2626", color: "white", cursor: "pointer", fontWeight: "bold" }}>
                Remove
              </button>
            </div>
          ) : (
            <>
              <div style={{ fontSize: "40px" }}>📸</div>
              <p style={{ color: "#D97706", fontWeight: "bold", marginBottom: "5px" }}>Click to upload product image</p>
              <p style={{ color: "#92400E", fontSize: "13px" }}>JPG, PNG or WebP (max 5MB)</p>
            </>
          )}
        </div>
        <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImageUpload} style={{ display: "none" }} />
        <input type="text" className="input" placeholder="Product Name" value={formData.name} onChange={e => setFormData(f => ({ ...f, name: e.target.value }))} />
        {addingCategory ? (
          <div style={{ display: "flex", gap: "8px", marginBottom: "12px", flexWrap: "wrap" }}>
            <input className="input" style={{ marginBottom: 0, width: "54px" }} placeholder="🛍️" value={newCatEmoji} onChange={e => setNewCatEmoji(e.target.value)} />
            <input className="input" style={{ marginBottom: 0, flex: 1, minWidth: "120px" }} placeholder="New category name…" value={newCatName} onChange={e => setNewCatName(e.target.value)} onKeyDown={e => e.key === "Enter" && handleCreateCategory()} autoFocus />
            <button className="btn" style={{ padding: "8px 14px", fontSize: "13px" }} onClick={handleCreateCategory} disabled={savingCat || !newCatName.trim()}>{savingCat ? "…" : "Create"}</button>
            <button className="btn btn-outline" style={{ padding: "8px 14px", fontSize: "13px" }} onClick={() => { setAddingCategory(false); setNewCatName(""); setNewCatEmoji(""); }}>Cancel</button>
          </div>
        ) : (
          <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
            <select className="input" style={{ marginBottom: 0, flex: 1 }} value={formData.category_id} onChange={e => setFormData(f => ({ ...f, category_id: e.target.value }))}>
              <option value="">No category</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.emoji ? cat.emoji + " " : ""}{cat.name}</option>
              ))}
            </select>
            <button className="btn btn-outline" style={{ padding: "10px 14px", fontSize: "13px", whiteSpace: "nowrap" }} onClick={() => setAddingCategory(true)}>+ New</button>
          </div>
        )}
        <input type="number" className="input" placeholder="Price per kg (₦)" value={formData.price} onChange={e => setFormData(f => ({ ...f, price: e.target.value }))} />
        <textarea className="input" placeholder="Description" value={formData.description} onChange={e => setFormData(f => ({ ...f, description: e.target.value }))} rows="3" />
        <label style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "15px", cursor: "pointer", color: "#92400E" }}>
          <input type="checkbox" checked={formData.in_stock} onChange={e => setFormData(f => ({ ...f, in_stock: e.target.checked }))} style={{ width: "18px", height: "18px" }} />
          In Stock
        </label>
        {approvedVendors.length > 0 && (
          <select className="input" value={formData.vendor_id} onChange={e => setFormData(f => ({ ...f, vendor_id: e.target.value }))}>
            <option value="">No supplier/vendor</option>
            {approvedVendors.map(v => (
              <option key={v.id} value={v.id}>{v.name}</option>
            ))}
          </select>
        )}
        <div style={{ display: "flex", gap: "10px" }}>
          {editingId && <button className="btn btn-outline" style={{ flex: 1 }} onClick={cancelEdit}>Cancel</button>}
          <button className="btn" style={{ flex: 1 }} onClick={handleSubmit}>{editingId ? "Update Product" : "Add Product"}</button>
        </div>
      </div>

      <div className="card">
        <h3 style={{ color: "#78350F", marginBottom: "20px" }}>Current Products ({products.length})</h3>
        {products.length === 0 ? (
          <p style={{ textAlign: "center", color: "#92400E", padding: "20px" }}>No products yet. Add your first product above!</p>
        ) : products.map(product => {
          const imgSrc = product.image_id ? api.imageUrl(product.image_id) : null;
          return (
            <div key={product.id} className="admin-product-item">
              <div className="admin-product-img" style={imgSrc ? { backgroundImage: `url(${imgSrc})`, backgroundSize: 'cover' } : {}}>
                {!imgSrc && <span style={{ fontSize: "32px" }}>{getCategoryEmoji(product.category_name)}</span>}
              </div>
              <div className="admin-product-info">
                <h4 style={{ color: "#78350F", marginBottom: "4px" }}>{product.name}</h4>
                <p style={{ color: "#92400E", fontSize: "13px", marginBottom: "4px" }}>{product.description}</p>
                <p style={{ fontWeight: "bold", color: "#D97706" }}>{formatPrice(product.price)}/kg • <span style={{ fontSize: "12px" }}>{product.category_name || "Uncategorized"}</span></p>
                <StockBadge inStock={product.in_stock} />
              </div>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                <button className={`btn ${product.in_stock ? "btn-outline" : "btn-green"}`} style={{ padding: "8px 12px", fontSize: "13px" }} onClick={() => toggleStock(product)}>
                  {product.in_stock ? "Mark Out" : "Mark In"}
                </button>
                <button className="btn btn-outline" style={{ padding: "8px 16px", fontSize: "14px" }} onClick={() => startEdit(product)}>✏️ Edit</button>
                <button className="btn btn-danger" style={{ padding: "8px 16px", fontSize: "14px" }} onClick={() => handleDelete(product.id)}>🗑️ Delete</button>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

function CategoriesView({ setCategories }) {
  const [adminCats, setAdminCats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [newEmoji, setNewEmoji] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [editEmoji, setEditEmoji] = useState("");

  const refresh = async () => {
    const cats = await api.getAdminCategories();
    setAdminCats(cats);
    // Sync App state (ShopView pills + AdminView dropdown)
    setCategories(cats.map(({ id, name, emoji, sort_order }) => ({ id, name, emoji, sort_order })));
    setLoading(false);
  };

  useEffect(() => { refresh(); }, []); // eslint-disable-line

  const addCategory = async () => {
    if (!newName.trim()) return;
    try {
      await api.createCategory({ name: newName.trim(), emoji: newEmoji.trim(), sort_order: adminCats.length });
      setNewName(""); setNewEmoji("");
      await refresh();
    } catch (err) { alert('Error: ' + err.message); }
  };

  const startEdit = (cat) => { setEditingId(cat.id); setEditValue(cat.name); setEditEmoji(cat.emoji || ""); };

  const saveEdit = async () => {
    if (!editValue.trim()) return;
    try {
      await api.updateCategory(editingId, { name: editValue.trim(), emoji: editEmoji.trim() });
      setEditingId(null);
      await refresh();
    } catch (err) { alert('Error: ' + err.message); }
  };

  const deleteCategory = async (cat) => {
    if (!window.confirm(`Delete category "${cat.name}"?`)) return;
    try {
      await api.deleteCategory(cat.id);
      await refresh();
    } catch (err) {
      // Surface 409 (products exist) as a clear message, not a generic alert
      alert(err.message);
    }
  };

  const moveCategory = async (idx, direction) => {
    const swapIdx = idx + direction;
    if (swapIdx < 0 || swapIdx >= adminCats.length) return;
    const a = adminCats[idx];
    const b = adminCats[swapIdx];
    try {
      await Promise.all([
        api.updateCategory(a.id, { sort_order: b.sort_order }),
        api.updateCategory(b.id, { sort_order: a.sort_order }),
      ]);
      await refresh();
    } catch (err) { alert('Error: ' + err.message); }
  };

  if (loading) return <div className="card text-center" style={{ padding: "40px" }}><p style={{ color: "#92400E" }}>Loading categories…</p></div>;

  return (
    <>
      <h2 style={{ fontSize: "26px", fontWeight: "bold", color: "#78350F", marginBottom: "25px" }}>🏷️ Manage Categories</h2>
      <div className="card" style={{ marginBottom: "20px" }}>
        <h3 style={{ color: "#78350F", marginBottom: "15px" }}>Add New Category</h3>
        <div style={{ display: "flex", gap: "10px" }}>
          <input className="input" style={{ marginBottom: 0, width: "60px" }} placeholder="🛍️" value={newEmoji} onChange={e => setNewEmoji(e.target.value)} />
          <input className="input" style={{ marginBottom: 0, flex: 1 }} placeholder="Category name…" value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === "Enter" && addCategory()} />
          <button className="btn" onClick={addCategory} disabled={!newName.trim()}>Add</button>
        </div>
      </div>
      <div className="card">
        <h3 style={{ color: "#78350F", marginBottom: "15px" }}>Current Categories ({adminCats.length})</h3>
        {adminCats.length === 0 && <p style={{ color: "#92400E" }}>No categories yet.</p>}
        {adminCats.map((cat, idx) => (
          <div key={cat.id} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "12px", borderBottom: "1px solid #FDE68A", flexWrap: "wrap" }}>
            {editingId === cat.id ? (
              <>
                <input className="input" style={{ marginBottom: 0, width: "60px" }} value={editEmoji} onChange={e => setEditEmoji(e.target.value)} />
                <input className="input" style={{ marginBottom: 0, flex: 1, minWidth: "150px" }} value={editValue} onChange={e => setEditValue(e.target.value)} onKeyDown={e => e.key === "Enter" && saveEdit()} autoFocus />
                <button className="btn" style={{ padding: "8px 16px", fontSize: "13px" }} onClick={saveEdit}>Save</button>
                <button className="btn btn-outline" style={{ padding: "8px 16px", fontSize: "13px" }} onClick={() => setEditingId(null)}>Cancel</button>
              </>
            ) : (
              <>
                <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                  <button onClick={() => moveCategory(idx, -1)} disabled={idx === 0} style={{ border: "none", background: "none", cursor: idx === 0 ? "default" : "pointer", color: idx === 0 ? "#FDE68A" : "#D97706", fontSize: "12px", padding: "0 4px", lineHeight: 1 }}>▲</button>
                  <button onClick={() => moveCategory(idx, 1)} disabled={idx === adminCats.length - 1} style={{ border: "none", background: "none", cursor: idx === adminCats.length - 1 ? "default" : "pointer", color: idx === adminCats.length - 1 ? "#FDE68A" : "#D97706", fontSize: "12px", padding: "0 4px", lineHeight: 1 }}>▼</button>
                </div>
                <span className="cat-btn active" style={{ cursor: "default" }}>{cat.emoji ? cat.emoji + " " : ""}{cat.name}</span>
                <span className="order-count-badge">{cat.product_count} product{cat.product_count !== 1 ? 's' : ''}</span>
                <span style={{ flex: 1 }} />
                <button className="btn btn-outline" style={{ padding: "6px 14px", fontSize: "12px" }} onClick={() => startEdit(cat)}>✏️ Edit</button>
                <button className="btn btn-outline" style={{ padding: "6px 14px", fontSize: "12px", borderColor: "#FCA5A5", color: "#DC2626" }} onClick={() => deleteCategory(cat)}>🗑️ Delete</button>
              </>
            )}
          </div>
        ))}
      </div>
    </>
  );
}

function LocationsView({ setLocations }) {
  const [adminLocs, setAdminLocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [newFee, setNewFee] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editFee, setEditFee] = useState("");

  const refreshAll = async () => {
    const [all, active] = await Promise.all([
      api.getAdminLocations(),
      api.getLocations().catch(() => []),
    ]);
    setAdminLocs(all);
    setLocations(active); // keep cart dropdown in sync
    setLoading(false);
  };

  useEffect(() => { refreshAll(); }, []); // eslint-disable-line

  const addLocation = async () => {
    if (!newName.trim()) return;
    try {
      await api.createLocation({ name: newName.trim(), delivery_fee: parseFloat(newFee) || 0 });
      setNewName(""); setNewFee("");
      await refreshAll();
    } catch (err) { alert('Error: ' + err.message); }
  };

  const startEdit = (loc) => { setEditingId(loc.id); setEditName(loc.name); setEditFee(String(loc.delivery_fee)); };

  const saveEdit = async () => {
    if (!editName.trim()) return;
    try {
      await api.updateLocation(editingId, { name: editName.trim(), delivery_fee: parseFloat(editFee) || 0 });
      setEditingId(null);
      await refreshAll();
    } catch (err) { alert('Error: ' + err.message); }
  };

  const deactivate = async (id) => {
    if (!window.confirm("Deactivate this location? It will be hidden from customers but its existing orders remain intact.")) return;
    try {
      await api.updateLocation(id, { active: false });
      await refreshAll();
    } catch (err) { alert('Error: ' + err.message); }
  };

  const reactivate = async (id) => {
    try {
      await api.updateLocation(id, { active: true });
      await refreshAll();
    } catch (err) { alert('Error: ' + err.message); }
  };

  const hardDelete = async (id) => {
    if (!window.confirm("Permanently delete this location? This only works if no orders reference it.")) return;
    try {
      await api.deleteLocation(id);
      await refreshAll();
    } catch (err) { alert('Error: ' + err.message); }
  };

  const active = adminLocs.filter(l => l.active);
  const inactive = adminLocs.filter(l => !l.active);

  if (loading) return (
    <div className="card text-center" style={{ padding: "40px" }}>
      <p style={{ color: "#92400E" }}>Loading locations…</p>
    </div>
  );

  return (
    <>
      <h2 style={{ fontSize: "26px", fontWeight: "bold", color: "#78350F", marginBottom: "25px" }}>📍 Delivery Locations</h2>
      <div className="card" style={{ marginBottom: "20px" }}>
        <h3 style={{ color: "#78350F", marginBottom: "15px" }}>Add New Location</h3>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <input className="input" style={{ marginBottom: 0, flex: 2, minWidth: "160px" }} placeholder="Location name (e.g. Poly Junction)" value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === "Enter" && addLocation()} />
          <input className="input" style={{ marginBottom: 0, flex: 1, minWidth: "120px" }} type="number" placeholder="Delivery fee (₦)" value={newFee} onChange={e => setNewFee(e.target.value)} />
          <button className="btn" onClick={addLocation} disabled={!newName.trim()}>Add</button>
        </div>
      </div>

      <div className="card">
        <h3 style={{ color: "#78350F", marginBottom: "15px" }}>Active Locations ({active.length})</h3>
        {active.length === 0 && <p style={{ color: "#92400E" }}>No active locations. Add delivery areas above to enable home delivery.</p>}
        {active.map(loc => (
          <div key={loc.id} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "12px", borderBottom: "1px solid #FDE68A", flexWrap: "wrap" }}>
            {editingId === loc.id ? (
              <>
                <input className="input" style={{ marginBottom: 0, flex: 2, minWidth: "150px" }} value={editName} onChange={e => setEditName(e.target.value)} onKeyDown={e => e.key === "Enter" && saveEdit()} autoFocus />
                <input className="input" style={{ marginBottom: 0, flex: 1, minWidth: "100px" }} type="number" value={editFee} onChange={e => setEditFee(e.target.value)} />
                <button className="btn" style={{ padding: "8px 16px", fontSize: "13px" }} onClick={saveEdit}>Save</button>
                <button className="btn btn-outline" style={{ padding: "8px 16px", fontSize: "13px" }} onClick={() => setEditingId(null)}>Cancel</button>
              </>
            ) : (
              <>
                <span style={{ flex: 1, fontWeight: "bold", color: "#78350F" }}>{loc.name}</span>
                <span style={{ color: "#92400E", marginRight: "6px" }}>{formatPrice(loc.delivery_fee)} delivery fee</span>
                <span className="order-count-badge">{loc.order_count} order{loc.order_count !== 1 ? 's' : ''}</span>
                <button className="btn btn-outline" style={{ padding: "6px 14px", fontSize: "12px" }} onClick={() => startEdit(loc)}>✏️ Edit</button>
                <button className="btn btn-outline" style={{ padding: "6px 14px", fontSize: "12px", borderColor: "#FDE68A", color: "#92400E" }} onClick={() => deactivate(loc.id)}>Deactivate</button>
              </>
            )}
          </div>
        ))}
      </div>

      {inactive.length > 0 && (
        <div className="card" style={{ marginTop: "20px" }}>
          <h3 style={{ color: "#78350F", marginBottom: "15px" }}>Inactive Locations ({inactive.length})</h3>
          {inactive.map(loc => (
            <div key={loc.id} className="loc-inactive-row" style={{ display: "flex", alignItems: "center", gap: "10px", padding: "12px", borderBottom: "1px solid #FDE68A", flexWrap: "wrap", borderRadius: "6px", marginBottom: "4px" }}>
              {editingId === loc.id ? (
                <>
                  <input className="input" style={{ marginBottom: 0, flex: 2, minWidth: "150px" }} value={editName} onChange={e => setEditName(e.target.value)} onKeyDown={e => e.key === "Enter" && saveEdit()} autoFocus />
                  <input className="input" style={{ marginBottom: 0, flex: 1, minWidth: "100px" }} type="number" value={editFee} onChange={e => setEditFee(e.target.value)} />
                  <button className="btn" style={{ padding: "8px 16px", fontSize: "13px" }} onClick={saveEdit}>Save</button>
                  <button className="btn btn-outline" style={{ padding: "8px 16px", fontSize: "13px" }} onClick={() => setEditingId(null)}>Cancel</button>
                </>
              ) : (
                <>
                  <span style={{ flex: 1, fontWeight: "bold", color: "#78350F" }}>{loc.name}</span>
                  <span style={{ color: "#92400E", marginRight: "6px" }}>{formatPrice(loc.delivery_fee)} delivery fee</span>
                  <span className="order-count-badge">{loc.order_count} order{loc.order_count !== 1 ? 's' : ''}</span>
                  <span style={{ fontSize: "11px", background: "#FEE2E2", color: "#DC2626", padding: "2px 8px", borderRadius: "10px", fontWeight: 600 }}>Inactive</span>
                  <button className="btn btn-outline" style={{ padding: "6px 14px", fontSize: "12px" }} onClick={() => startEdit(loc)}>✏️ Edit</button>
                  <button className="btn btn-green" style={{ padding: "6px 14px", fontSize: "12px" }} onClick={() => reactivate(loc.id)}>Reactivate</button>
                  {loc.order_count === 0 && (
                    <button className="btn btn-danger" style={{ padding: "6px 14px", fontSize: "12px" }} onClick={() => hardDelete(loc.id)}>🗑️ Delete</button>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}

// Sensible next-status per current status, taking order method into account.
// Enforcement is UI-only (suggestive); any status can still be set via the dropdown.
function getNextStatus(order) {
  const { status, method } = order;
  if (status === 'pending')    return 'confirmed';
  if (status === 'confirmed')  return 'preparing';
  if (status === 'preparing')  return method === 'pickup' ? 'ready_for_pickup' : 'out_for_delivery';
  if (status === 'out_for_delivery') return 'delivered';
  if (status === 'ready_for_pickup') return 'delivered';
  return null; // delivered is terminal
}

function OrdersView({ setSelectedOrder, setCurrentView }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    const data = await api.getAdminOrders();
    setOrders(data);
    setLoading(false);
  }, []);

  // Smart poll: 20 s, visibility-aware, 60 s backoff after 3 consecutive failures
  useSmartPoll(fetchOrders, 20000);

  const handleStatusChange = async (orderId, status) => {
    try {
      await api.putOrderStatus(orderId, status);
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o));
    } catch (err) { alert('Error: ' + err.message); }
  };

  const handleTogglePaid = async (orderId, currentPaid) => {
    try {
      await api.putOrderPaid(orderId, !currentPaid);
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, paid: !currentPaid } : o));
    } catch (err) { alert('Error: ' + err.message); }
  };

  if (loading) return (
    <>
      <h2 style={{ fontSize: "26px", fontWeight: "bold", color: "#78350F", marginBottom: "25px" }}>Order Management</h2>
      <div className="card text-center" style={{ padding: "50px" }}>
        <div style={{ fontSize: "40px", marginBottom: "10px" }}>⏳</div>
        <p style={{ color: "#92400E" }}>Loading orders…</p>
      </div>
    </>
  );

  if (orders.length === 0) return (
    <>
      <h2 style={{ fontSize: "26px", fontWeight: "bold", color: "#78350F", marginBottom: "25px" }}>Order Management</h2>
      <div className="card text-center" style={{ padding: "50px" }}>
        <div style={{ fontSize: "60px", marginBottom: "15px" }}>📦</div>
        <h3 style={{ color: "#78350F" }}>No Orders Yet</h3>
        <p style={{ color: "#92400E" }}>Orders will appear here when customers place them.</p>
      </div>
    </>
  );

  return (
    <>
      <h2 style={{ fontSize: "26px", fontWeight: "bold", color: "#78350F", marginBottom: "25px" }}>Order Management</h2>
      {orders.map(order => {
        const nextStatus = getNextStatus(order);
        return (
          <div key={order.id} className="card order-card">
            <div className="order-header">
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                  <span style={{ fontFamily: "monospace", fontWeight: "bold", color: "#78350F" }}>{order.id}</span>
                  <span className={`status-badge ${STATUS_CSS[order.status] || 'status-pending'}`}>{STATUS_LABELS[order.status] || order.status}</span>
                  <span className={`status-badge ${order.paid ? 'status-paid' : 'status-badge-unpaid'}`}>{order.paid ? "✓ Paid" : "Unpaid"}</span>
                </div>
                <p style={{ color: "#92400E", fontSize: "12px", marginTop: "5px" }}>{new Date(order.created_at).toLocaleString()}</p>
              </div>

              {/* Status controls: suggested next + manual override + paid toggle + chat */}
              <div className="status-controls">
                {nextStatus && (
                  <button className="next-status-btn" onClick={() => handleStatusChange(order.id, nextStatus)}>
                    → {STATUS_LABELS[nextStatus]}
                  </button>
                )}
                <select className="status-select-sm" value={order.status}
                  onChange={e => handleStatusChange(order.id, e.target.value)}>
                  {VALID_STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                </select>
                <button className={order.paid ? "toggle-unpaid-btn" : "toggle-paid-btn"}
                  onClick={() => handleTogglePaid(order.id, order.paid)}>
                  {order.paid ? "✕ Mark Unpaid" : "✓ Mark Paid"}
                </button>
                <button className="btn btn-outline" style={{ padding: "8px 12px", fontSize: "13px" }}
                  onClick={() => { setSelectedOrder(order.id); setCurrentView("chat"); }}>💬 Chat</button>
                <a
                  href={`https://wa.me/${normalizePhoneForWhatsApp(order.phone)}?text=${encodeURIComponent(`Hi ${order.customer_name}, I'm reaching out about your EverythingBida order ${order.id}. How can I help you?`)}`}
                  target="_blank" rel="noopener noreferrer"
                  className="btn btn-outline"
                  style={{ padding: "8px 12px", fontSize: "13px", textDecoration: "none", display: "inline-block" }}>
                  📱 WhatsApp Customer
                </a>
              </div>
            </div>
            <div className="order-grid">
              <div>
                <p style={{ fontSize: "12px", fontWeight: "bold", color: "#92400E", marginBottom: "5px" }}>Customer</p>
                <p style={{ fontWeight: "bold", color: "#78350F" }}>{order.customer_name}</p>
                <p style={{ color: "#92400E", fontSize: "13px" }}>{order.phone}</p>
                {order.email && <p style={{ color: "#92400E", fontSize: "13px" }}>{order.email}</p>}
              </div>
              <div>
                <p style={{ fontSize: "12px", fontWeight: "bold", color: "#92400E", marginBottom: "5px" }}>Delivery</p>
                <p style={{ fontWeight: "bold", color: "#78350F" }}>{order.method === "pickup" ? "🏪 Store Pickup" : "🚚 Delivery"}</p>
                {order.location_name && <p style={{ color: "#92400E", fontSize: "13px" }}>{order.location_name}</p>}
                {order.specific_address && <p style={{ color: "#92400E", fontSize: "13px" }}>{order.specific_address}</p>}
              </div>
              <div>
                <p style={{ fontSize: "12px", fontWeight: "bold", color: "#92400E", marginBottom: "5px" }}>Items</p>
                {(order.items || []).map((item, idx) => <p key={idx} style={{ color: "#78350F", fontSize: "13px" }}>{item.qty}× {item.name}</p>)}
                {order.delivery_fee > 0 && <p style={{ color: "#92400E", fontSize: "12px" }}>+ {formatPrice(order.delivery_fee)} delivery</p>}
                <p style={{ fontWeight: "bold", color: "#78350F", marginTop: "8px" }}>Total: {formatPrice(order.total)}</p>
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
}

function ChatView({ isAdmin, selectedOrder, setSelectedOrder }) {
  const [adminOrders, setAdminOrders] = useState([]);
  const [messages, setMessages] = useState([]);
  const [currentOrderId, setCurrentOrderId] = useState(selectedOrder || null);
  const [orderInput, setOrderInput] = useState("");
  const [messageText, setMessageText] = useState("");
  const [imgMime, setImgMime] = useState(null);
  const [imgData, setImgData] = useState(null);
  const [imgPreview, setImgPreview] = useState(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (isAdmin) {
      api.getAdminOrders().then(setAdminOrders).catch(() => {});
    }
  }, [isAdmin]);

  const loadChat = useCallback(async (orderId) => {
    if (!orderId) return;
    try {
      const msgs = await api.getOrderMessages(orderId);
      setMessages(msgs);
      setCurrentOrderId(orderId);
      if (setSelectedOrder) setSelectedOrder(orderId);
    } catch (err) {
      alert('Could not load chat: ' + err.message);
    }
  }, [setSelectedOrder]);

  useEffect(() => {
    if (selectedOrder && selectedOrder !== currentOrderId) loadChat(selectedOrder);
  }, [selectedOrder, currentOrderId, loadChat]);

  // Poll for new messages every 15s (smart: visibility-aware, backoff on failures)
  const pollMessages = useCallback(async () => {
    if (!currentOrderId) return;
    const msgs = await api.getOrderMessages(currentOrderId);
    setMessages(msgs);
  }, [currentOrderId]);

  useSmartPoll(pollMessages, 15000);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert("Max 5MB"); return; }
    const reader = new FileReader();
    reader.onloadend = () => {
      setImgPreview(reader.result);
      setImgMime(file.type);
      setImgData(reader.result.split(',')[1]);
    };
    reader.readAsDataURL(file);
  };

  const handleSend = async () => {
    if ((!messageText.trim() && !imgData) || !currentOrderId) return;
    try {
      let image_id = null;
      if (imgData && imgMime) {
        const res = await api.postReceiptImage(currentOrderId, { mime: imgMime, data: imgData });
        image_id = res.id;
      }
      const msg = await api.postOrderMessage(currentOrderId, { text: messageText.trim(), image_id });
      setMessages(prev => [...prev, msg]);
      setMessageText("");
      setImgPreview(null);
      setImgData(null);
      setImgMime(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      alert('Send failed: ' + err.message);
    }
  };

  const orderList = isAdmin ? adminOrders : [];

  return (
    <>
      <h2 style={{ fontSize: "26px", fontWeight: "bold", color: "#78350F", marginBottom: "25px" }}>Messages</h2>

      {!isAdmin && (
        <div className="card" style={{ marginBottom: "15px" }}>
          <p style={{ color: "#92400E", marginBottom: "10px" }}>Enter your Order ID to access your chat:</p>
          <div style={{ display: "flex", gap: "10px" }}>
            <input type="text" className="input" placeholder="e.g. EB12345678" value={orderInput}
              onChange={e => setOrderInput(e.target.value)} onKeyDown={e => e.key === "Enter" && loadChat(orderInput.trim().toUpperCase())}
              style={{ marginBottom: 0, flex: 1 }} />
            <button className="btn" onClick={() => loadChat(orderInput.trim().toUpperCase())}>Load Chat</button>
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: isAdmin ? "minmax(200px, 280px) 1fr" : "1fr", gap: "20px" }}>
        {isAdmin && (
          <div className="card" style={{ height: "fit-content" }}>
            <h3 style={{ color: "#78350F", marginBottom: "15px", fontSize: "16px" }}>All Orders</h3>
            {adminOrders.length === 0 && <p style={{ color: "#92400E", fontSize: "13px" }}>No orders yet.</p>}
            {adminOrders.map(order => (
              <div key={order.id} onClick={() => loadChat(order.id)}
                style={{ padding: "12px", marginBottom: "8px", borderRadius: "8px", cursor: "pointer", background: currentOrderId === order.id ? "#FEF3C7" : "transparent", border: currentOrderId === order.id ? "2px solid #D97706" : "1px solid #FDE68A", transition: "all 0.2s" }}>
                <p style={{ fontWeight: "bold", color: "#78350F", marginBottom: "4px", fontFamily: "monospace", fontSize: "13px" }}>{order.id}</p>
                <p style={{ fontSize: "12px", color: "#92400E" }}>{order.customer_name} • {formatPrice(order.total)}</p>
                <span className={`status-badge ${STATUS_CSS[order.status] || 'status-pending'}`} style={{ marginTop: "6px", display: "inline-block" }}>{STATUS_LABELS[order.status] || order.status}</span>
              </div>
            ))}
          </div>
        )}

        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          {currentOrderId ? (
            <>
              <div className="chat-header">
                <h3 style={{ color: "white", fontSize: "18px" }}>💬 Order: {currentOrderId}</h3>
                {(() => {
                  const od = isAdmin ? adminOrders.find(o => o.id === currentOrderId) : null;
                  if (!od || od.method !== 'delivery' || !od.location_name) return null;
                  return (
                    <p style={{ color: "rgba(255,255,255,0.85)", fontSize: "12px", marginTop: "4px" }}>
                      📍 {od.location_name}{od.specific_address ? ` — ${od.specific_address}` : ''}
                    </p>
                  );
                })()}
              </div>
              <div className="chat-messages">
                {messages.map(msg => (
                  <div key={msg.id} className={`msg msg-${msg.sender}`}>
                    {msg.sender === "system" ? (
                      <div className="msg-system"><span>{msg.text}</span></div>
                    ) : (
                      <>
                        <div className="bubble">
                          {msg.image_id && (
                            <img src={api.imageUrl(msg.image_id)} alt="Uploaded" style={{ maxWidth: "100%", maxHeight: "300px", borderRadius: "8px", marginBottom: msg.text ? "8px" : "0", cursor: "pointer", display: "block" }}
                              onClick={() => window.open(api.imageUrl(msg.image_id), "_blank")} />
                          )}
                          {msg.text && msg.text}
                        </div>
                        <div className="msg-time">{new Date(msg.created_at).toLocaleTimeString()}</div>
                      </>
                    )}
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
              <div className="chat-input-area">
                <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImageSelect} style={{ display: "none" }} />
                {imgPreview && (
                  <div style={{ position: "absolute", bottom: "80px", left: "15px", right: "15px", background: "white", padding: "10px", borderRadius: "12px", boxShadow: "0 4px 15px rgba(0,0,0,0.15)", display: "flex", alignItems: "center", gap: "10px" }}>
                    <img src={imgPreview} alt="Preview" style={{ width: "60px", height: "60px", objectFit: "cover", borderRadius: "8px" }} />
                    <span style={{ flex: 1, color: "#78350F", fontSize: "14px" }}>Image ready to send</span>
                    <button onClick={() => { setImgPreview(null); setImgData(null); setImgMime(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                      style={{ padding: "6px 12px", borderRadius: "6px", border: "none", background: "#DC2626", color: "white", cursor: "pointer", fontSize: "12px" }}>Remove</button>
                  </div>
                )}
                <button onClick={() => fileInputRef.current?.click()} style={{ padding: "12px", borderRadius: "10px", border: "2px solid #FDE68A", background: "white", cursor: "pointer", fontSize: "20px" }} title="Upload image / receipt">📷</button>
                <input type="text" className="input" placeholder="Type your message…" value={messageText} onChange={e => setMessageText(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSend()} style={{ marginBottom: 0, flex: 1 }} />
                <button className="btn" onClick={handleSend}>Send</button>
              </div>
            </>
          ) : (
            <div style={{ padding: "50px", textAlign: "center" }}>
              <div style={{ fontSize: "60px", marginBottom: "15px" }}>💬</div>
              <p style={{ color: "#92400E" }}>{isAdmin ? "Select an order to view messages" : "Enter your Order ID above to start chatting"}</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function BankView({ bank, setBank }) {
  const [formData, setFormData] = useState(bank);

  useEffect(() => { setFormData(bank); }, [bank]);

  const handleSubmit = async () => {
    try {
      const updated = await api.putBank({ name: formData.name, acc_num: formData.acc_num, acc_name: formData.acc_name });
      setBank(updated);
      alert("Bank details saved!");
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  return (
    <div style={{ maxWidth: "450px", margin: "0 auto" }}>
      <h2 style={{ fontSize: "26px", fontWeight: "bold", color: "#78350F", marginBottom: "25px" }}>Bank Account Settings</h2>
      <div className="card">
        <p style={{ color: "#92400E", marginBottom: "20px" }}>Customers will see this when placing orders.</p>
        <label style={{ display: "block", marginBottom: "8px", fontWeight: 600, color: "#92400E", fontSize: "14px" }}>Bank Name</label>
        <input type="text" className="input" value={formData.name || ""} onChange={e => setFormData(f => ({ ...f, name: e.target.value }))} />
        <label style={{ display: "block", marginBottom: "8px", fontWeight: 600, color: "#92400E", fontSize: "14px" }}>Account Number</label>
        <input type="text" className="input" value={formData.acc_num || ""} onChange={e => setFormData(f => ({ ...f, acc_num: e.target.value }))} />
        <label style={{ display: "block", marginBottom: "8px", fontWeight: 600, color: "#92400E", fontSize: "14px" }}>Account Name</label>
        <input type="text" className="input" value={formData.acc_name || ""} onChange={e => setFormData(f => ({ ...f, acc_name: e.target.value }))} />
        <button className="btn" style={{ width: "100%", marginTop: "10px" }} onClick={handleSubmit}>Save Changes</button>
      </div>
    </div>
  );
}

// --- Phone helpers ---
function isValidNigerianPhone(phone) {
  const digits = phone.replace(/\D/g, '');
  // accept 10 (local no leading 0), 11 (0XXXXXXXXXX), 13 (234XXXXXXXXXX)
  return (digits.length === 10) || (digits.length === 11 && digits[0] === '0') || (digits.length === 13 && digits.startsWith('234'));
}

function normalizePhoneForWhatsApp(phone) {
  let p = phone.replace(/[\s\-()]/g, '');
  if (p.startsWith('0')) p = '234' + p.slice(1);
  if (p.startsWith('+')) p = p.slice(1);
  return p;
}

// --- BecomeSellerView ---
function BecomeSellerView() {
  const [form, setForm] = useState({ name: '', phone: '', product_types: '', notes: '' });
  const [errors, setErrors] = useState({});
  const [imgPreview, setImgPreview] = useState(null);
  const [imgMime, setImgMime] = useState(null);
  const [imgData, setImgData] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const fileInputRef = useRef(null);

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setErrors(prev => ({ ...prev, photo: 'Max photo size is 5MB' })); return; }
    const reader = new FileReader();
    reader.onloadend = () => {
      setImgPreview(reader.result);
      setImgMime(file.type);
      setImgData(reader.result.split(',')[1]);
      setErrors(prev => ({ ...prev, photo: undefined }));
    };
    reader.readAsDataURL(file);
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Business or seller name is required';
    if (!form.phone.trim()) {
      e.phone = 'Phone number is required';
    } else if (!isValidNigerianPhone(form.phone.trim())) {
      e.phone = 'Enter a valid Nigerian phone number (e.g. 08012345678 or +2348012345678)';
    }
    if (!form.product_types.trim()) e.product_types = 'Please describe what you sell';
    return e;
  };

  const handleSubmit = async () => {
    const e = validate();
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    setErrors({});
    setSubmitting(true);
    try {
      let image_id = null;
      if (imgData && imgMime) {
        setUploading(true);
        const res = await api.postVendorImage(imgMime, imgData);
        image_id = res.id;
        setUploading(false);
      }
      await api.postVendorApplication({
        name: form.name.trim(),
        phone: form.phone.trim(),
        product_types: form.product_types.trim(),
        notes: form.notes.trim(),
        image_id,
      });
      setSubmitted(true);
    } catch (err) {
      setErrors({ submit: err.message || 'Submission failed. Please try again.' });
    } finally {
      setSubmitting(false);
      setUploading(false);
    }
  };

  if (submitted) {
    return (
      <div style={{ maxWidth: "520px", margin: "0 auto" }}>
        <div className="seller-form-confirm">
          <div style={{ fontSize: "60px", marginBottom: "16px" }}>🎉</div>
          <h2 style={{ color: "#065F46", marginBottom: "12px", fontSize: "22px" }}>Application Received!</h2>
          <p style={{ color: "#065F46", lineHeight: 1.6, marginBottom: "10px" }}>
            Thank you for applying to sell on EverythingBida. Our team will review your products and <strong>call you on the phone number you provided</strong> to verify and approve your listing.
          </p>
          <p style={{ color: "#6B7280", fontSize: "13px" }}>We typically reach out within 1–2 business days.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "520px", margin: "0 auto" }}>
      <h2 style={{ fontSize: "26px", fontWeight: "bold", color: "#78350F", marginBottom: "8px" }}>🏬 Become a Seller</h2>
      <p style={{ color: "#92400E", marginBottom: "24px", lineHeight: 1.6 }}>
        List your products in seconds and reach customers across Bida instantly. Our team verifies product quality before approving — so customers trust every listing.
      </p>
      <div className="card">
        <input type="text" className="input" placeholder="Business or seller name *"
          value={form.name} onChange={e => { setForm(f => ({ ...f, name: e.target.value })); setErrors(p => ({ ...p, name: undefined })); }} />
        {errors.name && <span className="inline-error">{errors.name}</span>}

        <input type="tel" className="input" placeholder="Phone number * (e.g. 08012345678)"
          value={form.phone} onChange={e => { setForm(f => ({ ...f, phone: e.target.value })); setErrors(p => ({ ...p, phone: undefined })); }} />
        {errors.phone && <span className="inline-error">{errors.phone}</span>}

        <textarea className="input" placeholder="What do you sell? * (e.g. fresh goat meat, frozen chicken, vegetables…)"
          value={form.product_types} rows="3"
          onChange={e => { setForm(f => ({ ...f, product_types: e.target.value })); setErrors(p => ({ ...p, product_types: undefined })); }} />
        {errors.product_types && <span className="inline-error">{errors.product_types}</span>}

        <textarea className="input" placeholder="Anything else we should know? (optional)"
          value={form.notes} rows="2"
          onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />

        <div className="image-upload-area" onClick={() => !imgPreview && fileInputRef.current?.click()}>
          {imgPreview ? (
            <div style={{ position: "relative" }}>
              <img src={imgPreview} alt="Preview" style={{ maxWidth: "100%", maxHeight: "180px", borderRadius: "8px" }} />
              <button onClick={e => { e.stopPropagation(); setImgPreview(null); setImgData(null); setImgMime(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                style={{ position: "absolute", top: "8px", right: "8px", padding: "6px 10px", borderRadius: "6px", border: "none", background: "#DC2626", color: "white", cursor: "pointer", fontWeight: "bold", fontSize: "12px" }}>
                Remove
              </button>
            </div>
          ) : (
            <>
              <div style={{ fontSize: "36px" }}>📸</div>
              <p style={{ color: "#D97706", fontWeight: "bold", marginBottom: "4px" }}>Upload a photo (optional)</p>
              <p style={{ color: "#92400E", fontSize: "12px" }}>Products or shopfront — JPG, PNG or WebP, max 5MB</p>
            </>
          )}
        </div>
        {errors.photo && <span className="inline-error">{errors.photo}</span>}
        <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImageSelect} style={{ display: "none" }} />

        {errors.submit && (
          <div style={{ background: "#FEE2E2", border: "2px solid #FCA5A5", borderRadius: "10px", padding: "12px", marginBottom: "12px", color: "#DC2626", fontWeight: 600, fontSize: "14px" }}>
            ⚠️ {errors.submit}
          </div>
        )}

        <button className="btn" style={{ width: "100%", padding: "16px", fontSize: "17px" }} onClick={handleSubmit} disabled={submitting || uploading}>
          {uploading ? 'Uploading photo…' : submitting ? 'Submitting…' : 'Submit Application'}
        </button>
        <p style={{ color: "#92400E", fontSize: "12px", textAlign: "center", marginTop: "10px" }}>
          No login required. We will call you to confirm details before approving.
        </p>
      </div>
    </div>
  );
}

// --- SellersView (admin) ---
const VENDOR_STATUS_LABELS = { pending: 'Pending', contacted: 'Contacted', approved: 'Approved', rejected: 'Rejected' };
const VENDOR_STATUSES = ['pending', 'contacted', 'approved', 'rejected'];

function SellersView({ onVendorDataChanged }) {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [updatingId, setUpdatingId] = useState(null);

  const refresh = async (filter) => {
    setLoading(true);
    try {
      const data = await api.getAdminVendors(filter === 'all' ? null : filter);
      setVendors(data);
    } catch (err) {
      console.error('Sellers fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(statusFilter); }, [statusFilter]); // eslint-disable-line

  const pendingCount = vendors.filter(v => v.status === 'pending').length;

  const handleStatusChange = async (id, status) => {
    setUpdatingId(id);
    try {
      await api.putVendorStatus(id, status);
      setVendors(prev => prev.map(v => v.id === id ? { ...v, status } : v));
      // If filter is active and vendor no longer matches, remove from list
      if (statusFilter !== 'all' && status !== statusFilter) {
        setVendors(prev => prev.filter(v => v.id !== id));
      }
      onVendorDataChanged();
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <>
      <h2 style={{ fontSize: "26px", fontWeight: "bold", color: "#78350F", marginBottom: "6px" }}>
        🏬 Seller Applications
        {pendingCount > 0 && statusFilter === 'all' && (
          <span className="pending-badge" style={{ fontSize: "14px", marginLeft: "10px", verticalAlign: "middle" }}>{pendingCount} pending</span>
        )}
      </h2>
      <p style={{ color: "#92400E", marginBottom: "20px" }}>Review vendor applications and update their status.</p>

      <div className="vendor-filter-tabs">
        {['all', ...VENDOR_STATUSES].map(s => (
          <button key={s} className={`vendor-filter-tab ${statusFilter === s ? 'active' : ''}`} onClick={() => setStatusFilter(s)}>
            {s === 'all' ? 'All' : VENDOR_STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="card text-center" style={{ padding: "40px" }}><p style={{ color: "#92400E" }}>Loading…</p></div>
      ) : vendors.length === 0 ? (
        <div className="card text-center" style={{ padding: "40px" }}>
          <div style={{ fontSize: "50px", marginBottom: "12px" }}>📭</div>
          <p style={{ color: "#92400E" }}>No {statusFilter === 'all' ? '' : VENDOR_STATUS_LABELS[statusFilter].toLowerCase() + ' '}applications.</p>
        </div>
      ) : vendors.map(v => {
        const waPhone = normalizePhoneForWhatsApp(v.phone);
        const waMsg = encodeURIComponent(`Hi ${v.name}, this is EverythingBida. We received your seller application and would like to connect with you regarding your products: ${v.product_types}.`);
        return (
          <div key={v.id} className="card vendor-card">
            <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
              <div className="vendor-photo" style={v.image_id ? { backgroundImage: `url(${api.imageUrl(v.image_id)})` } : {}}>
                {!v.image_id && '🏬'}
              </div>
              <div style={{ flex: 1, minWidth: "200px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", marginBottom: "4px" }}>
                  <h3 style={{ color: "#78350F", fontSize: "18px" }}>{v.name}</h3>
                  <span className={`status-badge vendor-status-${v.status}`}>{VENDOR_STATUS_LABELS[v.status]}</span>
                </div>
                <p style={{ color: "#92400E", fontSize: "14px", marginBottom: "4px" }}>📞 {v.phone}</p>
                <p style={{ color: "#78350F", fontSize: "14px", marginBottom: "4px" }}><strong>Products:</strong> {v.product_types}</p>
                {v.notes && <p style={{ color: "#92400E", fontSize: "13px", marginBottom: "4px" }}><strong>Notes:</strong> {v.notes}</p>}
                <p style={{ color: "#B45309", fontSize: "12px" }}>Submitted: {new Date(v.created_at).toLocaleString()}</p>
              </div>
            </div>
            <div style={{ display: "flex", gap: "10px", marginTop: "14px", flexWrap: "wrap", alignItems: "center" }}>
              <select
                value={v.status}
                onChange={e => handleStatusChange(v.id, e.target.value)}
                disabled={updatingId === v.id}
                style={{ padding: "8px 12px", borderRadius: "8px", border: "2px solid #FDE68A", fontSize: "13px", background: "white", color: "#78350F", flex: 1, minWidth: "150px" }}>
                {VENDOR_STATUSES.map(s => <option key={s} value={s}>{VENDOR_STATUS_LABELS[s]}</option>)}
              </select>
              <a href={`https://wa.me/${waPhone}?text=${waMsg}`} target="_blank" rel="noopener noreferrer"
                style={{ padding: "8px 14px", borderRadius: "8px", background: "#25D366", color: "white", fontWeight: "bold", fontSize: "13px", textDecoration: "none", whiteSpace: "nowrap" }}>
                WhatsApp
              </a>
            </div>
          </div>
        );
      })}
    </>
  );
}

function LoginModal({ onClose, onLogin, error }) {
  const [password, setPassword] = useState("");
  return (
    <div className="modal">
      <div className="modal-content">
        <h2 style={{ color: "#92400E", marginBottom: "20px" }}>🔐 Admin Login</h2>
        <input type="password" className="input" placeholder="Enter password" value={password}
          onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && onLogin(password)} autoFocus />
        {error && <p style={{ color: "#DC2626", marginBottom: "15px", fontSize: "14px" }}>❌ {error}</p>}
        <div className="flex gap-10">
          <button className="btn btn-outline flex-1" onClick={onClose}>Cancel</button>
          <button className="btn flex-1" onClick={() => onLogin(password)}>Login</button>
        </div>
      </div>
    </div>
  );
}

function SuccessModal({ order, bank, onClose }) {
  return (
    <div className="modal">
      <div className="modal-content text-center">
        <div style={{ fontSize: "60px", marginBottom: "15px" }}>✅</div>
        <h2 style={{ color: "#15803D", marginBottom: "10px" }}>Order Placed Successfully!</h2>
        <p style={{ color: "#666", marginBottom: "20px" }}>Your order has been registered.</p>
        <div className="order-id-box">
          <p style={{ fontSize: "14px", color: "#92400E", marginBottom: "5px" }}>Your Order ID:</p>
          <p style={{ fontSize: "20px", fontWeight: "bold", color: "#78350F", fontFamily: "monospace" }}>{order.id}</p>
          <p style={{ fontSize: "12px", color: "#92400E", marginTop: "5px" }}>Save this ID to track your order</p>
        </div>
        <div className="bank-box" style={{ textAlign: "left" }}>
          <p style={{ fontWeight: "bold", color: "#1E40AF", marginBottom: "8px" }}>💳 Please pay to:</p>
          <p style={{ fontWeight: "bold", color: "#1E3A8A" }}>{bank.name}</p>
          <p style={{ color: "#1E40AF" }}>{bank.acc_num}</p>
          <p style={{ color: "#1E40AF" }}>{bank.acc_name}</p>
        </div>
        {order.method === 'delivery' && (order.location_name || order.specific_address) && (
          <div style={{ background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: "12px", padding: "15px", marginBottom: "15px", textAlign: "left" }}>
            <p style={{ fontWeight: "bold", color: "#92400E", marginBottom: "6px" }}>📍 Delivery to:</p>
            {order.location_name && <p style={{ color: "#78350F", fontWeight: "bold", marginBottom: "3px" }}>{order.location_name}</p>}
            {order.specific_address && <p style={{ color: "#92400E", fontSize: "13px" }}>{order.specific_address}</p>}
          </div>
        )}
        <div style={{ background: "#FEF3C7", borderRadius: "12px", padding: "15px", marginBottom: "20px", textAlign: "left" }}>
          <div style={{ display: "flex", justifyContent: "space-between", color: "#92400E", marginBottom: "6px" }}>
            <span>Subtotal</span><span style={{ fontWeight: "bold" }}>{formatPrice(order.subtotal)}</span>
          </div>
          {order.delivery_fee > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", color: "#92400E", marginBottom: "6px" }}>
              <span>{order.location_name ? `Delivery to ${order.location_name}` : 'Delivery fee'}</span>
              <span style={{ fontWeight: "bold" }}>{formatPrice(order.delivery_fee)}</span>
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold", color: "#78350F", borderTop: "1px solid #FDE68A", marginTop: "8px", paddingTop: "8px" }}>
            <span>Total to pay</span><span>{formatPrice(order.total)}</span>
          </div>
        </div>
        <p style={{ fontSize: "12px", color: "#666", marginBottom: "15px" }}>Go to Chat to send your payment receipt after paying.</p>
        <div className="flex gap-10">
          <button className="btn btn-outline flex-1" onClick={() => onClose("shop")}>Continue Shopping</button>
          <button className="btn flex-1" onClick={() => onClose("track")}>📦 Track Order</button>
        </div>
        <button className="btn btn-outline" style={{ width: "100%", marginTop: "8px" }} onClick={() => onClose("chat")}>💬 Go to Chat</button>
      </div>
    </div>
  );
}
