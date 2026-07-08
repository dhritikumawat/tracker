import React, { useState, useEffect } from 'react';
import styles from './Modal.module.css';

const BUILTIN_PLATFORMS = ['Meesho', 'Myntra', 'Amazon', 'Flipkart', 'Ajio'];
const STATUS_OPTS = ['Pending', 'In Transit', 'Delivered', 'Picked Up', 'Return window', 'Returned'];
const CONTENT_OPTS = ['Unboxing', 'Review', 'Try-on', 'Haul', 'GRWM', 'Tutorial', 'Other'];

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

function SubForm({ idx, data, onChange, onRemove }) {
  const [local, setLocal] = useState(data);
  const deadline = calcDeadline(local.delivery, local.policyDays);

  function update(field, val) {
    const next = { ...local, [field]: val };
    setLocal(next);
    onChange(idx, next);
  }

  return (
    <div className={styles.sfi}>
      <button className={styles.rmBtn} onClick={() => onRemove(idx)}>✕</button>
      <div className={styles.fg}>
        <label>Product Name</label>
        <input placeholder="e.g. Printed Kurti" value={local.name} onChange={e => update('name', e.target.value)} />
      </div>
      <div className={styles.r3}>
        <div className={styles.fg}>
          <label>Qty</label>
          <input type="number" min="1" value={local.qty} onChange={e => update('qty', parseInt(e.target.value) || 1)} />
        </div>
        <div className={styles.fg}>
          <label>Price (₹)</label>
          <input type="number" min="0" placeholder="0" value={local.price || ''} onChange={e => update('price', parseFloat(e.target.value) || 0)} />
        </div>
        <div className={styles.fg}>
          <label>Delivery Date</label>
          <input type="date" value={local.delivery} onChange={e => update('delivery', e.target.value)} />
        </div>
      </div>
      <div className={styles.fg}>
        <label>Return Policy (days from delivery)</label>
        <input type="number" min="1" max="90" placeholder="e.g. 7" value={local.policyDays || ''} onChange={e => update('policyDays', e.target.value)} />
        {deadline && <div className={styles.hint}>↳ Return by: {fmtFull(deadline)}</div>}
      </div>
    </div>
  );
}

