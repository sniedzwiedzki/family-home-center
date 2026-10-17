import Backdrop from './Backdrop'
import './App.css'

function App() {
  return (
    <div className="starter">
      <Backdrop />
      <main>
        <svg className="framework-mark react-mark" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.1" aria-hidden="true">
          <circle cx="12" cy="12" r="1.9" fill="currentColor" stroke="none" />
          <ellipse cx="12" cy="12" rx="10.2" ry="3.9" />
          <ellipse cx="12" cy="12" rx="10.2" ry="3.9" transform="rotate(60 12 12)" />
          <ellipse cx="12" cy="12" rx="10.2" ry="3.9" transform="rotate(120 12 12)" />
        </svg>
        <p className="status">
          <span className="status-dot" aria-hidden="true" />
          Running
        </p>
        <h1>Your React app is ready.</h1>
        <p className="lede">
          Describe what you want in the AI Coding Agent tab, and this page turns into it.
        </p>
        <p className="aside">
          Prefer to write the code yourself? Start in <code>src/App.tsx</code>.
        </p>
      </main>
      <ul className="stack" aria-label="What this workspace runs">
        <li>React</li>
        <li>TypeScript</li>
        <li>Vite</li>
        <li>Hot reload</li>
        <li>Port 3000</li>
      </ul>
    </div>
  )
}

export default App
