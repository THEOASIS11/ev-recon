'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Product {
  id: string;
  name: string;
  sku: string | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
}

export default function ProductsPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ name: '', display_order: '' });
  const [addError, setAddError] = useState('');
  const [adding, setAdding] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', display_order: '' });
  const [actionError, setActionError] = useState('');

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      try {
        const u = JSON.parse(stored);
        if (u.role !== 'admin') { router.replace('/dashboard'); return; }
      } catch { /* ignore */ }
    }
    fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  async function fetchProducts() {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('/api/v1/admin/products', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setProducts(data.products || []);
      }
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }

  async function addProduct() {
    if (!token) return;
    setAddError('');
    if (!addForm.name.trim()) { setAddError('Product name is required.'); return; }
    setAdding(true);
    try {
      const res = await fetch('/api/v1/admin/products', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: addForm.name.trim(),
          display_order: addForm.display_order ? parseInt(addForm.display_order) : 999,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setAddError(data.error || 'Failed to add product.'); return; }
      setProducts((prev) => [...prev, data.product].sort((a, b) => a.display_order - b.display_order));
      setShowAdd(false);
      setAddForm({ name: '', display_order: '' });
    } catch { setAddError('Server error.'); } finally {
      setAdding(false);
    }
  }

  async function saveEdit(productId: string) {
    if (!token) return;
    setActionError('');
    const updates: Record<string, unknown> = {};
    if (editForm.name.trim()) updates.name = editForm.name.trim();
    if (editForm.display_order) updates.display_order = parseInt(editForm.display_order);

    if (Object.keys(updates).length === 0) { setEditId(null); return; }

    const res = await fetch(`/api/v1/admin/products/${productId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    const data = await res.json();
    if (!res.ok) { setActionError(data.error || 'Failed to update.'); return; }
    setProducts((prev) => prev.map((p) => (p.id === productId ? { ...p, ...data.product } : p))
      .sort((a, b) => a.display_order - b.display_order));
    setEditId(null);
  }

  async function toggleActive(product: Product) {
    if (!token) return;
    setActionError('');
    const confirmed = window.confirm(
      product.is_active
        ? `Deactivate "${product.name}"? It will no longer appear in submission forms.`
        : `Reactivate "${product.name}"?`
    );
    if (!confirmed) return;

    const res = await fetch(`/api/v1/admin/products/${product.id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !product.is_active }),
    });
    const data = await res.json();
    if (!res.ok) { setActionError(data.error || 'Failed.'); return; }
    setProducts((prev) => prev.map((p) => (p.id === product.id ? { ...p, ...data.product } : p)));
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px' }}>
        <p style={{ color: '#9ca3af' }}>Loading...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#111827', margin: '0 0 4px' }}>Product Management</h1>
          <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>{products.length} products total</p>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          style={{ padding: '8px 18px', backgroundColor: '#111827', color: '#ffffff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}
        >
          {showAdd ? 'Cancel' : '+ Add Product'}
        </button>
      </div>

      {/* Add product form */}
      {showAdd && (
        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e5e7eb', padding: '20px', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: '600', color: '#111827', margin: '0 0 16px' }}>New Product</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>Product Name</label>
              <input type="text" value={addForm.name} onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. EV Scooter Pro 2026"
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#374151', marginBottom: '6px' }}>Display Order</label>
              <input type="number" value={addForm.display_order} onChange={(e) => setAddForm((f) => ({ ...f, display_order: e.target.value }))}
                placeholder="e.g. 11"
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
            </div>
          </div>
          {addError && <p style={{ color: '#dc2626', fontSize: '13px', margin: '0 0 10px' }}>{addError}</p>}
          <button
            onClick={addProduct}
            disabled={adding}
            style={{ padding: '8px 20px', backgroundColor: '#16a34a', color: '#ffffff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}
          >
            {adding ? 'Adding...' : 'Add Product'}
          </button>
        </div>
      )}

      {actionError && (
        <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', fontSize: '13px', color: '#dc2626' }}>
          {actionError}
        </div>
      )}

      {/* Products table */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f9fafb' }}>
              <th style={{ padding: '10px 20px', textAlign: 'left', fontSize: '12px', color: '#6b7280', fontWeight: '600', width: '60px' }}>#</th>
              <th style={{ padding: '10px 20px', textAlign: 'left', fontSize: '12px', color: '#6b7280', fontWeight: '600' }}>Product</th>
              <th style={{ padding: '10px 20px', textAlign: 'center', fontSize: '12px', color: '#6b7280', fontWeight: '600', width: '100px' }}>Active</th>
              <th style={{ padding: '10px 20px', textAlign: 'left', fontSize: '12px', color: '#6b7280', fontWeight: '600', width: '200px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id} style={{ borderTop: '1px solid #f3f4f6' }}>
                <td style={{ padding: '14px 20px', color: '#9ca3af', fontSize: '13px' }}>{product.display_order}</td>
                <td style={{ padding: '14px 20px' }}>
                  {editId === product.id ? (
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <input
                        type="text"
                        value={editForm.name}
                        onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                        placeholder={product.name}
                        style={{ padding: '5px 8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px', outline: 'none', width: '180px' }}
                      />
                      <input
                        type="number"
                        value={editForm.display_order}
                        onChange={(e) => setEditForm((f) => ({ ...f, display_order: e.target.value }))}
                        placeholder={String(product.display_order)}
                        style={{ padding: '5px 8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px', outline: 'none', width: '60px' }}
                      />
                    </div>
                  ) : (
                    <div>
                      <p style={{ fontSize: '14px', fontWeight: '500', color: '#111827', margin: '0 0 2px' }}>{product.name}</p>
                      {product.sku && <p style={{ fontSize: '12px', color: '#9ca3af', margin: 0 }}>{product.sku}</p>}
                    </div>
                  )}
                </td>
                <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                  <span style={{
                    backgroundColor: product.is_active ? '#dcfce7' : '#f3f4f6',
                    color: product.is_active ? '#16a34a' : '#9ca3af',
                    fontSize: '11px', fontWeight: '600', padding: '2px 8px', borderRadius: '99px',
                  }}>
                    {product.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td style={{ padding: '14px 20px' }}>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {editId === product.id ? (
                      <>
                        <button onClick={() => saveEdit(product.id)}
                          style={{ padding: '4px 10px', backgroundColor: '#16a34a', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>
                          Save
                        </button>
                        <button onClick={() => setEditId(null)}
                          style={{ padding: '4px 8px', backgroundColor: 'transparent', color: '#9ca3af', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => { setEditId(product.id); setEditForm({ name: product.name, display_order: String(product.display_order) }); setActionError(''); }}
                          style={{ padding: '4px 10px', backgroundColor: 'transparent', color: '#374151', border: '1px solid #e5e7eb', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>
                          Edit
                        </button>
                        <button
                          onClick={() => toggleActive(product)}
                          style={{
                            padding: '4px 10px',
                            backgroundColor: 'transparent',
                            color: product.is_active ? '#dc2626' : '#16a34a',
                            border: `1px solid ${product.is_active ? '#fecaca' : '#bbf7d0'}`,
                            borderRadius: '6px',
                            fontSize: '12px',
                            cursor: 'pointer',
                          }}>
                          {product.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
