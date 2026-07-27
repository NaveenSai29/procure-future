'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, X, Save, HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';

const FAQ_CATEGORIES = ['GENERAL', 'ACCOUNT', 'ORDERS', 'PAYMENTS', 'DELIVERY', 'RETURNS', 'SUPPLIER', 'BUYER'];

export default function FAQsPage() {
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingFaq, setEditingFaq] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [form, setForm] = useState({ question: '', answer: '', category: 'GENERAL', sortOrder: 0 });

  useEffect(() => { fetchFAQs(); }, []);

  const fetchFAQs = async () => {
    try { const res = await fetch('/api/admin/cms/faqs'); const data = await res.json(); setFaqs(data.faqs || []); } catch {} finally { setLoading(false); }
  };

  const handleSubmit = async () => {
    const url = editingFaq ? '/api/admin/cms/faqs/' + editingFaq.id : '/api/admin/cms/faqs';
    const method = editingFaq ? 'PATCH' : 'POST';
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    if (res.ok) { toast.success(editingFaq ? 'Updated' : 'Created'); setShowModal(false); resetForm(); fetchFAQs(); }
  };

  const handleDelete = async (id) => { if (!confirm('Delete?')) return; await fetch('/api/admin/cms/faqs/' + id, { method: 'DELETE' }); toast.success('Deleted'); fetchFAQs(); };

  const resetForm = () => { setEditingFaq(null); setForm({ question: '', answer: '', category: 'GENERAL', sortOrder: 0 }); };

  const groupedFaqs = FAQ_CATEGORIES.reduce((acc, cat) => {
    acc[cat] = faqs.filter(f => f.category === cat);
    return acc;
  }, {});

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl font-bold text-gray-900">FAQs</h1><p className="text-gray-500">{faqs.length} questions</p></div>
        <button onClick={() => { resetForm(); setShowModal(true); }} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"><Plus className="h-4 w-4" /> Add FAQ</button>
      </div>

      {FAQ_CATEGORIES.map(cat => {
        const catFaqs = groupedFaqs[cat] || [];
        if (catFaqs.length === 0) return null;
        return (
          <div key={cat} className="mb-6">
            <h2 className="font-semibold text-gray-700 mb-2 px-1">{cat}</h2>
            <div className="space-y-2">
              {catFaqs.map(faq => (
                <div key={faq.id} className="bg-white rounded-xl border">
                  <div className="flex items-center justify-between p-4 cursor-pointer" onClick={() => setExpandedId(expandedId === faq.id ? null : faq.id)}>
                    <p className="font-medium text-sm pr-4">{faq.question}</p>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={(e) => { e.stopPropagation(); setEditingFaq(faq); setForm({ question: faq.question, answer: faq.answer, category: faq.category, sortOrder: faq.sortOrder }); setShowModal(true); }} className="p-1 hover:bg-gray-100 rounded"><Edit className="h-3.5 w-3.5 text-gray-400" /></button>
                      <button onClick={(e) => { e.stopPropagation(); handleDelete(faq.id); }} className="p-1 hover:bg-red-50 rounded"><Trash2 className="h-3.5 w-3.5 text-red-400" /></button>
                      {expandedId === faq.id ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                    </div>
                  </div>
                  {expandedId === faq.id && <div className="px-4 pb-4 text-sm text-gray-600 border-t pt-3">{faq.answer}</div>}
                </div>
              ))}
            </div>
          </div>
        );
      })}
      {faqs.length === 0 && <div className="text-center py-12 text-gray-400"><HelpCircle className="h-12 w-12 mx-auto mb-3 opacity-50" /><p>No FAQs created</p></div>}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4"><h3 className="text-lg font-bold">{editingFaq ? 'Edit FAQ' : 'Add FAQ'}</h3><button onClick={() => setShowModal(false)}><X className="h-5 w-5" /></button></div>
            <div className="space-y-3">
              <div><label className="text-sm font-medium">Question</label><input type="text" value={form.question} onChange={(e) => setForm(prev => ({ ...prev, question: e.target.value }))} className="w-full px-3 py-2 border rounded-lg mt-1" /></div>
              <div><label className="text-sm font-medium">Answer</label><textarea value={form.answer} onChange={(e) => setForm(prev => ({ ...prev, answer: e.target.value }))} className="w-full px-3 py-2 border rounded-lg mt-1" rows={4} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-sm font-medium">Category</label><select value={form.category} onChange={(e) => setForm(prev => ({ ...prev, category: e.target.value }))} className="w-full px-3 py-2 border rounded-lg mt-1">{FAQ_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                <div><label className="text-sm font-medium">Sort Order</label><input type="number" value={form.sortOrder} onChange={(e) => setForm(prev => ({ ...prev, sortOrder: parseInt(e.target.value) }))} className="w-full px-3 py-2 border rounded-lg mt-1" /></div>
              </div>
            </div>
            <div className="flex gap-2 mt-6"><button onClick={() => setShowModal(false)} className="flex-1 py-2 border rounded-lg">Cancel</button><button onClick={handleSubmit} className="flex-1 py-2 bg-blue-600 text-white rounded-lg"><Save className="h-4 w-4 inline mr-1" />{editingFaq ? 'Update' : 'Create'}</button></div>
          </div>
        </div>
      )}
    </div>
  );
}