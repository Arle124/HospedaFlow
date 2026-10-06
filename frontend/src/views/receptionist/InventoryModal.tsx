import React, { useState } from 'react';
import { m, AnimatePresence } from 'framer-motion';
import { X, Plus, Package, Edit2, Trash2 } from 'lucide-react';
import { db } from '../../db/db';
import type { LocalProduct } from '../../db/db';
import { springModal, springTouch } from '../../utils/motion';

interface InventoryModalProps {
  isOpen: boolean;
  products: LocalProduct[];
  onClose: () => void;
}

export const InventoryModal: React.FC<InventoryModalProps> = ({ isOpen, products, onClose }) => {
  const [editingProduct, setEditingProduct] = useState<LocalProduct | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    price: '',
    stock: '',
    minStock: '',
  });

  const handleEdit = (p: LocalProduct) => {
    setEditingProduct(p);
    setFormData({
      name: p.name,
      sku: p.sku,
      price: p.price.toString(),
      stock: p.stock.toString(),
      minStock: p.minStock.toString(),
    });
  };

  const handleCreateNew = () => {
    setEditingProduct({ id: 0, name: '', sku: '', price: 0, stock: 0, minStock: 0 }); // id=0 indicates new
    setFormData({ name: '', sku: '', price: '', stock: '', minStock: '' });
  };

  const handleCancelEdit = () => {
    setEditingProduct(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    const payload = {
      name: formData.name.trim(),
      sku: formData.sku.trim(),
      price: parseInt(formData.price, 10),
      stock: parseInt(formData.stock, 10),
      minStock: parseInt(formData.minStock, 10),
    };

    if (editingProduct.id === 0) {
      // Create new
      const nextId = products.length > 0 ? Math.max(...products.map(p => p.id)) + 1 : 1;
      await db.inventory.add({ ...payload, id: nextId });
    } else {
      // Update
      await db.inventory.update(editingProduct.id, payload);
    }
    
    setEditingProduct(null);
  };

  const handleDelete = async (id: number) => {
    if (confirm('¿Seguro que deseas eliminar este producto del inventario?')) {
      await db.inventory.delete(id);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="modal-overlay" onClick={onClose}>
          <m.div
            className="modal-dialog"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '600px' }}
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={springModal}
          >
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Package size={18} color="var(--text-primary)" />
            <h2>Gestión de Inventario (Minibar e Insumos)</h2>
          </div>
          <button type="button" className="btn-close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body" style={{ maxHeight: '65vh', overflowY: 'auto' }}>
          {editingProduct ? (
            <m.form 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              onSubmit={handleSave} 
              style={{ backgroundColor: 'var(--bg-surface-elevated)', padding: '20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', marginBottom: '24px', overflow: 'hidden' }}
            >
              <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '16px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Edit2 size={16} color="var(--border-focus)" />
                {editingProduct.id === 0 ? 'Añadir Nuevo Producto' : 'Editar Producto'}
              </h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label>Nombre del Producto *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ej. Gaseosa 400ml"
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label>SKU / Código</label>
                  <input
                    type="text"
                    required
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    placeholder="Ej. GAS-400"
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label>Precio de Venta ($) *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label>Stock Actual *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label>Stock Mínimo (Alerta) *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={formData.minStock}
                    onChange={(e) => setFormData({ ...formData, minStock: e.target.value })}
                    className="form-input"
                  />
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '20px' }}>
                <m.button type="button" className="btn-secondary" onClick={handleCancelEdit} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                  Cancelar
                </m.button>
                <m.button type="submit" className="btn-primary" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                  {editingProduct.id === 0 ? 'Crear Producto' : 'Guardar Cambios'}
                </m.button>
              </div>
            </m.form>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
                <m.button
                  type="button"
                  className="btn-primary"
                  onClick={handleCreateNew}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  transition={springTouch}
                >
                  <Plus size={14} />
                  <span>Nuevo Producto</span>
                </m.button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '12px' }}>
                {products.map((p) => {
                  const isLowStock = p.stock <= p.minStock;
                  return (
                    <m.div
                      key={p.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      whileHover={{ y: -2, boxShadow: 'var(--shadow-md)' }}
                      transition={springTouch}
                      style={{
                        backgroundColor: 'var(--bg-surface-elevated)',
                        border: `1px solid ${isLowStock ? 'var(--status-dirty-border)' : 'var(--border-subtle)'}`,
                        borderRadius: 'var(--radius-md)',
                        padding: '14px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <div style={{ fontWeight: '600', fontSize: '14px', color: 'var(--text-primary)', marginBottom: '2px' }}>{p.name}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>SKU: {p.sku}</div>
                        </div>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <m.button
                            type="button"
                            className="btn-secondary"
                            style={{ padding: '6px', height: 'auto', border: 'none', backgroundColor: 'var(--bg-surface)' }}
                            onClick={() => handleEdit(p)}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            transition={springTouch}
                            title="Editar"
                          >
                            <Edit2 size={14} color="var(--text-secondary)" />
                          </m.button>
                          <m.button
                            type="button"
                            className="btn-secondary"
                            style={{ padding: '6px', height: 'auto', border: 'none', backgroundColor: 'var(--bg-surface)' }}
                            onClick={() => handleDelete(p.id)}
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            transition={springTouch}
                            title="Eliminar"
                          >
                            <Trash2 size={14} color="var(--status-maintenance-text)" />
                          </m.button>
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '4px' }}>
                        <span className="tabular-nums" style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-primary)' }}>
                          ${p.price.toLocaleString()}
                        </span>
                        <span
                          className="tabular-nums"
                          style={{
                            fontSize: '11px',
                            fontWeight: '600',
                            padding: '4px 8px',
                            borderRadius: 'var(--radius-sm)',
                            backgroundColor: isLowStock ? 'var(--status-dirty-bg)' : 'var(--status-available-bg)',
                            color: isLowStock ? 'var(--status-dirty-text)' : 'var(--status-available-text)',
                            border: `1px solid ${isLowStock ? 'var(--status-dirty-border)' : 'var(--status-available-border)'}`,
                          }}
                        >
                          Stock: {p.stock} {isLowStock ? '(Bajo)' : ''}
                        </span>
                      </div>
                    </m.div>
                  );
                })}
                {products.length === 0 && (
                  <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '13px' }}>
                    No hay productos en el inventario.
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </m.div>
    </div>
    )}
    </AnimatePresence>
  );
};
