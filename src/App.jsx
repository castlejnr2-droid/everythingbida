import { useState, useEffect, useRef } from "react";

const formatPrice = (price) => `₦${price.toLocaleString()}`;

const getEmoji = (type) => {
  const emojis = { chicken: "🐔", turkey: "🦃", beef: "🥩", sausage: "🌭" };
  return emojis[type] || "🍖";
};

const getTagColor = (type) => {
  const colors = { chicken: "#F59E0B", turkey: "#DC2626", beef: "#B45309", sausage: "#10B981" };
  return colors[type] || "#92400E";
};

const DEFAULT_CATEGORIES = ["Grains", "Spices", "Oils", "Nuts", "Meats", "Vegetables", "Fruits", "Beverages", "Other"];
const LOW_STOCK_THRESHOLD = 5;

const linkifyText = (text) => {
  if (!text) return "";
  const urlRegex = /(https?:\/\/[^\s]+|(?:www\.|(?:vm\.)?tiktok\.com)[^\s]+)/gi;
  return text.split(urlRegex).map((part, index) =>
    part.match(urlRegex) ? (
      <a key={index} href={/^https?:\/\//i.test(part) ? part : "https://" + part} target="_blank" rel="noopener noreferrer"
        style={{ color: "#D97706", textDecoration: "underline", wordBreak: "break-all" }}
        onClick={(e) => e.stopPropagation()}>{part}</a>
    ) : part
  );
};

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
  .tiktok-float { position: fixed; bottom: 30px; right: 30px; width: 60px; height: 60px; background: #010101; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 8px 25px rgba(0,0,0,0.4), 0 0 0 0 rgba(238,29,82,0.4); z-index: 150; animation: floaty 3s ease-in-out infinite; }
  .tiktok-float:hover { transform: scale(1.15) translateY(-4px); animation: none; }
  .tiktok-float svg { width: 28px; height: 28px; fill: white; }
  select.input { appearance: auto; }
  textarea.input { resize: vertical; }
  .flex { display: flex; }
  .gap-10 { gap: 10px; }
  .flex-1 { flex: 1; }
  .stock-badge { padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: bold; display: inline-block; margin-top: 4px; }
  .stock-ok { background: #D1FAE5; color: #065F46; }
  .stock-low { background: #FEF3C7; color: #D97706; }
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
`;

const API = '/.netlify/functions/api';
const cloudGet = async (r) => { try { const res = await fetch(API + '?r=' + r); if (res.ok) return await res.json(); } catch(e) { console.warn('Cloud get failed:', r, e); } return null; };
const cloudSet = async (r, data) => { try { await fetch(API + '?r=' + r, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }); } catch(e) { console.warn('Cloud set failed:', r, e); } };

const DEFAULT_PRODUCTS = [
  { id: 1, name: "Fresh Chicken", type: "chicken", category: "Meats", price: 4500, desc: "Farm-fresh whole chicken", image: null, stock: 20 },
  { id: 2, name: "Premium Turkey", type: "turkey", category: "Meats", price: 8500, desc: "Locally raised turkey", image: null, stock: 15 },
  { id: 3, name: "Quality Beef", type: "beef", category: "Meats", price: 5500, desc: "Prime cut beef", image: null, stock: 25 },
];
const DEFAULT_BANK = { name: "GTBank", accNum: "0123456789", accName: "EverythingBida Ltd" };

export default function App() {
  const [products, setProducts] = useState(DEFAULT_PRODUCTS);
  const [cart, setCart] = useState([]);
  const [orders, setOrders] = useState([]);
  const [messages, setMessages] = useState([]);
  const [bank, setBank] = useState(DEFAULT_BANK);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [loaded, setLoaded] = useState(false);
  const canSave = useRef(false);

  useEffect(() => {
    (async () => {
      const [p, o, m, b, cats] = await Promise.all([
        cloudGet('products'), cloudGet('orders'), cloudGet('messages'), cloudGet('bank'), cloudGet('categories')
      ]);
      if (p && Array.isArray(p)) setProducts(p);
      if (o && Array.isArray(o)) setOrders(o);
      if (m && Array.isArray(m)) setMessages(m);
      if (b && b.name) setBank(b);
      if (cats && Array.isArray(cats)) setCategories(cats);
      setLoaded(true);
      setTimeout(() => { canSave.current = true; }, 500);
    })();
  }, []);

  useEffect(() => { if (canSave.current) cloudSet('products', products); }, [products]);
  useEffect(() => { if (canSave.current) cloudSet('orders', orders); }, [orders]);
  useEffect(() => { if (canSave.current) cloudSet('messages', messages); }, [messages]);
  useEffect(() => { if (canSave.current) cloudSet('bank', bank); }, [bank]);
  useEffect(() => { if (canSave.current) cloudSet('categories', categories); }, [categories]);

  const [isAdmin, setIsAdmin] = useState(false);
  const [currentView, setCurrentView] = useState("shop");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successOrderId, setSuccessOrderId] = useState("");
  const [loginError, setLoginError] = useState("");
  const [showProofModal, setShowProofModal] = useState(null);

  const handleLogin = (password) => {
    // INTERIM — client-side auth removed in Phase 2 (server-side login)
    if (password === "rK7mX4nJ9wQ2vB8p") {
      setIsAdmin(true); setShowLoginModal(false); setLoginError(""); setCurrentView("admin");
    } else { setLoginError("Incorrect password"); }
  };
  const handleLogout = () => { setIsAdmin(false); setCurrentView("shop"); };

  const addToCart = (product) => {
    if (product.stock !== undefined && product.stock <= 0) return;
    const existing = cart.find(i => i.id === product.id);
    if (existing) setCart(cart.map(i => i.id === product.id ? { ...i, qty: i.qty + 1 } : i));
    else setCart([...cart, { ...product, qty: 1 }]);
  };
  const updateQty = (id, change) => {
    const item = cart.find(i => i.id === id);
    if (!item) return;
    const newQty = item.qty + change;
    if (newQty <= 0) setCart(cart.filter(i => i.id !== id));
    else setCart(cart.map(i => i.id === id ? { ...i, qty: newQty } : i));
  };
  const removeFromCart = (id) => setCart(cart.filter(i => i.id !== id));
  const clearCart = () => setCart([]);

  const placeOrder = (customerInfo) => {
    const orderId = "EB" + Date.now().toString().slice(-8);
    const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
    const newOrder = { id: orderId, items: cart.map(i => ({ id: i.id, name: i.name, qty: i.qty, price: i.price })), customer: customerInfo, total, status: "pending", paid: false, paymentProof: null, createdAt: Date.now() };
    setOrders(prev => [...prev, newOrder]);
    // Decrease stock
    setProducts(prev => prev.map(p => {
      const cartItem = cart.find(c => c.id === p.id);
      if (cartItem && p.stock !== undefined) {
        return { ...p, stock: Math.max(0, p.stock - cartItem.qty) };
      }
      return p;
    }));
    setMessages(prev => [...prev, { id: Date.now(), orderId, type: "system", text: `New order placed: ${orderId}`, time: new Date().toISOString() }]);
    setSuccessOrderId(orderId); setShowSuccessModal(true); clearCart();
    const itemsList = cart.map(i => `${i.qty}kg ${i.name} - ₦${(i.price * i.qty).toLocaleString()}`).join('\n');
    fetch('/api?action=notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId, total, customer: customerInfo, items: itemsList }),
    }).catch(() => {});
  };

  const uploadPaymentProof = (orderId, proofBase64) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, paymentProof: proofBase64 } : o));
    setMessages(prev => [...prev, { id: Date.now(), orderId, type: "system", text: "Payment proof uploaded", time: new Date().toISOString() }]);
  };

  const sendMessage = (text, orderId, image = null) => {
    setMessages(prev => [...prev, { id: Date.now(), orderId, type: isAdmin ? "admin" : "customer", text, image, time: new Date().toISOString() }]);
  };
  const updateOrderStatus = (orderId, status) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o));
    setMessages(prev => [...prev, { id: Date.now(), orderId, type: "system", text: `Status updated to: ${status.toUpperCase()}`, time: new Date().toISOString() }]);
  };
  const confirmPayment = (orderId) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, paid: true, status: "confirmed" } : o));
    setMessages(prev => [...prev, { id: Date.now(), orderId, type: "system", text: "Payment confirmed!", time: new Date().toISOString() }]);
  };
  const addProduct = (pd) => { setProducts(prev => [...prev, { ...pd, id: Date.now() }]); };
  const deleteProduct = (id) => { if (window.confirm("Delete this product?")) setProducts(prev => prev.filter(p => p.id !== id)); };
  const updateProduct = (id, data) => setProducts(prev => prev.map(p => p.id === id ? { ...p, ...data } : p));

  return (
    <div className="eb-wrap">
      <style>{styles}</style>
      <Header isAdmin={isAdmin} currentView={currentView} setCurrentView={setCurrentView}
        setShowLoginModal={setShowLoginModal} handleLogout={handleLogout} cartCount={cart.length} />
      <main className="main">
        {currentView === "shop" && <ShopView products={products} addToCart={addToCart} setCurrentView={setCurrentView} categories={categories} />}
        {currentView === "cart" && <CartView cart={cart} updateQty={updateQty} removeFromCart={removeFromCart} placeOrder={placeOrder} bank={bank} />}
        {currentView === "track" && <TrackOrderView orders={orders} />}
        {currentView === "chat" && <ChatView messages={messages} orders={orders} selectedOrder={selectedOrder} setSelectedOrder={setSelectedOrder} sendMessage={sendMessage} isAdmin={isAdmin} uploadPaymentProof={uploadPaymentProof} />}
        {currentView === "admin" && <AdminView products={products} addProduct={addProduct} deleteProduct={deleteProduct} updateProduct={updateProduct} categories={categories} />}
        {currentView === "categories" && <CategoriesView categories={categories} setCategories={setCategories} />}
        {currentView === "orders" && <OrdersView orders={orders} updateOrderStatus={updateOrderStatus} confirmPayment={confirmPayment} setSelectedOrder={setSelectedOrder} setCurrentView={setCurrentView} setShowProofModal={setShowProofModal} />}
        {currentView === "bank" && <BankView bank={bank} updateBank={setBank} />}
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
          <path d="M19.321 5.562a5.124 5.124 0 0 1-.443-.258 6.228 6.228 0 0 1-1.137-.966c-.849-.971-1.166-1.959-1.282-2.648h.004C16.368 1.308 16.393 1 16.396 1h-3.91v14.801c0 .196 0 .391-.008.583 0 .023-.002.045-.004.07v.012a3.257 3.257 0 0 1-1.67 2.653 3.2 3.2 0 0 1-1.585.417c-1.78 0-3.225-1.452-3.225-3.244 0-1.791 1.445-3.243 3.225-3.243.347 0 .681.057.994.158l.005-3.966a7.12 7.12 0 0 0-.999-.07C6.467 9.171 3.5 12.155 3.5 15.842 3.5 19.529 6.467 22.5 10.219 22.5c3.752 0 6.719-2.97 6.719-6.658v-7.5a10.09 10.09 0 0 0 5.562 1.671V6.059a5.646 5.646 0 0 1-3.179-.497z" fill="#69C9D0" transform="translate(0.5, 0)"/>
          <path d="M19.321 5.562a5.124 5.124 0 0 1-.443-.258 6.228 6.228 0 0 1-1.137-.966c-.849-.971-1.166-1.959-1.282-2.648h.004C16.368 1.308 16.393 1 16.396 1h-3.91v14.801c0 .196 0 .391-.008.583 0 .023-.002.045-.004.07v.012a3.257 3.257 0 0 1-1.67 2.653 3.2 3.2 0 0 1-1.585.417c-1.78 0-3.225-1.452-3.225-3.244 0-1.791 1.445-3.243 3.225-3.243.347 0 .681.057.994.158l.005-3.966a7.12 7.12 0 0 0-.999-.07C6.467 9.171 3.5 12.155 3.5 15.842 3.5 19.529 6.467 22.5 10.219 22.5c3.752 0 6.719-2.97 6.719-6.658v-7.5a10.09 10.09 0 0 0 5.562 1.671V6.059a5.646 5.646 0 0 1-3.179-.497z" fill="#EE1D52" transform="translate(-0.5, 0)"/>
          <path d="M19.321 5.562a5.124 5.124 0 0 1-.443-.258 6.228 6.228 0 0 1-1.137-.966c-.849-.971-1.166-1.959-1.282-2.648h.004C16.368 1.308 16.393 1 16.396 1h-3.91v14.801c0 .196 0 .391-.008.583 0 .023-.002.045-.004.07v.012a3.257 3.257 0 0 1-1.67 2.653 3.2 3.2 0 0 1-1.585.417c-1.78 0-3.225-1.452-3.225-3.244 0-1.791 1.445-3.243 3.225-3.243.347 0 .681.057.994.158l.005-3.966a7.12 7.12 0 0 0-.999-.07C6.467 9.171 3.5 12.155 3.5 15.842 3.5 19.529 6.467 22.5 10.219 22.5c3.752 0 6.719-2.97 6.719-6.658v-7.5a10.09 10.09 0 0 0 5.562 1.671V6.059a5.646 5.646 0 0 1-3.179-.497z" fill="white"/>
        </svg>
      </div>
      {showLoginModal && <LoginModal onClose={() => { setShowLoginModal(false); setLoginError(""); }} onLogin={handleLogin} error={loginError} />}
      {showSuccessModal && <SuccessModal orderId={successOrderId} bank={bank} onClose={(v) => { setShowSuccessModal(false); setCurrentView(v); }} uploadPaymentProof={uploadPaymentProof} />}
      {showProofModal && <ProofViewModal proof={showProofModal} onClose={() => setShowProofModal(null)} />}
    </div>
  );
}

function Header({ isAdmin, currentView, setCurrentView, setShowLoginModal, handleLogout, cartCount }) {
  const navItems = isAdmin
    ? [{ id: "shop", label: "Shop", icon: "🏪" }, { id: "admin", label: "Products", icon: "📦" }, { id: "categories", label: "Categories", icon: "🏷️" }, { id: "orders", label: "Orders", icon: "📋" }, { id: "bank", label: "Bank", icon: "🏦" }, { id: "chat", label: "Messages", icon: "💬" }]
    : [{ id: "shop", label: "Shop", icon: "🏪" }, { id: "cart", label: `Cart${cartCount > 0 ? ` (${cartCount})` : ""}`, icon: "🛒" }, { id: "track", label: "Track", icon: "📦" }, { id: "chat", label: "Chat", icon: "💬" }];
  return (
    <header className="header">
      <div className="header-inner">
        <div className="logo">
          <div className="logo-icon"><img src="data:image/png;base64,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" alt="EB" style={{width:"45px",height:"45px",objectFit:"contain"}} /></div>
          <div><h1 style={{ fontSize: "22px", color: "#92400E" }}>EverythingBida</h1><p style={{ fontSize: "11px", color: "#B45309" }}>your source for everything in bida.</p></div>
        </div>
        <nav className="nav">
          {navItems.map(item => (
            <button key={item.id} className={`nav-btn ${currentView === item.id ? "active" : ""}`} onClick={() => setCurrentView(item.id)}>{item.icon} {item.label}</button>
          ))}
          {isAdmin
            ? <button className="nav-btn" onClick={handleLogout}>🚪 Logout</button>
            : <button className="nav-btn" onClick={() => setShowLoginModal(true)}>🔐 Admin</button>}
        </nav>
      </div>
    </header>
  );
}

function StockBadge({ stock }) {
  if (stock === undefined || stock === null) return null;
  if (stock <= 0) return <span className="stock-badge stock-out">Out of Stock</span>;
  if (stock <= LOW_STOCK_THRESHOLD) return <span className="stock-badge stock-low">⚠️ Low stock ({stock} left)</span>;
  return <span className="stock-badge stock-ok">{stock} in stock</span>;
}

function ShopView({ products, addToCart, setCurrentView, categories }) {
  const [searchText, setSearchText] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  const filtered = products.filter(p => {
    const matchesSearch = !searchText || p.name.toLowerCase().includes(searchText.toLowerCase()) || (p.desc && p.desc.toLowerCase().includes(searchText.toLowerCase()));
    const matchesCategory = selectedCategory === "All" || (p.category || "Other") === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <>
      <div className="search-bar">
        <input type="text" className="input" placeholder="🔍 Search products..." value={searchText} onChange={e => setSearchText(e.target.value)} />
        <button className="btn btn-outline" style={{ padding: "12px 20px", whiteSpace: "nowrap" }} onClick={() => setCurrentView("track")}>📦 Track Order</button>
      </div>
      <div className="category-filters">
        {["All", ...categories].map(cat => (
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
            const outOfStock = product.stock !== undefined && product.stock <= 0;
            return (
              <div key={product.id} className="card product-card">
                <div className={`product-img ${!product.image ? "no-image" : ""}`} style={product.image ? { backgroundImage: `url(${product.image})` } : {}}>
                  {!product.image && <span>{getEmoji(product.type)}</span>}
                  <span className="product-tag" style={{ background: getTagColor(product.type) }}>{product.category || product.type}</span>
                  {outOfStock && <div className="out-of-stock-overlay"><span className="out-of-stock-text">OUT OF STOCK</span></div>}
                </div>
                <div className="product-info">
                  <h3>{product.name}</h3>
                  <p>{linkifyText(product.desc)}</p>
                  <StockBadge stock={product.stock} />
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
    </>
  );
}

function TrackOrderView({ orders }) {
  const [trackId, setTrackId] = useState("");
  const [foundOrder, setFoundOrder] = useState(null);
  const [searched, setSearched] = useState(false);

  const statusSteps = ["pending", "confirmed", "processing", "shipped", "delivered"];

  const handleTrack = () => {
    setSearched(true);
    const order = orders.find(o => o.id.toLowerCase() === trackId.trim().toLowerCase());
    setFoundOrder(order || null);
  };

  const getStepIndex = (status) => statusSteps.indexOf(status || "pending");

  return (
    <div className="track-section">
      <h2 style={{ fontSize: "26px", fontWeight: "bold", color: "#78350F", marginBottom: "25px", textAlign: "center" }}>📦 Track Your Order</h2>
      <div className="card">
        <p style={{ color: "#92400E", marginBottom: "15px" }}>Enter your Order ID to check the status of your order.</p>
        <div style={{ display: "flex", gap: "10px" }}>
          <input type="text" className="input" placeholder="e.g. EB12345678" value={trackId} onChange={e => setTrackId(e.target.value)} onKeyDown={e => e.key === "Enter" && handleTrack()} style={{ marginBottom: 0, flex: 1 }} />
          <button className="btn" onClick={handleTrack}>Track</button>
        </div>
      </div>

      {searched && !foundOrder && (
        <div className="card text-center" style={{ padding: "30px" }}>
          <div style={{ fontSize: "50px", marginBottom: "10px" }}>❌</div>
          <h3 style={{ color: "#DC2626" }}>Order Not Found</h3>
          <p style={{ color: "#92400E" }}>Please check your Order ID and try again.</p>
        </div>
      )}

      {foundOrder && (
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px", marginBottom: "20px" }}>
            <div>
              <h3 style={{ color: "#78350F", fontFamily: "monospace" }}>{foundOrder.id}</h3>
              <p style={{ color: "#92400E", fontSize: "12px" }}>{new Date(foundOrder.createdAt).toLocaleString()}</p>
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <span className={`status-badge status-${foundOrder.status}`}>{foundOrder.status}</span>
              {foundOrder.paid && <span className="status-badge status-paid">✓ Paid</span>}
            </div>
          </div>

          <div className="track-timeline">
            {statusSteps.map((step, idx) => {
              const currentIdx = getStepIndex(foundOrder.status);
              const isCompleted = idx < currentIdx;
              const isCurrent = idx === currentIdx;
              return (
                <div key={step} className={`track-step ${isCompleted ? "completed" : ""} ${isCurrent ? "current" : ""}`}>
                  <div style={{ fontWeight: isCurrent ? "bold" : "normal", color: isCompleted || isCurrent ? "#78350F" : "#B45309", textTransform: "capitalize" }}>
                    {step} {isCurrent && "← Current"}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ borderTop: "2px solid #FEF3C7", paddingTop: "15px", marginTop: "10px" }}>
            <h4 style={{ color: "#78350F", marginBottom: "10px" }}>Order Items</h4>
            {foundOrder.items.map((item, idx) => (
              <div key={idx} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", color: "#92400E" }}>
                <span>{item.qty}kg {item.name}</span>
                <span style={{ fontWeight: "bold" }}>{formatPrice(item.price * item.qty)}</span>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0 0", borderTop: "1px solid #FDE68A", marginTop: "8px", fontWeight: "bold", color: "#78350F" }}>
              <span>Total</span>
              <span>{formatPrice(foundOrder.total)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CartView({ cart, updateQty, removeFromCart, placeOrder, bank }) {
  const [customerInfo, setCustomerInfo] = useState({ name: "", phone: "", method: "pickup", address: "" });
  const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);

  const handleSubmit = () => {
    if (!customerInfo.name || !customerInfo.phone) { alert("Please fill in name and phone"); return; }
    if (customerInfo.method === "delivery" && !customerInfo.address) { alert("Please provide delivery address"); return; }
    placeOrder(customerInfo);
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
        {cart.map(item => (
          <div key={item.id} className="cart-item">
            <div className="cart-item-img" style={item.image ? { backgroundImage: `url(${item.image})` } : {}}>
              {!item.image && getEmoji(item.type)}
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
        ))}
        <div style={{ marginTop: "20px", paddingTop: "20px", borderTop: "2px solid #FDE68A", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ fontSize: "20px", color: "#78350F" }}>Total:</h3>
          <h3 style={{ fontSize: "24px", fontWeight: "bold", color: "#78350F" }}>{formatPrice(total)}</h3>
        </div>
      </div>
      <div className="card">
        <h3 style={{ color: "#78350F", marginBottom: "20px" }}>Customer Information</h3>
        <div>
          <input type="text" className="input" placeholder="Name" value={customerInfo.name} onChange={e => setCustomerInfo({ ...customerInfo, name: e.target.value })} />
          <input type="tel" className="input" placeholder="Phone Number" value={customerInfo.phone} onChange={e => setCustomerInfo({ ...customerInfo, phone: e.target.value })} />
          <h4 style={{ color: "#78350F", marginBottom: "12px", marginTop: "10px" }}>Delivery Method</h4>
          <div className="delivery-options">
            <div className={`delivery-option ${customerInfo.method === "pickup" ? "active" : ""}`} onClick={() => setCustomerInfo({ ...customerInfo, method: "pickup" })}>
              <div style={{ fontSize: "28px" }}>🏪</div>
              <div style={{ fontWeight: "bold", color: "#78350F", marginTop: "8px" }}>Store Pickup</div>
            </div>
            <div className={`delivery-option ${customerInfo.method === "delivery" ? "active" : ""}`} onClick={() => setCustomerInfo({ ...customerInfo, method: "delivery" })}>
              <div style={{ fontSize: "28px" }}>🚚</div>
              <div style={{ fontWeight: "bold", color: "#78350F", marginTop: "8px" }}>Home Delivery</div>
            </div>
          </div>
          {customerInfo.method === "delivery" && (
            <textarea className="input" placeholder="Delivery Address" value={customerInfo.address} onChange={e => setCustomerInfo({ ...customerInfo, address: e.target.value })} rows="3" />
          )}
          <div className="payment-box">
            <p style={{ fontWeight: "bold", color: "#92400E", marginBottom: "8px" }}>💳 Payment Details:</p>
            <p style={{ color: "#78350F", fontWeight: "bold" }}>{bank.name}</p>
            <p style={{ color: "#92400E" }}>{bank.accNum}</p>
            <p style={{ color: "#92400E" }}>{bank.accName}</p>
          </div>
          <button className="btn" style={{ width: "100%", padding: "18px", fontSize: "20px" }} onClick={handleSubmit}>Place Order</button>
        </div>
      </div>
    </>
  );
}

function AdminView({ products, addProduct, deleteProduct, updateProduct, categories }) {
  const [formData, setFormData] = useState({ name: "", type: "chicken", category: "Meats", price: "", desc: "", image: null, stock: "" });
  const [editingId, setEditingId] = useState(null);
  const fileInputRef = useRef(null);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setFormData(f => ({ ...f, image: reader.result }));
      reader.readAsDataURL(file);
    }
  };
  const startEdit = (product) => {
    setEditingId(product.id);
    setFormData({ name: product.name, type: product.type, category: product.category || "Other", price: product.price.toString(), desc: product.desc, image: product.image, stock: product.stock !== undefined ? product.stock.toString() : "" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const cancelEdit = () => { setEditingId(null); setFormData({ name: "", type: "chicken", category: "Meats", price: "", desc: "", image: null, stock: "" }); if (fileInputRef.current) fileInputRef.current.value = ""; };
  const handleSubmit = () => {
    if (!formData.name || !formData.price) { alert("Please fill in name and price"); return; }
    const data = { ...formData, price: parseInt(formData.price), stock: formData.stock !== "" ? parseInt(formData.stock) : 0 };
    if (editingId) { updateProduct(editingId, data); alert("Product updated!"); cancelEdit(); }
    else { addProduct(data); setFormData({ name: "", type: "chicken", category: "Meats", price: "", desc: "", image: null, stock: "" }); if (fileInputRef.current) fileInputRef.current.value = ""; alert("Product added!"); }
  };

  return (
    <>
      <h2 style={{ fontSize: "26px", fontWeight: "bold", color: "#78350F", marginBottom: "25px" }}>Product Management</h2>
      <div className="card">
        <h3 style={{ color: "#78350F", marginBottom: "20px" }}>{editingId ? "✏️ Edit Product" : "➕ Add New Product"}</h3>
        <div>
          <div className="image-upload-area" onClick={() => !formData.image && fileInputRef.current?.click()}>
            {formData.image ? (
              <div style={{ position: "relative" }}>
                <img src={formData.image} alt="Preview" style={{ maxWidth: "100%", maxHeight: "200px", borderRadius: "8px" }} />
                <button onClick={e => { e.stopPropagation(); setFormData(f => ({ ...f, image: null })); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                  style={{ position: "absolute", top: "10px", right: "10px", padding: "8px 12px", borderRadius: "8px", border: "none", background: "#DC2626", color: "white", cursor: "pointer", fontWeight: "bold" }}>
                  Remove
                </button>
              </div>
            ) : (
              <>
                <div style={{ fontSize: "40px" }}>📸</div>
                <p style={{ color: "#D97706", fontWeight: "bold", marginBottom: "5px" }}>Click to upload product image</p>
                <p style={{ color: "#92400E", fontSize: "13px" }}>JPG, PNG or GIF</p>
              </>
            )}
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} style={{ display: "none" }} />
          <input type="text" className="input" placeholder="Product Name" value={formData.name} onChange={e => setFormData(f => ({ ...f, name: e.target.value }))} />
          <select className="input" value={formData.type} onChange={e => setFormData(f => ({ ...f, type: e.target.value }))}>
            <option value="chicken">🐔 Chicken</option>
            <option value="turkey">🦃 Turkey</option>
            <option value="beef">🥩 Beef</option>
            <option value="sausage">🌭 Sausage</option>
            <option value="other">🛍️ Other</option>
          </select>
          <select className="input" value={formData.category} onChange={e => setFormData(f => ({ ...f, category: e.target.value }))}>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <input type="number" className="input" placeholder="Price per kg (₦)" value={formData.price} onChange={e => setFormData(f => ({ ...f, price: e.target.value }))} />
          <input type="number" className="input" placeholder="Stock quantity" value={formData.stock} onChange={e => setFormData(f => ({ ...f, stock: e.target.value }))} />
          <textarea className="input" placeholder="Description" value={formData.desc} onChange={e => setFormData(f => ({ ...f, desc: e.target.value }))} rows="3" />
          <div style={{ display: "flex", gap: "10px" }}>
            {editingId && <button className="btn btn-outline" style={{ flex: 1 }} onClick={cancelEdit}>Cancel</button>}
            <button className="btn" style={{ flex: 1 }} onClick={handleSubmit}>{editingId ? "Update Product" : "Add Product"}</button>
          </div>
        </div>
      </div>
      <div className="card">
        <h3 style={{ color: "#78350F", marginBottom: "20px" }}>Current Products ({products.length})</h3>
        {products.length === 0 ? (
          <p style={{ textAlign: "center", color: "#92400E", padding: "20px" }}>No products yet. Add your first product above!</p>
        ) : products.map(product => (
          <div key={product.id} className="admin-product-item">
            <div className="admin-product-img" style={product.image ? { backgroundImage: `url(${product.image})` } : {}}>
              {!product.image && <span style={{ fontSize: "32px" }}>{getEmoji(product.type)}</span>}
            </div>
            <div className="admin-product-info">
              <h4 style={{ color: "#78350F", marginBottom: "4px" }}>{product.name}</h4>
              <p style={{ color: "#92400E", fontSize: "13px", marginBottom: "4px" }}>{product.desc}</p>
              <p style={{ fontWeight: "bold", color: "#D97706" }}>{formatPrice(product.price)}/kg • <span style={{ fontSize: "12px" }}>{product.category || "Other"}</span></p>
              <StockBadge stock={product.stock} />
            </div>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <button className="btn btn-outline" style={{ padding: "8px 16px", fontSize: "14px" }} onClick={() => startEdit(product)}>✏️ Edit</button>
              <button className="btn btn-danger" style={{ padding: "8px 16px", fontSize: "14px" }} onClick={() => deleteProduct(product.id)}>🗑️ Delete</button>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function CategoriesView({ categories, setCategories }) {
  const [newCat, setNewCat] = useState("");
  const [editingIdx, setEditingIdx] = useState(null);
  const [editValue, setEditValue] = useState("");

  const addCategory = () => {
    const name = newCat.trim();
    if (!name || categories.includes(name)) return;
    setCategories([...categories, name]);
    setNewCat("");
  };

  const startEdit = (idx) => { setEditingIdx(idx); setEditValue(categories[idx]); };

  const saveEdit = () => {
    const name = editValue.trim();
    if (!name || (categories.includes(name) && name !== categories[editingIdx])) return;
    setCategories(categories.map((c, i) => i === editingIdx ? name : c));
    setEditingIdx(null); setEditValue("");
  };

  const deleteCategory = (idx) => {
    if (window.confirm(`Delete "${categories[idx]}"? Products with this category will show as "Other".`)) {
      setCategories(categories.filter((_, i) => i !== idx));
    }
  };

  return (
    <>
      <h2 style={{ fontSize: "26px", fontWeight: "bold", color: "#78350F", marginBottom: "25px" }}>🏷️ Manage Categories</h2>
      <div className="card" style={{ marginBottom: "20px" }}>
        <h3 style={{ color: "#78350F", marginBottom: "15px" }}>Add New Category</h3>
        <div style={{ display: "flex", gap: "10px" }}>
          <input className="input" style={{ marginBottom: 0, flex: 1 }} placeholder="Category name..." value={newCat} onChange={e => setNewCat(e.target.value)} onKeyDown={e => e.key === "Enter" && addCategory()} />
          <button className="btn" onClick={addCategory} disabled={!newCat.trim()}>Add</button>
        </div>
      </div>
      <div className="card">
        <h3 style={{ color: "#78350F", marginBottom: "15px" }}>Current Categories ({categories.length})</h3>
        {categories.length === 0 && <p style={{ color: "#92400E" }}>No categories yet. Add one above!</p>}
        {categories.map((cat, idx) => (
          <div key={idx} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "12px", borderBottom: idx < categories.length - 1 ? "1px solid #FDE68A" : "none", flexWrap: "wrap" }}>
            {editingIdx === idx ? (
              <>
                <input className="input" style={{ marginBottom: 0, flex: 1, minWidth: "150px" }} value={editValue} onChange={e => setEditValue(e.target.value)} onKeyDown={e => e.key === "Enter" && saveEdit()} autoFocus />
                <button className="btn" style={{ padding: "8px 16px", fontSize: "13px" }} onClick={saveEdit}>Save</button>
                <button className="btn btn-outline" style={{ padding: "8px 16px", fontSize: "13px" }} onClick={() => setEditingIdx(null)}>Cancel</button>
              </>
            ) : (
              <>
                <span className="cat-btn active" style={{ cursor: "default" }}>{cat}</span>
                <span style={{ flex: 1 }} />
                <button className="btn btn-outline" style={{ padding: "6px 14px", fontSize: "12px" }} onClick={() => startEdit(idx)}>✏️ Edit</button>
                <button className="btn btn-outline" style={{ padding: "6px 14px", fontSize: "12px", borderColor: "#FCA5A5", color: "#DC2626" }} onClick={() => deleteCategory(idx)}>🗑️ Delete</button>
              </>
            )}
          </div>
        ))}
      </div>
    </>
  );
}

function OrdersView({ orders, updateOrderStatus, confirmPayment, setSelectedOrder, setCurrentView, setShowProofModal }) {
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
      {orders.map(order => (
        <div key={order.id} className="card order-card">
          <div className="order-header">
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                <span style={{ fontFamily: "monospace", fontWeight: "bold", color: "#78350F" }}>{order.id}</span>
                <span className={`status-badge status-${order.status}`}>{order.status}</span>
                {order.paid && <span className="status-badge status-paid">✓ Paid</span>}
              </div>
              <p style={{ color: "#92400E", fontSize: "12px", marginTop: "5px" }}>{new Date(order.createdAt).toLocaleString()}</p>
            </div>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              <select onChange={e => updateOrderStatus(order.id, e.target.value)} value={order.status}
                style={{ padding: "8px 12px", borderRadius: "8px", border: "2px solid #FDE68A", fontSize: "13px" }}>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="processing">Processing</option>
                <option value="shipped">Shipped</option>
                <option value="ready">Ready</option>
                <option value="delivered">Delivered</option>
              </select>
              {!order.paid && <button className="btn btn-green" style={{ padding: "8px 12px", fontSize: "13px" }} onClick={() => confirmPayment(order.id)}>Confirm Payment</button>}
              {order.paymentProof && <button className="btn" style={{ padding: "8px 12px", fontSize: "13px", background: "linear-gradient(135deg, #6366F1, #4F46E5)" }} onClick={() => setShowProofModal(order.paymentProof)}>🧾 View Proof</button>}
              <button className="btn btn-outline" style={{ padding: "8px 12px", fontSize: "13px" }} onClick={() => { setSelectedOrder(order.id); setCurrentView("chat"); }}>💬 Chat</button>
            </div>
          </div>
          <div className="order-grid">
            <div>
              <p style={{ fontSize: "12px", fontWeight: "bold", color: "#92400E", marginBottom: "5px" }}>Customer</p>
              <p style={{ fontWeight: "bold", color: "#78350F" }}>{order.customer.name}</p>
              <p style={{ color: "#92400E", fontSize: "13px" }}>{order.customer.phone}</p>
            </div>
            <div>
              <p style={{ fontSize: "12px", fontWeight: "bold", color: "#92400E", marginBottom: "5px" }}>Delivery</p>
              <p style={{ fontWeight: "bold", color: "#78350F" }}>{order.customer.method === "pickup" ? "🏪 Store Pickup" : "🚚 Delivery"}</p>
              {order.customer.address && <p style={{ color: "#92400E", fontSize: "13px" }}>{order.customer.address}</p>}
            </div>
            <div>
              <p style={{ fontSize: "12px", fontWeight: "bold", color: "#92400E", marginBottom: "5px" }}>Items</p>
              {order.items.map((item, idx) => <p key={idx} style={{ color: "#78350F", fontSize: "13px" }}>{item.qty}kg {item.name}</p>)}
              <p style={{ fontWeight: "bold", color: "#78350F", marginTop: "8px" }}>Total: {formatPrice(order.total)}</p>
            </div>
          </div>
        </div>
      ))}
    </>
  );
}

function ChatView({ messages, orders, selectedOrder, setSelectedOrder, sendMessage, isAdmin, uploadPaymentProof }) {
  const [messageText, setMessageText] = useState("");
  const [imageToSend, setImageToSend] = useState(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const proofInputRef = useRef(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, selectedOrder]);

  const orderMessages = selectedOrder ? messages.filter(m => m.orderId === selectedOrder) : [];
  const currentOrder = selectedOrder ? orders.find(o => o.id === selectedOrder) : null;

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { alert("Image size must be less than 5MB"); return; }
      const reader = new FileReader();
      reader.onloadend = () => setImageToSend(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleProofUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { alert("Image size must be less than 5MB"); return; }
      const reader = new FileReader();
      reader.onloadend = () => {
        uploadPaymentProof(selectedOrder, reader.result);
        alert("Payment proof uploaded!");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSend = () => {
    if ((!messageText.trim() && !imageToSend) || !selectedOrder) return;
    sendMessage(messageText.trim() || "📷 Image", selectedOrder, imageToSend);
    setMessageText(""); setImageToSend(null); if (fileInputRef.current) fileInputRef.current.value = "";
  };

  if (orders.length === 0) return (
    <>
      <h2 style={{ fontSize: "26px", fontWeight: "bold", color: "#78350F", marginBottom: "25px" }}>Messages</h2>
      <div className="card text-center" style={{ padding: "50px" }}>
        <div style={{ fontSize: "60px", marginBottom: "15px" }}>💬</div>
        <h3 style={{ color: "#78350F" }}>No Orders Yet</h3>
        <p style={{ color: "#92400E" }}>Place an order to start chatting!</p>
      </div>
    </>
  );

  return (
    <>
      <h2 style={{ fontSize: "26px", fontWeight: "bold", color: "#78350F", marginBottom: "25px" }}>Messages</h2>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(200px, 280px) 1fr", gap: "20px" }}>
        <div className="card" style={{ height: "fit-content" }}>
          <h3 style={{ color: "#78350F", marginBottom: "15px", fontSize: "16px" }}>{isAdmin ? "All Orders" : "Your Orders"}</h3>
          {orders.map(order => (
            <div key={order.id} onClick={() => setSelectedOrder(order.id)}
              style={{ padding: "12px", marginBottom: "8px", borderRadius: "8px", cursor: "pointer", background: selectedOrder === order.id ? "#FEF3C7" : "transparent", border: selectedOrder === order.id ? "2px solid #D97706" : "1px solid #FDE68A", transition: "all 0.2s" }}>
              <p style={{ fontWeight: "bold", color: "#78350F", marginBottom: "4px", fontFamily: "monospace", fontSize: "13px" }}>{order.id}</p>
              <p style={{ fontSize: "12px", color: "#92400E" }}>{formatPrice(order.total)}</p>
              <span className={`status-badge status-${order.status}`} style={{ marginTop: "6px", display: "inline-block" }}>{order.status}</span>
            </div>
          ))}
        </div>
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          {selectedOrder ? (
            <>
              <div className="chat-header">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
                  <h3 style={{ color: "white", fontSize: "18px" }}>💬 Order: {selectedOrder}</h3>
                  {currentOrder && !currentOrder.paymentProof && !isAdmin && (
                    <>
                      <input ref={proofInputRef} type="file" accept="image/*" onChange={handleProofUpload} style={{ display: "none" }} />
                      <button onClick={() => proofInputRef.current?.click()} style={{ padding: "6px 14px", borderRadius: "8px", border: "none", background: "rgba(255,255,255,0.2)", color: "white", cursor: "pointer", fontSize: "12px", fontWeight: "bold" }}>📤 Upload Payment Proof</button>
                    </>
                  )}
                  {currentOrder && currentOrder.paymentProof && <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.8)" }}>✓ Proof uploaded</span>}
                </div>
              </div>
              <div className="chat-messages">
                {orderMessages.map(msg => (
                  <div key={msg.id} className={`msg msg-${msg.type}`}>
                    {msg.type === "system" ? (
                      <div className="msg-system"><span>{msg.text}</span></div>
                    ) : (
                      <>
                        <div className="bubble">
                          {msg.image && <img src={msg.image} alt="Uploaded" style={{ maxWidth: "100%", maxHeight: "300px", borderRadius: "8px", marginBottom: msg.text && msg.text !== "📷 Image" ? "8px" : "0", cursor: "pointer", display: "block" }} onClick={() => window.open(msg.image, "_blank")} />}
                          {msg.text && msg.text !== "📷 Image" && msg.text}
                        </div>
                        <div className="msg-time">{new Date(msg.time).toLocaleTimeString()}</div>
                      </>
                    )}
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
              <div className="chat-input-area">
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} style={{ display: "none" }} />
                {imageToSend && (
                  <div style={{ position: "absolute", bottom: "80px", left: "15px", right: "15px", background: "white", padding: "10px", borderRadius: "12px", boxShadow: "0 4px 15px rgba(0,0,0,0.15)", display: "flex", alignItems: "center", gap: "10px" }}>
                    <img src={imageToSend} alt="Preview" style={{ width: "60px", height: "60px", objectFit: "cover", borderRadius: "8px" }} />
                    <span style={{ flex: 1, color: "#78350F", fontSize: "14px" }}>Image ready to send</span>
                    <button onClick={() => { setImageToSend(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                      style={{ padding: "6px 12px", borderRadius: "6px", border: "none", background: "#DC2626", color: "white", cursor: "pointer", fontSize: "12px" }}>Remove</button>
                  </div>
                )}
                <button onClick={() => fileInputRef.current?.click()} style={{ padding: "12px", borderRadius: "10px", border: "2px solid #FDE68A", background: "white", cursor: "pointer", fontSize: "20px" }} title="Upload image">📷</button>
                <input type="text" className="input" placeholder="Type your message..." value={messageText} onChange={e => setMessageText(e.target.value)} onKeyDown={e => e.key === "Enter" && handleSend()} style={{ marginBottom: 0, flex: 1 }} />
                <button className="btn" onClick={handleSend}>Send</button>
              </div>
            </>
          ) : (
            <div style={{ padding: "50px", textAlign: "center" }}>
              <div style={{ fontSize: "60px", marginBottom: "15px" }}>💬</div>
              <p style={{ color: "#92400E" }}>Select an order to view messages</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function BankView({ bank, updateBank }) {
  const [formData, setFormData] = useState(bank);
  const handleSubmit = () => { updateBank(formData); alert("Bank details saved!"); };
  return (
    <div style={{ maxWidth: "450px", margin: "0 auto" }}>
      <h2 style={{ fontSize: "26px", fontWeight: "bold", color: "#78350F", marginBottom: "25px" }}>Bank Account Settings</h2>
      <div className="card">
        <p style={{ color: "#92400E", marginBottom: "20px" }}>Customers will see this when placing orders.</p>
        <div>
          <label style={{ display: "block", marginBottom: "8px", fontWeight: 600, color: "#92400E", fontSize: "14px" }}>Bank Name</label>
          <input type="text" className="input" value={formData.name} onChange={e => setFormData(f => ({ ...f, name: e.target.value }))} />
          <label style={{ display: "block", marginBottom: "8px", fontWeight: 600, color: "#92400E", fontSize: "14px" }}>Account Number</label>
          <input type="text" className="input" value={formData.accNum} onChange={e => setFormData(f => ({ ...f, accNum: e.target.value }))} />
          <label style={{ display: "block", marginBottom: "8px", fontWeight: 600, color: "#92400E", fontSize: "14px" }}>Account Name</label>
          <input type="text" className="input" value={formData.accName} onChange={e => setFormData(f => ({ ...f, accName: e.target.value }))} />
          <button className="btn" style={{ width: "100%", marginTop: "10px" }} onClick={handleSubmit}>Save Changes</button>
        </div>
      </div>
    </div>
  );
}

function LoginModal({ onClose, onLogin, error }) {
  const [password, setPassword] = useState("");
  return (
    <div className="modal">
      <div className="modal-content">
        <h2 style={{ color: "#92400E", marginBottom: "20px" }}>🔐 Admin Login</h2>
        <input type="password" className="input" placeholder="Enter password" value={password} onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === "Enter" && onLogin(password)} autoFocus />
        {error && <p style={{ color: "#DC2626", marginBottom: "15px", fontSize: "14px" }}>❌ {error}</p>}
        <div className="flex gap-10">
          <button className="btn btn-outline flex-1" onClick={onClose}>Cancel</button>
          <button className="btn flex-1" onClick={() => onLogin(password)}>Login</button>
        </div>
      </div>
    </div>
  );
}

function SuccessModal({ orderId, bank, onClose, uploadPaymentProof }) {
  const proofInputRef = useRef(null);
  const [proofUploaded, setProofUploaded] = useState(false);

  const handleProofUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { alert("Image size must be less than 5MB"); return; }
      const reader = new FileReader();
      reader.onloadend = () => {
        uploadPaymentProof(orderId, reader.result);
        setProofUploaded(true);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="modal">
      <div className="modal-content text-center">
        <div style={{ fontSize: "60px", marginBottom: "15px" }}>✅</div>
        <h2 style={{ color: "#15803D", marginBottom: "10px" }}>Order Placed Successfully!</h2>
        <p style={{ color: "#666", marginBottom: "20px" }}>Your order has been registered.</p>
        <div className="order-id-box">
          <p style={{ fontSize: "14px", color: "#92400E", marginBottom: "5px" }}>Your Order ID:</p>
          <p style={{ fontSize: "20px", fontWeight: "bold", color: "#78350F", fontFamily: "monospace" }}>{orderId}</p>
          <p style={{ fontSize: "12px", color: "#92400E", marginTop: "5px" }}>Save this ID to track your order</p>
        </div>
        <div className="bank-box" style={{ textAlign: "left" }}>
          <p style={{ fontWeight: "bold", color: "#1E40AF", marginBottom: "8px" }}>💳 Please pay to:</p>
          <p style={{ fontWeight: "bold", color: "#1E3A8A" }}>{bank.name}</p>
          <p style={{ color: "#1E40AF" }}>{bank.accNum}</p>
          <p style={{ color: "#1E40AF" }}>{bank.accName}</p>
        </div>

        {!proofUploaded ? (
          <div style={{ marginBottom: "15px" }}>
            <input ref={proofInputRef} type="file" accept="image/*" onChange={handleProofUpload} style={{ display: "none" }} />
            <button className="btn" style={{ width: "100%", background: "linear-gradient(135deg, #6366F1, #4F46E5)", marginBottom: "8px" }} onClick={() => proofInputRef.current?.click()}>
              📤 Upload Payment Proof
            </button>
            <p style={{ fontSize: "12px", color: "#666" }}>Upload a screenshot of your bank transfer</p>
          </div>
        ) : (
          <div style={{ background: "#D1FAE5", borderRadius: "12px", padding: "12px", marginBottom: "15px" }}>
            <p style={{ color: "#065F46", fontWeight: "bold" }}>✅ Payment proof uploaded!</p>
          </div>
        )}

        <div className="flex gap-10">
          <button className="btn btn-outline flex-1" onClick={() => onClose("shop")}>Continue Shopping</button>
          <button className="btn flex-1" onClick={() => onClose("track")}>📦 Track Order</button>
        </div>
        <button className="btn btn-outline" style={{ width: "100%", marginTop: "8px" }} onClick={() => onClose("chat")}>Go to Chat</button>
      </div>
    </div>
  );
}

function ProofViewModal({ proof, onClose }) {
  return (
    <div className="modal" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: "600px" }} onClick={e => e.stopPropagation()}>
        <h3 style={{ color: "#78350F", marginBottom: "15px" }}>🧾 Payment Proof</h3>
        <img src={proof} alt="Payment proof" style={{ width: "100%", borderRadius: "12px", marginBottom: "15px" }} />
        <button className="btn" style={{ width: "100%" }} onClick={onClose}>Close</button>
      </div>
    </div>
  );
}
