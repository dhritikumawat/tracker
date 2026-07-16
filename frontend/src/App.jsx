import React, { useState, useEffect, useCallback } from 'react';
import { api } from './api';
import StatCards from './components/StatCards';
import OrderCard from './components/OrderCard';
import OrderModal from './components/OrderModal';
import EditSubModal from './components/EditSubModal';
import styles from './App.module.css';

const FILTERS = ['All', 'Pending', 'In Transit', 'Delivered', 'Picked Up', 'Return window', 'Returned'];

export default function App() {
  const [stats, setStats] = useState(null);
  const [orders, setOrders] = useState([]);
  const [customPlats, setCustomPlats] = useState({});
  const [filter, setFilter] = useState('All');
  const [sort, setSort] = useState('newest');
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState(null); // null | { mode: 'add' } | { mode: 'sub', orderId } | { mode: 'editSub', orderId, subIdx, initial }

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [s, o, p] = await Promise.all([api.getStats(), api.getOrders(filter, sort), api.getPlatforms()]);
      setStats(s); setOrders(o); setCustomPlats(p);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [filter, sort]);

  useEffect(() => { loadAll(); }, [loadAll]);

  // ── Status change ──────────────────────────────────────────────────────────
  async function handleStatusChange(id, val) {
    await api.updateOrder(id, { status: val });
    loadAll();
  }

  // ── Mark delivered ─────────────────────────────────────────────────────────
  async function handleMarkDel(orderId, si) {
    await api.updateSubproduct(orderId, si, { delivered: true });
    loadAll();
  }

  // ── Mark returned ──────────────────────────────────────────────────────────
  async function handleMarkRet(orderId, si) {
    const order = orders.find(o => o.id === orderId);
    const sp = order?.subProducts?.[si];
    if (!sp) return;
    await api.updateSubproduct(orderId, si, { returned: !sp.returned });
    loadAll();
  }

  // ── Delete sub ─────────────────────────────────────────────────────────────
  async function handleDelSub(orderId, si) {
    await api.deleteSubproduct(orderId, si);
    loadAll();
  }

  // ── Delete order ───────────────────────────────────────────────────────────
  async function handleDelOrder(id) {
    if (!window.confirm('Delete this order?')) return;
    await api.deleteOrder(id);
    loadAll();
  }

  // ── Save platform ──────────────────────────────────────────────────────────
  async function handleSavePlatform(name, color) {
    const updated = await api.savePlatform(name, color);
    setCustomPlats(updated);
  }

  // ── Save new order ─────────────────────────────────────────────────────────
  async function handleSaveOrder(data) {
    await api.createOrder(data);
    setModal(null);
    loadAll();
  }

  // ── Save sub-products ──────────────────────────────────────────────────────
  async function handleSaveSubs(orderId, subs) {
    await api.addSubproduct(orderId, subs);
    setModal(null);
    loadAll();
  }

  // ── Edit sub ───────────────────────────────────────────────────────────────
  async function handleEditSub(data) {
    const { orderId, subIdx, ...patch } = data;
    await api.updateSubproduct(orderId, subIdx, patch);
    setModal(null);
    loadAll();
  }

  // ── Export CSV ─────────────────────────────────────────────────────────────
  function exportCSV() {
    if (!orders.length) { alert('No orders to export!'); return; }
    const rows = [['Platform', 'Order ID', 'Name', 'Amount', 'Status', 'Order Date', 'Delivery', 'Content', 'Notes', 'Sub-product', 'Qty', 'Price', 'Policy Days', 'Return Deadline', 'Delivered?', 'Returned?']];
    orders.forEach(o => {
      const subs = o.subProducts || [];
      if (!subs.length) {
        rows.push([o.platform, o.orderId, o.name, o.amount, o.status, o.orderDate, o.deliveryDate, o.contentType, o.notes, '', '', '', '', '', '', '']);
      } else {
        subs.forEach(sp => rows.push([o.platform, o.orderId, o.name, o.amount, o.status, o.orderDate, o.deliveryDate, o.contentType, o.notes, sp.name, sp.qty, sp.price, sp.policyDays, sp.returnDeadline, sp.delivered ? 'Yes' : 'No', sp.returned ? 'Yes' : 'No']));
      }
    });
    const csv = rows.map(r => r.map(v => `"${String(v || '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = 'data:text/csv;charset=utf-8,\uFEFF' + encodeURIComponent(csv);
    a.download = 'orders_' + new Date().toISOString().slice(0, 10) + '.csv';
    a.click();
  }

  return (
    <div className={styles.app}>
      {/* Header */}
      <header className={styles.header}>
        <div>
          <div className={styles.title}>📦 Content Creator Order Tracker</div>
          <div className={styles.subtitle}>Track platforms · return windows · deliveries · sub-products</div>
        </div>
      </header>

      {/* Stat cards */}
      <StatCards stats={stats} />

      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.tabs}>
          {FILTERS.map(f => (
            <button key={f} className={`${styles.tab} ${filter === f ? styles.active : ''}`} onClick={() => setFilter(f)}>
              {f}
            </button>
          ))}
        </div>
        <select className={styles.sortSel} value={sort} onChange={e => setSort(e.target.value)}>
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="amount">By amount</option>
          <option value="return">By return deadline</option>
        </select>
        <button className={`${styles.btn} ${styles.btnExp}`} onClick={exportCSV}>⬇ Export CSV</button>
        <button className={`${styles.btn} ${styles.btnAdd}`} onClick={() => setModal({ mode: 'add' })}>＋ Add order</button>
      </div>

      {/* Order list */}
      <div className={styles.orders}>
        {loading && <div className={styles.loading}>Loading…</div>}
        {!loading && orders.length === 0 && (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>📭</div>
            <p>No orders yet.<br />Click <strong>＋ Add order</strong> to start tracking.</p>
          </div>
        )}
        {orders.map(o => (
          <OrderCard
            key={o.id}
            order={o}
            customPlatforms={customPlats}
            onStatusChange={handleStatusChange}
            onMarkDel={handleMarkDel}
            onMarkRet={handleMarkRet}
            onEditSub={(orderId, si, sp) => setModal({ mode: 'editSub', orderId, subIdx: si, initial: sp })}
            onDelSub={handleDelSub}
            onAddSub={id => setModal({ mode: 'sub', orderId: id })}
            onDelete={handleDelOrder}
          />
        ))}
      </div>

      {/* Modals */}
      {modal?.mode === 'add' && (
        <OrderModal
          mode="add"
          customPlatforms={customPlats}
          onSavePlatform={handleSavePlatform}
          onClose={() => setModal(null)}
          onSave={handleSaveOrder}
        />
      )}
      {modal?.mode === 'sub' && (
        <OrderModal
          mode="sub"
          orderId={modal.orderId}
          customPlatforms={customPlats}
          onSavePlatform={handleSavePlatform}
          onClose={() => setModal(null)}
          onSave={handleSaveSubs}
        />
      )}
      {modal?.mode === 'editSub' && (
        <EditSubModal
          orderId={modal.orderId}
          subIdx={modal.subIdx}
          initial={modal.initial}
          onClose={() => setModal(null)}
          onSave={(orderId, subIdx, data) => handleEditSub({ orderId, subIdx, ...data })}
        />
      )}
    </div>
  );
}
