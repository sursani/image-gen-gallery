import { render, screen } from '@testing-library/react';
import ProgressiveImage from '../components/ProgressiveImage';

// Transparent 1×1 pixel PNG (base-64)
const TINY_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8Xw8AAoMBgPb+cc0AAAAASUVORK5CYII=';

describe('ProgressiveImage', () => {
  test('renders nothing when no image and not loading', () => {
    const { container } = render(<ProgressiveImage imageUrl={null} isLoading={false} />);
    expect(container.firstChild).toBeNull();
  });

  test('renders placeholder when loading without image', () => {
    const { container } = render(<ProgressiveImage imageUrl={null} isLoading />);
    // Should render a div with animate-pulse class indicating the placeholder
    const placeholder = container.querySelector('.animate-pulse');
    expect(placeholder).toBeTruthy();
  });

  test('renders img when imageUrl provided', () => {
    render(<ProgressiveImage imageUrl={TINY_PNG} isLoading={false} alt="alt text" />);
    const img = screen.getByAltText('alt text') as HTMLImageElement;
    expect(img).toBeInTheDocument();
    expect(img.src).toContain(TINY_PNG);
  });

  test('shows overlay while loading with image', () => {
    render(<ProgressiveImage imageUrl={TINY_PNG} isLoading />);
    // Overlay text should be present
    const text = screen.getByText(/enhancing image/i);
    expect(text).toBeInTheDocument();
  });
});
