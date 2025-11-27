import React, { useState, useEffect } from 'react';
import { LoadingSpinner } from '../ui/LoadingSpinner';

interface CapePreview2DProps {
  capeUrl: string;
  playerUuid?: string;
  className?: string;
}

/**
 * A 2D preview of a cape using the Starlight API from Lunar Eclipse
 */
export const CapePreview2D: React.FC<CapePreview2DProps> = ({ capeUrl, playerUuid, className }) => {
  const [imageUrl, setImageUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  
  useEffect(() => {
    // Format the UUID without dashes if provided
    const formattedUuid = playerUuid ? playerUuid.replace(/-/g, '') : 'ec561538f3fd461daff5086b22154bce'; // Default Steve UUID
    
    // Build the Starlight API URL with the exact camera position as specified
    // https://starlightskins.lunareclipse.studio/render/default/[PLAYER-UUID]/full?cameraPosition={"x":"..."}&capeTexture=URL
    const baseUrl = `https://starlightskins.lunareclipse.studio/render/default/${formattedUuid}/full`;
    
    // Add the camera position parameters - properly URL encoded
    const cameraPosition = encodeURIComponent('{"x":"-30.26","y":"20.34","z":"54.94"}');
    const cameraParams = `?cameraPosition=${cameraPosition}`;
    
    // Add camera FOV parameter to zoom in and focus more on the cape
    const fovParam = '&cameraFOV=22';
    
    // Add the cape texture URL or disable cape if empty
    let fullUrl = `${baseUrl}${cameraParams}${fovParam}`;
    if (capeUrl && capeUrl.trim() !== '') {
      fullUrl += `&capeTexture=${encodeURIComponent(capeUrl)}`;
    } else {
      // Use a transparent/empty cape texture to override any equipped cape
      fullUrl += '&capeTexture=n/a';
    }
    
    setImageUrl(fullUrl);
  }, [capeUrl, playerUuid]);
  
  
  // Handle image load/error events
  const handleImageLoad = () => {
    setLoading(false);
    setError(false);
  };

  const handleImageError = () => {
    setLoading(false);
    setError(true);
    console.error('Failed to load cape preview image:', imageUrl);
  };

  return (
    <div className={`relative ${className || ''}`}>
      <div className="absolute inset-0 flex items-center justify-center">
        {/* Loading indicator */}
        {loading && (
          <LoadingSpinner
            size="md"
            variant="default"
            message="Loading Cape..."
            showMessage={true}
            shadowDepth="none"
          />
        )}
        
        {/* Error state */}
        {error && !loading && (
          <div className="text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="mt-2 text-sm text-gray-500">Failed to load cape</p>
          </div>
        )}
        
        {/* Cape image */}
        {imageUrl && (
          <img
            src={imageUrl}
            alt="Cape Preview"
            className={`max-w-full max-h-full object-contain transition-opacity duration-300 ${loading ? 'opacity-0' : 'opacity-100'}`}
            loading="lazy"
            style={{ imageRendering: 'auto' }} // Ensure smooth rendering
            onLoad={handleImageLoad}
            onError={handleImageError}
          />
        )}
      </div>
    </div>
  );
};
