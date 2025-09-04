import React, { useEffect, useState } from 'react';
import { Link, Outlet } from 'react-router-dom';
import {
  FaFolderOpen, FaTachometerAlt, FaImages, FaStar, FaFilePdf,
  FaCamera, FaCalendar, FaCog, FaBars, FaBell, FaUser
} from 'react-icons/fa';
import { FaPhotoFilm, FaUsersGear } from 'react-icons/fa6';

const DashboardLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [title, setTitle] = useState("");
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem('activeTab') || "Tableau de bord");

  const toggleSidebar = () => setIsSidebarOpen(v => !v);

  useEffect(() => {
    localStorage.setItem('activeTab', activeTab);
  }, [activeTab]);

  const menuSections = [
    {
      title: null,
      items: [
        { name: "Tableau de bord", icon: <FaTachometerAlt className="text-blue-500 mr-3" />, link: "/backoffice" },
      ],
    },
    {
      title: "Gestion des médias",
      items: [
        // Éviter "#": utiliser des boutons sans navigation tant que c'est WIP
        { name: "Tous les médias",  icon: <FaImages className="text-indigo-500 mr-3" />, onClick: () => {} },
        { name: "Favoris",          icon: <FaStar className="text-yellow-500 mr-3" />, onClick: () => {} },
        { name: "Documents",        icon: <FaFilePdf className="text-red-500 mr-3" />, onClick: () => {} },
        { name: "Images/Vidéos",    icon: <FaPhotoFilm className="text-green-500 mr-3" />, onClick: () => {} },
      ],
    },
    {
      title: "Albums & Photos",
      items: [
        { name: "Tous les albums",  icon: <FaImages className="text-purple-500 mr-3" />, link: "/albumphoto" },
        { name: "Photos récentes",  icon: <FaCamera className="text-pink-500 mr-3" />, onClick: () => {} },
        { name: "Par date",         icon: <FaCalendar className="text-orange-500 mr-3" />, onClick: () => {} },
      ],
    },
    {
      title: "Paramètres",
      items: [
        { name: "Configuration", icon: <FaCog className="text-gray-500 mr-3" />, link :"/configuration" },
        { name: "Utilisateurs",  icon: <FaUsersGear className="text-gray-500 mr-3" />, onClick: () => {} },
      ],
    },
  ];

  const baseItemClass = (isActive) =>
    `flex items-center sidebar-item rounded-lg p-3 mb-1 cursor-pointer transition-colors ${
      isActive ? "bg-[#eff6ff] border-l-2 border-blue-500 font-semibold" : "hover:bg-gray-100"
    }`;

  return (
    <div className="flex h-screen w-full overflow-hidden bg-bgDefault">
      {/* Sidebar */}
      <div
        id='sidebar'
        className={`sidebar w-64 bg-white flex-shrink-0 overflow-y-auto transition-transform duration-300 ease-in-out ${
          isSidebarOpen ? 'ml-0' : '-ml-64'
        }`}
      >
        <div className="p-5 border-b border-gray-200">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center mr-3">
              <FaFolderOpen className="text-white" />
            </div>
            <h2 className="text-xl font-bold text-gray-800">Media Manager</h2>
          </div>
          <p className="text-xs text-gray-500 mt-1">Back Office Admin</p>
        </div>

        <div className="p-3">
          {menuSections.map((section, idx) => (
            <div key={idx}>
              {section.title && (
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mt-6 mb-2 px-3">
                  {section.title}
                </h3>
              )}

              {section.items.map((item) => {
                const isActive = activeTab === item.name;

                if (item.link) {
                  return (
                    <Link
                      key={item.name}
                      to={item.link}
                      onClick={() => setActiveTab(item.name)}
                      className={baseItemClass(isActive)}
                    >
                      {item.icon}
                      <span className="font-medium">{item.name}</span>
                    </Link>
                  );
                }

                return (
                  <button
                    key={item.name}
                    type="button"
                    onClick={() => setActiveTab(item.name)}
                    className={baseItemClass(isActive)}
                  >
                    {item.icon}
                    <span className="font-medium">{item.name}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-gray-200 bg-gray-50 mt-auto">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Stockage utilisé</span>
            <span className="text-sm font-medium">42%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div className="bg-indigo-600 h-1.5 rounded-full" style={{ width: "42%" }} />
          </div>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="flex-1 flex flex-col">
        <div className="bg-white shadow-sm p-4 flex justify-between items-center">
          <div className="flex items-center">
            <button onClick={toggleSidebar} className="mr-4 text-gray-600 hover:text-gray-900">
              <FaBars />
            </button>
            <h1 className="text-xl font-bold text-gray-800">{title}</h1>
          </div>

          <div className="flex items-center space-x-4">
            <div className="relative">
              <button className="text-gray-600 hover:text-gray-900">
                <FaBell />
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">2</span>
              </button>
            </div>
            <div className="relative">
              <button className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-700 hover:bg-gray-300">
                <FaUser />
              </button>
            </div>
          </div>
        </div>

        <div className='bg-bgDefault p-6 overflow-y-auto'>
          <Outlet context={{ setTitle }} />
        </div>
      </div>
    </div>
  );
};

export default DashboardLayout;
