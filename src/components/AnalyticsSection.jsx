import React, { useState, useEffect } from 'react';
import { BarChart3, Info } from 'lucide-react';
import { analyticsApi } from '../services/api';

const AnalyticsSection = ({ isAuthenticated }) => {
  const [analytics, setAnalytics] = useState(null);

  const loadAnalytics = async () => {
    try {
      const data = await analyticsApi.get();
      setAnalytics(data);
    } catch (error) {
      console.error('Error loading analytics:', error);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadAnalytics();
    }
  }, [isAuthenticated]);

  return (
    <div className="max-w-6xl mx-auto">
      <h2 className="text-2xl font-semibold mb-6 text-center">Analytics</h2>
      
      {analytics ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-blue-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-blue-900">Total Documents</h3>
              <p className="text-3xl font-bold text-blue-600">{analytics.summary.totalDocuments}</p>
            </div>
            
            <div className="bg-green-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-green-900">Total Downloads</h3>
              <p className="text-3xl font-bold text-green-600">{analytics.summary.totalDownloads}</p>
            </div>
            
            <div className="bg-purple-50 p-6 rounded-lg">
              <h3 className="text-lg font-semibold text-purple-900">Total Versions</h3>
              <p className="text-3xl font-bold text-purple-600">{analytics.summary.totalVersions}</p>
            </div>
            
            <div className="bg-orange-50 p-6 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-lg font-semibold text-orange-900">Average Versions</h3>
                <div className="relative group">
                  <Info size={16} className="text-orange-600 cursor-help" />
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block bg-gray-900 text-white text-sm rounded py-2 px-3 w-48 text-center z-10">
                    Average number of<br />versions per document
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                  </div>
                </div>
              </div>
              <p className="text-3xl font-bold text-orange-600">{analytics.summary.averageVersionsPerDoc}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="rounded-lg p-6" style={{ backgroundColor: '#fbf7f1' }}>
              <h3 className="text-lg font-semibold mb-4">Most downloaded documents</h3>
              <div className="space-y-3">
                {analytics.topDocuments.length > 0 ? analytics.topDocuments.map((doc, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-white rounded">
                    <div>
                      <span className="font-medium">{doc.name}</span>
                      <p className="text-sm text-gray-600">v{doc.currentVersion} • {new Date(doc.created).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-bold text-green-600">{doc.downloads}</span>
                      <p className="text-sm text-gray-600">downloads</p>
                    </div>
                  </div>
                )) : (
                  <p className="text-gray-600 text-center py-4">No documents uploaded yet</p>
                )}
              </div>
            </div>

            <div className="rounded-lg p-6" style={{ backgroundColor: '#fbf7f1' }}>
              <h3 className="text-lg font-semibold mb-4">Version history</h3>
              <div className="space-y-3">
                {analytics.documentVersions.length > 0 ? analytics.documentVersions.map((doc, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-white rounded">
                    <div>
                      <span className="font-medium">{doc.name}</span>
                      <p className="text-sm text-gray-600">
                        Current: v{doc.currentVersion} • 
                        {doc.lastVersionDate && ` Last update: ${new Date(doc.lastVersionDate).toLocaleDateString()}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-bold text-blue-600">{doc.totalVersions}</span>
                      <p className="text-sm text-gray-600">versions</p>
                    </div>
                  </div>
                )) : (
                  <p className="text-gray-600 text-center py-4">No versions available</p>
                )}
              </div>
            </div>
          </div>

          {analytics.monthlyStats.length > 0 && (
            <div className="mt-8 rounded-lg p-6" style={{ backgroundColor: '#fbf7f1' }}>
              <h3 className="text-lg font-semibold mb-4">Monthly statistics</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {analytics.monthlyStats.map((stat, index) => (
                  <div key={index} className="bg-white p-4 rounded text-center">
                    <p className="text-sm font-medium text-gray-600">{stat.month}</p>
                    <p className="text-lg font-bold text-blue-600">{stat.documents}</p>
                    <p className="text-xs text-gray-500">documents</p>
                    <p className="text-sm font-semibold text-green-600">{stat.downloads || 0}</p>
                    <p className="text-xs text-gray-500">download</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-8">
          <BarChart3 size={48} className="mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600">No analytics available yet</p>
          <p className="text-sm text-gray-500 mt-2">Upload some documents to see analytics data</p>
        </div>
      )}
    </div>
  );
};

export default AnalyticsSection;