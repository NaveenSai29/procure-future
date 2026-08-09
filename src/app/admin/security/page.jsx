'use client';

import { useState, useEffect } from 'react';
import {
  Shield, Key, Activity, Save, RefreshCw, Check, Server,
} from 'lucide-react';
import { toast } from 'sonner';

export default function SecurityPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState('bruteforce');

  // Brute Force Protection
  const [bruteForce, setBruteForce] = useState({
    maxLoginAttempts: 5,
    lockoutDuration: 30,
    autoUnlock: true,
  });

  // API Security
  const [apiSecurity, setApiSecurity] = useState({
    jwtExpiry: 43200,
    refreshTokenExpiry: 7,
  });

  useEffect(() => {
    fetchSecuritySettings();
  }, []);

  const fetchSecuritySettings = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/settings');
      const data = await res.json();

      if (data.settings?.SECURITY_BRUTE) setBruteForce(prev => ({ ...prev, ...data.settings.SECURITY_BRUTE }));
      if (data.settings?.SECURITY_API) setApiSecurity(prev => ({ ...prev, ...data.settings.SECURITY_API }));
    } catch (error) {
      toast.error('Failed to load security settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (category, data) => {
    try {
      setSaving(true);
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, settings: data })
      });

      if (res.ok) {
        toast.success('Security settings saved');
        fetchSecuritySettings();
      } else {
        throw new Error('Failed to save');
      }
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const sections = [
    { id: 'bruteforce', label: 'Brute Force Protection', icon: Shield },
    { id: 'apisecurity', label: 'API & Token Security', icon: Key },
    { id: 'status', label: 'Security Status', icon: Activity },
  ];

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          {[1,2,3].map(i => <div key={i} className="h-48 bg-gray-200 rounded-xl"></div>)}
        </div>
      </div>
    );
  }

  // Convert minutes to days for display
  const jwtExpiryDays = Math.round((apiSecurity.jwtExpiry || 43200) / 1440);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Security Center</h1>
          <p className="text-gray-500 mt-1">Brute force protection & token security configuration</p>
        </div>
        <button onClick={fetchSecuritySettings} className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200">
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </div>

      {/* Security Status Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-green-50 rounded-xl p-4 text-center border border-green-200">
          <Check className="h-5 w-5 text-green-500 mx-auto mb-1" />
          <p className="text-xs text-green-700 font-medium">SSL/TLS</p>
          <p className="text-xs text-green-600">Active</p>
        </div>
        <div className="bg-green-50 rounded-xl p-4 text-center border border-green-200">
          <Shield className="h-5 w-5 text-green-500 mx-auto mb-1" />
          <p className="text-xs text-green-700 font-medium">Brute Force</p>
          <p className="text-xs text-green-600">Active</p>
        </div>
        <div className="bg-green-50 rounded-xl p-4 text-center border border-green-200">
          <Activity className="h-5 w-5 text-green-500 mx-auto mb-1" />
          <p className="text-xs text-green-700 font-medium">Rate Limiting</p>
          <p className="text-xs text-green-600">Active</p>
        </div>
        <div className="bg-green-50 rounded-xl p-4 text-center border border-green-200">
          <Key className="h-5 w-5 text-green-500 mx-auto mb-1" />
          <p className="text-xs text-green-700 font-medium">JWT Tokens</p>
          <p className="text-xs text-green-600">{jwtExpiryDays}d expiry</p>
        </div>
      </div>

      {/* Section Navigation */}
      <div className="flex gap-2 mb-6 overflow-x-auto">
        {sections.map(section => (
          <button
            key={section.id}
            onClick={() => setActiveSection(section.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition ${
              activeSection === section.id
                ? 'bg-red-600 text-white shadow-sm'
                : 'bg-white text-gray-600 border hover:bg-gray-50'
            }`}
          >
            <section.icon className="h-4 w-4" />
            {section.label}
          </button>
        ))}
      </div>

      {/* BRUTE FORCE PROTECTION */}
      {activeSection === 'bruteforce' && (
        <div className="bg-white rounded-xl border shadow-sm p-6">
          <h3 className="font-semibold text-gray-900 mb-2">Brute Force Protection</h3>
          <p className="text-sm text-gray-500 mb-6">Protects against repeated failed login attempts by temporarily locking accounts.</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="text-sm font-medium text-gray-700">Max Login Attempts</label>
              <p className="text-xs text-gray-400 mb-1">Number of failed attempts before lockout</p>
              <input type="number" min="1" max="20" value={bruteForce.maxLoginAttempts} onChange={(e) => setBruteForce(prev => ({ ...prev, maxLoginAttempts: parseInt(e.target.value) || 5 }))} className="w-full px-3 py-2 border rounded-lg" />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Lockout Duration (Minutes)</label>
              <p className="text-xs text-gray-400 mb-1">How long the account stays locked</p>
              <input type="number" min="1" max="1440" value={bruteForce.lockoutDuration} onChange={(e) => setBruteForce(prev => ({ ...prev, lockoutDuration: parseInt(e.target.value) || 30 }))} className="w-full px-3 py-2 border rounded-lg" />
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-blue-800">How it works</p>
                <ul className="text-xs text-blue-700 mt-1 space-y-1 list-disc list-inside">
                  <li>After {bruteForce.maxLoginAttempts} failed login attempts, the account is locked</li>
                  <li>Locked accounts cannot login for {bruteForce.lockoutDuration} minutes</li>
                  <li>Failed attempts are tracked in the last {bruteForce.lockoutDuration} minute window</li>
                  <li>Login page shows remaining attempts and lockout time to users</li>
                  <li>Rate limiting also applies: 10 login requests per minute per IP</li>
                </ul>
              </div>
            </div>
          </div>

          <button onClick={() => handleSave('SECURITY_BRUTE', bruteForce)} disabled={saving} className="px-6 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2">
            <Save className="h-4 w-4" />{saving ? 'Saving...' : 'Save Protection Settings'}
          </button>
        </div>
      )}

      {/* API SECURITY */}
      {activeSection === 'apisecurity' && (
        <div className="bg-white rounded-xl border shadow-sm p-6">
          <h3 className="font-semibold text-gray-900 mb-2">API & Token Security</h3>
          <p className="text-sm text-gray-500 mb-6">Configure JWT token expiry for access and refresh tokens. Changes take effect for all new logins.</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="text-sm font-medium text-gray-700">JWT Access Token Expiry</label>
              <p className="text-xs text-gray-400 mb-1">How long before users must re-authenticate</p>
              <select 
                value={apiSecurity.jwtExpiry} 
                onChange={(e) => setApiSecurity(prev => ({ ...prev, jwtExpiry: parseInt(e.target.value) }))} 
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={60}>1 hour</option>
                <option value={360}>6 hours</option>
                <option value={720}>12 hours</option>
                <option value={1440}>1 day</option>
                <option value={10080}>7 days</option>
                <option value={43200}>30 days</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Refresh Token Expiry</label>
              <p className="text-xs text-gray-400 mb-1">How long refresh tokens remain valid</p>
              <select 
                value={apiSecurity.refreshTokenExpiry} 
                onChange={(e) => setApiSecurity(prev => ({ ...prev, refreshTokenExpiry: parseInt(e.target.value) }))} 
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value={1}>1 day</option>
                <option value={3}>3 days</option>
                <option value={7}>7 days</option>
                <option value={14}>14 days</option>
                <option value={30}>30 days</option>
                <option value={90}>90 days</option>
              </select>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <Key className="h-5 w-5 text-blue-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-blue-800">Current Configuration</p>
                <ul className="text-xs text-blue-700 mt-1 space-y-1 list-disc list-inside">
                  <li>Access tokens expire after <strong>{jwtExpiryDays} days</strong> (currently {apiSecurity.jwtExpiry} minutes)</li>
                  <li>Refresh tokens expire after <strong>{apiSecurity.refreshTokenExpiry} days</strong></li>
                  <li>Mobile apps use silent token refresh via refresh token</li>
                  <li>Web browsers store tokens in secure httpOnly cookies</li>
                  <li>Existing tokens remain valid until their original expiry</li>
                </ul>
              </div>
            </div>
          </div>

          <button onClick={() => handleSave('SECURITY_API', apiSecurity)} disabled={saving} className="px-6 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2">
            <Save className="h-4 w-4" />{saving ? 'Saving...' : 'Save Token Settings'}
          </button>
        </div>
      )}

      {/* SECURITY STATUS */}
      {activeSection === 'status' && (
        <div className="bg-white rounded-xl border shadow-sm p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Security Status Overview</h3>
          
          <div className="space-y-4">
            {[
              { label: 'Brute Force Protection', active: true, desc: `Locks account after ${bruteForce.maxLoginAttempts} failed attempts for ${bruteForce.lockoutDuration} minutes` },
              { label: 'Login Rate Limiting', active: true, desc: '10 login requests per minute per IP address' },
              { label: 'OTP Rate Limiting', active: true, desc: '3 OTP requests per 10 minutes, 5 verify attempts per 5 minutes' },
              { label: 'JWT Token Security', active: true, desc: `Access tokens: ${jwtExpiryDays} days, Refresh tokens: ${apiSecurity.refreshTokenExpiry} days` },
              { label: 'Password Hashing', active: true, desc: 'bcrypt with 12 salt rounds' },
              { label: 'HTTP-Only Cookies', active: true, desc: 'Tokens stored in secure, httpOnly cookies for web' },
              { label: 'SSL/TLS Encryption', active: true, desc: 'All traffic encrypted in production' },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                <div className={`p-1.5 rounded-full mt-0.5 ${item.active ? 'bg-green-100' : 'bg-gray-100'}`}>
                  <Check className={`h-4 w-4 ${item.active ? 'text-green-600' : 'text-gray-400'}`} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{item.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}