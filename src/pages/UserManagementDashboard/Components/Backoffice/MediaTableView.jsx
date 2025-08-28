import React from 'react';
import MediaTableRow from './MediaTableRow';

const MediaTableView = ({ mediaArray }) => {
    const headers = ["Nom", "Type", "Catégorie", "Taille", "Date d'ajout", "Actions"];

    return (
        <div className="bg-white rounded-xl shadow-sm overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        {headers.map((header, index) => (
                            <th 
                                key={header} 
                                scope="col" 
                                className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${index === headers.length - 1 ? 'text-right' : ''}`}
                            >
                                {header}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {mediaArray.map(media => (
                        <MediaTableRow key={media.id} media={media} />
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default MediaTableView;