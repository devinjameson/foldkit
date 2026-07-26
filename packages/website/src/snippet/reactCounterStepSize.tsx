import { useEffect, useEffectEvent, useRef, useState } from 'react'

const TICK_INTERVAL_MS = 1000

function Counter() {
  const intervalRef = useRef<number>()

  const [count, setCount] = useState(0)
  const [isAutoCounting, setIsPlaying] = useState(false)
  const [step, setStep] = useState(1)

  const handleClickIncrement = () => {
    setCount(count => count + step)
  }

  const handleClickAutoCount = () => {
    setIsPlaying(isAutoCounting => !isAutoCounting)
  }

  const onTick = useEffectEvent(() => {
    setCount(count => count + step)
  })

  useEffect(() => {
    if (isAutoCounting) {
      intervalRef.current = setInterval(() => onTick(), TICK_INTERVAL_MS)
    }

    return () => clearInterval(intervalRef.current)
  }, [isAutoCounting])

  return (
    <div>
      <p>Count: {count}</p>
      <label>
        Step:
        <input
          type="number"
          value={step}
          onChange={e => setStep(Number(e.target.value))}
        />
      </label>
      <button onClick={handleClickIncrement}>Increment</button>
      <button onClick={handleClickAutoCount}>
        {isAutoCounting ? 'Stop' : 'Auto-Count'}
      </button>
    </div>
  )
}
