import React, { useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { increment, decrement, incrementByAmount, resetCounter } from '../store/slices/Slice'

const Counter = () => {
  const count = useSelector((state) => state.lybrary.counter.value)
  console.log(count);
  
  const dispatch = useDispatch()
  const [incrementAmount, setIncrementAmount] = useState(2)

  return (
    <div style={{ 
      padding: '20px', 
      textAlign: 'center',
      fontFamily: 'Arial, sans-serif'
    }}>
      <h2>Compteur Redux</h2>
      
      <div style={{ 
        fontSize: '3rem', 
        margin: '20px 0',
        color: '#333'
      }}>
        {count}
      </div>
      
      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={() => dispatch(increment())}
          style={{
            margin: '0 10px',
            padding: '10px 20px',
            fontSize: '1.2rem',
            backgroundColor: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          +1
        </button>
        
        <button 
          onClick={() => dispatch(decrement())}
          style={{
            margin: '0 10px',
            padding: '10px 20px',
            fontSize: '1.2rem',
            backgroundColor: '#f44336',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          -1
        </button>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <input
          type="number"
          value={incrementAmount}
          onChange={(e) => setIncrementAmount(e.target.value)}
          style={{
            padding: '8px',
            fontSize: '1rem',
            width: '80px',
            textAlign: 'center',
            marginRight: '10px'
          }}
        />
        <button
          onClick={() => dispatch(incrementByAmount(Number(incrementAmount)))}
          style={{
            padding: '8px 16px',
            backgroundColor: '#008CBA',
            color: 'white',
            border: 'none',
            borderRadius: '3px',
            cursor: 'pointer'
          }}
        >
          Ajouter
        </button>
      </div>

      <button
        onClick={() => dispatch(resetCounter())}
        style={{
          padding: '10px 20px',
          backgroundColor: '#ff9800',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer'
        }}
      >
        Reset
      </button>
    </div>
  )
}

export default Counter