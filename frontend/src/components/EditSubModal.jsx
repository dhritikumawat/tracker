import React, { useState, useEffect } from 'react';
import styles from './Modal.module.css';

function calcDeadline(delivery, days) {
  if (!delivery || !days) return '';
  try {
    const d = new Date(delivery);
    d.setDate(d.getDate() + parseInt(days));
    return d.toISOString().slice(0, 10);
  } catch { return ''; }
}
function fmtFull(d) {
  if (!d) return '';
  try { return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); }
  catch { return ''; }
}

export default function EditSubModal({ orderId, subIdx, initial, onClose, onSave }) {
  const [name, setName] = useState(initial?.name || '');
  const [qty, setQty] = useState(initial?.qty || 1);
  const [price, setPrice] = useState(initial?.price || 0);
  const [delivery, setDelivery] = useState(initial?.delivery || '');
  const [policyDays, setPolicyDays] = useState(initial?.policyDays || '');
  const [delivered, setDelivered] = useState(initial?.delivered ? 'yes' : 'no');
  const [returned, setReturned] = useState(initial?.returned ? 'yes' : 'no');

  const deadline = calcDeadline(delivery, policyDays);

  function handleSave() {
    const rd = calcDeadline(delivery, policyDays) || initial?.returnDeadline || '';
    onSave(orderId, subIdx, {
      name, qty: parseInt(qty) || 1, price: parseFloat(price) || 0,
      delivery, policyDays, returnDeadline: rd,
      delivered: delivered === 'yes',
      returned: returned === 'yes',
    });
  }

  return (
    <div className={styles.overlay} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={styles.modal}>
        <div className={styles.head}>
          <h2>Edit Sub-product</h2>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>
        <div className={styles.body}>
          <div className={styles.fg}>
            <label>Product Name</label>
            <input value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className={styles.r3}>
            <div className={styles.fg}><label>Qty</label><input type="number" min="1" value={qty} onChange={e => setQty(e.target.value)} /></div>
            <div className={styles.fg}><label>Price (₹)</label><input type="number" min="0" value={price} onChange={e => setPrice(e.target.value)} /></div>
            <div className={styles.fg}><label>Delivery Date</label><input type="date" value={delivery} onChange={e => setDelivery(e.target.value)} /></div>
          </div>
          <div className={styles.r2}>
            <div className={styles.fg}>
              <label>Return Policy (days)</label>
              <input type="number" min="1" max="90" placeholder="e.g. 7" value={policyDays} onChange={e => setPolicyDays(e.target.value)} />
              {deadline && <div className={styles.hint}>↳ Return by: {fmtFull(deadline)}</div>}
            </div>
            <div className={styles.fg}>
              <label>Delivered?</label>
              <select value={delivered} onChange={e => setDelivered(e.target.value)}>
                <option value="no">Not yet</option>
                <option value="yes">Yes — delivered</option>
              </select>
            </div>
          </div>
          <div className={styles.fg}>
            <label>Returned?</label>
            <select value={returned} onChange={e => setReturned(e.target.value)}>
              <option value="no">Not returned</option>
              <option value="yes">Marked as returned</option>
            </select>
          </div>
        </div>
        <div className={styles.foot}>
          <button className={styles.cancelBtn} onClick={onClose}>Cancel</button>
          <button className={styles.saveBtn} onClick={handleSave}>Save Changes</button>
        </div>
      </div>
    </div>
  );
}
