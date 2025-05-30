import { useState, useEffect, useCallback, useRef } from 'react'
import './App.css'
import Button from './components/Button'
import GalleryView, { GalleryViewRef } from './components/GalleryView'
import ImageGenerationFormStreaming from './components/ImageGenerationFormStreaming'
import ImageEditFormStreaming from './components/ImageEditFormStreaming'

const pathToView = (path: string): string => {
  switch (path) {
    case '/create':
      return 'create'
    case '/edit':
      return 'edit'
    default:
      return 'gallery'
  }
}

const viewToPath = (view: string): string => {
  switch (view) {
    case 'create':
      return '/create'
    case 'edit':
      return '/edit'
    default:
      return '/'
  }
}

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
    flexDirection: 'column' as const,
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
    textAlign: 'center' as const,
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
    textAlign: 'center' as const,
    color: '#999999',
    fontSize: '0.875rem'
  }
}

function App() {
  const [activeView, setActiveView] = useState<string>(() => pathToView(window.location.pathname))
  const galleryRef = useRef<GalleryViewRef>(null)

  const navigate = useCallback((view: string) => {
    const newPath = viewToPath(view)
    window.history.pushState({ view }, '', newPath)
    setActiveView(view)
    
    // Refresh gallery when navigating to it to show latest images
    if (view === 'gallery' && galleryRef.current) {
      galleryRef.current.refresh()
    }
  }, [])

  useEffect(() => {
    const handlePopState = () => {
      setActiveView(pathToView(window.location.pathname))
    }
    window.addEventListener('popstate', handlePopState)
    // Normalize the URL on first load if needed
    const initialView = pathToView(window.location.pathname)
    const initialPath = viewToPath(initialView)
    if (initialPath !== window.location.pathname) {
      window.history.replaceState({ view: initialView }, '', initialPath)
    }

    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const renderView = () => {
    switch (activeView) {
      case 'gallery':
        return <GalleryView ref={galleryRef} />
      case 'create':
        return <ImageGenerationFormStreaming />
      case 'edit':
        return <ImageEditFormStreaming />
      default:
        return <GalleryView ref={galleryRef} />
    }
  }

  return (
    <div style={styles.container} className="min-h-screen bg-black text-gray-200 font-sans">
      <div style={styles.pageContainer} className="page-container flex flex-col min-h-screen">
        <header style={styles.header} className="mb-12 pb-6 border-b border-gray-800">
          <h1 style={styles.h1} className="text-4xl font-bold text-center text-white mb-8">AI Image Generation Gallery</h1>
          
          <nav className="flex justify-center gap-2 md:gap-4">
            <Button
              onClick={() => navigate('gallery')}
              variant={activeView === 'gallery' ? 'primary' : 'outline'}
              className="text-sm md:text-base"
            >
              Gallery
            </Button>
            <Button
              onClick={() => navigate('create')}
              variant={activeView === 'create' ? 'primary' : 'outline'}
              className="text-sm md:text-base"
            >
              Create
            </Button>
            <Button
              onClick={() => navigate('edit')}
              variant={activeView === 'edit' ? 'primary' : 'outline'}
              className="text-sm md:text-base"
            >
              Edit
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
