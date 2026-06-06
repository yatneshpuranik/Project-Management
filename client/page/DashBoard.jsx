
import { useNavigate } from 'react-router-dom'
import './Home.css'

const Home = () => {
  const navigate = useNavigate()

  const Handler = () => {
    navigate('/login')
  }

  return (
    <div className="home-page">
      <div className="home-card">
        <h1>Welcome back!</h1>
        <p>Sign in to continue and view your profile</p>
        <button className="home-button" onClick={Handler}>
          Login
        </button>
      </div>
    </div>
  )
}

export default Home
