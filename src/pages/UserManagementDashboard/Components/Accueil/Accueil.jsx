import React from 'react'
import Objectif from './objectif'
import Actu from './Actu'
import Footer from './Footer'
import HomeLanding from './HomeLanding'
import PartnersStrip from './PartnersStrip'
import Slide from './Slider'
const Accueil = () => {
  
  return(
      <div className=''>
        <Slide/>
        <HomeLanding/>
          <Actu />
          <Objectif />
          <PartnersStrip/>

          <Footer/>
      </div>
  )
 
}

export default Accueil