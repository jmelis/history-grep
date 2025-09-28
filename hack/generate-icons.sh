#!/bin/bash

# Generate icon PNG files from favicon.svg using Inkscape
# Usage: ./generate-icons.sh

set -e

# Check if inkscape is installed
if ! command -v inkscape &> /dev/null; then
    echo "Error: Inkscape is not installed"
    echo "Install with: brew install inkscape"
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

# Generate different sizes using Inkscape
inkscape favicon.svg --export-type=png --export-width=16 --export-filename=icons/icon16.png
echo "Generated icon16.png"

inkscape favicon.svg --export-type=png --export-width=48 --export-filename=icons/icon48.png
echo "Generated icon48.png"

inkscape favicon.svg --export-type=png --export-width=128 --export-filename=icons/icon128.png
echo "Generated icon128.png"

echo "All icons generated successfully!"

# Show file sizes
echo ""
echo "Generated files:"
ls -la icons/icon*.png
