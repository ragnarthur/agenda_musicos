import React, { useState } from 'react';
import {
  Search,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Mail,
  Calendar,
  Music,
} from 'lucide-react';

interface RequestStatus {
  id: number;
  artist_name: string;
  artist_email: string;
  artist_phone: string;
  event_type: string;
  event_date: string;
  event_time: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  created_at: string;
  updated_at: string;
  notes?: string;
  rejection_reason?: string;
  estimated_budget?: number;
}

const StatusPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [requestId, setRequestId] = useState('');
  const [searchType, setSearchType] = useState<'email' | 'id'>('email');
  const [loading, setLoading] = useState(false);
  const [requestStatus, setRequestStatus] = useState<RequestStatus | null>(null);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setRequestStatus(null);

    try {
      let url = 'http://localhost:8000/api/public/request-status/';

      if (searchType === 'email') {
        url += `?email=${encodeURIComponent(email)}`;
      } else {
        url += `?request_id=${encodeURIComponent(requestId)}`;
      }

      const response = await fetch(url);
      const data = await response.json();

      if (response.ok) {
        if (Array.isArray(data) && data.length > 0) {
          // If searching by email, return the most recent request
          setRequestStatus(data[0]);
        } else if (!Array.isArray(data)) {
          // If searching by ID, return the single request
          setRequestStatus(data);
        } else {
          setError('No requests found');
        }
      } else {
        setError(data.error || 'Failed to fetch request status');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
      setSearched(true);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-8 h-8 text-yellow-500" />;
      case 'approved':
        return <CheckCircle className="w-8 h-8 text-green-500" />;
      case 'rejected':
        return <XCircle className="w-8 h-8 text-red-500" />;
      case 'cancelled':
        return <AlertCircle className="w-8 h-8 text-gray-500" />;
      default:
        return <AlertCircle className="w-8 h-8 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      approved: 'bg-green-100 text-green-800 border-green-200',
      rejected: 'bg-red-100 text-red-800 border-red-200',
      cancelled: 'bg-gray-100 text-gray-800 border-gray-200',
    };

    return (
      <span
        className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium border ${variants[status as keyof typeof variants] || 'bg-gray-100 text-gray-800'}`}
      >
        {getStatusIcon(status)}
        <span className="ml-2">{status.charAt(0).toUpperCase() + status.slice(1)}</span>
      </span>
    );
  };

  const getStatusMessage = (status: string) => {
    switch (status) {
      case 'pending':
        return "Your request is being reviewed by our team. We'll get back to you soon!";
      case 'approved':
        return 'Congratulations! Your request has been approved. Check your email for next steps.';
      case 'rejected':
        return 'Unfortunately, your request could not be approved at this time.';
      case 'cancelled':
        return 'This request has been cancelled.';
      default:
        return 'Status unknown.';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-[100svh] bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900">Request Status Check</h1>
            <p className="mt-2 text-gray-600">Check the status of your booking request</p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Search Form */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <form onSubmit={handleSearch} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                How would you like to search?
              </label>
              <div className="flex flex-col gap-2 sm:flex-row sm:gap-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="searchType"
                    value="email"
                    checked={searchType === 'email'}
                    onChange={e => setSearchType(e.target.value as 'email' | 'id')}
                    className="mr-2"
                  />
                  Search by Email
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="searchType"
                    value="id"
                    checked={searchType === 'id'}
                    onChange={e => setSearchType(e.target.value as 'email' | 'id')}
                    className="mr-2"
                  />
                  Search by Request ID
                </label>
              </div>
            </div>

            {searchType === 'email' ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="Enter your email address"
                    className="min-h-[44px] w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Request ID</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    value={requestId}
                    onChange={e => setRequestId(e.target.value)}
                    placeholder="Enter your request ID"
                    className="min-h-[44px] w-full pl-10 pr-3 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="min-h-[44px] w-full bg-blue-600 text-white py-2.5 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Searching...' : 'Check Status'}
            </button>
          </form>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-8">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
              <p className="text-red-800">{error}</p>
            </div>
          </div>
        )}

        {/* Request Status Result */}
        {requestStatus && (
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            {/* Status Header */}
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 px-6 py-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">Request Details</h2>
                {getStatusBadge(requestStatus.status)}
              </div>
            </div>

            {/* Status Message */}
            <div className="px-6 py-4 bg-gray-50 border-b">
              <p className="text-gray-700">{getStatusMessage(requestStatus.status)}</p>
            </div>

            {/* Request Information */}
            <div className="px-6 py-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Artist Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <Music className="h-5 w-5 mr-2" />
                    Artist Information
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Name</label>
                      <p className="text-gray-900">{requestStatus.artist_name}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Email</label>
                      <p className="text-gray-900">{requestStatus.artist_email}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Phone</label>
                      <p className="text-gray-900">{requestStatus.artist_phone}</p>
                    </div>
                  </div>
                </div>

                {/* Event Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <Calendar className="h-5 w-5 mr-2" />
                    Event Information
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Event Type</label>
                      <p className="text-gray-900">{requestStatus.event_type}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Date</label>
                      <p className="text-gray-900">{requestStatus.event_date}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">Time</label>
                      <p className="text-gray-900">{requestStatus.event_time}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Additional Information */}
              <div className="mt-6 pt-6 border-t space-y-4">
                {requestStatus.notes && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Notes</label>
                    <p className="text-gray-900 bg-gray-50 p-3 rounded-md">{requestStatus.notes}</p>
                  </div>
                )}

                {requestStatus.rejection_reason && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500">
                      Reason for Rejection
                    </label>
                    <p className="text-red-800 bg-red-50 p-3 rounded-md border border-red-200">
                      {requestStatus.rejection_reason}
                    </p>
                  </div>
                )}

                {requestStatus.estimated_budget && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500">
                      Estimated Budget
                    </label>
                    <p className="text-gray-900">${requestStatus.estimated_budget.toFixed(2)}</p>
                  </div>
                )}
              </div>

              {/* Timestamps */}
              <div className="mt-6 pt-6 border-t grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-500">
                <div>
                  <label className="block font-medium">Submitted</label>
                  <p>{formatDate(requestStatus.created_at)}</p>
                </div>
                <div>
                  <label className="block font-medium">Last Updated</label>
                  <p>{formatDate(requestStatus.updated_at)}</p>
                </div>
              </div>
            </div>

            {/* Request ID */}
            <div className="px-6 py-4 bg-gray-50 border-t">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Request ID</span>
                <span className="font-mono text-sm bg-gray-200 px-2 py-1 rounded">
                  #{requestStatus.id}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* No Results */}
        {searched && !error && !requestStatus && (
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No requests found</h3>
            <p className="text-gray-600">
              We couldn't find any requests matching your search criteria. Please double-check your
              information and try again.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StatusPage;
