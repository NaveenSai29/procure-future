'use client';

import { useState, useEffect } from 'react';
import {
  Shield, Lock, Key, UserX, AlertTriangle, Activity,
  Save, RefreshCw, Eye, EyeOff, Plus, X, Trash2,
  Check, Clock, Server, Wifi, Globe
} from 'lucide-react';
import { toast } from 'sonner';

export default function SecurityPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState('authentication');

  // Authentication Settings
  const [authSettings, setAuthSettings] = useState({
    twoFactorAuth: false,
    passwordMinLength: 8,
    passwordRequireUppercase: true,
    passwordRequireNumber: true,
    passwordRequireSpecial: true,
    passwordExpiryDays: 90,
    passwordHistoryCount: 5,
    sessionTimeout: 30,
    maxConcurrentSessions: 3,
    rememberMeEnabled: true,
    socialLoginGoogle: false,
    socialLoginMicrosoft: false,
    otpLoginEnabled: true,
  });

  // IP & Access Control
  const [ipWhitelist, setIpWhitelist] = useState([]);
  const [newIp, setNewIp] = useState('');
  const [ipWhitelistEnabled, setIpWhitelistEnabled] = useState(false);
  const [geoRestriction, setGeoRestriction] = useState({
    enabled: false,
    allowedCountries: [],
    blockedCountries: []
  });

  // Rate Limiting
  const [rateLimit, setRateLimit] = useState({
    apiRateLimit: 100,
    apiRateWindow: 60,
    loginRateLimit: 5,
    loginRateWindow: 300,
    otpRateLimit: 3,
    otpRateWindow: 600,
  });

  // Brute Force Protection
  const [bruteForce, setBruteForce] = useState({
    maxLoginAttempts: 5,
    lockoutDuration: 30,
    progressiveLockout: true,
    notifyOnLockout: true,
    autoUnlock: true,
  });

  // API Security
  const [apiSecurity, setApiSecurity] = useState({
    jwtExpiry: 15,
    refreshTokenExpiry: 7,
    requireHttps: true,
    corsEnabled: true,
    corsOrigins: '*',
    apiKeyAuth: false,
    requestSigning: false,
  });

  // Security Monitoring
  const [monitoring, setMonitoring] = useState({
    auditLogEnabled: true,
    auditLogRetention: 90,
    suspiciousActivityDetection: true,
    anomalyDetection: false,
    realTimeAlerts: true,
    alertEmail: '',
    alertThreshold: 'MEDIUM',
  });

  useEffect(() => {
    fetchSecuritySettings();
  }, []);

  const fetchSecuritySettings = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/settings');
      const data = await res.json();

      if (data.settings?.SECURITY_AUTH) setAuthSettings(prev => ({ ...prev, ...data.settings.SECURITY_AUTH }));
      if (data.settings?.SECURITY_IP) {
        setIpWhitelist(data.settings.SECURITY_IP.whitelist || []);
        setIpWhitelistEnabled(data.settings.SECURITY_IP.enabled || false);
      }
      if (data.settings?.SECURITY_RATE) setRateLimit(prev => ({ ...prev, ...data.settings.SECURITY_RATE }));
      if (data.settings?.SECURITY_BRUTE) setBruteForce(prev => ({ ...prev, ...data.settings.SECURITY_BRUTE }));
      if (data.settings?.SECURITY_API) setApiSecurity(prev => ({ ...prev, ...data.settings.SECURITY_API }));
      if (data.settings?.SECURITY_MONITOR) setMonitoring(prev => ({ ...prev, ...data.settings.SECURITY_MONITOR }));
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

  const addIpAddress = () => {
    if (!newIp || ipWhitelist.includes(newIp)) return;
    setIpWhitelist([...ipWhitelist, newIp]);
    setNewIp('');
  };

  const removeIp = (ip) => {
    setIpWhitelist(ipWhitelist.filter(i => i !== ip));
  };

  const sections = [
    { id: 'authentication', label: 'Authentication', icon: Lock },
    { id: 'access', label: 'Access Control', icon: Globe },
    { id: 'ratelimit', label: 'Rate Limiting', icon: Activity },
    { id: 'bruteforce', label: 'Brute Force', icon: Shield },
    { id: 'apisecurity', label: 'API Security', icon: Key },
    { id: 'monitoring', label: 'Monitoring', icon: AlertTriangle },
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

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Security Center</h1>
          <p className="text-gray-500 mt-1">Enterprise-grade security configuration and monitoring</p>
        </div>
        <button onClick={fetchSecuritySettings} className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200">
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </div>

      {/* Security Status Overview */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <div className="bg-green-50 rounded-xl p-3 text-center border border-green-200">
          <Check className="h-5 w-5 text-green-500 mx-auto mb-1" />
          <p className="text-xs text-green-700 font-medium">SSL/TLS</p>
          <p className="text-xs text-green-600">Active</p>
        </div>
        <div className={`rounded-xl p-3 text-center border ${authSettings.twoFactorAuth ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
          <Shield className={`h-5 w-5 mx-auto mb-1 ${authSettings.twoFactorAuth ? 'text-green-500' : 'text-yellow-500'}`} />
          <p className="text-xs text-gray-700 font-medium">2FA</p>
          <p className="text-xs text-gray-600">{authSettings.twoFactorAuth ? 'Required' : 'Optional'}</p>
        </div>
        <div className={`rounded-xl p-3 text-center border ${ipWhitelistEnabled ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
          <Globe className={`h-5 w-5 mx-auto mb-1 ${ipWhitelistEnabled ? 'text-green-500' : 'text-gray-400'}`} />
          <p className="text-xs text-gray-700 font-medium">IP Whitelist</p>
          <p className="text-xs text-gray-600">{ipWhitelistEnabled ? 'Enabled' : 'Disabled'}</p>
        </div>
        <div className="bg-green-50 rounded-xl p-3 text-center border border-green-200">
          <Activity className="h-5 w-5 text-green-500 mx-auto mb-1" />
          <p className="text-xs text-green-700 font-medium">Rate Limiting</p>
          <p className="text-xs text-green-600">Active</p>
        </div>
        <div className={`rounded-xl p-3 text-center border ${monitoring.suspiciousActivityDetection ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
          <AlertTriangle className={`h-5 w-5 mx-auto mb-1 ${monitoring.suspiciousActivityDetection ? 'text-green-500' : 'text-gray-400'}`} />
          <p className="text-xs text-gray-700 font-medium">Threat Detection</p>
          <p className="text-xs text-gray-600">{monitoring.suspiciousActivityDetection ? 'Active' : 'Inactive'}</p>
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

      {/* AUTHENTICATION SETTINGS */}
      {activeSection === 'authentication' && (
        <div className="bg-white rounded-xl border shadow-sm p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Authentication & Session Settings</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="flex items-center justify-between p-4 border rounded-lg">
              <div><p className="font-medium text-sm">Two-Factor Authentication</p><p className="text-xs text-gray-500">Require OTP for login</p></div>
              <input type="checkbox" checked={authSettings.twoFactorAuth} onChange={(e) => setAuthSettings(prev => ({ ...prev, twoFactorAuth: e.target.checked }))} className="w-5 h-5" />
            </label>
            <label className="flex items-center justify-between p-4 border rounded-lg">
              <div><p className="font-medium text-sm">OTP Login</p><p className="text-xs text-gray-500">Allow passwordless OTP login</p></div>
              <input type="checkbox" checked={authSettings.otpLoginEnabled} onChange={(e) => setAuthSettings(prev => ({ ...prev, otpLoginEnabled: e.target.checked }))} className="w-5 h-5" />
            </label>
            <div>
              <label className="text-sm font-medium">Min Password Length</label>
              <input type="number" value={authSettings.passwordMinLength} onChange={(e) => setAuthSettings(prev => ({ ...prev, passwordMinLength: parseInt(e.target.value) }))} className="w-full px-3 py-2 border rounded-lg mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">Password Expiry (Days)</label>
              <input type="number" value={authSettings.passwordExpiryDays} onChange={(e) => setAuthSettings(prev => ({ ...prev, passwordExpiryDays: parseInt(e.target.value) }))} className="w-full px-3 py-2 border rounded-lg mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">Session Timeout (Minutes)</label>
              <select value={authSettings.sessionTimeout} onChange={(e) => setAuthSettings(prev => ({ ...prev, sessionTimeout: parseInt(e.target.value) }))} className="w-full px-3 py-2 border rounded-lg mt-1">
                <option value={15}>15 min</option><option value={30}>30 min</option><option value={60}>1 hour</option><option value={120}>2 hours</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Max Concurrent Sessions</label>
              <input type="number" value={authSettings.maxConcurrentSessions} onChange={(e) => setAuthSettings(prev => ({ ...prev, maxConcurrentSessions: parseInt(e.target.value) }))} className="w-full px-3 py-2 border rounded-lg mt-1" />
            </div>
            <label className="flex items-center gap-2"><input type="checkbox" checked={authSettings.passwordRequireUppercase} onChange={(e) => setAuthSettings(prev => ({ ...prev, passwordRequireUppercase: e.target.checked }))} /> Require Uppercase</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={authSettings.passwordRequireNumber} onChange={(e) => setAuthSettings(prev => ({ ...prev, passwordRequireNumber: e.target.checked }))} /> Require Number</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={authSettings.passwordRequireSpecial} onChange={(e) => setAuthSettings(prev => ({ ...prev, passwordRequireSpecial: e.target.checked }))} /> Require Special Character</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={authSettings.rememberMeEnabled} onChange={(e) => setAuthSettings(prev => ({ ...prev, rememberMeEnabled: e.target.checked }))} /> Remember Me</label>
          </div>
          <button onClick={() => handleSave('SECURITY_AUTH', authSettings)} disabled={saving} className="mt-6 px-6 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2">
            <Save className="h-4 w-4" />{saving ? 'Saving...' : 'Save Authentication Settings'}
          </button>
        </div>
      )}

      {/* ACCESS CONTROL */}
      {activeSection === 'access' && (
        <div className="bg-white rounded-xl border shadow-sm p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Access Control & IP Whitelisting</h3>
          <label className="flex items-center justify-between p-4 border rounded-lg mb-4">
            <div><p className="font-medium text-sm">IP Whitelisting</p><p className="text-xs text-gray-500">Restrict admin access to specific IPs</p></div>
            <input type="checkbox" checked={ipWhitelistEnabled} onChange={(e) => setIpWhitelistEnabled(e.target.checked)} className="w-5 h-5" />
          </label>
          {ipWhitelistEnabled && (
            <div className="space-y-3">
              <div className="flex gap-2">
                <input type="text" value={newIp} onChange={(e) => setNewIp(e.target.value)} placeholder="192.168.1.1 or CIDR range" className="flex-1 px-3 py-2 border rounded-lg" />
                <button onClick={addIpAddress} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-1"><Plus className="h-4 w-4" /> Add</button>
              </div>
              <div className="space-y-2">
                {ipWhitelist.map(ip => (
                  <div key={ip} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                    <span className="text-sm font-mono">{ip}</span>
                    <button onClick={() => removeIp(ip)} className="p-1 hover:bg-red-50 rounded"><Trash2 className="h-4 w-4 text-red-400" /></button>
                  </div>
                ))}
                {ipWhitelist.length === 0 && <p className="text-sm text-gray-400">No IPs added. All IPs will be allowed.</p>}
              </div>
            </div>
          )}
          <button onClick={() => handleSave('SECURITY_IP', { enabled: ipWhitelistEnabled, whitelist: ipWhitelist })} disabled={saving} className="mt-6 px-6 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2">
            <Save className="h-4 w-4" />{saving ? 'Saving...' : 'Save Access Settings'}
          </button>
        </div>
      )}

      {/* RATE LIMITING */}
      {activeSection === 'ratelimit' && (
        <div className="bg-white rounded-xl border shadow-sm p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Rate Limiting Configuration</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">API Requests / Minute</label>
              <input type="number" value={rateLimit.apiRateLimit} onChange={(e) => setRateLimit(prev => ({ ...prev, apiRateLimit: parseInt(e.target.value) }))} className="w-full px-3 py-2 border rounded-lg mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">API Rate Window (Seconds)</label>
              <input type="number" value={rateLimit.apiRateWindow} onChange={(e) => setRateLimit(prev => ({ ...prev, apiRateWindow: parseInt(e.target.value) }))} className="w-full px-3 py-2 border rounded-lg mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">Max Login Attempts</label>
              <input type="number" value={rateLimit.loginRateLimit} onChange={(e) => setRateLimit(prev => ({ ...prev, loginRateLimit: parseInt(e.target.value) }))} className="w-full px-3 py-2 border rounded-lg mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">Login Rate Window (Seconds)</label>
              <input type="number" value={rateLimit.loginRateWindow} onChange={(e) => setRateLimit(prev => ({ ...prev, loginRateWindow: parseInt(e.target.value) }))} className="w-full px-3 py-2 border rounded-lg mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">Max OTP Attempts</label>
              <input type="number" value={rateLimit.otpRateLimit} onChange={(e) => setRateLimit(prev => ({ ...prev, otpRateLimit: parseInt(e.target.value) }))} className="w-full px-3 py-2 border rounded-lg mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">OTP Rate Window (Seconds)</label>
              <input type="number" value={rateLimit.otpRateWindow} onChange={(e) => setRateLimit(prev => ({ ...prev, otpRateWindow: parseInt(e.target.value) }))} className="w-full px-3 py-2 border rounded-lg mt-1" />
            </div>
          </div>
          <button onClick={() => handleSave('SECURITY_RATE', rateLimit)} disabled={saving} className="mt-6 px-6 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2">
            <Save className="h-4 w-4" />{saving ? 'Saving...' : 'Save Rate Limit Settings'}
          </button>
        </div>
      )}

      {/* BRUTE FORCE PROTECTION */}
      {activeSection === 'bruteforce' && (
        <div className="bg-white rounded-xl border shadow-sm p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Brute Force Protection</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Max Login Attempts</label>
              <input type="number" value={bruteForce.maxLoginAttempts} onChange={(e) => setBruteForce(prev => ({ ...prev, maxLoginAttempts: parseInt(e.target.value) }))} className="w-full px-3 py-2 border rounded-lg mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">Lockout Duration (Minutes)</label>
              <input type="number" value={bruteForce.lockoutDuration} onChange={(e) => setBruteForce(prev => ({ ...prev, lockoutDuration: parseInt(e.target.value) }))} className="w-full px-3 py-2 border rounded-lg mt-1" />
            </div>
            <label className="flex items-center gap-2"><input type="checkbox" checked={bruteForce.progressiveLockout} onChange={(e) => setBruteForce(prev => ({ ...prev, progressiveLockout: e.target.checked }))} /> Progressive Lockout (increases with each attempt)</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={bruteForce.notifyOnLockout} onChange={(e) => setBruteForce(prev => ({ ...prev, notifyOnLockout: e.target.checked }))} /> Notify Admin on Lockout</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={bruteForce.autoUnlock} onChange={(e) => setBruteForce(prev => ({ ...prev, autoUnlock: e.target.checked }))} /> Auto Unlock After Duration</label>
          </div>
          <button onClick={() => handleSave('SECURITY_BRUTE', bruteForce)} disabled={saving} className="mt-6 px-6 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2">
            <Save className="h-4 w-4" />{saving ? 'Saving...' : 'Save Protection Settings'}
          </button>
        </div>
      )}

      {/* API SECURITY */}
      {activeSection === 'apisecurity' && (
        <div className="bg-white rounded-xl border shadow-sm p-6">
          <h3 className="font-semibold text-gray-900 mb-4">API Security Configuration</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">JWT Expiry (Minutes)</label>
              <input type="number" value={apiSecurity.jwtExpiry} onChange={(e) => setApiSecurity(prev => ({ ...prev, jwtExpiry: parseInt(e.target.value) }))} className="w-full px-3 py-2 border rounded-lg mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">Refresh Token Expiry (Days)</label>
              <input type="number" value={apiSecurity.refreshTokenExpiry} onChange={(e) => setApiSecurity(prev => ({ ...prev, refreshTokenExpiry: parseInt(e.target.value) }))} className="w-full px-3 py-2 border rounded-lg mt-1" />
            </div>
            <label className="flex items-center gap-2"><input type="checkbox" checked={apiSecurity.requireHttps} onChange={(e) => setApiSecurity(prev => ({ ...prev, requireHttps: e.target.checked }))} /> Require HTTPS</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={apiSecurity.corsEnabled} onChange={(e) => setApiSecurity(prev => ({ ...prev, corsEnabled: e.target.checked }))} /> Enable CORS</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={apiSecurity.apiKeyAuth} onChange={(e) => setApiSecurity(prev => ({ ...prev, apiKeyAuth: e.target.checked }))} /> API Key Authentication</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={apiSecurity.requestSigning} onChange={(e) => setApiSecurity(prev => ({ ...prev, requestSigning: e.target.checked }))} /> Request Signing</label>
          </div>
          <button onClick={() => handleSave('SECURITY_API', apiSecurity)} disabled={saving} className="mt-6 px-6 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2">
            <Save className="h-4 w-4" />{saving ? 'Saving...' : 'Save API Settings'}
          </button>
        </div>
      )}

      {/* MONITORING */}
      {activeSection === 'monitoring' && (
        <div className="bg-white rounded-xl border shadow-sm p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Security Monitoring & Alerts</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="flex items-center gap-2"><input type="checkbox" checked={monitoring.auditLogEnabled} onChange={(e) => setMonitoring(prev => ({ ...prev, auditLogEnabled: e.target.checked }))} /> Enable Audit Logging</label>
            <div>
              <label className="text-sm font-medium">Audit Log Retention (Days)</label>
              <input type="number" value={monitoring.auditLogRetention} onChange={(e) => setMonitoring(prev => ({ ...prev, auditLogRetention: parseInt(e.target.value) }))} className="w-full px-3 py-2 border rounded-lg mt-1" />
            </div>
            <label className="flex items-center gap-2"><input type="checkbox" checked={monitoring.suspiciousActivityDetection} onChange={(e) => setMonitoring(prev => ({ ...prev, suspiciousActivityDetection: e.target.checked }))} /> Suspicious Activity Detection</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={monitoring.anomalyDetection} onChange={(e) => setMonitoring(prev => ({ ...prev, anomalyDetection: e.target.checked }))} /> Anomaly Detection</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={monitoring.realTimeAlerts} onChange={(e) => setMonitoring(prev => ({ ...prev, realTimeAlerts: e.target.checked }))} /> Real-Time Alerts</label>
            <div>
              <label className="text-sm font-medium">Alert Email</label>
              <input type="email" value={monitoring.alertEmail} onChange={(e) => setMonitoring(prev => ({ ...prev, alertEmail: e.target.value }))} className="w-full px-3 py-2 border rounded-lg mt-1" placeholder="security@procure.com" />
            </div>
          </div>
          <button onClick={() => handleSave('SECURITY_MONITOR', monitoring)} disabled={saving} className="mt-6 px-6 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2">
            <Save className="h-4 w-4" />{saving ? 'Saving...' : 'Save Monitoring Settings'}
          </button>
        </div>
      )}
    </div>
  );
}