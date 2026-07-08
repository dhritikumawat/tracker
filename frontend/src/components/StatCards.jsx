import React from 'react';
import styles from './StatCards.module.css';

const cards = [
  { id: 'total_spent',     label: 'Total Spent',      cls: 'navy',   fmt: v => '₹' + Number(v).toLocaleString('en-IN') },
  { id: 'total_orders',    label: 'Total Orders',      cls: '',       fmt: v => v },
  { id: 'delivering_soon', label: 'Delivering Soon',   cls: 'amber',  fmt: v => v },
  { id: 'delivered',       label: 'Delivered',         cls: 'ok',     fmt: v => v },
  { id: 'picked_up',       label: 'Picked Up',         cls: 'purple', fmt: v => v },
  { id: 'urgent_returns',  label: '⚠ Urgent Returns',  cls: 'danger', fmt: v => v },
];

export default function StatCards({ stats }) {
  return (
    <div className={styles.grid}>
      {cards.map(c => (
        <div key={c.id} className={`${styles.card} ${styles[c.cls] || ''}`}>
          <label>{c.label}</label>
          <div className={styles.val}>{stats ? c.fmt(stats[c.id] ?? 0) : '—'}</div>
        </div>
      ))}
    </div>
  );
}
