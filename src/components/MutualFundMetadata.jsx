import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'

const MutualFundMetadata = () => {
  const { id } = useParams()
  const [fundData, setFundData] = useState(null)

  useEffect(() => {
    // Fetching fund data based on the ID from the URL
    const fetchData = async () => {
      try {
        const response = await fetch(`/api/mutualfunds/${id}`)
        const result = await response.json()
        setFundData(result)
      } catch (error) {
        console.error('Error fetching fund data:', error)
      }
    }

    fetchData()
  }, [id])

  if (!fundData) {
    return <div>Loading...</div>
  }

  return (
    <div>
      <h1>{fundData.name}</h1>
      <p>Category: {fundData.category}</p>
      <p>Expense Ratio: {fundData.expenseRatio}%</p>
      <Link to={`/invest/${id}`}>Invest Now</Link>
    </div>
  )
}

export default MutualFundMetadata
