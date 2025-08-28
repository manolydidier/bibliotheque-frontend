import React from 'react';
import FilePreview from './FilePreview/FilePreview';

export default function FullscreenModal({ file, onClose, activeTab }) {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center">
            <div className="relative w-full h-full flex items-center justify-center">
                <div className="max-w-4xl w-full p-8">
                    <FilePreview file={file} activeTab={activeTab} />
                </div>
                <button 
                    onClick={onClose}
                    className="absolute top-4 right-4 text-white text-2xl hover:text-gray-300"
                >
                    <i className="fas fa-times"></i>
                </button>
            </div>
        </div>
    );
}