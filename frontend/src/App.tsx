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
    // Removed dark class from here, as Tailwind dark mode is configured via prefers-color-scheme or a manual toggle
    // The global styles in index.css handle the dark and light themes.
    <div className="min-h-screen text-gray-200 font-sans"> {/* Ensure bg is handled by body in index.css */}
      {/* Apply the new .page-container class for consistent padding and max-width */}
      <div className="page-container flex flex-col min-h-screen"> {/* Added flex flex-col to make footer stick to bottom if content is short */}
        {/* Updated Header: Increased bottom margin, centered items, and added a subtle bottom border */}
        <header className="mb-12 pb-6 border-b border-gray-700 dark:border-gray-600">
          <h1 className="text-4xl font-bold text-center text-purple-500 dark:text-purple-400 mb-6">AI Image Generation Gallery</h1>
          {/* Navigation: Added more spacing between buttons and centered them more effectively */}
          <nav className="mt-6 flex justify-center items-center space-x-6">
            <Button
              onClick={() => setActiveView('gallery')}
              variant={activeView === 'gallery' ? 'primary' : 'outline'} /* Changed secondary to outline for better contrast */
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

        {/* Main content area: Added flex-grow to push footer down */}
        <main className="flex-grow">
          {renderView()}
        </main>

        {/* Footer: Increased top margin and refined text style */}
        <footer className="mt-16 pt-6 border-t border-gray-700 dark:border-gray-600 text-center text-gray-600 dark:text-gray-400 text-sm">
          Powered by FastAPI, React, Tailwind, and OpenAI
        </footer>
      </div>
    </div>
  )
}

export default App
