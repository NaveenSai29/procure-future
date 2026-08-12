'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Ticket, Percent, ArrowRight,
  BarChart3
} from 'lucide-react';

export default function MarketingHubPage() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const res = await fetch('/api/supplier/marketing/analytics');
      const data = await res.json();
      setAnalytics(data);
    } catch (error) {
      console.error('Fetch analytics error:', error);
    } finally {
      setLoading(false);
    }
  };

  const marketingCards = [
    {
      title: 'Coupons',
      description: 'Create discount codes for your customers',
      icon: Ticket,
      href: '/dashboard/supplier/marketing/coupons',
      color: 'bg-blue-50 text-blue-600',
      stats: analytics ? `${analytics.activeCoupons || 0} active` : null
    },
    {
      title: 'Offers & Deals',
      description: 'Flash sales, seasonal offers, bundle deals',
      icon: Percent,
      href: '/dashboard/supplier/marketing/offers',
      color: 'bg-green-50 text-green-600',
      stats: analytics ? `${analytics.activeOffers || 0} active` : null
    },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Marketing Hub</h1>
        <p className="text-gray-500 mt-1">Grow your business with coupons, offers, and campaigns</p>
      </div>

      {/* Quick Stats */}
      {analytics && (
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-white p-4 rounded-xl border">
            <p className="text-sm text-gray-500">Active Coupons</p>
            <p className="text-2xl font-bold text-blue-600">{analytics.activeCoupons || 0}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border">
            <p className="text-sm text-gray-500">Active Offers</p>
            <p className="text-2xl font-bold text-green-600">{analytics.activeOffers || 0}</p>
          </div>
        </div>
      )}

      {/* Marketing Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {marketingCards.map(card => (
          <Link
            key={card.title}
            href={card.href}
            className="bg-white rounded-xl border p-6 hover:shadow-lg transition group cursor-pointer"
          >
            <div className={`w-12 h-12 rounded-xl ${card.color} flex items-center justify-center mb-4 group-hover:scale-110 transition`}>
              <card.icon className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">{card.title}</h3>
            <p className="text-sm text-gray-500 mb-3">{card.description}</p>
            <div className="flex items-center justify-between">
              {card.stats && (
                <span className="text-xs text-gray-400">{card.stats}</span>
              )}
              <span className="text-blue-600 group-hover:translate-x-1 transition flex items-center gap-1 text-sm">
                Manage <ArrowRight className="h-4 w-4" />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}