import React from 'react'
import Objectif from './objectif'
import Actu from './Actu'
import Footer from './Footer'
import HomeLanding from './HomeLanding'
import PartnersStrip from './PartnersStrip'
import Slide from './Slider'
import ContactPage from './Contact'
const Accueil = () => {
  
  return(
      <div className=''>
        <Slide/>
        <HomeLanding/>
          <Actu />
          <Objectif />
          <PartnersStrip/>
          <ContactPage/>
          <Footer/>
      </div>
  )
 
}

export default Accueil