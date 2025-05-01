import { useState } from 'react'
import './App.css'
import Button from './components/Button'
import GalleryView from './components/GalleryView'
import ImageGenerationForm from './components/ImageGenerationForm'
import EditImageView from './views/EditImageView'

// Define the main application component
function App() {
  // State to manage the active view (e.g., 'gallery', 'create', 'edit')
  const [activeView, setActiveView] = useState('gallery')

  // Helper function to render content based on the active view
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
    // Apply dark theme globally using the 'dark' selector defined in tailwind.config.js
    // Ensure your index.html or root component has the `dark` class or attribute
    <div className="dark min-h-screen bg-black text-gray-200 font-sans">
      <div className="container mx-auto p-4">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-center text-purple-400">AI Image Generation Gallery</h1>
          {/* Basic Tab Navigation */}
          <nav className="mt-4 flex justify-center space-x-4">
            <Button
              onClick={() => setActiveView('gallery')}
              variant={activeView === 'gallery' ? 'primary' : 'secondary'}
            >
              View Gallery
            </Button>
            <Button
              onClick={() => setActiveView('create')}
              variant={activeView === 'create' ? 'primary' : 'secondary'}
            >
              Create Image
            </Button>
            <Button
              onClick={() => setActiveView('edit')}
              variant={activeView === 'edit' ? 'primary' : 'secondary'}
            >
              Edit Image
            </Button>
          </nav>
        </header>

        <main>
          {/* Render the content based on the active view */}
          {renderView()}
        </main>

        <footer className="mt-8 text-center text-gray-500 text-sm">
          Powered by FastAPI, React, Tailwind, and OpenAI
        </footer>
      </div>
    </div>
  )
}

export default App
