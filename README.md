# HistoryGrep - Chrome Extension

An enhanced search interface for Chrome's browsing history with fuzzy search capabilities, advanced filtering, and multiple sorting options.

## Features

- **Enhanced Search**: Fuzzy search across both URLs and page titles
- **Date Filtering**: Filter by last day, week, month, all time, or custom date ranges
- **Multiple Sort Options**:
  - Best Match (fuzzy search relevance)
  - Most Recent
  - Most Visited (All Time)
  - Most Visited (This Period)
- **Clean Interface**: Modern, responsive design with pagination
- **Fast Performance**: Debounced search with efficient result handling

## Installation

### Method 1: Load Unpacked Extension (Development)

1. **Enable Developer Mode in Chrome**:
   - Open Chrome and navigate to `chrome://extensions/`
   - Toggle on "Developer mode" in the top-right corner

2. **Load the Extension**:
   - Click "Load unpacked" button
   - Navigate to and select the folder containing these extension files
   - The extension should now appear in your extensions list

3. **Pin the Extension** (Optional but recommended):
   - Click the Extensions icon (puzzle piece) in Chrome's toolbar
   - Find "HistoryGrep" and click the pin icon to keep it visible

### Method 2: Pack and Install

1. **Pack the Extension**:
   - In `chrome://extensions/`, click "Pack extension"
   - Select the extension folder as the root directory
   - Click "Pack Extension" to create a `.crx` file

2. **Install the Packed Extension**:
   - Drag and drop the `.crx` file onto the `chrome://extensions/` page
   - Click "Add extension" when prompted

## Usage

### Basic Usage

1. **Open the Extension**:
   - Click the HistoryGrep icon in your Chrome toolbar
   - Click "Open History Search" to launch the search interface

2. **Search Your History**:
   - Type in the search box to find pages by title or URL
   - Results update automatically as you type (with debouncing)

3. **Filter by Date**:
   - Use the time period buttons: Last Day, Last Week, Last Month, All Time
   - For custom ranges, click "Custom" and select start/end dates

4. **Sort Results**:
   - **Best Match**: Most relevant results based on search terms
   - **Most Recent**: Newest visits first
   - **Most Visited (All Time)**: Pages you've visited most overall
   - **Most Visited (This Period)**: Most visited in the selected date range

### Advanced Features

- **Fuzzy Search**: Finds results even with typos or partial matches
- **Relevance Scoring**: Shows match percentage for search results
- **Visit Counts**: See how many times you've visited each page
- **Period Statistics**: View visit counts within specific time periods
- **Pagination**: Navigate through large result sets efficiently

## Privacy and Permissions

- **History Permission**: Required to access Chrome's browsing history
- **Data Usage**: All data stays local on your device
- **No External Servers**: No data is sent to external services
- **Chrome's Built-in API**: Uses Chrome's native history storage

## Technical Details

### Files Structure
```
history-search-pro/
├── manifest.json          # Extension configuration
├── popup.html            # Extension popup interface
├── popup.js              # Popup functionality
├── history.html          # Main search interface
├── history.js            # Search logic and Chrome API integration
└── README.md             # This file
```

### Chrome APIs Used
- `chrome.history.search()` - Query browsing history
- `chrome.history.getVisits()` - Get detailed visit information
- `chrome.tabs.create()` - Open new tabs
- `chrome.runtime.getURL()` - Get extension file URLs

### Browser Compatibility
- Chrome 88+ (Manifest V3 support required)
- Chromium-based browsers with extension support

## Troubleshooting

### Extension Not Working
1. Ensure Developer mode is enabled in `chrome://extensions/`
2. Check that the extension has the "history" permission
3. Try disabling and re-enabling the extension
4. Reload the extension if you made changes to the files

### No Search Results
1. Verify you have browsing history in the selected time period
2. Try expanding the date range (use "All Time")
3. Check if Chrome's history deletion settings are clearing data
4. Try simpler search terms

### Performance Issues
- Large history databases (100k+ entries) may take longer to search
- Consider using more specific search terms
- Try shorter time periods to reduce result sets

## Development

### Modifying the Extension
1. Make changes to the source files
2. Go to `chrome://extensions/`
3. Click the refresh icon on the HistoryGrep extension
4. Test your changes

### Adding Features
- Modify `history.js` for search logic changes
- Update `history.html` for UI modifications
- Edit `manifest.json` for permission or configuration changes

## Support

For issues, feature requests, or contributions, please refer to the project repository or contact the developer.

## License

This extension is provided as-is for educational and personal use.