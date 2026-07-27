'use client';

import Link from 'next/link';
import { Ticket, Percent, Megaphone, ArrowRight } from 'lucide-react';

export default function AdminMarketingPage() {
  const cards = [
    { title: 'Coupons', desc: 'Manage platform-wide coupons and discounts', icon: Ticket, href: '/admin/marketing/coupons', color: 'bg-blue-50 text-blue-600' },
    { title: 'Offers', desc: 'Oversee all supplier offers and deals', icon: Percent, href: '/admin/marketing/offers', color: 'bg-green-50 text-green-600' },
    { title: 'Campaigns', desc: 'Monitor email & SMS campaigns', icon: Megaphone, href: '/admin/marketing/campaigns', color: 'bg-purple-50 text-purple-600' },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Marketing Management</h1>
      <p className="text-gray-500 mb-8">Oversee platform-wide marketing activities and campaigns</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {cards.map(card => (
          <Link key={card.title} href={card.href} className="bg-white rounded-xl border p-6 hover:shadow-lg transition group">
            <div className={`w-12 h-12 rounded-xl ${card.color} flex items-center justify-center mb-4 group-hover:scale-110 transition`}>
              <card.icon className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">{card.title}</h3>
            <p className="text-sm text-gray-500 mb-3">{card.desc}</p>
            <span className="text-blue-600 group-hover:translate-x-1 transition flex items-center gap-1 text-sm">
              Manage <ArrowRight className="h-4 w-4" />
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}