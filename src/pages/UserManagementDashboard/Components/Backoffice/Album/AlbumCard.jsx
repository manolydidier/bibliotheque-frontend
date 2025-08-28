import React from 'react';
import { FaImages } from 'react-icons/fa';
import { Link } from 'react-router-dom';

const AlbumCard = ({ album }) => {
    return (
        <Link to={`/backoffice/album/${encodeURIComponent(album.id)}`} className="block">
            <div className="relative group bg-white rounded-xl shadow-sm overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1 cursor-pointer">
                <img src={album.thumbnail} alt={album.title} className="w-full h-48 object-cover" />

                {/* Overlay */}
                <div className="absolute inset-0 bg-black bg-opacity-10 group-hover:bg-opacity-40 transition-all duration-300 flex flex-col justify-end p-4 text-white">
                    <h3 className="font-bold text-lg truncate drop-shadow-md">{album.title}</h3>
                    <p className="text-sm flex items-center drop-shadow-sm">
                        <FaImages className="mr-2" />
                        {album.count} {album.count > 1 ? 'éléments' : 'élément'}
                    </p>
                </div>
            </div>
        </Link>
    );
};

export default AlbumCard;