const BASE = '/api';

async function req(method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export const api = {
  getStats:          ()              => req('GET',    '/stats'),
  getOrders:         (status, sort)  => req('GET',    `/orders?status=${status || 'All'}&sort=${sort || 'newest'}`),
  createOrder:       (data)          => req('POST',   '/orders', data),
  updateOrder:       (id, data)      => req('PATCH',  `/orders/${id}`, data),
  deleteOrder:       (id)            => req('DELETE', `/orders/${id}`),
  addSubproduct:     (id, subs)      => req('POST',   `/orders/${id}/subproducts`, subs),
  updateSubproduct:  (id, si, data)  => req('PATCH',  `/orders/${id}/subproducts/${si}`, data),
  deleteSubproduct:  (id, si)        => req('DELETE', `/orders/${id}/subproducts/${si}`),
  getPlatforms:      ()              => req('GET',    '/platforms'),
  savePlatform:      (name, color)   => req('POST',   '/platforms', { name, color }),
};
