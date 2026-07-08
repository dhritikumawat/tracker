import React, { useState } from 'react';
import styles from './OrderCard.module.css';

const BUILTIN = { Meesho:'#982176', Myntra:'#FF3F6C', Amazon:'#e68a00', Flipkart:'#2874F0', Ajio:'#1E2D4C' };
const STATUS_OPTS = ['Pending','In Transit','Delivered','Picked Up','Return window','Returned'];

function fmtDate(d) {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }); }
  catch { return '—'; }
}

function PlatBadge({ platform, customPlatforms }) {
  const col = customPlatforms?.[platform] || BUILTIN[platform];
  return (
    <div className={styles.badge} style={{ background: col || '#858585' }}>
      {(platform || '?').slice(0, 2).toUpperCase()}
    </div>
  );
}

function ReturnBar({ sp }) {
  const rs = sp._returnStatus;
  if (sp.returned) return <span className={`${styles.pill} ${styles.pillRet}`}>Returned ✓</span>;
  if (!rs) return <span>—</span>;
  return (
    <div>
      <div className={styles.rbar}>
        <div className={`${styles.rbf} ${styles[rs.cls]}`} style={{ width: rs.pct + '%' }} />
      </div>
      <div className={`${styles.dl} ${styles[rs.cls]}`}>
        {rs.label}{rs.days_left !== null && rs.days_left >= 0 ? ' · ' + fmtDate(sp.returnDeadline) : rs.days_left < 0 ? ' expired' : ''}
      </div>
    </div>
  );
}

export default function OrderCard({ order, customPlatforms, onStatusChange, onMarkDel, onMarkRet, onEditSub, onDelSub, onAddSub, onDelete }) {
  const [open, setOpen] = useState(false);
  const subs = order.subProducts || [];
  const subTotal = subs.reduce((s, sp) => s + (sp.price * sp.qty || 0), 0);
  const allRet = subs.length > 0 && subs.every(s => s.returned);

  let cardCls = styles.card;
  if (order._isExpired) cardCls += ' ' + styles.expired;
  else if (order._isUrgent) cardCls += ' ' + styles.urgent;

  const PILL_CLS = { Pending: styles.pillPend, Delivered: styles.pillDel, Returned: styles.pillRet, 'In Transit': styles.pillTr, 'Return window': styles.pillTr, 'Picked Up': styles.pillPickup };

  return (
    <div className={cardCls} id={`card-${order.id}`}>
      {/* Header */}
      <div className={styles.top} onClick={() => setOpen(o => !o)}>
        <PlatBadge platform={order.platform} customPlatforms={customPlatforms} />
        <div className={styles.meta}>
          <div className={styles.name}>{order.name || order.platform + ' Order'}</div>
          <div className={styles.sub}>{order.orderId ? '#' + order.orderId + ' · ' : ''}{order.platform}{order.contentType ? ' · ' + order.contentType : ''}</div>
          <div className={styles.pills}>
            <span className={`${styles.pill} ${PILL_CLS[order.status] || styles.pillPend}`}>{order.status}</span>
            {subs.length > 0 && <span className={`${styles.pill} ${styles.pillTr}`}>{subs.length} item{subs.length > 1 ? 's' : ''}</span>}
            {allRet && <span className={`${styles.pill} ${styles.pillDel}`}>All returned ✓</span>}
            {order.deliveryDate && <span className={`${styles.pill} ${styles.pillDel}`}>Del: {fmtDate(order.deliveryDate)}</span>}
          </div>
          {order._isExpired && <div className={`${styles.flag} ${styles.flagExp}`}>⛔ Return window expired on some items</div>}
          {!order._isExpired && order._isUrgent && (
            <div className={`${styles.flag} ${styles.flagUrg}`}>
              ⚠ Return deadline approaching!
            </div>
          )}
        </div>
        <div className={styles.amt}>
          <div className={styles.amtVal}>₹{(order.amount || 0).toLocaleString('en-IN')}</div>
          <div className={styles.amtLbl}>total</div>
          {subTotal > 0 && <div className={styles.amtSub}>+₹{subTotal.toLocaleString('en-IN')}</div>}
          <select
            className={styles.statusSel}
            value={order.status}
            onClick={e => e.stopPropagation()}
            onChange={e => onStatusChange(order.id, e.target.value)}
          >
            {STATUS_OPTS.map(s => <option key={s}>{s}</option>)}
          </select>
          <div className={`${styles.chev} ${open ? styles.open : ''}`}>▾</div>
        </div>
      </div>

      {/* Sub-panel */}
      {open && (
        <div className={styles.panel}>
          {subs.length > 0 ? (
            <table className={styles.tbl}>
              <thead>
                <tr><th>Product</th><th>Price</th><th>Policy</th><th>Return Window</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {subs.map((sp, si) => (
                  <tr key={si} className={sp.returned ? styles.retRow : ''}>
                    <td>
                      <span className={styles.spName}>{sp.name}{sp.qty > 1 && <span className={styles.qty}> ×{sp.qty}</span>}</span>
                      {sp.delivered && <span className={`${styles.pill} ${styles.pillDel} ${styles.delBadge}`}>✓ Delivered</span>}
                    </td>
                    <td>₹{(sp.price || 0).toLocaleString('en-IN')}</td>
                    <td>{sp.policyDays ? sp.policyDays + 'd' : '—'}</td>
                    <td><ReturnBar sp={sp} /></td>
                    <td>
                      <div className={styles.actBtns}>
                        {!sp.delivered && !sp.returned && (
                          <button className={styles.mdbBtn} onClick={() => onMarkDel(order.id, si)}>✓ Delivered</button>
                        )}
                        <button className={`${styles.mbtn} ${sp.returned ? styles.undo : ''}`} onClick={() => onMarkRet(order.id, si)}>
                          {sp.returned ? 'Undo' : '↩ Return'}
                        </button>
                        <button className={`${styles.mbtn} ${styles.edit}`} onClick={() => onEditSub(order.id, si, sp)}>✎</button>
                        <button className={`${styles.mbtn} ${styles.del}`} onClick={() => onDelSub(order.id, si)}>✕</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className={styles.noSubs}>No sub-products yet.</p>
          )}
          <button className={styles.addSubBtn} onClick={() => onAddSub(order.id)}>＋ Add sub-product</button>
          <div className={styles.cardActions}>
            <button className={styles.delOrderBtn} onClick={() => onDelete(order.id)}>🗑 Delete order</button>
          </div>
        </div>
      )}
    </div>
  );
}
