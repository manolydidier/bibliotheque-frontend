import React from 'react';
import { useParams, Link } from 'react-router-dom';
import mediaData from '../Data';
import MediaCard from '../MediaCard';
import { FaArrowLeft } from 'react-icons/fa';

const AlbumDetailPage = () => {
    const { albumName } = useParams();
    const decodedAlbumName = decodeURIComponent(albumName);

    const albumMedia = mediaData.filter(
        media => (media.category || 'Sans catégorie') === decodedAlbumName && (media.type === 'image' || media.type === 'video')
    );

    return (
        <div>
            {/* <div className="flex items-center mb-6">
                <Link to="/backoffice" className="text-gray-500 hover:text-blue-600 transition-colors flex items-center font-medium">
                    <FaArrowLeft className="mr-2" />
                    Retour
                </Link>
            </div> */}
            <h1 className="text-3xl font-bold text-gray-800 mb-6">
                Album: <span className="text-blue-600">{decodedAlbumName}</span>
            </h1>

            {albumMedia.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-6">
                    {albumMedia.map(media => <MediaCard key={media.id} media={media} />)}
                </div>
            ) : (
                <p className="text-gray-500 mt-4">Cet album ne contient aucun média.</p>
            )}
        </div>
    );
};

export default AlbumDetailPage;