export default function OrderModal({ mode, orderId, customPlatforms, onSavePlatform, onClose, onSave }) {
  const isSubOnly = mode === 'sub';

  const [platform, setPlatform] = useState('Meesho');
  const [isCustom, setIsCustom] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customColor, setCustomColor] = useState('#6B7C5C');
  const [ordIdField, setOrdIdField] = useState('');
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [status, setStatus] = useState('Pending');
  const [orderDate, setOrderDate] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [contentType, setContentType] = useState('Unboxing');
  const [notes, setNotes] = useState('');
  const [subForms, setSubForms] = useState([]);
  const [error, setError] = useState('');

  const allPlatforms = [...BUILTIN_PLATFORMS, ...Object.keys(customPlatforms || {})];

  function handlePlatChange(val) {
    if (val === '__custom__') { setIsCustom(true); setPlatform(''); }
    else { setIsCustom(false); setPlatform(val); }
  }

  function addSub() {
    setSubForms(f => [...f, { name: '', qty: 1, price: 0, policyDays: '', delivery: '', returnDeadline: '' }]);
  }
  function updateSub(idx, data) {
    setSubForms(f => f.map((s, i) => i === idx ? data : s));
  }
  function removeSub(idx) {
    setSubForms(f => f.filter((_, i) => i !== idx));
  }

  async function handleSave() {
    setError('');
    if (!isSubOnly && !name.trim()) { setError('Order name is required'); return; }

    let resolvedPlatform = platform;
    if (isCustom) {
      if (!customName.trim()) { setError('Platform name is required'); return; }
      resolvedPlatform = customName.trim();
      await onSavePlatform(resolvedPlatform, customColor);
    }

    const validSubs = subForms.filter(s => s.name.trim()).map(s => ({
      ...s,
      returnDeadline: calcDeadline(s.delivery || deliveryDate, s.policyDays) || '',
    }));

    if (isSubOnly) {
      onSave(orderId, validSubs);
    } else {
      onSave({
        platform: resolvedPlatform,
        orderId: ordIdField,
        name: name.trim(),
        amount: parseFloat(amount) || 0,
        status,
        orderDate,
        deliveryDate,
        contentType,
        notes,
        subProducts: validSubs,
      });
    }
  }

  return (
    <div className={styles.overlay} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={styles.modal}>
        <div className={styles.head}>
          <h2>{isSubOnly ? 'Add Sub-product' : 'Add New Order'}</h2>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>
        <div className={styles.body}>
          {!isSubOnly && (
            <>
              <div className={styles.r2}>
                <div className={styles.fg}>
                  <label>Platform</label>
                  <select value={isCustom ? '__custom__' : platform} onChange={e => handlePlatChange(e.target.value)}>
                    {allPlatforms.map(p => <option key={p} value={p}>{p}</option>)}
                    <option value="__custom__">Other / Custom…</option>
                  </select>
                  {isCustom && (
                    <div className={styles.customWrap}>
                      <input
                        placeholder="Platform name e.g. Nykaa"
                        value={customName}
                        onChange={e => setCustomName(e.target.value)}
                      />
                      <div className={styles.colorRow}>
                        <label>Badge colour</label>
                        <input type="color" value={customColor} onChange={e => setCustomColor(e.target.value)} />
                        <div className={styles.badgePrev} style={{ background: customColor }}>
                          {customName ? customName.slice(0, 2).toUpperCase() : '??'}
                        </div>
                      </div>
                      <div className={styles.hint}>This platform will be saved for future orders.</div>
                    </div>
                  )}
                </div>
                <div className={styles.fg}>
                  <label>Order ID (optional)</label>
                  <input placeholder="e.g. OD123456" value={ordIdField} onChange={e => setOrdIdField(e.target.value)} />
                </div>
              </div>
              <div className={styles.fg}>
                <label>Order Name *</label>
                <input placeholder="e.g. Myntra Summer Haul" value={name} onChange={e => setName(e.target.value)} className={error && !name ? styles.errInput : ''} />
              </div>
              <div className={styles.r2}>
                <div className={styles.fg}>
                  <label>Total Amount (₹)</label>
                  <input type="number" min="0" placeholder="0" value={amount} onChange={e => setAmount(e.target.value)} />
                </div>
                <div className={styles.fg}>
                  <label>Status</label>
                  <select value={status} onChange={e => setStatus(e.target.value)}>
                    {STATUS_OPTS.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div className={styles.r2}>
                <div className={styles.fg}><label>Order Date</label><input type="date" value={orderDate} onChange={e => setOrderDate(e.target.value)} /></div>
                <div className={styles.fg}><label>Delivery Date</label><input type="date" value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)} /></div>
              </div>
              <div className={styles.r2}>
                <div className={styles.fg}>
                  <label>Content Type</label>
                  <select value={contentType} onChange={e => setContentType(e.target.value)}>
                    {CONTENT_OPTS.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div className={styles.fg}><label>Notes</label><input placeholder="Any notes…" value={notes} onChange={e => setNotes(e.target.value)} /></div>
              </div>
              <div className={styles.sectionLabel}>Sub-products</div>
            </>
          )}

          {subForms.map((sf, i) => (
            <SubForm key={i} idx={i} data={sf} onChange={updateSub} onRemove={removeSub} />
          ))}
          <button className={styles.addSFBtn} onClick={addSub}>＋ Add sub-product</button>
          {error && <div className={styles.errMsg}>{error}</div>}
        </div>
        <div className={styles.foot}>
          <button className={styles.cancelBtn} onClick={onClose}>Cancel</button>
          <button className={styles.saveBtn} onClick={handleSave}>
            {isSubOnly ? 'Save Sub-product' : 'Save Order'}
          </button>
        </div>
      </div>
    </div>
  );
}
