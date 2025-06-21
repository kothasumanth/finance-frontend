import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { fetchMutualFundMetadata } from '../api/api'

const MutualFundEntries = () => {
  const { id } = useParams()
  const [mutualFund, setMutualFund] = useState(null)

  useEffect(() => {
    const getMutualFundMetadata = async () => {
      const data = await fetchMutualFundMetadata(id)
      setMutualFund(data)
    }

    getMutualFundMetadata()
  }, [id])

  if (!mutualFund) {
    return <div>Loading...</div>
  }

  return (
    <div>
      <h1>{mutualFund.name}</h1>
      <p>{mutualFund.description}</p>
      <Link to={`/invest/${id}`}>Invest Now</Link>
    </div>
  )
}

export default MutualFundEntries
