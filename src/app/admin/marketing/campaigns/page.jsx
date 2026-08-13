export const dynamic = 'force-dynamic';

export default function AdminCampaignsPage() {
  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">All Campaigns</h1>
      <div className="text-center py-12 text-gray-400">
        <p>No campaigns found</p>
      </div>
    </div>
  );
}