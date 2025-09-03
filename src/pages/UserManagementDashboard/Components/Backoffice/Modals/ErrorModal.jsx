import React from 'react'
import { FaTimes } from 'react-icons/fa';
import { FaTriangleExclamation} from 'react-icons/fa6';

const ErrorModal = ({ isOpen, onClose, message }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-30  flex items-center justify-center overflow-y-auto pt-6  p-4">
            <div className="w-1/3 bg-red-100 rounded-xl shadow-sm p-6 mt-6 ">
                <div className="flex justify-end items-center mb-6">                   
                    <button className="text-gray-500 hover:text-gray-700" onClick={onClose}>
                       <FaTimes className='text-red-900'/>
                    </button>
                </div>
                <div className='flex flex-col items-center justify-center'>
                    <FaTriangleExclamation className='text-red-500 text-4xl mb-6'/>
                    <p className='text-red-900'>{message}</p>
                </div>
                
            </div>
        </div>
    )
}

export default ErrorModal