import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaChevronDown, FaChevronRight, FaSave, FaRotateCw, FaEye, FaCode, FaPalette, FaUndo } from 'react-icons/fa';
import { clsx } from 'clsx';
import { buttonClass } from '../ui';
import { useReducedMotion, motionVariants, getMotionProps } from '../../lib/motion';

const CONTENT_API = '/api/admin/content';

function FieldEditor({ label, value, onChange, type = 'text', schema, required }) {
  const [localValue, setLocalValue] = useState(value);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleBlur = () => setTouched(true);

  const handleChange = (e) => {
    const newValue = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setLocalValue(newValue);
    onChange(newValue);
  };

  if (type === 'textarea') {
    return (
      <div className="space-y-1">
        <label className="text-xs font-medium text-zinc-300">{label}{required && <span className="text-brand ml-1">*</span>}</label>
        <textarea
          value={localValue}
          onChange={handleChange}
          onBlur={handleBlur}
          className={clsx(
            'w-full rounded-lg border bg-charcoal px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-brand/60 focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all duration-200',
            touched && !localValue && required ? 'border-red-500/50' : 'border-white/10'
          )}
          rows={schema?.rows || 4}
          placeholder={schema?.placeholder}
        />
      </div>
    );
  }

  if (type === 'color') {
    return (
      <div className="space-y-1">
        <label className="text-xs font-medium text-zinc-300">{label}{required && <span className="text-brand ml-1">*</span>}</label>
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={localValue || '#000000'}
            onChange={handleChange}
            className="h-10 w-10 rounded border border-white/10 bg-charcoal cursor-pointer"
          />
          <input
            type="text"
            value={localValue}
            onChange={handleChange}
            className="flex-1 rounded-lg border border-white/10 bg-charcoal px-3 py-2 text-sm text-white font-mono focus:border-brand/60 focus:outline-none focus:ring-2 focus:ring-brand/20"
            placeholder="#hex"
          />
        </div>
      </div>
    );
  }

  if (type === 'select') {
    return (
      <div className="space-y-1">
        <label className="text-xs font-medium text-zinc-300">{label}{required && <span className="text-brand ml-1">*</span>}</label>
        <select
          value={localValue}
          onChange={handleChange}
          onBlur={handleBlur}
          className="w-full rounded-lg border border-white/10 bg-charcoal px-3 py-2 text-sm text-white focus:border-brand/60 focus:outline-none focus:ring-2 focus:ring-brand/20"
        >
          {schema?.options?.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>
    );
  }

  if (type === 'array') {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-zinc-300">{label}{required && <span className="text-brand ml-1">*</span>}</label>
          <button
            type="button"
            onClick={() => onChange([...(localValue || []), schema?.itemSchema ? getDefaultForSchema(schema.itemSchema) : ''])}
            className="btn btn-outline text-xs"
          >
            Add Item
          </button>
        </div>
        {(localValue || []).map((item, idx) => (
          <div key={idx} className="flex gap-2">
            {schema.itemSchema?.type === 'object' ? (
              <div className="flex-1">
                {Object.entries(schema.itemSchema.itemFields || {}).map(([k, s]) => (
                  <FieldEditor
                    key={k}
                    label={s.label || k}
                    value={item?.[k] || s.default || ''}
                    onChange={(v) => {
                      const newItem = { ...item, [k]: v };
                      const newArray = [...(localValue || [])];
                      newArray[idx] = newItem;
                      onChange(newArray);
                    }}
                    type={getInputType(s)}
                    schema={s}
                    required={s.required}
                  />
                ))}
              </div>
            ) : (
              <input
                value={item}
                onChange={(e) => {
                  const newArray = [...(localValue || [])];
                  newArray[idx] = e.target.value;
                  onChange(newArray);
                }}
                className="flex-1 rounded-lg border border-white/10 bg-charcoal px-3 py-2 text-sm text-white focus:border-brand/60 focus:outline-none focus:ring-2 focus:ring-brand/20"
              />
            )}
            <button
              type="button"
              onClick={() => onChange((localValue || []).filter((_, i) => i !== idx))}
              className="text-zinc-500 hover:text-red-400"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-zinc-300">{label}{required && <span className="text-brand ml-1">*</span>}</label>
      <input
        type={type}
        value={localValue}
        onChange={handleChange}
        onBlur={handleBlur}
        className={clsx(
          'w-full rounded-lg border bg-charcoal px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-brand/60 focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all duration-200',
          touched && !localValue && required ? 'border-red-500/50' : 'border-white/10'
        )}
        placeholder={schema?.placeholder}
      />
    </div>
  );
}

function getInputType(schema) {
  if (schema.type === 'boolean') return 'checkbox';
  if (schema.type === 'number') return 'number';
  if (schema.type === 'string' && schema.format === 'color') return 'color';
  if (schema.type === 'string' && schema.options) return 'select';
  if (schema.type === 'string' && schema.multiline) return 'textarea';
  return 'text';
}

function getDefaultForSchema(schema) {
  if (!schema) return '';
  if (schema.type === 'object') {
    const obj = {};
    for (const [k, s] of Object.entries(schema.itemFields || {})) {
      obj[k] = s.default || getDefaultForSchema(s);
    }
    return obj;
  }
  return schema.default || '';
}

export default function ContentEditor() {
  const prefersReduced = useReducedMotion();
  const [manifest, setManifest] = useState(null);
  const [content, setContent] = useState({});
  const [selectedRoute, setSelectedRoute] = useState('/');
  const [selectedComponent, setSelectedComponent] = useState('Hero');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    fetchManifest();
  }, []);

  const fetchManifest = async () => {
    try {
      const res = await fetch(`${CONTENT_API}`, { credentials: 'include' });
      const data = await res.json();
      if (data.ok) setManifest(data.manifest);
    } catch (e) {
      console.error('Failed to fetch manifest:', e);
    }
  };

  const loadContent = async () => {
    try {
      const res = await fetch(`${CONTENT_API}?route=${encodeURIComponent(selectedRoute)}&component=${encodeURIComponent(selectedComponent)}`, { credentials: 'include' });
      const data = await res.json();
      if (data.ok) setContent(data.content || {});
    } catch (e) {
      console.error('Failed to load content:', e);
    }
  };

  useEffect(() => {
    loadContent();
  }, [selectedRoute, selectedComponent]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${CONTENT_API}?route=${encodeURIComponent(selectedRoute)}&component=${encodeURIComponent(selectedComponent)}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(content),
      });
      const data = await res.json();
      if (data.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } else {
        alert('Save failed: ' + data.error);
      }
    } catch (e) {
      alert('Save failed: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSync = async () => {
    try {
      const res = await fetch(`${CONTENT_API}/sync`, { method: 'POST', credentials: 'include' });
      const data = await res.json();
      if (data.ok) {
        fetchManifest();
        loadContent();
        alert('Synced from git!');
      } else {
        alert('Sync failed: ' + data.error);
      }
    } catch (e) {
      alert('Sync failed: ' + e.message);
    }
  };

  const routeComponents = manifest?.routes?.[selectedRoute]?.components || {};
  const componentSchema = routeComponents[selectedComponent];
  const componentFields = componentSchema?.fields || {};

  const routes = Object.keys(manifest?.routes || {});

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 p-4 border-b border-white/10 bg-charcoal/50 backdrop-blur-sm">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <select
            value={selectedRoute}
            onChange={(e) => { setSelectedRoute(e.target.value); setSelectedComponent(Object.keys(manifest?.routes?.[e.target.value]?.components || {})[0] || ''); }}
            className="flex-1 min-w-[180px] rounded-lg border border-white/10 bg-charcoal px-3 py-2 text-sm text-white focus:border-brand/60 focus:outline-none focus:ring-2 focus:ring-brand/20"
          >
            {routes.map(r => <option key={r} value={r}>{manifest.routes[r].name} ({r})</option>)}
          </select>
          <select
            value={selectedComponent}
            onChange={(e) => setSelectedComponent(e.target.value)}
            className="flex-1 min-w-[180px] rounded-lg border border-white/10 bg-charcoal px-3 py-2 text-sm text-white focus:border-brand/60 focus:outline-none focus:ring-2 focus:ring-brand/20"
          >
            {Object.keys(routeComponents).map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleSync} className="btn btn-outline text-sm" title="Sync from git">
            <FaRotateCw className="text-sm" />
            Sync
          </button>
          <button onClick={() => setPreviewOpen(true)} className="btn btn-outline text-sm" title="Preview">
            <FaEye className="text-sm" />
            Preview
          </button>
          {saved && <span className="text-xs text-emerald-400">Saved!</span>}
          <button onClick={handleSave} disabled={saving} className={clsx('btn btn-primary text-sm', saving && 'opacity-50')}>
            <FaSave className="text-sm" />
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-auto p-4 md:p-6">
        <motion.div
          {...getMotionProps(prefersReduced, motionVariants.fadeInUp)}
          className="max-w-3xl mx-auto space-y-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-xl font-bold text-white">{selectedComponent}</h2>
            <span className="text-xs text-zinc-500">{selectedRoute}</span>
          </div>

          {Object.entries(componentFields).map(([key, schema]) => (
            <div key={key} className="card p-4">
              <FieldEditor
                label={schema.label || key}
                value={content[key] ?? schema.default ?? ''}
                onChange={(v) => setContent(prev => ({ ...prev, [key]: v }))}
                type={getInputType(schema)}
                schema={schema}
                required={schema.required}
              />
            </div>
          ))}
        </motion.div>
      </div>

      {/* Preview Modal */}
      <AnimatePresence>
        {previewOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            onClick={() => setPreviewOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-4xl max-h-[90vh] overflow-auto rounded-xl bg-charcoal border border-white/10"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-4 border-b border-white/10">
                <h3 className="font-bold text-white">Live Preview — {selectedComponent}</h3>
                <button onClick={() => setPreviewOpen(false)} className="text-zinc-400 hover:text-white">✕</button>
              </div>
              <div className="p-4">
                <ComponentPreview component={selectedComponent} content={content} route={selectedRoute} />
              </div>
            </motion.div>
          </motion.div>
          )}
      </AnimatePresence>
    </div>
  );
}

function ComponentPreview({ component, content, route }) {
  // Minimal preview - in production would render actual component
  return (
    <div className="space-y-4 text-sm">
      <p className="text-zinc-400">Preview for <span className="text-brand">{component}</span> on <span className="text-brand">{route}</span></p>
      <div className="bg-night/50 rounded-lg p-4 font-mono text-xs text-zinc-300 overflow-auto max-h-96">
        {JSON.stringify(content, null, 2)}
      </div>
    </div>
  );
}

