import React, { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom';
import TabsNavigation from '../../TabsNavigation';
import CategoryTab from './cateoryTab/categoryTab';
import TagsTab from './tagTab/tagsTag';
const Configuration = () => {
    const { setTitle } = useOutletContext();

    useEffect(() => {
        setTitle("Configuration");
    }, [setTitle]);

    const [activeTab, setActiveTab]= useState('category');
     const tabs = [
       { id: 'category', label: 'Categories', icon: '' },
       { id: 'tag', label: 'Tags', icon: '' },
    ];

    return (
        <div className='bg-white rounded-xl p-6'>
            {/* TABS */}
            <TabsNavigation activeTab={activeTab} setActiveTab={setActiveTab} tabs={tabs}/>
            <div>
                {activeTab === 'category' && <CategoryTab />}
                {activeTab === 'tag' && <TagsTab />}
            </div>
        </div>
    )
}

export default Configuration