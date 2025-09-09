import React from 'react';
export default function Tabs({ activeTab, setActiveTab }) {
  const tabs = ['Visualisation', 'Métadonnées', 'Versions', 'Statistiques'];
  return (
    <div className="flex border-b border-gray-200 mb-6 overflow-x-auto">
      {tabs.map(tab => (
        <button key={tab}
          onClick={() => setActiveTab(tab)}
          className={`px-4 py-2 font-medium whitespace-nowrap ${activeTab === tab ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-600'}`}>
          {tab}
        </button>
      ))}
    </div>
  );
}
