import { useNavigate } from 'react-router-dom'
import { IconLeaf } from '../components/icons'
import { useLanguage } from '../context/LanguageContext'

export default function Welcome() {
  const navigate = useNavigate()
  const { t } = useLanguage()

  return (
    <div className="screen">
      <div className="welcome">
        <div className="welcome__mark">
          <IconLeaf />
        </div>
        <h1>{t('welcome.title')}</h1>
        <p>{t('welcome.body')}</p>
        <div className="welcome__actions">
          <button className="btn btn-primary" onClick={() => navigate('/consent')}>
            {t('welcome.start')}
          </button>
        </div>
      </div>
    </div>
  )
}
