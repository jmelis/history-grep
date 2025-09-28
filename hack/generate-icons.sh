#!/bin/bash

# Generate icon PNG files from favicon.svg using ImageMagick
# Usage: ./generate-icons.sh

set -e

# Check if magick is installed
if ! command -v magick &> /dev/null; then
    echo "Error: ImageMagick (magick) is not installed"
    echo "Install with: brew install imagemagick"
    exit 1
fi

# Check if favicon.svg exists
if [ ! -f "favicon.svg" ]; then
    echo "Error: favicon.svg not found"
    exit 1
fi

# Create icons directory if it doesn't exist
mkdir -p icons

echo "Generating icon files from favicon.svg..."

# Generate different sizes
magick favicon.svg -resize 16x16 icons/icon16.png
echo "Generated icon16.png"

magick favicon.svg -resize 48x48 icons/icon48.png
echo "Generated icon48.png"

magick favicon.svg -resize 128x128 icons/icon128.png
echo "Generated icon128.png"

echo "All icons generated successfully!"

# Show file sizes
echo ""
echo "Generated files:"
ls -la icons/icon*.png
