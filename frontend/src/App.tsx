import { useState } from 'react'
import './App.css'
import Button from './components/Button'
import GalleryView from './components/GalleryView'
import ImageGenerationForm from './components/ImageGenerationForm'
import EditImageView from './views/EditImageView'

// Define main styles directly to ensure they apply
const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#121212',
    color: '#DDDDDD',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif'
  },
  pageContainer: {
    width: '100%',
    maxWidth: '1280px',
    margin: '0 auto',
    padding: '32px',
    display: 'flex',
    flexDirection: 'column' as 'column',
    minHeight: '100vh'
  },
  header: {
    marginBottom: '48px',
    paddingBottom: '20px',
    borderBottom: '1px solid #333333'
  },
  h1: {
    fontSize: '2.8rem',
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#FFFFFF',
    marginBottom: '32px'
  },
  nav: {
    marginTop: '20px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '20px'
  },
  main: {
    flexGrow: 1
  },
  footer: {
    marginTop: '48px',
    paddingTop: '20px',
    borderTop: '1px solid #333333',
    textAlign: 'center',
    color: '#999999',
    fontSize: '0.875rem'
  }
}

function App() {
  const [activeView, setActiveView] = useState('gallery')

  const renderView = () => {
    switch (activeView) {
      case 'gallery':
        return <GalleryView />
      case 'create':
        return <ImageGenerationForm />
      case 'edit':
        return <EditImageView />
      default:
        return <GalleryView />
    }
  }

  return (
    <div style={styles.container} className="min-h-screen bg-black text-gray-200 font-sans">
      <div style={styles.pageContainer} className="page-container flex flex-col min-h-screen">
        <header style={styles.header} className="mb-12 pb-6 border-b border-gray-800">
          <h1 style={styles.h1} className="text-4xl font-bold text-center text-white mb-8">AI Image Generation Gallery</h1>
          
          <nav style={styles.nav} className="mt-6 flex justify-center items-center space-x-6">
            <Button
              onClick={() => setActiveView('gallery')}
              variant={activeView === 'gallery' ? 'primary' : 'outline'}
            >
              View Gallery
            </Button>
            <Button
              onClick={() => setActiveView('create')}
              variant={activeView === 'create' ? 'primary' : 'outline'}
            >
              Create Image
            </Button>
            <Button
              onClick={() => setActiveView('edit')}
              variant={activeView === 'edit' ? 'primary' : 'outline'}
            >
              Edit Image
            </Button>
          </nav>
        </header>

        <main style={styles.main} className="flex-grow">
          {renderView()}
        </main>

        <footer style={styles.footer} className="mt-16 pt-6 border-t border-gray-800 text-center text-gray-500 text-sm">
          Powered by FastAPI, React, Tailwind, and OpenAI
        </footer>
      </div>
    </div>
  )
}

export default App
