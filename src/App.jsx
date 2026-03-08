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

const linkifyText = (text) => {
  if (!text) return "";
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.split(urlRegex).map((part, index) =>
    part.match(urlRegex) ? (
      <a key={index} href={part} target="_blank" rel="noopener noreferrer"
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
`;

export default function App() {
  const [products, setProducts] = useState([
    { id: 1, name: "Fresh Chicken", type: "chicken", price: 4500, desc: "Farm-fresh whole chicken", image: null },
    { id: 2, name: "Premium Turkey", type: "turkey", price: 8500, desc: "Locally raised turkey", image: null },
    { id: 3, name: "Quality Beef", type: "beef", price: 5500, desc: "Prime cut beef", image: null },
  ]);
  const [cart, setCart] = useState([]);
  const [orders, setOrders] = useState([]);
  const [messages, setMessages] = useState([]);
  const [bank, setBank] = useState({ name: "GTBank", accNum: "0123456789", accName: "EverythingBida Ltd" });
  const [adminPassword, setAdminPassword] = useState("castle@7035");
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentView, setCurrentView] = useState("shop");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successOrderId, setSuccessOrderId] = useState("");
  const [loginError, setLoginError] = useState("");

  const handleLogin = (password) => {
    if (password === adminPassword) {
      setIsAdmin(true); setShowLoginModal(false); setLoginError(""); setCurrentView("admin");
    } else { setLoginError("Incorrect password"); }
  };
  const handleLogout = () => { setIsAdmin(false); setCurrentView("shop"); };


  const addToCart = (product) => {
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
    const newOrder = { id: orderId, items: cart.map(i => ({ id: i.id, name: i.name, qty: i.qty, price: i.price })), customer: customerInfo, total, status: "pending", paid: false, createdAt: Date.now() };
    setOrders(prev => [...prev, newOrder]);
    setMessages(prev => [...prev, { id: Date.now(), orderId, type: "system", text: `New order placed: ${orderId}`, time: new Date().toISOString() }]);
    setSuccessOrderId(orderId); setShowSuccessModal(true); clearCart();
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
        {currentView === "shop" && <ShopView products={products} addToCart={addToCart} />}
        {currentView === "cart" && <CartView cart={cart} updateQty={updateQty} removeFromCart={removeFromCart} placeOrder={placeOrder} bank={bank} />}
        {currentView === "chat" && <ChatView messages={messages} orders={orders} selectedOrder={selectedOrder} setSelectedOrder={setSelectedOrder} sendMessage={sendMessage} isAdmin={isAdmin} />}
        {currentView === "admin" && <AdminView products={products} addProduct={addProduct} deleteProduct={deleteProduct} updateProduct={updateProduct} />}
        {currentView === "orders" && <OrdersView orders={orders} updateOrderStatus={updateOrderStatus} confirmPayment={confirmPayment} setSelectedOrder={setSelectedOrder} setCurrentView={setCurrentView} />}
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
      {showSuccessModal && <SuccessModal orderId={successOrderId} bank={bank} onClose={(v) => { setShowSuccessModal(false); setCurrentView(v); }} />}
    </div>
  );
}

function Header({ isAdmin, currentView, setCurrentView, setShowLoginModal, handleLogout, cartCount }) {
  const navItems = isAdmin
    ? [{ id: "shop", label: "Shop", icon: "🏪" }, { id: "admin", label: "Products", icon: "📦" }, { id: "orders", label: "Orders", icon: "📋" }, { id: "bank", label: "Bank", icon: "🏦" }, { id: "chat", label: "Messages", icon: "💬" }]
    : [{ id: "shop", label: "Shop", icon: "🏪" }, { id: "cart", label: `Cart${cartCount > 0 ? ` (${cartCount})` : ""}`, icon: "🛒" }, { id: "chat", label: "Chat", icon: "💬" }];
  return (
    <header className="header">
      <div className="header-inner">
        <div className="logo">
          <div className="logo-icon"><img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIEAAACACAYAAAAs/Ar1AAABBmlDQ1BJQ0MgUHJvZmlsZQAAeJxjYGCSYAACFgMGhty8kqIgdyeFiMgoBQYkkJhcXMCAGzAyMHy7BiIZGC7r4lGHC3CmpBYnA+kPQFxSBLQcaGQKkC2SDmFXgNhJEHYPiF0UEuQMZC8AsjXSkdhJSOzykoISIPsESH1yQRGIfQfItsnNKU1GuJuBJzUvNBhIRwCxDEMxQxCDO4MTGX7ACxDhmb+IgcHiKwMD8wSEWNJMBobtrQwMErcQYipAP/C3MDBsO1+QWJQIFmIBYqa0NAaGT8sZGHgjGRiELzAwcEVj2oGICxx+VQD71Z0hHwjTGXIYUoEingx5DMkMekCWEYMBgyGDGQCSpUCz8yM2qAAAdWRJREFUeJyk/VmspVl254f91t77+85wx4gbERk5V2UVi1Ws4lQsztXuJtlUt8SeoJbabkGGZKPRlloGbBgwYNiwYdgwID34xX7zk19lAxaMtgSpbTfJHkhWkV0s1jxlZVZOMUfc6Qzft/deyw9rf+feyEp2N+STOHnPvXHuued8e+81/Nd//Zfw/+dNIphd+94EMDAIQBRIyb9KgKPDnldffcle/9irvHi84KV9Y6Yb/Nn6Y1+32xGzCgTMKqpc+94IMgPATJ57npkAynq93X3/4a9ShXGd/bEaxfS5rxUjSaBiUJVi+tzXitB3C0xADAhCQJ77vuaCYqD2Y19Het4/G9hqYiiZ7TiwHbJs8shQobZrqoAh7aqE566S7p713/6W5No3dv1fhB+/2Y//SCwg/rEAiBjSfl2AV+/O7DOf+Ql++Zc+z6c/9Qlu3zpmPuupOiDbMw551jbB9T+tV9+otUUzzAxUd49NhUCHGf5vgGq7ZOrPiTFiVKiCqj53RyFqj2hAVam1ohX/2v5OzhWrSilKznl3L6WgVRA6ICIiIH7RRAQL/tivTPDLN32G9niUjnW3T4491ZTNZsOTp6d27+EDPnj4iLPzSz54OkoBqn8KlEqVgBL8Amv4c6+dXf3wuTX88JpLH6TtTt95RnvPof2ysftwSQJigZIzAIv5HuNYUFWETJ98Vy16+MWff93+jd/6Il/81c8TZSSFQh8gBiWIEcxIkok6onXAir8OVjEtaC5ozVArWN19wCQBESMgiBnU6AumxS1DOzemBar/TFBQgdo2UPsqKtQKqKDVP3gwf1xLQSvE2FFGZRyKf9ZcyLlSc6EW0CxgwRc9CBI7CIIRqAGqGSIRE9+gtehuI9QknGnBukifOuZdT4yRrMZmO7IelBJ7vv6DH/HVH7zN/TPkssKlQREgziBFKIApCYjm11AxLLg1s7BbQoJCqBDbDhkAmYlg9udsguDfiAiWKxikmEghksfBN0a3ZDbrWF+eMUvwV37rF+3v/p3f4fM/8xMcLJTIQGSgYySIEk0RCtIWNoqfUCttr+v1TTCi44DWjOZCLRnNI7WMbmatkCwiam2jKEFApIIWaGZbcPOOGlbZWQkUajW0fXjfGNFdRvV/68PMrcC2+uKPlVKUMhZqMSJzwBddYkBSxGICidQAMXUQA0hslsCvt4hgMbCygbOLU86fPGO7WdPHxNHRMUc3Tpjv3+D7P3of9o9Z0fPdDx7zp997m++9/0jOM2QRcuhRBKnuHCJGnyKKMdaMBbBmlkX9Hg1iO+MjIJ1cmaqKXW0CCf4bFohdcB9ZK1GCm3o1QggUU2o1fu6n37D/2f/0P+Fv/PXfom7OuDx/wCsvHHJx9tA3Qi2IDUit7dRWMCMYqBasqm8MU6wWrFasFvogvhmaZbCaqbWgxS1E2Q6oFl/0tgnQaRMUgrl/FmubwGhfjWDBN5MqVnwzBAJYAI2oQrRErUYdm2so5u5grNQCYsmfHwIWAyF1SIwQIhoiqeuRFJGQ3GUQEImEEJAQiP2Mvu9ZzuYkgc3liof3H/Deex/w8OlTlgfHhOUBtd9jCD3b0HP/7JKvfvO7fPn7b/EUZASiuDUqLaYxIKTYrI56jDJdC642wQBIlNCeGFqQESA0Pybug/vZDFDykHeOJjQvcXLngP/1/+Z/aX/3v/u30XHN6uIxNw5nzLvK5vIJy04INhJ0QOsIJTdT7ZtgWgS0gFaC4ZtEC1YKlOwuohbE/FQHw39mlbLdojVT2wZRLZhWat5iNZNCJOCn/soCNNuohrT34JtAPcaRgGjy4LKIW4sibsqLUUqhNIugNYL/BYiJEBOkjhACGiISE4RICAkJyV1OaHfpEDpqdRcVUJYpsbdYslgs6Pqed967x+PTU9598IhH52vCfEla7rMuhXurLX/05tt8/+EjnmyyVEBmkU2t1AqSElaMIEY0kLY5rod2FRCR2CKEgMmPR+fHx8ecnT7FzFjMe3IesQp3757wK7/yBfs//Gf/O/YP5vRJ6BLszxNmA3U8pw+KDiuCjZiOUAYoBavt5Kqhxa2AWwclKohVdwElE7S5iJL9rtOm8Y2RkkItlDqiJaPmm2f6fbcAlWABU20boZlkcx+qJaNZUWW3CVD39ZpBq7uRyW2UUn0TZMU0oS3UMomEFH0TSIfF9m/TJiBi4u41SCKEDpEFQXrfrGJ0Lb7RWhA1bt68yXrYcnpxwYNHT3jv/gPOVhfsHRyx9+IrvL0Z+cNvf5cvf/P7PKlISaCzyFiEnH3DB4ReIohillEMtSnrAEE6/ryb4EHMvO/o+sj6cg3A66/ftb//9/8+f/9/9D9kKGtObh3SxUTVNXXYsN1cQN2yXCSGy2cEHbE6YnWAOp3utpDZN8S0sGEK8tqCz2LAtELxRaVtGKqilolBMXVLMMUZzaFjWhi3AwF1d6OCVd35f8zo5GoTXFmJgFVraaS7BauejdBihZoLpRi5+Cap+KaRGJDYIaGDECEkJCaCdB7REzCBIAkJHRb2MElEhCCQMLqYmKfIrItsNhtqLcxmMw4ODlhtV/zwhz/krbff4dFqxeLl13la4c2Hj/jqm2/yrQcbWQNZIM1mjNtKJJKCEMRQKsUKdTIHBslz+qv0BvyEWMs/3ZQW1pcDKcDf+lt/zf7Bf/If8Yu/9EukTugqhJDYDFtqzizmcw77ns36jGFc0e8dE3SAusVyj9WhLXAmmmJpxDRgpYLFZiWAIGgVxu0arHrgo0oQJQRBJBAsUcsWNUUxRNyT7dI1Ebqu89Mvvvh1inzMEFXfjPh6afXfUbWWMhrd7roAYkgQd1kRogmlKhLwGMYK1Li7hmIKJgiCiS++7bIFo4pyvj4n9gv6vidFz9TIGYoiG+XWzZvk7ZZBM+P2nBiF47snvBRGuidnvHf/HW6c3OXnX32ZvVmHyHftW/fXsjWQ6tfFxCjq71+nuG/K4RUESdd+0t48irRNsJx3bLaZNz7+sv2Df/AP+Hf/zt/m8HCfXAsHB/tIEmKAIW8pJbOYdQiFmtekBMPqFNMB6hodN1jZYGUAzQTNiFasjmipSEsPpRZqLlCKZxK1+Cap1S2J1WYJCikEarMEU7BJdXNKVfou+oWteDBZPcC16m4n1KFtPMV0ygoqNfvz+jD3wLGGlj24W9BinkqaUYuQ1TEGkeC+P/QQIoZbgyDNMlhCJBJDQlNiLQHrpqDR4xZioI89KQXW6zV7iyUpBnIeiCL0fQI1hs2GP/uTr/L0/JIhzJDDEx4MmT/5wY/45tv35RTPHguJgvjyi04r7x6/ghDnoJXZYonVQh5WHB/ss15dYu25f+W3v2h/7+/9PX7ti7/ObLkgpchsMafW6h/s2kkxqwQKxgg2onmF6AYrK6xssbKBumlB4gbqFmmbYEoPrbmMKZOQ9r2W0lbANwFmVNWdCzCrze97liHa8AK1nSuYFhEVxDLkjQedKjt3oKq7TdDJzMGlIrtNYGa+CTwDpValZCWrtdhKMI1Ui3RpTkgdMfQgEdVANSOEhKVATQGNgjBhDZ5JmERMxLMIPF6YAkoRt0adQbi85NmTU770la8xxjl2cExZHPF7X/0a33vwmPulisZE6RLbWkHz1Xq1KDF1XUcpgpZMHtcc7+9xcXFJBA4W8O/823/T/urv/FV+/uc/S5eEvUWPzHrKWAgh+o63hiVQPfigICSE5FdcAPOUTTS4B1LDYksLtYJkkNJ2aQapGANoRS23tM8zhSlCs2ZqtZl3z8MdL/Bc8KMg1Snw9cdCbBivB8N+IAMiyi5o/nNvu5AQQXFHoKCRokawipbRM5AoCBW16AuulWAtBhLF2uJriFjs0BABzywQqKHhOdU9XQBQ5Xg2RxcL/tIv/RK//wdfRuLAdjznt3/u86Sv/Rn6/gf2sBYptdDNEjKbM5YKufgLmZJyQ//yONB3ke1mxSyCVPjrf+237H/wH/5dXnr5Li++cJM4X1DqgIxK6maoJQId7lJAxD8QFrEGOUpwg+Q7vJ0SAPGUL0jBQvE/KL6JxFoaaW76xdzUG7mdcmtppLi5bUGeP1ev3ILVtkjPY+Ae87TH0jaBTDUPQcTanY+Eyq9DvyKBgIdVJoaqYKYEtZ3bkAASgx8aQKU6ilmNXvw9EyIWi2+CUNEQ0ZAIcUaVikls79U/j+EYQKayWCxYziKfeeMN/uhLX+HGS69xcPOEn3/1FWaznm988L69s86yHQoSgOKHRLqEjUpy3NQLPIsusl1XDPjtv/w5+7t/56/zykvHiIyUvCIuIqV4jBv7xTV4cbo6wXNraSeTAtKBRES6VtQBa6Z6Qvmmu7WF8xOtmHruPMUpihEwDPWvAkWvBXqmqNW2GabgbMLTheto/gSgTEGkEfx97bDycG3rBMAaBP3jG8qtgDj4haENjaR6TcJCRixg0QMzITYrYkSMYApB/d+D+ueKigTF1z2hcbKohkkCCqqVDSPRDMtbPvH6a7zzvbe4PH/Go/WGV195ifjSHdRGyrsf2P0RWW9KCwHDFBMTgvjH2lvM2KxHDvbg6AD++//e3+b1V++Qxwtu3z5g1ivbyzPm80S/WJLLuMP6MYd8dydEpS14A14kOqrWNoy0vezAj9cjrpdBpjA1GJ46tbunUe0rsS2TAz4O10xgUoOKudpEE3IIXl8I1/+a+QUxpdUhZOfivCop195ZS/OmTaa2e+3pfU6bD6skGlBTFcuVUCtBWxBc1TOR6pkQ1QNY00IshVALoWZER0LJhDISiv8sTPhK7NkWZXFwxHa75S/+pV8n1gE9f4qcP+Ng2PLJgwM+e/sWdxO2BGYIEnsoHsOElBJBjM16Q5+gjPAP/qP/nr1894QUR27f3CPFCp0wX/Z+kuq4i2YnMy7YNZ+u/u8miHjQE+RqIUWu7lO1zlR2AdwV4N02EIFggbD7GttXiGJIcPMdpJ2s5jNDW6jQNgQT2ohbDbHJvLdgT6828ITzX1m6yYo97x+swdHgUGzAN25skHgngWC2A8ikFcSkeho6VmEgMVpgq0I2DzaLKcUKRTOqGbURtYyRQf2xolxutiyPbrIaRoaqzGY9P/HJj9Mzsr7/PrPVOS/1M944vsFLswVLoDMj7iqEkLRWN2XA3kL4+Osn9jf/xr/FsHrM4cGSvaM91pfnLEJEDpfk9ZZixmzPCyct1N6dkBY+Y1YRsQYCKWKTOfVTaQamATU/BWbBk29reXgz2h65R0/hylQIalhCswy+8aylQFO1BCToFSz24eU0D+JMBZ3SPp08mef302bAxE2nhasXm8rDtbjr2WVd/rdNHPyJwY2lVPWYNrbqJ0IhsokBWmUUgSDWYitpLs1QMsGSWzpxFysElMQmZwqBJ+cXnBzu8eDpY1599UXuv/M2jx8/ZdElZmnGC13Pa4fHPN4W29QsWirEDkolFFW6rmMxg9WF8R/83b/Oo/vf55OfeInlXMjrU5ZHC5CB7bP7xFCZz1Pz1y3R3LmE7JiADcAWsQGzDWYb0C3YgOnY7l4FRK2ZbG0uwtqJ9YoY6gUlbaXiauq1ddNdejhZlUgkiANJEfHUqpny8BEBXpjMAFw7/fb8aberKGC3ia79s2LUa88XcSvjz2tOd6qMVoe+pXp9wz+X+mcx5zjkWintcWmYhqpStKJa0XbAJquwd7Tk3sN3OTo+oJTC8c3bbLaV1z72cVJKbC8u0IszjrXwxvEhb9y4wSHJzOruoqS+32M7nrIn8G/+5kv2m7/+k2w2T5B6ymz/mDgTal0hEpn1c2CNlYimhJVACp1vhOBmeIInsC3oQAhbTC/ReoGVCygr0AYWUck2IAyEhOMCtVBt9E2l2QMtKRgZFUWuyoJYe+jxpQdkYh6B2+Rmat2ZbFPBVNtz9fkN0gyINcvhgau2YLcFotqsXCOkmCnEgMoVT0GU5spAAmgeQRsuo1NWEwgh0YWEjgrxCiyqmPMSgoNO1oqaiPMDNGSC+HMIhfXqjJs3j7h4+pT9dMBIYu/4ZYhLavwe86DU1TmHs56jXPj86y/y3ccPiUDtFlgeSLVWuhSZSeUv/6Vf4vL0PV566SZdyMCIWkKt8z9sA2gHcYa0/BbN7gKUFh9kIINtMBuugCJdo9WtAzqCehoo5nUEs4rWCg0TMMsNAWhxRkM2vMiF59YY0VJb9Gklr9/8dzzVa4yjlh56zPJRv/OhV5jc2FSB3FmLKT74qFhBHcPQKzTezA24p7VTBqGIJA9iGyZh1uhpMUCcXidAANVKCAmiIiZUK+RySckJilGsomN2Nys9x7fusHr8AbMI5fyUm/tHXK5XvHp0wLtnF2yrUg2CaSEG41M/sW+//IVfQFCWyzn9LDmFSr1KZyW34GYEHTFrC2ob0Om+Bt2idUUtG2rZUPK6PV6jdaDWwWHedreG9NVa0VIbcqi7FO/DF9j9uT3383/VV6ZF/3MW+fpi/3mP/7w7NKvRnutZwVXGcP3vOiZlWKloLpQx++N2r7U+972VCu1uuX0tzmqanhMsOHLbrk0phWHc0PU9r7/+OiEEuq5jfblikXpCyXzsxZe40c+JxQ9YCqLUUfkrv/2bpGjcuH0TLSMpRsZxJKSMBSWE6QNlTNyEI4aK7eoMUNx06wg6YDqgdYXVq5hAdEQ1txpAdjOntqsFoIpocdKDCKZ+CvUjovJd4PahxRS7tiC0C/8Rvz8Fqdd9uv3Y4ylQ/eibuw3/G2G3AULz3Z4xTKhTnd63empoeDA8AZMqzRIASvAAMjRwKSimkdBobCoKsSIBavbiGJGWcfl6HN08Zj6fQx48wBwzC+l4Yf+QFw/27emTx1KBFG3k5iH8+q98ntX5E167e5s+GcPmgtQvG3I3HUk83CViYY5JRqRg1vBoqS1oGZq1GNC6gbL1u24RK0TLmI1UHTErO6aRY/12dWImAOnaSTLs2gZQPnxqp/cp1xb6wwtv7aS6eb/aJM+Z+WkjfdhdWGg74hqhc8po2u/vspG2KaZ6TWxFnGrmQR6VWJJ7ql1VT5AgHuhEB8QkSEs91F80OB+hqgMguY7UjRB1IKZItcJ6WBOp7B0esHq0YZ56hosLDm7cZaOVV/b3eevJYwqQghlf+NnP2MnhnJAFHdfMbtzk2ZNzbrxwyLY6ECQGNWSCGVTBQgLpqGxBssO1QXdYv9oWNCPVMwKpWwc9tFzLECaLMPna6n5zenxtgXZfdz7WLcT1751oKs99z4fuz/18optd30DXT7lf4+vc5+duoYFMohMXwX9Gu0Zqitq0kb0IFAV0QinVvHraUnYVxymcsDpxESfIpDGamyUwAaIR4kSHU6wUJCoxCVUHsMrh4SGbhw9JMbHZjixMmQ0jd5dLTmK0y1olJYFf/cWfYbt6yiu3FwTLUJwUWvMAGrEQUS2ICDWo5/9IqyCufRNoxcKUHmUnkegIjEgdoRZEC6YZK6WRTFqNgCu/OiFtpkpVRxXN9PkLb0ZtLmgXtF077XAV7tmHNgAf3hxMLiWwg6snC/FRMcDO1VjDiKa0wk2+XXtdj0endHFKZR2in6DbnKdNoDtLQGhuMKarTR4MCcE3iLRNoIKaMZslYgStlVo9o8ooMRiLxYwYI1JH5iGS12sWi31OUuLlg0PeO31G6gQ+/tpt8vqcxeyE/XnP5tkTDvZvslmvSLM9pBpC9g+h2ih6jccsK4yh+S/bYQZTABmojQk0tpp9bcjZiGj2AktjPEedNkBb2Kof6Y+fM//XrPVzhrttqsmCyIeDvo8y9buNhi/2ted/eBPQTH9QYcoRjMllhd33fpod0AoEVK5wjSA0VyjtWsIEUoXGylbwhVc8wNDqm0H8eXnMdHGOVCOPG9TwEnWoxAQpJbrYM4wr9veXPF1t2VsecGDK7b0l8fQZ6eQIOzmcs+wuCHlL3lZShDyMSAgerQdP1bQWQgikTlANjHUkhg0io58CWk3fHEYWc8qXmCKl8QLMcfMpmFQcCaQqWbVtBGubxcstnha3gKmZ3mABYmDcDohe+f4pGAzTwunzxlxa7UHbqa2l+unTCWKO6FRwmqDFdtp36XkIqAVM6lV9QR1TmH4vtOaTkDx6r7USgpG65CymoVCz0qeuNbZ44S7GzhtmqlJqJcXoh2K3ywQNjioSIilFxs2WThNdSs6xVHE20aj0wYtYfZoRqtBXpW4H9vdnLIMRgfTCyZxFUrpQSKGROYikznd6ycUDERucEhZii3UUyojJGmTEGqHE4wf1Sl9rhGAid0wMHrNdY0g0cRDFrqJr0SnC5znzvaszXLsnCVh4frEndDDg/neqFwA/lmlcLytPloIPfz+xMp+zDP4Xiqn79h2YFNomblVFuSpVKbaLH9wa2HPvF3PrZzSsALxmMBXiYvDQMrSNHA1IDarPu6DRMwwPQM2kYRAedETzGKbXyly84J9efekuywQdhU4MyyMmM+9QMUNraS1V1c23OIiDGpQRDSuE3Ezz5L+n0rBbBT9l2sx7Q+ymzUDAm0Qc2QuTJdidZDflps0EN9ROJ27grpD1fLpoE9awA4V+fGH1Whzy42Hhh13B9HvSHuvVz/AMYVddvPa7IbQgUNp7Eo/4De8LaNlc67/wWMc3SWxhRssQJIIGRCoSA0qkqnmQ2Wo3JpUahWrinEKgU988hlskMbyKqZVF51WjdOfkiI6K1JFoSq6ZoG6OqhUvhBCQlsoRDHEPgdWRoKOjhGbQSrdeq/d+JtkteEsBDS/9quP/zcbvovUJsrXWMTQVnq5vDFVHC58DYyaOXr2WNraT6PvgKsPYbRLFrcKHdsDk+8NkBK5tAkGe2xgi4lDvRPcRdy0W4IrSe80S0D5mEIKJB3wtRrC2ubVtFpniBNrzp/eHWzgTsFIRCaj573ixS9Hkm7LUxmSy4LW+0Ip7lulniQ5Ie7MEZXDSpVak8d1rKagGiLEFQw7iTBUwFG8kYfSgsX3MHZGxRUlWpkCxNapamPaLQ59SPI1qmP6Ulvm/T0EdrQ9mMsOyA4SY4immReK5hQ5BPmRZnscerha+cSCuZSL/stvuPU2Ek+BMIWGqNHoArY38YqLuQi3s9qzFiIgRY2ibWyi1YnpVat9tbhPnJopfl4naYE5qwHlnzW1GsBarjGMlhEAVj6dCitSWcfX9zN2BYGgdGyLlp1XUyMOISkepFYnV+aq1oMFNSSmJWibk0PN7lcawQTGxtnBlt5hVjeAYmluIxhIybX0BZohJM/1ylcvDVUHow9E6fGSsINbSxqp+2mvrRP7XyA6AKzAJnjuRTNanpXtadXJ+7I75VOcwozRGlAVpZFam+pLXOVueP1k4UUVpGZJEL4q1vyUqrblUJoODiWcKWisS6q7K4nY4UgZ/HXcvnlkYoFbouj0kQqIWuil3rVOxBu/A7ZzYEFuxQrQQxJm+VhXLjR9IxRwpcQvopbSW3tVW3AmIOUnMW81w/2gOF5u1n9skeNCoPk074MoNPL/oOpnRaz+7ftvFHrt2dN1ZDLcAkzu42hBXgR/XTuTV97uj3HAa/8jxOXRJGxagtV6RaKJ3eWkL2BKeaUiMnjqaElomsQOKpk3dmMeotoWceiPczycrjamkeItGoJpi2a7eL4KkiIqX40P0HyfB05IgCdME1vsnKJkUiwM27Q1OPmsCQUQHRJ0l7D6tVep2oJGzenYsAYkoPVUiFnqvxdeMWSFQiVra/lUm4ojq1GzuG8iZ5u0ka6WEZlXUTXr1P9QqdW72xCoBI2gmWCVqJbVsQoEqiS0dOURKCFCVKIVkXlyT6vm6qnqOqAZSyVUZukBtJ9TrB4GghuUGdJXc6HB+FUyKp9uiZK3MwsSQklaf0YYStjgKAUvNlV6zSI3pbLngYbszvDxLMaiBaIJmd50lGDXSGneEUJWORARLi8WMcSjsHRwxlEQExqGySB3r9VP6+ZLtekS6QIxCGSsmhSRQhzVdHD0rAOrUwlfrLkCczTouLrdIv09YHPJsHRnDASUdshoqnQhSBxZk5rKlz5ckG0gkai1Y7MkqFHPWoIg4wmaVIJUUAloy27GSSwCZEdMMSz0m3sF09uQhtw8P6GVL2Jxxe7EklYHz9Tn7x0e8dzlw3t/gMhxwUSKLZc+ebgirJyxsjRRPt2LfEyRSSsHGLSUJ25Aokshq6GgETcyIdAGkjhztzQjDyLi5RHUk7fVIjKx0oA4DVoy5VQgQkxI6L8+bKrUGZnGJk0KDN9BopYSCBW8e7plfWb2WFgrQ4eVmijGMI9boaEMRQupYMOPZemTRz0keiWsTZnBypRiEkAk2EjUQrCDauW9p/jZIO1m4O6gy1b0nqpe7lvXFwHYo9GEPCQsWR7eI89vU2QkMcLxc0tUt83xBHM5I2yfMbOumtVZY7IEKpToVzQmm3mBiViklk1JHSEsIc6omVlvlbL1lM2be+NnXOHv6gINkrO69x9M3L6jnlyxKJqWey1zZf+FlwvGnmC3usp8OWcxnnMiK7vIhN7stXJ4xjuOu2WQcNjBsnCMYes42Wy6GQi7GMCoXK+++7hf7rNcjMwIHRzfpQ+Xy8pTtOBBniflszlISZT1Q64gk6Am7JqtOOs8wJrxEHJJDK0ohEvFmkkAN7mbcwJkTZtQIVbypV8wrjwKRSKeBXj0+S7QLWstILdPim2MQLacPakitjtppvaKA6TV/uuu18+YOEyeDJumZd8Jsfszi4DbHJ5+A/ZdgdofNWJhHQdjCxSPygw1109I3CuRCGTLFAlU6JCT61BGSkywkBfq7d6BPEJeQ9ohxzmG/x+FsD7oO1hfc2hwjSSkLZXv+PqtnmbgdWfaBk9t3uf3zX4Q7PwWzO9Df8FhEz+HZu/Ded0CNng2WlWKVKAbR4yjLwosvvgI3T2A+93s/gwqbyw3rp6d872vf5IP33+cg9vQhMt8skFJgHEmzBaNkshp9cN0Ca4Gss6dc1QWdAkpFgweVxhQTGG4oaitHezwWDKS0zqsW0F6PmKb4JsUgO/DHSkBDISX/I0HV+XC1eFxRPXh0mnprGWNi+nhaIuoR6wTAaPCaeS2JPARm/RHMb0B3xCIYyNYdc1ZOT88YHj2ir2uSeY9gUaFqIJugJq5MgiNkYzAuZh1DjGA9Jj39/Iijkzuc3H2Fw+ObyHKGzI5gvODp5Tlnw8DefEaXAsSetx4+5efTEpaH/r4WN2Ec/Z6NL/+TPySuT7Ftbl0/LV7SzJzAggXhzXtsUsD297jxiU9y63M/BXdvs6jG4vXX+NWf/RmG9+/x5lf+jIff/gGixp4I85kx2BaZz5n1AakVHZVZ6pAk6FicOWXm8Llag0E9q9qVwZmAr5YsTzoEVZoMhAeFkYg2+t2ufmGQuhScP1erc981E6IQVBqy1Io9gtcDam25eXXrsCuKcFXduhZplwKlCmMtrG3N3ZcSjB1IR1ajsxEssN2MXFysKOstVjeoDQQtSIjOIWzCU6W6hdI6MAKjgHYLb/ikZ7ANjx6c8eyte3TzOa9/7GMc3b0NdcvmwVPkfMPeYkYYRzbjmm3ch7CA/gjmh9SwJHYJtonxfMOzpytm2zV9hT40d1QrnRgdMJ5fkMsFG4HLKHzz+29Tv/xlPv75z/OpL3yB/ddfg+WS2Z0X+KlXP84nP/0u3/r9P+Dh997i1nLOZnWfo/19OjHG1TmxFmbLPUqsrHXwelxLOxXZaQ2Z+kGLuLxOBKpM5J6wK6BdZRpTLaQlXRMuAqQk0ybI6FiwoA5FRlxHQMRXsrEwreRdCkjO7aR7e9kOBJ/QG/BeASJ5NOq6Aj3EBcQ9uiSt4WIkF2/qjAhJAqEqCaOMI8GEqEaSSIjO6ZeQKKbsNbUPLJELjHlguMzkJxdsJfDdt97hM5/+JAcHe3RPLrlRIoclkM8GignxaM75qnBIT5GOTYWZRbqx8vjpOZjQkeiDMafRxYsSLCOizJcLZBgJRGapozPjycWWt/7FV3n77Xf4+C98np/5lV8jHt2CfaP/whf4udd/krf+0T/hK//0d9mPPR1Gj6IGUSIxBkKEGoN3jEmgThT3SYCo4ShTYUkEggYqzs/YcTEmLSbiNb7jFXoqIiQR29GhS4AghSQBjUYdB4d2dpvAGkpYG0CRnVyMp1naCh87HT9csEmkp5gybP3UO5TW0MjYQ/G6eq1GR/R0NI8YlVlKjqlrq2Oot6yX4ub6uN9Hx5E6GrUKqgkN3a6p83x1ydYUi4K+/y5HVjkaK3Wr3Lx5i29n4cmTMw6qkMIcaqRLCVkeMO96ghpBK522fLpUbNwSLKNReFRW9PN9lpIIw8hhNnoi56cbnpx9wFfvPyWO8DN/4TfgxglsDI4jd774a/zyK3f47u/9l5w9fR82aw4lMut6dL1Fx8w8dYxVW9Dd4OhG9J8INFYdK3EsZdc4gaoRqjXk1WssExb6HK8CSN6Q33jw4pRmC+J9IHn0hSp5ZwnIzncD9XbxVmpVqRgBbVUzaQFj7AISILaOG4e6Gv6O4+dkZcgOkkjrVDI1oig2DA2TiF72RFo1LXlvwnZNqN7mJqHzMq0pm7olZ2MxC9TTJ6zGgW7ccnN/jzSObE7P6Gb7LI8OyZvcqOrCsNmyt5wh2y3r1YpoRmdGjzGb0Ipg9KbQJRb7czbDFjZr5jlwWDr2NLDfzThaLHlnm/nRn3yV/aPbvPGrvw57+3DQs3f3ZfZevcMHb3+Dx5dPGc7PODrYYxGF7WYAdXmgMm78qAe/ng6dN2sgjR851VLwhh9Tr2xag+5D8wFhArVtYjv7JgghBHIZyOOWxbx39ZCqlJzpQiRvtnQhOmlhu3FOgCpas0ugoCCVKEqQSidKH4xZUmbRkJqpeUstmShw9vABRIeYvWDodfHFYslm463oebthniKhVDrzPvyolVALknML3Jy9lG1kZMPImqwrhnLBoOdga0Q25HJOsUssDcyWwmW+YFVW9McLNmVN3W5h44QXqnK0t/BNHyDWTI8yC9CRkTwQdWQmSpKC1g2r4Ry1gSQjXR2ZD5fsbzccXFyy9+wpr0nCHjzku3/8JUDRMsJsxtgL3DrmZ3/jNzh85VX2br3Aew+fsC3e6by3WCAGfe+tfzkPmFVSCnQpeOHHhF6EFF0oxJMHB+qiOF6QJOyygKuA0GHjWrPzQ6x4Y+SO7lydJkZ1ZxMInpNP0SltBzW8X839geeg0aNW4QrYQcEiYhnDm0gak9S5B41EN/kpaT1qobYyMsULM2pcJ39INdQqxbL3OcaOEArB1FFGHSmqLhPTCC8T7ljEu6GVHimFVNzFUAuBrpW7W+BrngnEWukaQSZQieZl8bl5QaYzY47SCy4q2ZC7Mq6Zh0C+uGB4/326197AgBGBlJi9+DI/8Qu/xJfv3ePg5h3UKil27M168mpNjUZOEFvhKUhjSYXgLXQi/rcaUSZKq5loO/3T5xcIOMfRQiDJVYoYdnKuek3ydeK+11b902nh7apuUF2hw+H49nu1qYkUF5qy7KBJ0Ao2UdEr4CIUNA7P5Kem15nUzFyhpOkVZYPcAp3iSiG1QFElm6JkTCoq1Vux65ZaN3jr24Baplhuok2FbK5RLLUQinMgqYWgmam1zmr2INS0faUVtXxDdQp7RTjIwlzFrWE0NGWII6SM5RVdHcnPnvGjb3+b0GBeb+BNcHiDFz73MwzdjLDc43KbKUWJ0ZVauz7S94mUApJkxzGMCAkjTT2PWLPM+MHDy5xyrWFXhKvHwWsHDYd4vvrmC4E3QxSv7KHNCrQFovpGseqVEtXgQiK14QS1VQZ399KeW5t+AI1V07aAtI02iVS2vzFVF+3axqMErAa0BlCPEnYKpFnRMSPZW7dj1vZYCUWRqYGjbSQrTd7GWt6EXpVvr5FUZKKN2ZQAhcaLEPoszLOQ/GNRgjLGSu4qNTiNbhEgbLfc//6bMGS3bEUJkqCbwY1b3HzldS7HwlBATcjZA/AQhJQCoYs7LsCkchzQHYM5RF/cGMD5qN6hLc1i7eRMaW37clXtTFMiN7Vka1P4Kq0U2ofkPXCm0wHwkpC5dIpXPab0xRpgpO1NCkpFkjZ/2DbRtdtEsZo2IDSLItljAIut0Tm03BbQgGnCgE5mbjVy68ipXsTpTegkkoeKtUxU1YmhUSHUQE6CJReFIDln0WLTMQyRKoFq3thuKmgrGbqBdfGo2LSNHbcXhuB1gIpRBLogLGJkTwPre49hk2GshNC5/Pt8Dy4v+dznf4l//PWvc3dvj34Qah6YzWYUU0+LE40tdHXKwWMyFz3zDcDV2jZGcnF3YPg6SW2JnrRNAUklMGFNkzmuZkR1cxmT/8FJwCGoV+bMmvgjCRPvuAmTtdxlB4a2ypeZoemqpv+8HlB7TS1UMmkit9bm06vX0qsaaGzEFI+UBa+law5+0g2imYMoQQjVKGKIigtiaOMrqFuSUo0agKY8WiQQQyBIoIpQJUx1zRbHeLncrBANTD0zqUGo0ai4PN20VjOJmAb2Q+L0coBBvV93FsgEUuzJCHc++RMMCNL3hDKgg7YmFD9oISmhQBEX5JgYzLS188pt02aYNoKHY/41TOCNd42FeBUwpuuCERak8Ti8UbGaUsokcBSoWlvtwN+cm2Hnu2k7ze4/A0ZthGk/VYJAucKZdpag4Q87d9T4BRPBojLJz7t2Qb3GV6wtflXzRQsB+urwdaujUIiUlo76/2le0xdhq8YC8R6KEBgRoglziRQiVRKVhEqgWJkgG8x6XPbQD8GYClXEu4arkQSiRZJGtFT2+8CmBhgVJFBTZAQigTBbuEWNifV2wyIXZkEYykhIQpRAErdcUYUoELN3KpVad4c4NhOfmiuz9v6mdNAMCBGNEQtupUSEFGJ0mnPJ9OrEj2ie25sZtRpBvEgRq7OIxZz2vJOmnxYSnCqOOiWaiThizSRdk7GxyY24QHRS6GolaSUWgRgxTa1mwK7FXMxQDZhGMlCyYZbolB0T2tTp6+7Tr+BLa7QeaWdaTVps4wtbMd8w5hT7QmWSClJRaiuSgicqqXoKBsEx+dDocaJ0BCIdQcVbLjq8X6Dm1rLhf0MIpMWS8XLFPPWUs1Okuh7kOGyQrmsyduZC2cUPYIzNNehwVbfZUdGCWwY171V0iSO/ClGwtuFdahdSzkYg0WfBLgaWJRCicLG9QGYdq4tLFos9Drs5STrGsbLVNZqM0CV0GAjSrAU0E1aaia8onVsWrV6HrxPPzi+SqhBkSdoW4uWGg967jDQHkH0qikohBO+M0gpqiaJzjEQfO6dx77QDoHrk5+4rQGhAVbBJ26jhExXmYcH2/BI6dwcRxzykh1y2zCn0milNVq8T98OCK7wsS0EskZKRFWpwNxNb3FJDz0aAoyUXdYSjOfSVTrfM4oKYt4wP7tMb3OgSN7pI2mzZ3zvgaR0ICgVD6JEgSLAdOppQpPPg01VThUhqOowjWgudOALrYwYCRVuBSQNWhFnsSdVwYmMFGQ2pzhWYNH5jDFAqJW93VKRZSGzwCSAdAdECEloZsxV4Gp489eJdiT8Fdpxr2G2IoJWYK0EG4lhRAlUadq6KlNGFnApe+paEmBCKfyip2oLWib7W0swmbL1jNOOmsrY+wViNUFz91BWKIztVNSkkVTqrVFHHT7SVdnFJmZIcVq6hXk94XZQiQA4VFj1ndWD+wos7fyjFCFGRUun7GatHD5Fc2uQY11vuYvThFsEp61EjFhSJSmhBujOMldb/vLtFcRJOwHb1PEGbnlPc3UWENAWDJSujOmWL4P5e8DamMhQ2OaMxMusSMSagUspAkg5akOanv+WnLb2q0jqJrqeafhTbMAYFMkqm6oDmEctbdhlvUYJmYh1JJSMOXRDEKZxiGRe7tJ2uccArjnFidbYiCuBC1AjVImZxF3tQXY0kajP5RutU8msYoCmttQqqQY3GaTRqg9GNTKxKUpwFRGZrPbbsubAtb/zkJ2GxAJmhEumYOymkFt55623HSCQQ+gVbBZn1GI6uhiDEZIRUkZKJ4n8kYU0b0phsFM0qTGpqTiiB0GR8CH7AUiOtpik1K6WQVZE6uuRqswYCiBm1GFUrNXjxxwGswI4Pak1kuuHVtAUxUyx6vKBxava88tHS+OVqlVJGChkZB2fNIEg1Yq1EzcRSiNUHWVVc+LHY1tHIdsolBP/wdlU9c4sERnSL5bscJRA1IK0NTsxrExMpsyNRzBffiXetecOlRKihsk1Cjk7HT1qJtIkr0QkcWYS8EEaJfPxnPgN7B2CRUhKz4Pri63ff4f233qITz8AWy32G9TmzrnMhD/8EzneMhRALIQ5oMUwa18qmw+FajNquRcTxjElEdJqdlIJ4o+qVJXD59lyKm7auLV6n1OCpVRciwZQ6OuCjvZGka+mW7BbdA9RAoHjkXw0tjUYdG7YwgTChIWehNrm2Qs2u1TclulGFaEosRq8QKxiexharFCkgLh0bEKKlBle7DJa7Ji/R7uQjxVXPEp1Dzi2lEi9LMc2LCddOk6e8sZFupZFAcVqXOFwc8cJSpHpAGAv0c4akpBv79K++DPOZZzP0TtI5O+Ptr3+Ni/sf8GIKoJXF/j7r9ZnHF5OZF3UZ3LYBomy9fyAsnGDb6OzNG5Fc2IDgSt4NEAptLB10UUgxuLy+93y0lKJWB3RKqzJlpQp0pF0/QM6FUirVAqETtPhFlJ0Qnvsp1zY2RzhisxTdhBNMBpaWRF5NKvPxc/5JRHwJPOMIuwwEC1SgINQYqJYcy2gNFxHZ9T04LDphCgbR32nxqkhTIt2Zil2A666r6SZacHJLu8pOJ2/8PIOoQl9gViOzrAT1ti+Vjhx71hK5/frHYG8JydPZhQbYbrn4zjd4/N2v06/PONjfQ8RIDQdwYWuoYSKLQApGCEoITX0sOFIbZErvuaKnV20ssNDwvEnXwC3DVFxKV2mUXKGG6kpbdZzQr0qtV8pfVStZHMbtSmtTo1mC4IGTtELG1Klu1qDaarsSpjTCiVuSiFmgmrRg0bX6CsH5+XgZ2j9sZCCRRdiEOUoHQYmq9ARXEW1K57GdEGk0LKFgRO9aRtreunJRTI91ageTdrga17+BMdqs3t7oxZ2kPV0x+jqjmrANgWIzxrSkLm7wxmd/zlVe6giyhfVI/eH3eesPfpf+8T1OdGQ/O6M7ry+YRyf2xtDSzwlkw3mIPt/Iha2mzezQWbNibcGjmR+I9hmCFxDoJJBiwwlMr0z4jpbUAhurLUeuSi1+EsUES5GaK7VULItz5sXl273hcopYzXP32t6cXru3t+5XuMe0874HOtRcBUVCoqhRBSxUsnmDZ5FItsgQOrZpTjYlaia50/GIHi9cGcI09sYD17aR1DzlEvG3M+1UaUfdvENKd8hhMxhBqOJayFj0iqE6q8cskolk6djEjnWcMS4OkIOb3PrEp/0ab9eQB3j/lHe//Ps8+fpXeDFkIiPLrHRRGc4uWSwWbVCGQ9JKBuvcdoYei66OKhqJIi12aZd2qg+0zeCxgk3OsFE6bOfqUt/31Oot4jF2lM0KzV7Fqg2z90/v6KCfiqYSIs5xE/XWiqkbxjDP00UpamzXSln2bMqGcRwhJSxnNMyIErFRiNZTc0eYR3JZ0y/30Oh6PqNmchGiJAKRKh0jcy5JXEpC+o4wDtzYm3F2/oz9CLmsOF706HZNjNpKsNOp93ilA8bgNC4arGoCkiIEoagSup6yFbIZMSYKxjAOSAzMFx2mcHE5MEtL0myP9Vqx/pC82OdxLdjRi/yF3/kdmB151fD0AZxv+M4/+l3ufeXL3K6X3BClk0o5PyVJ4vjGPqUKT04viXv77bjMCBG61COhRwsUtnSp9y6nyYU0yxVjJPWRvBmY4OLQDuiucc7qFBiya4Ckis/zKdY6bRu+XIHqpnyilasoRpNbseazCU26TXd/yDF58TgjGFaumd7m30Vm1BKoFdargTIYg41YEsJ8DlEQqWTzQle2yFoDm9DT3bjLasi8+tItPvfGx/jBV/4YWZ8RJHK5WbHA4TKRyZxOeLvH0LXJ8JC8J6uaU/CjRGLXcXp5SUIIsxkhJToVYtexzWserzfEvuPmx17l8cMLnp2vuHPnDdbac0nHnZ/6SX7qN/8CvHDsUfDFim/90Zd468tforz1Dq+lwK0+YhfnaCkczHtiUc6fPCV1c+7cPuFs7foE2mIbhxsNCzMkOb0MWjtbiGCxdXV5bOeMYmkQdysnTyVmcZ5FqrWFZhIdSSpGzV5ZizGgRUEDWhxTN7LvptaWqwpRW1MetDza00o3TdYEmpRC8VqEXcUE201mVrygdLB/g/0wJ85mqMyg73iyXoEkUpxh5kUhDYl+dox0Bxy+/Al++Sc/x+JoH9bnnA1fYmGRpIFZ7Lxh1Fx/hMk3TgRNWqDqVxHEZxoFM2KX6BZL9o6PuREqZ2SePH2KbAr78znzgz0sLnmihe8//oBbL77O3idv8d6zysc++dN84Vd/Aw4OYDmHObz19T/lq1/6fXh4n6M8MF/2LHLm4vycm92M2WKOjgMhBvaP9hiy8vTxQ/rlDTfZsPP/0CHdgkiCzYjEaS6iF6vMgrvwmlvb2RT7eszmnAIvOqnqFBhCkIjL0Qm1KpYdHtRiTT9o4reZ5/3irBYp0uK8ydx6imWtkEyL1GtWihQXXjRrujuQug45OuTWrTuUj32Mu7J12DmDdR2v7+21SY6jl0FDhOUBHL8IB7dgfgI3bsP5M9DR27CLkTcDy3mH6EiUqxR2V8MQfLAEU57i8bFI9OGWRFLf8Zmf+ini+VP2pPL6Jz5JImHbLdu8Yh2NT//UT8LBIYMmJO3R33oV4gGM3huIjvyL//of893vfZ3N0wf0l6dsL854fb5Eu8DhrRfZbi5ZbzfeH1i9OjnrZhydHLMdjLjrzG5JiQixzU2qRT0Pqx4XTA0obmSFGFpnc2vTt9DGDAeQGKiqJKciX90nChcqjTnUiCKlpVAWUGukVAHNxS0BV+3cO5kacbEmETxNxFqxJjLlv+vthv1ywZOnj/jgg/cYdcW8jAw1QOhYafUCGwNCJaRINz9gdvwIDm5y8vHPIk9PYd5BitRhzTIYi4MlujpjNwehpVBVwKJnITUEQmqUimu6Bc53qQzDwL1796kPPmDohcObN0hFuDh7xnxvxq3XX2b17JK9vRNmyz3qULh4903Oz1ZICdw5uUta7vELH3+JX/jES6zOnpFX53zjy1/m2fv3qCHybLUmjYG9fp8byxsEHRjOT8nFh32ahEYQ8Wt/BbCJDyHre4pUlxLIV+orobUCSKi7ToDaWDGSXBQzRlcvSTTzOIkrTTh/rRUGr9tLmxI2WQJNUIthoq7eZdcAl4lz3nLumpUanMJuck0gon1ZLufIxTnDsObew3toWbGomZAWSJqxqYZIJTEg5jpHFs7RB5cM/T5f+so3eOPTn+YTL75AH0HXF8Q+EKrPTIx6FQf4CYlUfANYa/vSNh1L1BXXVRW2A5eXlzx57z2O8pZnlwNvv/c+nUbu3D7h5IXbdHFGxx5v/ZM/Zm2FVR548+23mKUZt/aP+IN7D9lbHvLqx9/gs7/4S+wt9+GFl/jiv/vvw/kl/+Kf/jMu3rvHeHHKtqxQidza60kpMTx7zKPzZ5zs33Cwx8SnouAmQaR6BbJPCME7pKuLaYtASOJNrI0P7gKYAQutHhQiqYlqJTMf++rj4K84g7lmp33HGdQJJ/CVtmI7FY5gsQWDYRfoXX2v1FxdOqV6D911/YCqFYkR6SB2PtouRO856MOcpjGGKET19Mbfb2YYLqnRIe53v/M1Hn3HeOPFW9zen8HqjMunD3jh6NA1FXA3gPgGKOLYuReoWk8lzcyG2PoXoIxeqEgpsd93HN884cWbL3Dj5jEXq1N+8NVvMN7fcPvmbS4vnlLGC3711Tvkcc3w9D6ffe0u223h/g++wx9+8B63Pv05PvmLv0o4OYK7r/MLn/o5+NE7vP3Hf8R3v/ol3j1/wPl65IAtN5d7vHhywurxE69ctllL3npeW4oXiHGJpUDXKZ1OSvPWGEXXWVyNQRWblYiRlBJmRlKM2iTUtLRTUF0apWobJKUupeKDdT3FsNYwWXJuO84vZDFn4sbG2fNsQnwjGFeTTfA26oC3m3VdRx/mzGNC85aqmVwHutnCka9aSGJ0bVpYFyJBAvM+crE6p0fJj5SLB/c5Wc44OL5BHQeHga/Og8cqDegRxOdst9TXSyFCSJFAR0fPbO+I7ekDusWcl1++w4yOd7//Xc6fPmU/zLg1W5CfnvLy/gzd7zl/+JBE5jAENm9/nyA9Ly73WenI+1/9F/zwR+/yub/4W7zyi78G8wgnJ3zst/4K+6+/zNe/9E84ff8HzLsDch259/QxB+bjc5Ko12gQ1BqJRyKdOL+w6yKzGhnFBbU0t2aU0Io7sKObWzCfrRSd/JNKUSQmupig+EYgdcQwcy082o7D6Dy0Bnz8uoGnjqrTmfWu2uBjZkUDMXqLmOVIN5tTBjy4E2+1MjLSB7YXI0/vXzKvIwdqaBwoNTPIlo7AjHZKkyGdEmeVvWToUNhrApn25Akn/ZzO2sKKdy85jC6Aj6AThT4kSkysNh192ANJrMcN6z4QcuHmEFiGQ55sjc984lPs3Qh88P7bnN1/xFFc8Codss4QK9bDULbUUumi11hCyRyknr1uxuMnDzneP+bw6AY/ePweb/7e/4u5rrj1878Md14H4Nbrv8EvfPxF/vj/81/zw2/9GZtx4GOHJ+iTR8xj5PLpKXv7ByxO7nJ6umZThOU8UcolYqN736BIydTik+bmKUIpdNE1i6wBb0TnU06zFXalZFXQ6gUeK6DRgyjBY4HUSuyRttMacyh6xOeaeeLjWOPER2glWe86cxPromZXlTpVp5XXDONGGUdlVMUkU+oWiZ33RlrAJFJihC6j/YAlfLr4BHqI45BUJZdCLZmu61rJ1IOmaYIKIWOpo+sOqcXfTykDgwROZvug8PTeI95445OE/JT33/sRVlYslxHOLunKPjFXShBqI9VaM8WTqFUwJa8vuHvrJhfnK84ebnjtzl3urU/5wR//c+L+HjeObsPhCcw7lq9+nF/4q3+Nt4+Ouff7v8dZGXhl/5gkSn95yTAM5LMzttnoZscs9/fQi5WjuFjrt3ANCRNx+nxTJ0HYDdi0ABqDi5XC9U1wda+mnhkEcAXSQK3Tonr9vDbVrGCd/2xXvGgXonXTirTe+eoU9oloenVzRLLkyjgWtpuRWLYkKeSyoUsz76OrkSyOrWsHtfONKub8u67riH0itaFDoQGn0/emXkyJaRoQ7o2384MFDzYXULbsLQ6pCvNG6X7x5hG3a8e973+PMV+SyyXzkFgsZqwfXnJzeeCsJ7zJQ3fVRkAaj68PrM5OiV3P0XzJ/YtTTDpsfsFX/+AP+Y2f/osOB2+Naj3Hr36Sz2wy+u59yo9+wLPLSxYzQRY9oSohFrpeKKzYrDcsIgTzeYkNF/RhWqU0eZtWTGo1j8lS06atQms+8VrL9YFQdr2O4idYn//ei0yBWpXa5gb7TgTTNmlcpfUjeKm6lCucwN+0NY6eC1pYbdnEdB+9l6CMPqp+HAvDkBk3I8NmZFhnTp+ccfbsgovTc1YXa/LaR97OU8/eYp8+dC6BW53UOUszFv2MLnQeZGJUpyv5bEirsF3BxVNeuXnM+299n6iZ7fk5syD0QdhuNxzfPKI2vaYgtpvZNCmRWyuRVIzL1QoRYz5LSC4sgnEQhNX9B9z75nfgbAN09P0BpANmr36SN3765zmtwjp1XAB11hMWiTCHvaUQw5bV5RN88KjHMSklPwyd13D0Q1DydVLx9Z+nCel7rgmliTYbeHlWPbgzxREprm2SGnZVWHceTULVwEwp5npDmUqWStGJY9gwBfGmLTS2zlsQdQg0kHa1C9Ur8UdVaXUo5XK19ukeQVjNVixmc/aXM5bzGf3MJ4iFEIkJEKXmQm78wxoCl9tL9l96GUKFzTnzMIeLFU+//Q0uvvNNto8fkIZn3Dk5YsjnaBk43F9y8eSUg34PYerDDFRxcEwQNDqj+ez8khdeepHVasWzJ4+4e+cu5xUePHnISy98gh9+4+u8+LlfhtAhoXem1eyQ40/9NCdvfJ3ug7fIm8d0OVPHAcYL+m7Gct4xjz1mxZFUHAgiXs1TpmUHlQnufz4729lib0Hz0980pa9ihClOcOKNf483YVQNLpOmLR+15G9GPcUqOZBHY7stbDZbNuuRzWag5EbflUk88qqyaCVA9Q4jqZGgPmxLaoQafXJ5cYthGawGJ4aUgI3CcFG4fLbi9Mk5p0/PuXh6TtkUkkX2+n1m3RyrxrDN1GLOrEmB2AmsLvDS6cj6nbf54Z/+CW9/889YiHK8N2c4P2Ov61j2HRcXZ6RFzyav2Y37xeORSRLGJKIBFgd7ZJTURxZ9R1mv6MqWW33HfNwwPnsCdYD1irzdYObXjZt3+Onf+G2eVOPBemQdI8xmZFOqjgQb6TrdZT4qYG0epUf/oQ3p4kPWYLIOdmUJJjM9mepalJrcxxc1NARiFWp1Mqoh1HClHyhNsqziMLIariOw9b5ELZWtCRehsKkJn80c2LV5NUuj1ZprEW8LdE6En6zrAWVL41S8RyFJ11Q+8X6FrIw1+2CorVBzoeSBmhfEzhnOs85PSSESZhGkwLiGcU157wHf+9IfsLr3Djc64XiWKKtn7M968naLiLC3nLO52LDf9a6JLo3v0ELlHTwtwmxvybNH9zk+PORgOef+oyf0ywNePDnkcnVKCY+4fO9N9vc/Rzc/pPSBulzSUeHF17Cjm5yf3udQInuzBV1x2RwrLj6KdLu/rO1whRQJMZIsYeaIqzWcIbR4QGIkpt0mqLvG0lq9z8AXwcURLDZzXMVLy4p32zTyQq0CNTARn0utlKzoplLziFVlC2xE2YaBek3v10mhsJuxPKGS1blwWkOTY3E3pOaFKRF2bmvY+rymFBoUbVBrYagFjUbeDlxEI80Sh4d7HBwd4uXzzJAz4zhycz53yvn9+3zt936Pt//0q7xG4uWbB+TTByy6wKZsUS1+wlJk/3APNuMOf2ghbgtIG9Yv8PTslMPjIzabDav1BXdObpKLcvH4EbdOXuSpjDx49/vsf/oT0O1zvlmzt1y6V7045VO/8Mu8O5wznn3AZtwSqzBLiRSCZ2NiYFfToDUaQQMxekVRNSDR9Z5CCwYlCno9MCxaybWSuhnrYSREV8eQmBhzdR3+Zu5dcEupFUQ6Ypwh1qM1MA7G6nLk4nzL6nJkGEojonSYRmKaO+VKaad/av50BdO+79lsNgRJxNC5qkkjbpi5rFvJRh6VcSzksVKyIeKvX7KfjomwQjVKcctyebGhFuHJk1PefecD1qsBI7FcHCISuXGwD2+/zft/9Ifo44cckzkkE4ZLegxKoQ/Csp8x63qiQK4jltwE29To2SJwsZaqAvPljGqVbpZYLBaM44BpYZkStlmzCFs+eOebkM9A16R5YEC9bWxvn1sff4OzTSHM9hiqENMegQXYDNNEij2x75DobkFCoJvP6OYzV1FvsZfDrs5IktgAtFZBTZPPv+7/3cx7tF+rIrESM95Jqx4sjkNrW10pmoWhVIZSKNXn+kStBDPms9lzQkk+B6AtVHuD0ub7KK3HkPbv1hgzDdFzFyaNS2gtAA1XvECnfnp/oLSqm3QM2eg23vljpfD02QX9fIbcTMQ057BfAIF3v/41ts/O+OStW+iD+6QuEWUa4NHK0ZOWQjO/DtOGVjfB6VvmQWgr3l99dvMytXMovLMryQjjOdgWdhLB3nDSRYGuw2Kk1NDYVm4tRad0z7mGgnePOS9TCElIKVFj9I2qzuh2CmDYTWbbkUrcFdTdZhADqsPJEjvPCDQSJBKjUXElk7FWyiqjVRjVPIZQXPrFPEquKhQN7TWa57x2If1iOTVt2hTWTrOZeKEKb/QM4oQKcUlTh6+nps12M3XFU1PPUqb3Pmbz4RhROL3cEjeZ5WxJiRm2I9vvfB85u+BIK+HiFBvWzBcHlLEx92RiLzfCa+ubrG2KlVdjA8mcBu7+uRWvpnSNABP3wnzjd8Eo4wrXbPAGGGuFMkQgRroYkOyZVIqClUKVQAyGim+CQKBGcSIQQugSoQb6vqfU0YuDTDF5Y2O3NUi7lLBZAJ369duGCMGbQKs6315DJNfMtlaGYaQOFTRSmFq3Y9vl04yf6fWvWQKuTpK3VMtuyFNVv2C17dJSK1GSEz1bvd9aq6s1HmBobJvaSBdBW9kUYSxK1+85G2jcIMEnvm42mXK2YZWVernhrW9/k5fm+/R15PzRPe4eH7DdrIihWR5p08jMrc3Ujk5DVYGdYKRDNq3YJm6id43KEgkaveU+JCYtQYdn004IwxVeDMrYpGgKMSgpzdDR2VDu621XJRSdWMq+gWKMxL7HxurStn7VmQaBXFMvu2pfmky1me6wgbEUJCtSvSdfrLKtWy7zmnEsyNaj+4l8aSG6egYeuETYya3axHa4dqsoMXpooNI6oa3sELCddTBrMHY7aRR/XfHXCM0UTwQXzIsl26Ew31uSuo68Hkipo9KxGQfy5Za7d19m8/icsB5JHYSy4YWDAw7mHQ/OnnBwuOcZEdZcmC+yNhfkkLEjl1MPg5gvijbrsStlEN3CSUQ0USVSc6Dv9tw6aKCTjgx0IYFm9PQJ0TKdVEJouo5SoQ8NindCqQckzVWEVisJLhwW66SQbrvrybUNESZZ92naqKo2LQLaY0HFTXNRyLkybItLzrXSs0fvrhriqERsfjJwvRN5d7uWt05mTxrHT72lwiNswYtNDYGbuA6lFawmCddmRH1TYG1ZvOVsrG4rSoWhGLnCMBpDVmazJT/9c1/gu3/2TeJ6hNVAGjOHfeL+Bx9w6/ZNCh6B+9lu/NxmFUQihIi2Ll8ILSjEpYAnTeF20IsYVcJOTb2ERK6B44M7YD3U4GTa2hY1jzy69y6hbul7I8qIMaJhhA5qKC0OFhfYCFfXFdhlA7GVjSfJ3Gns34QfpNJqBcV0lyJK2wW1GKH3BRW8+aI27kE1H/IcQkI0YpLcZ4bEpDmwC9hs6uoJu81B86Qm06bwCHan73/1SXxBvXO2BZDteQGU6u2M4jL3qb2mmvvGGDqf3VAqxETsejbjSOoWfOKNnySfXvDkvXt0BwuWx3P6ubA6O6VmF6HWwVBxfYVJqib6m28d0883goqfCCY9QdcJqH5QwnQdhCqRYoEQl9y5/RqEfaiJ1HVs8tY3/+U5jz54F+qW+UKR7eAd11II3YySq+sXRN+MLvXfikXmeADVmccxemFJG4GIyG7DJLVCMfWo3oyqbjasCrl6RhBVyGqQjTxUNtvCII3hmj0qdVwhAMWBI4xoRp8mq3BVXZsu0qTw5aYsegqJaxdME2GlEUksGNoUv818YNZEs2AKcsSoctULJSLM5h3DWDCBeTen6+ecj5n5wT4v/8RP8l/85/85L984QdaXbLfnLA87Qld4+Y2f4IO33mZ5cgBaCSSfJCYuL1uDW88wBdLmgyuyCC72WTCxXQrpMEjFSF5qN2GIc0p/k72T16Df92MhGRvPISXq5UM2pw/oyoYFnef6WqliWIJc1buIkgftjsg7i1obh1Cr/ywmIRRpmlEeau8sQVX1HkATlMTYUMOQBIs9pXgDBlXJ28ywGtkWKLOenhlUIVqkiEJstPLgxEYxYRxHYuq8YJMLx3tLGH2Eq5jSAfXZBTeOTxgHJYY5ybbMMcJQqKFQg8cDmibVLnFeozYtotAudPTTJ2KufWjCLM7ch0pgqIWnp2eMXeRXv/gX+NNvfJObN+6wevqMtB1dCHM9cvTCAY+//S4vfebjXK6fkTUTdKRPHSawpbKN0IWOflWI6jMPxtja4oI6XwKjT9pS7+JAabdgMxRCv8c2HfAs3GD+ymfh8BbIiqorjm9khre+wZ/87v+D+fYJt/oOuRjYY+apaAdbLWgXUYxcFLGRYIEYk9d0Jvio8+B6Pu8ZB9egTCKcDltkbuQyECpG1SYsKS49Y0QXbLKAkRjGwmo9MIwFJBHTAqNzjNvSzsxPKJma7Xz4VMkylV0lscGEmFUHMLoEfU/pOrIIww6GDtQAJUCOMCRjjDCKtVPRRJ49SL+aL9h8sAo8PD3FutjEsJX54T4/84UvcOull/jhu+/y8PEjjo+Pif2M5eENLreF9+4/pmhkfbom0jGPM+axazMFa2Pq0gJY74rUafCHTFzGFkJmYxE69tKCkAPrsw0HhzcZqnBelM//xr+BHZ9QLs8wHUlhRB+/w5M3v8Hm/o/YqyNLhbkFonYeM4SExYQmH3cXUjP3KTZEMCCdQBfR5LFCCIEYXFklBm+7v1Y7qLvikdWWbpm3VKm61MQ4jOg6E6owjz3JB/My5MIysEtTrub1XFuMaqR5pBjkUtlWhRhRCWylYkSY95S9GdtZ4BJDkmEW6MTIwWsVJXgAFFToNVJN6CvEKqRd1uGdeAQPGscg3Hr9LttceP/BPW68cIe1Gh//9Kf5gy/9kf9KhMsyMJYNm8stEjJdCixRHn9wj5defoG92YyUlDIMVFNidHmdsWypSdBYG3U9MrOEVOf7JRPm0rM+PacoHB2fcHzzNt99+wE3X/kJwslr3PjMa3AzEYpPlOfpEx5+53s8+fb3kcfPOJjvMVfvEKOVqWnu3sQzIlG/LtKEf4MJGQhmaA1YcrGvkGJLU+S5NUouW9fgXIvthIpXA0sla2XMFSme6HoE6i3aITTuntiO1Diplnmq6e4fcX82mGGxg9ijIj62HVcvj7HDYqJQGBsZNKbgLeiik8AqiKt3BI3EiYpNA6jUCZml/X4JwvcfPyUjpJNbDPMlX/yL/x1mN4547733kJy5c3yDh/fvMZ/3WBcZSuXGwT6Pnz3l5tEeZ6db+qMDZvOZp2xFkeTtsjVXQudmKLVarc9aCr4JNLq+0zbQH+yT9k5489EpcvwCZ3HGZ37tl2E/oHJJ6ArEwuadd3nzn/8h+v47/MTRCXuXa2bTVK12ECRKSwNb/UUcY5HWT+r5UHS1ljDpFLRGVvMys4bKNCk2VIViNFQvgiXH4iuMWRmGilkkhI4QvE7gCvjenDGlPhN4I2bEJn/jbVOJXG0nBzffP4CUyI0Xn7LRjTArgS4HUo0k60iWSNYRSqLLiS5Huhzpx8AsR/oaiUWw1jDqGUiPWo/agkEWrNOC8egmF/t7bI6OeO0Xf4G7X/x1/uzrX4eqzAhsnp3z2suv8t6zJ/zlf//f4/jTn+JbT55wKXPGMufi8Ui5AIaepDMSM3rtWGpg34SZwcyUmSpzrcwrzNTozNUOzlYDBx//JOHOy/zZ46c83D/g7IXbfPpv/03s9RdgkQnLAvkpz/70y/zwD/4Zcu8+L2TlRjWWtSmutLxfQ/DxAjESQsRiwlLYpYkEp41ZK/5NJWViIESvG1hwkGmSJE7esuTlW1MXhdAq5NEYRyUX9V3UoMZa25SxEAghUiQ3aRrbZQEGjfcGISaGXKi9E1ePT241aNMJmSkrZIWMz+uxgEgCU2qpiDkxxJU58TlLiE9xFRhbR03UhEikkhhDYhsT6xQZ92asyprP/vIv8Uu/82/Cs2f86de/hl6uuH3jBqEK7z94yMkbn4DPfppf/8TrfPP/9H8ml8ib9x/w8f1jTlfQzYTYz7EuIL0RxBE8ZWzQd6vatU6bbN5RHO68wL0h88gGNie36F99nV/8nb8BJ7fh5Iard68fcu8bf8YP/ukfIB/c40URTkIkXKzoAi6WHASSi21adNKtBdc6NKPVKFoKLi1VVS8aSWxBTGxgVxvmPZWgk9O/nENoRahFGCtkVYZtwcTrANqi8aDOKlalJTwtAhJo74Zg0nL3SEodl+PWc/Qg3Lh12yFNR9tp0jtMXU8WHD4cFXLJPj0U36C1pX1Yaw8XYUze2JJqIFhCpWOMMzYxcpki9y5WfOoXPsdv/wf/Icwi73zta8SYuHtywuXjp7xw8w7fvPc+v/xX/hK8+jJ5dcnf/0//U/4v/9v/jOXdntNNJgyw2WT2Zx39oiOkoV3kHms1Dw+MmyUlOA4QArK3x4PNhu1iwUs//bO88au/hh0eIjduMG4vsEcP+cGX/4j73/gWR5cjd/pE9/QUHbbsnRzDuEZjpEZpQZ6f+mS+CXajUGrTerDk4/GaVdbxim0UkrsODW4Nph6h5LxA70Z2nWK3BMWUkiHNOrRWcqmk6uZGJeCDKEorXngc4IIH7C6KRzCRsSh9w7KPlvtg/rzruv2YB3+DCNIFMgXNxrxzr28CYuq8BfPmWI2BbRew6OLOyQJqiTEJ25QYYuDv/Y//J/zkb/4FkBEePuAf/sP/kvLwIS8cnjAPPQ+ePOXVz3yGu5/9DHSJ7qc/iz465W/9x/8x/+z/9g85ffMthlI4H5UbCHt9R0jqIt7inL6peqCE5p7cRZUQOF1f8upPfoaf+9xPk155Dfb3kH7OxfvvMZw95uu/+1/B40csLlbsl8CRdCwXHRYLkBnngZKEnJpvl+gpcnWzX9IkFuYld2mWCDOkKhrEs4UQ3G00lY1dMRdIJddW3IEYOjbrLXko5BiYzRYUdemZEFwz2I+lV8tDDKiNvgGc8oPRagkIwZSSR+6+9DLfe3iPN37lCxwtFiCR+uwZcdbR5rQy9sbJJ1/hg299lzt7eywssQ4jSeqOCuWSrR4MdmJoNFYyMpvNWcqM7QgpJF75xKf4mS9+kbtf+Fl4+TbMZrDe8Pa3vsnJwQFlvs/5/Ue88sKLvLO65MYLL3DnE5+E23dc7/DuXe7EA/7tNz7D/d//Q771L/6I7775Dd55suaF/ZscLHu6WfR+f209nDjyaimw3Nvj6OYNlgeHfP7jn4T9Yx+0ZQLvPuLsg6/x7ts/4um9dzjikgMd2Isd+wbLMpLEYNmRk7HthbETyk5kCuYVOvUIv2KOn2hbF5mqnO0QRiP2ie16bFXJQNFK7DvvNMt56kX05tM6cQtqMxUSUK1O8GzmP05zfUUaBuC+5TmlYt9s+DicyJtvvsnxyy/yF3/1V6Hr4dEj0tE+XG7chYwj/f4e//P/1f8Ctpnhg3vMOp8CxnZN09WnjgMlZ+qYIfuQyL07+4QuImEOYQ5xH5Z7sH8IB3O4PIf+EJ484Xtf/TMev/UjXkk9Nw8OyasV+2nGfrdkHjooQsgF5QJ9dkE83XD3l3+Fuz/3M/xmPgO7BLsANhDaNJi470Gp+MklGvSd35ObZ9YDw/vf4+n797l88IRyfomsN9waLzleVuZaWBj06rMLiFA6yL2w7YWhEzTFVuJv3eCAhEicecNvtOhumA7DuRxSga3/njW8QEMTwhevtzTNIqHUhjrl2qalK8XipDj/HNsYJjxAp5yN68QOa7m6te9vnNz0PHzY8KXf/z3+8T//fX50+ojcBZ6uztlsNnzy9Y+TL9YcdB035gv2UuKFGye8+9ZbnBwfEaPQdx0pBfqY6FJwOlkyLr+XyRQ6jSy7PWazJVkDZ5sNz8Y1aX/G7dsnRM289Sd/SlytOby5x34fWJ1ecnJ8yP0//Rb/9//9/5H3y8CDYcvdl17mE3df47Ubt4mXG+7ePOTweImkjKaBbhGQWauFjNu29TMWMpaUEoyNZjZ55PGjZ673sB5gvWExZI6A/QDzeUcZN22yWiuwRfHi0Cwy9kLphdp5CT8hSGYns4MINXr6LI2P6bB6q8CKemHO2DGKpFlzM3ZuIdXqcrPjWH26Wam+6Oq6AmZeRvWUsmH0rTX6w8DQdHPU0B+/896POL51wvtPH/Gtr/wJe7dOqOMW6wJ3lwsW+zfZvnefiwePObr7Ais95Wy15nyxZN4nfvT+B6QAKcSm4++AQUSoydgkZbTaOoodbwgxodElqnLNfLdmXjy+wfzikptHR8hmy+V6SwdwuWKRM4fnc/ZmiRdljjy95PLen/GN7cjJYsnjIKSgGCPWVfpFol8kQowcHpw4WheKD7vonKh7WbescibNvUycEGZVWcbK0pSlFZIoidryfFqaJ9QuUPuAzYIPKU1CCl67iMoVwSXiwWFoMyAae9sDd/Hmkxhcr6m5ArEW4Bu7qmIq2ZtR81gIbQNcX1iZTI84HicTKeG527Uog4ly7ffZbEbXJ4729kh9x3zWE9YrtBQWRGabyvriktvzfRarzLDZcnMx4+yDBxzeOOLEok8dKQ5I1ZqpNTstPsDxzSM0JSQKleKWrI50XUfXJxbzBY8/eEZXMstiHMzm5NUaLZWjgyMSwYdjPDvnMAVuhkBaVheoCsa+FsbVJb0qfecFKz2rzI/3uHHrhHJ+QTdLdKmiMmIxY3PhKEbWQZAuUVpKFs2YVYO6Zaxbiipp3qqv0TeApkSNgqWExEDXoF7BBbf65BQ/TR4Edl1spzk1tx0xq9SG1eS1u2dpcnci5iIcZhBcIijlnFtbeqVTbUpk0vr22Qk6RsMbLTW0amjdSdME48cswtROUKzyo7d+yHy54HjvhLMP7tGr8sKdWzx++IjtWLlxcMjNg0Pee+89hiHzic9+hjRmynq9e7MpRlJ0pm2YJWfriLC+HFot3cUbAj5DOQxr7yhaLLkLLBS2qzU2Fg5mS2qqjFLZ5C2pV/ZDYh6EoiNlNZD7QAmw7IywHZibcRwXmAUu1iusFtZSifsd3bynDwK2wfKASMBmPbMYOT17TOh6wnzOfJaY9a572KkjfGoJDQEJqX2OiAaBmOiCOOtq+k8ECUKMftoRw5LtkEKrHpxNLC6mzKA62GQtXjOtzuVUJWdIuQyt5+CKaOCzAxyESTG1Io26FgHOa5Opb2C36o3B2qo4E99y72CfrnOI14aBOIwsU+KYwGBw+OILPHz0mPfev+ToxjHF4IfvvoWVygt37pC3Q8M2fE5xttZCDySFG2FJKJCDQucl1hg9ck9WCBfnHIfEMkQ2XU9F2F/OOb284DSvmN3cQ7WyWq+powepORi2nMOi52l5jIUMQdigzFPH8mDOpVRO8xmknv15T1rO6HUklpEQBZIR6dg7OmKlwmAVhoEsA8pAlELoEmXmSug0sq20voUY4tXha2OHEXFp4MYc1jaRRswZVbEBRzudEDMkBah115Xk4t5GqZClkBVJowrjVJLFlcZEAqSA4jh5MKgEQjE0ukc2lHpNCuWjbgI8evCQl198gbMnTyAIL75wl/OnT7n//n0ODw+5OLvgxo0bPDl95iJKnTNg9m8ecv/BAw4P9n0zNspUkOgXKAR6Aqy1FVd8OJaaNp3iQsBYhEQdM0NWQgiMpZCzb/z54YKL9QUJgwKLvmc+3yNaZgwudY8Zi8WMRRHG7ZZqW7q+p5/3ZFMuz8+YLfbQzjt/JngXlFoHNK8xC85c7iIx9ARzAUzrIqQOUt8mk0QPtcUVCG3HaZyKR05M0WgN7Il04j2V0lWUDFoQVVIOiHSIzAkhUkMhB2EMyrYaWa3RByCtC2ytYzRjvVmzSAukT8i8Ub2i56DdaNRgbVK6R6VCxCcyO8dsklZ1eNd3x63DY8b1yP5iH4Cz1Ujol4SZsDbBpGO1ycwXBy1FLcy7OXXMHBwctM9uoFfya1FdPNOsUuLVxXF4OTQ8tEODsCqVmGYOcyOE1LEZMvNZB8U40I6A0SEMFedSxEgYfeZg33XE0QOylPw1BCGMykGKHKYDeFCom0K8uU9YRqplMhVbJDSBRUNcbgUhEOOcwAwNkaCdF7/witBUhyEIJQjWza7oeG1kzeRqg/bosE/qYOgeM3KByIaZdMSLGbqGTg4Y8gVhsc9ms2HooVvus3rvlMs8eBFvoyZZom3yhsPZgvVq5NbBHlsdsT7QhnY3NMrYzUtstO9grm4meEnZwT/PUbyi6JGmyvU+vXTFh5vSiB2R819iWmjcAfFFmdxPCUKYJq00MIvGC1TRptjV3oPpjrqWFJKmZn6vdfCKZ9siQq9+qpPJTpB7YgiHGuhHoWokbQNh9LI4KaJR0aDQebzi88JCY0sLAR+y4ZCucxQ1+GgbDYKlCRGMTGPwiGHnLgAoc1LaR5JBf+ZLIxBVdxNOkkQXHMGpaJuc2V5eMkjiycXaYeOxeD47H0dkNmMYBmapI+RMLx4cBSB0rVATBFRdlh0lWucMWC1t8IRdUZrF+xlDaCDItZtTED8iv/wot9Je76N+bv+KTfPhNuwf21SxaS4FF3AIeOp09X4/+vWnvy3iAdY4jnTjyEx7YuxIycGsltc6+SN4cUyCU/OJTUwqCiFNhZ6Axtb+1wLFyQJMm2inWhqiv1aC1Hckpi6vQInJVVSS0fcBGyvL1HEpHZcV+uObPH7nLXcHo1ZOL845jD2bPNKnSCmFRdczhGl+Hk3fxrWNp5RWgJASQasHKeACVfjCe5Ooz1asclXraJfxeULpv2QRnT7eOmkni/QvX/vnbg3WYGq6mF53d2dyuc+TLaZ/o/386rlXrwF43aMUhmEg5TlxOfPuH8FLu5MPT6HR8p12ztTTkFw7UZIXdya2kHcVu4WQiTF0bRNIdViY6E1CiSVFOqxGSgdxliFnmAuy3hJrpZfOx9csj/jRs3N3BwXj/ukTXrv1KqfPLnltechms+Hw1k20bqCRKjFwSRRAQlPYnIgNBrW1fgVvkWqxWhu44BdSW1oj0kqd8K/cBFcX+/lMZLc5J7fzr3ih65bg+uMm4OsyfcGunf/2SD7aEl0XxgQvqI1DphtHFrVDSD7ltMHvUx5do+wW1ybQp81kJDXqegpY6rxsLFdWgNhSyWnzWsBya5OLiYBL5asYdWYw32JjBquU7Yq83lBKR5F93l1t+fYH51QgWYg8Oj+T8c7rJqXCMjIMI11KzKRrmjdtoRvyJGrEau3DF5fAb9xfU2vTUJtgFP4hwu5MPX/78fWb4oKJSXx10f21rtzNj6WpH154m073tdP/ob+267uYHl/bJGbVL/70u9csgbRyuJnPGASllsKw2RLHjn4RCeITZERanp68JdxC8IEW4qQYSRHrHBwiXG0IabrQGvx3QoqI+M+m6+mzegSRntCGeGhVrB+wWcF6fG5FydioWOjJYc737z/jYfGKR6oBVlo4HzfcmnesNHPQOlsWaU5ISparRo9YBKnqE0hMKcXwaXC++KrRCw7WhhW1iai73repD9EjyKslacHcjy3kBDh81M//W958Aa9e+8Nu4sN/48OWIOBlbRNv0Amdm/NaXEqn22bS/oLoUqw+8SU5G0hSKyxNixka46eZf0LEokCzBCF1xEYIkeQVS2sAEmJIX/0z1I5EpFqEUKhZoN9CJ2Cju96QKJa4zJGvv3OPtTg0kCpGAc6GLbeWx5ytRvb39smlMnd4CwmQJxAoQKhGLH4hXMXMMWjajCOfp+xC1nkYCQ1KFm1m9rlFvXbidxvhepbwIVfwr3HzReJfy9dMrFu55vdde8iu+hfaRvGp47LbFNPEliReoRt0pIzZtR2rS/q6JoRBjG7em+nXtuBO90qQ/N+nTSCxQ5pbIHjforuLtMu2QtMrcmi2R7QnaPB5CnHjgU5rny9AlhkXOfJgPfKNtz/gwmigWwMM3n38gMNbkYP9I87yln51wcuH+2jw/LhYoWD0fce43lBGV/vu06xJ4manWu/SxYiVSmx6/FR3GxO4JBUwJcbkefLk43cBG8jkD32HcDVk05VUQOl7VyML7fdjmPxlk26pV6Njphax6yZ9sgThQxnEhJzWmgnR/XuDJNxN7DZPZNy6FmM/6ykUVucrZNZxuOywFAmdT1Et6h1eMXlrmNfkPEWUlPzkxw7pAiH1Pks5ppYp+FedUkQJWOiQVHBK+AzKzMm2aqQQiSmR5jM2VRnjnEfrkWF5yNe++X0ebhGZz7BhIKUQ0Vq5qKM8zRu7OV+QYqJ2EekTdRhZ7C1Qi+Rxi6XA4mCfGHMTOYht2lkTsvZjc9Ub1DplVQyp7QRNwdxHNKj++Jm+/lj5cKygTWqXFitMmyRw1c52PTaQ6zHChwyMQJswLruMIkxm17y5/HmpWE8np9mPoVENxcCqq67FeefXqHUGXRFGmxJ81zkDO3QNX4gNFfQNROwbTzDtAkPHXCISWt9GChD20G3AshKIdBLoYmAcRx6fr7A457LreG+V+drb71Oj7ETEUhSnfl9SeDKsuTHfo+/gJpVtHkkpuTQaQrRK7HtvYNCA1oJWJzBYswJmPlLXGhVNmnuQUbzmUMsOXArRHYUb/CnQuzZ3aNcse5VJeH3j2kZwDZvd4k+Bo7bX+fAJ//DNGiHT5e3//NtUV9k9bvYpiusDq05CFp4a26iMqw3L/TngU1tcT8CxAAkJixHpeix1SGMNW0xI6jw76OJuc0jqXCsitnZ2iUhQLAw4wW/h76GOrjyLtwE+eXbOqggPz0biyWv83j/6Y350PrC5dsZSzU47zsDTcS0P88qWKXFeMg/PTnnj5Vc8QtbKbDYj9T11O6Ioy/mcOmy9li/S0r7gmyF40cKqQtBdXKXV+wKjtHr3h6P7xlyCq+jfGkro6di/XnwgzRr9S2MDuTrV00bbfZ3+Xa5+Prmj638jxki14lpKBim4hCyqjNsty1rBkkPWLRCUSS8oRiTNICakuzrxlgKWHHkkzqBrFqFLSEit2zhBqFirRFbtISsx1gboFdgOXJxeoHHBw7Gwvij8s+++y8UUeUlAJTudLYWOjWWeloHF9oKD2Yyb2jNfgwWhjz2zLlDNAxGNQmy+LmpqjOGWDRCR4MpdhDZ6NgQvL1R1abdaW7NmmzkIbkc/ZGqvYoAplXx+Na9gXnZB3RQbNATVGzDMdnttWkSxq1PNn2MpJncyPcfdn0vYOvLVxupJC30l+LBx2izI0ajb0bmUc3+eigd3ISQ0Jl/0zk94iMm5EV1Eurn3DXQzLAVCmrcsonMr4MoVmHRoDeQqhJSd8zBU2G4o5+fkoXK2jYwHt/h//tOv8ADkgkDfJbZ5BIMUcaqWWWU05cmwluPtpb0gPTdmHc9OT3nx7l0WiwXDsKYA/XxGEh9Q2XUdtV6xVJimo4h3Nk9gjhnE4lrA9uda52bmLWA4WvlcHs+V2/jwZviwhZiiiekEf9gc7CyMXX/OtOBXrMnndBT8wQ78gkn8KThCyhV4JWpQhWE9MJt3xOWsoZ2tABUCQfxkW3A2FKkjNFcgqce6q59J++oWIDU8wYgy89lU6qOLGPGxexdnXD5+TBmMJ+db3j5T/uA778k6LhlqZSlOcqlASvjgA2tCpJdaeHD+TO7kYC/cmPPBg/sc7O+zt3eD2cx1hj3/L15RbD3wTKPtG1jkC6bQgjIQqA6olDaSNgTxOcUfcgkTbW1yCx+1gM8tZtNQvh4TfLimcGXmr8z9BFd81O269fio2/T+rdbdwqqpt9pXA/UEc9hsCcPcizpcz36molAz8alzl5A66Huk8682bY7Y/m3qhp1qErgySVDQ7UDRgbi6YPP0CWcPHrJZwXsPVvz+Nx9yhrCRAPMZ4/aZo75AqgJl+rSzDsuZp2PmAz3nztENtuuBvctTXr51wHJ/j86M9cUKSqWfL8g1I+Lybd775oLW2o5/SB0izv/TqATxYc+NEI2YD2qo03uQqRQdpm+RZoJjcAMcWnAoGC5c4b8aWmbiQI61eMBc3p5AkNbFJD7yL6hvh2jTlFe/Rw27CxuQVicRXERjor77cI9aKzH6JogGWhWKkDpv6slDRXJ1CWINTURDrqWrRp1Q0DAFhgm6eYOOuwYc9RDSDjZ2a2BQtyQxoihZDRsq61Xl6YVx7yLytCZ+8PAhX/nhUymdDxej6RfFKORqpJVl/4AWYFM8DRK4Vwe5ePdN+/Wf/lm+8uQeZ4vIZ/d+goMwI0WlWyyQBCOVkq4aHwKRUJW8HagyevAxjq6wERKz2QKVhA4Zy6M3jNTsQhAhkFIiijnlbRzYWyygRdxStRFLmh8Waxey7jaByGTIm3iW+s+jef/CrmJoRhSvIrrp9hMdxU94auBQaKCQm/tpyosLblZVb8qtxUvLFom7cbuut9yFBKtKPd0SQ2xs4og0fYYgRgwB6aILU3QJjT0aeyzNIfVINyf0C4L0OAQpftc1xBWcPUKGQL8aWT8eeOvtS370QYT9n+L/+l/8Q777+JQNruoSLKMUKoHBnDOSjKtij4tJVzLCZTAqJn/4/e/Yazdvox9E+tjz82/8JHt7e2xPL4i4RFoMiVorOWcf4GSuG5yWC0J1oSmkYDFCTNSU2oDMRN6uMXFl1Cb7g0nAug4wcghXVUBoc5DZ8RFMm4gkU0bQJp4ibVM08Sxx3o4GaSCbURGiepUzhIbGN55ErhClDeFu00Rcva19FX+diludGCIptDavxhgo2oSkqqeQyfDZhTFQYnstbQFTBW88dBdB6pDYE+d7FAuMxTdzH4NDzqVAyRBG0MrlB/e4fLTmg+8/4MmjFae2zz/8b/45X7t/wYNtlS0NZbFGAvJjg1GvWgmvnJ2TQ4oaI8bTzYW8yImNKN/6wfc4f/SUX/mZn+fOi7c5ffyIXgJROqQTalImCntukrEEr42X5NbGxBe2xIB1iRyi08KKAErnyKn3JXaRUSYQZzL5LTUTaUUtYYrS/YQ3aykRcXzN+Ybh2kZp5rcTkFxxJNeIMVDgalPhZjZKIAXdlZpjaIGgNBsUfbhU6puucQKSYBFXWbGMlC197UjMfLO3mEeqkbKvK7W5IsUtnWsAEkLywRUBD1rriNaButlQzh+xwNjfP+E7X3uXt96/x+nZlv/vP/sT/vjbP+SJ4RtAPHiXWpDq1LuJKJz4c26uv2HMQuTt99+XfLG2W8sDtFQOfvQmof80hzdvouOAXJukloKPZw0IVn1TgL+BEifEzzmKiBJ1BsFnLu3mVNbmu5077FRq1E9gg0YcDGrB24SlqzVMnVackl3poU7xgXln1O5UqzRkMFz1NRgesHoP1RVIGVuzbXMTTnP3tDjShCBCY1iZazJahbodqZfeT9D3kVn0iqukgHVTX4cSVH3kbdUGqik6DIQOSD3kCmXjM6FygZzp+iPe+953+c43vsdYhAuF//eXvsyXv/M2p+ZVQqL3bdRa0Tb8s5vobKZXI/GQ1uZMoMF0KLDWilH50flDGcfR9l5+jbce3+dsu+ZjL77Ipz72BlILw3bLZrVFa2WWOvousRf32G42ECIVD0amYkYBr6UXoVQhi1B1QEsloG2XGrPWPCFt54ZJe+8amORj4Z3+GlpsMHE+Y9sUMbQTbm5pAq50lorHBikYXQ0+ugfajCcfYx+C0XH1eyFUp6MFI9M4mNFNewjQuuldrDsEBlNGyxgbZhKZW2BW9qjLjrqotEG4BMsucqmZlDOELcES5AJ17QSRiUNWKmwHfviDN7l3/yEXa3j3/kP+m9/9p3z56+9LDjCIS/2oyK7E7y4VUnD6+qDNEvxYSiUeJGi7kKGbIdV4uD2T7ds/sBdPbvPCsOXp+oIwm3Hr8JDD/QO65ZyyGbBSXYqd4oUSw/V0G7w60Z8lBFKaES0SDQYzig7eV6+TCkk7kdVVPj0BmPiA7cTvRIImCVrbPc8/jpuC0FyIVL8A0qTw/KO7giISiELLLlonjlZnA6tfG1MDCzuYOIn4tEWV1l8bQFwCP7ZYIhRDt5lwsXYqmQSSCHlv5nyc3LAVmQyPEKsCXnugTq5PYFQ2T5/x9Mkp3/7GmxRJnK+V/+r/19fZ/saRFGH8V909b3YcO86FgA4E4q/nKxLiC+ITAsRxEuEE0d0hAne55JyzEzuJvS8z3V18qJrZdV5Yydpk1p6d3amurnrqqad+/0f+/M9nkgPkBJKijQmuc0obzKhFqVpMyQxIUWalq9vomfpnbocDXl+vaIHjtufFuJKrH74hJ1HpE5//4wt++eNP+flPf8bJ0R2arkdipjCacpkbQVbLm9WDsrq3T9UULQUShWDjeELx0TQle+B220NEv9kLAujeAd9sTFRDjSUcZu9gRhJ9o5mAGOZJrhZn7ISdzANYPCD23mH3vtHZy9ENSOdmf8+QkkSKKGOu1KBIY8Ib01jQt5UqGdUtU1vI+YAwDkg3QDNQ24xMBUmFooEmDaCRvJkYb7a8vrzixXdnPP/hgtUUefTll/zq17/hIiPtobXGN23LzXpNDMkyFuZrrtRaKMpOnwAsF67v4OK+rfL2ekXb2H5yNW7oY2RbCo+ffyPnl6/0FycP2Gw2XLy54pOTezw8uc8nJ8cMbUeLuciaM5IjmidiKUagmAI1ZOp2Mgi0iTb2hoCUuKz8sq3GYZTiQZ+5ehWTc1XNQCVqtNVrIYDdLAertFpg6H7Cnp0Am2WGgpVQbaJalEgSe68u2sTx6CsoOyBlmm1GVY9YZlVd87hRE4goCONmZc0jjVm9btR6JzWjdSQ2Shq3pGEk9BU6tabTHKhNZCoB6SJTDpyfv+T5sxecn7/k5fkFl2/W/PZ3f+Crp2eyAUIjXK4rpammQSQNNVd0yuZVg/E/s4JGaJK1DCwDsxFc62YPv3dMfqplIZfelLJEzt+v38i0nfR63HAjyvnNNf96+pTjruMnpw94eHqPe/0hCbWZRtGKQHGqNoxBMbiU7ColNlGs5MK4tUaKzjdzxSFard5lY0bSOONVlkldClTbyqx9BkHIQXeAkwRQE+aIaUYZWSJ2C2Ztz5cZP0DNQ/gEkRyM2t14eqyOLyA2Ylgn8w5Nn2yBjdnK3skzm5SJNxugEPueOIzIMKHDFoZCPUjQRbY18NWT5zw9u+B6M7GZKt8+O+Ozzz7n0RdPRB0pXgPTpJQULc1VhcmGmCaEhkCphewenmAYj913du7fnvV2GX9GbmFJKcACrAi0/nMUe71/dJeHx6ecDncYiMSc7d8xctQN3Ok7+raj83JoVGVz/RYtGS2FMmXXIBi9Ozozrm6YqWpSi3clQxJb6SmaGMbuunx78K3DJqmaC0/iItTB4VtM2FFCcUDIAsOFei5+7mVbmLujZ+xfSaWYYbm8rMRo9PwkSLJJJNJGpPWOo0ZITUNz0BK6yHVeEQ57huMT2run1O4Ob4rwYpV5NVaeX14TDk9YlcDjJ//lT3/9G4+//o/cbK3ISLG0dkLIwk7EyvGJWC2odTFgRsFGHbZYpLsuH4DOw7sHPlrtAZS+bRm3I0kthLnfH+qDwyOOU0+vgXvNwIAwxIZOhFathsBk3ILDrrORutXVtJyfaPQspYmJeb6QaPX8eb6hSqKy3ym9UMKouynufmxmHc2UsiCKYXDeUBJtpSdx2BjDLsJsQJ5qxeiikQJ37/T2d04Zl2AGYHoAdlNsurmBRJrm8XWB2gWa+z1X45qr1Zq3o7IicV0Cl2PlchRKe8jf//2Evzx6zDcvbmQEUifkKmwnmwFVtFIIrmHkcHtRqJXB+xiFSqaaESSMexgj3OSP3OF5Y3XM/ONVP5jdRAzW0dNVaAncia0OEvn09Ef0BA5iw0FqGSTRhmjBmVai9wyK4+lIXVJBwDiKThBZun9CWECgRqoHdlaKngszBg8bxi9ec5g5CoshUDlw72CBYFjOHzz7mEGoyDxDyMAi8Xxzu10Zzd7PqzOyFQMEJfWdN574GD8MT6kCtam80TXaN3QHR6ThLmsNfP/qNV8/PePb8yseP7lgG5EssK3CJiuTfRIIyZTojUfFjJSJV8eCFtplWex5AhekJyRYZ3Yl+ncqZrMdhD0jME5H2P0ClSFGyz+rBZYWee/h95jn6Wh0iC0HTUffdfRNS4qBtk3LzQt+sYtBLNdi/wl7g5/nSzAY9X0jEJ0RYPHUMTiewM5IqBz4oImFcDr/sJ+K7i5m/zXA5WJkJ7uvakLWDu93XbcYiXEj6wKsVVG2Zc3l22vOLl5ycaXcbGBSI/lMIOv5q55FOlV9xkJCYmRTJifAyO67cRHruUg3Y10K8/TBXbWs8L4RvLvoDXzdM4IlEbMv8Xg4pE6j1Q1mryA2fydJWCaiVp/AvhA9mWsB//8RdxDA8qh717m/e83HZlAIDJSa2QEzXql715FYqujvPT50TN95bT6/v+a5xq1Q6tbn3T/O7b+1m4ShterPMZkaLIB6N3atlZxHshaKfwO2MHZn+1CZfK62uqNYHv8DPJKsMZkwbNcAAAAASUVORK5CYII=" alt="EB" style={{width:"45px",height:"45px",objectFit:"contain"}} /></div>
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

function ShopView({ products, addToCart }) {
  const [category, setCategory] = useState("meats");

  const meatTypes = ["chicken", "turkey", "beef", "sausage"];
  const filtered = products.filter(p =>
    category === "meats" ? meatTypes.includes(p.type) : !meatTypes.includes(p.type)
  );

  return (
    <>
      <div style={{ display: "flex", gap: "12px", marginBottom: "25px" }}>
        <button
          onClick={() => setCategory("meats")}
          style={{
            padding: "12px 32px", borderRadius: "30px", border: "none", cursor: "pointer", fontWeight: "bold", fontSize: "15px",
            background: category === "meats" ? "linear-gradient(135deg, #D97706, #B45309)" : "white",
            color: category === "meats" ? "white" : "#92400E",
            boxShadow: category === "meats" ? "0 4px 12px rgba(217,119,6,0.4)" : "0 2px 8px rgba(0,0,0,0.08)",
            transition: "all 0.2s"
          }}>
          🍖 Meats
        </button>
        <button
          onClick={() => setCategory("other")}
          style={{
            padding: "12px 32px", borderRadius: "30px", border: "none", cursor: "pointer", fontWeight: "bold", fontSize: "15px",
            background: category === "other" ? "linear-gradient(135deg, #D97706, #B45309)" : "white",
            color: category === "other" ? "white" : "#92400E",
            boxShadow: category === "other" ? "0 4px 12px rgba(217,119,6,0.4)" : "0 2px 8px rgba(0,0,0,0.08)",
            transition: "all 0.2s"
          }}>
          🛍️ Other Products
        </button>
      </div>
      {filtered.length === 0 ? (
        <div className="card text-center" style={{ padding: "50px" }}>
          <div style={{ fontSize: "60px", marginBottom: "15px" }}>{category === "meats" ? "🍖" : "🛍️"}</div>
          <h3 style={{ color: "#78350F" }}>No {category === "meats" ? "Meat" : "Other"} Products Available</h3>
          <p style={{ color: "#92400E" }}>Products will appear here when admin adds them.</p>
        </div>
      ) : (
        <div className="products-grid">
          {filtered.map(product => (
            <div key={product.id} className="card product-card">
              <div className={`product-img ${!product.image ? "no-image" : ""}`} style={product.image ? { backgroundImage: `url(${product.image})` } : {}}>
                {!product.image && <span>{getEmoji(product.type)}</span>}
                <span className="product-tag" style={{ background: getTagColor(product.type) }}>{product.type}</span>
              </div>
              <div className="product-info">
                <h3>{product.name}</h3>
                <p>{linkifyText(product.desc)}</p>
                <div className="product-footer">
                  <div className="product-price">{formatPrice(product.price)}/kg</div>
                  <button className="btn" onClick={() => addToCart(product)}>Add to Cart</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
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
      <p style={{ color: "#92400E" }}>Add some delicious meats to get started!</p>
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

function AdminView({ products, addProduct, deleteProduct, updateProduct }) {
  const [formData, setFormData] = useState({ name: "", type: "chicken", price: "", desc: "", image: null });
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
    setFormData({ name: product.name, type: product.type, price: product.price.toString(), desc: product.desc, image: product.image });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const cancelEdit = () => { setEditingId(null); setFormData({ name: "", type: "chicken", price: "", desc: "", image: null }); if (fileInputRef.current) fileInputRef.current.value = ""; };
  const handleSubmit = () => {
    if (!formData.name || !formData.price) { alert("Please fill in name and price"); return; }
    if (editingId) { updateProduct(editingId, { ...formData, price: parseInt(formData.price) }); alert("Product updated!"); cancelEdit(); }
    else { addProduct({ ...formData, price: parseInt(formData.price) }); setFormData({ name: "", type: "chicken", price: "", desc: "", image: null }); if (fileInputRef.current) fileInputRef.current.value = ""; alert("Product added!"); }
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
          <input type="number" className="input" placeholder="Price per kg (₦)" value={formData.price} onChange={e => setFormData(f => ({ ...f, price: e.target.value }))} />
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
              <p style={{ fontWeight: "bold", color: "#D97706" }}>{formatPrice(product.price)}/kg</p>
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

function OrdersView({ orders, updateOrderStatus, confirmPayment, setSelectedOrder, setCurrentView }) {
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
                <option value="ready">Ready</option>
                <option value="delivered">Delivered</option>
              </select>
              {!order.paid && <button className="btn btn-green" style={{ padding: "8px 12px", fontSize: "13px" }} onClick={() => confirmPayment(order.id)}>Confirm Payment</button>}
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

function ChatView({ messages, orders, selectedOrder, setSelectedOrder, sendMessage, isAdmin }) {
  const [messageText, setMessageText] = useState("");
  const [imageToSend, setImageToSend] = useState(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, selectedOrder]);

  const orderMessages = selectedOrder ? messages.filter(m => m.orderId === selectedOrder) : [];

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { alert("Image size must be less than 5MB"); return; }
      const reader = new FileReader();
      reader.onloadend = () => setImageToSend(reader.result);
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
              <div className="chat-header"><h3 style={{ color: "white", fontSize: "18px" }}>💬 Order: {selectedOrder}</h3></div>
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
        <p style={{ marginTop: "12px", fontSize: "12px", color: "#92400E", textAlign: "center", background: "#FEF3C7", padding: "8px", borderRadius: "8px" }}>
          Default password: <strong>castle@7035</strong>
        </p>
      </div>
    </div>
  );
}

function SuccessModal({ orderId, bank, onClose }) {
  return (
    <div className="modal">
      <div className="modal-content text-center">
        <div style={{ fontSize: "60px", marginBottom: "15px" }}>✅</div>
        <h2 style={{ color: "#15803D", marginBottom: "10px" }}>Order Placed Successfully!</h2>
        <p style={{ color: "#666", marginBottom: "20px" }}>Your order has been registered.</p>
        <div className="order-id-box">
          <p style={{ fontSize: "14px", color: "#92400E", marginBottom: "5px" }}>Your Order ID:</p>
          <p style={{ fontSize: "20px", fontWeight: "bold", color: "#78350F", fontFamily: "monospace" }}>{orderId}</p>
        </div>
        <div className="bank-box" style={{ textAlign: "left" }}>
          <p style={{ fontWeight: "bold", color: "#1E40AF", marginBottom: "8px" }}>💳 Please pay to:</p>
          <p style={{ fontWeight: "bold", color: "#1E3A8A" }}>{bank.name}</p>
          <p style={{ color: "#1E40AF" }}>{bank.accNum}</p>
          <p style={{ color: "#1E40AF" }}>{bank.accName}</p>
        </div>
        <p style={{ fontSize: "14px", color: "#666", marginBottom: "20px" }}>Use Chat to confirm payment and arrange pickup/delivery.</p>
        <div className="flex gap-10">
          <button className="btn btn-outline flex-1" onClick={() => onClose("shop")}>Continue Shopping</button>
          <button className="btn flex-1" onClick={() => onClose("chat")}>Go to Chat</button>
        </div>
      </div>
    </div>
  );
}

