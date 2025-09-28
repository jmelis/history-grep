# HistoryGrep - Chrome Extension

A powerful Chrome extension for searching and managing your browsing history with advanced regex filtering, tab management, and configurable exclusion patterns.

## ✨ Key Features

### 🔍 **Advanced Search & Filtering**
- **Dual Regex Search**: Search both page titles and URLs with separate regex patterns
- **Smart Time Periods**: Last Day, **Last 3 Days (default)**, Last Week, Last Month, All Time, or custom "since" date
- **Intelligent Sorting**:
  - **Last Visit (default)**: Sort by most recent visit time
  - **Visits in Range**: Sort by frequency within the selected time period
- **Exclude Open Tabs**: Filter out currently open tabs from results (enabled by default)

### 🎯 **Tab Management**
- **Close All Tabs**: Safely close all unpinned tabs across all windows
- **Smart Protection**: Configurable URL patterns protect important tabs from bulk closure
- **One-Click URL Copy**: Copy any URL to clipboard with visual confirmation

### ⚙️ **Configuration System**
- **Persistent Settings**: Configurations sync across your Chrome instances
- **URL Exclusion Patterns**:
  - Exclude specific URLs from "Close All Tabs" action
  - Filter unwanted URLs from search results
- **Regex Support**: Full regex pattern matching for sophisticated filtering

### 🚀 **Performance & UX**
- **Real-time Search**: Debounced input with instant results
- **Favicon Integration**: Visual site icons for easy recognition
- **Pagination**: Efficient browsing of large result sets
- **Responsive Design**: Clean, modern interface that works on any screen size

## 🏁 Quick Start

### Default Behavior
When you open HistoryGrep, it automatically shows:
- **History from the last 3 days**
- **Sorted by last visit time** (most recent first)
- **Excluding open tabs** (only showing closed/historical tabs)
- **Ready for regex search** across titles and URLs

This gives you immediate access to recently closed tabs you might want to reopen.

## 📦 Installation

### Method 1: Load Unpacked Extension (Development)

1. **Enable Developer Mode**:
   - Open Chrome and navigate to `chrome://extensions/`
   - Toggle on "Developer mode" in the top-right corner

2. **Load the Extension**:
   - Click "Load unpacked" button
   - Navigate to and select the folder containing these extension files
   - The extension should now appear in your extensions list

3. **Pin the Extension** (Recommended):
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

## 🎮 Usage Guide

### Basic Search

1. **Open HistoryGrep**: Click the extension icon in your toolbar
2. **Click "Open History Search"** to launch the main interface
3. **Search**: Use the dual regex inputs:
   - **Title Pattern**: Search page titles (e.g., `github.*issues`)
   - **URL Pattern**: Search URLs (e.g., `\.github\.com|stackoverflow`)

### Time Period Selection

- **Last 3 Days** (default): Most recent activity
- **Custom**: Select any "since" date (to current time)
- **Presets**: Last Day, Week, Month, or All Time

### Sorting Options

- **Last Visit** (default): Most recently visited first
- **Visits in Range**: Most frequently visited in the selected period

### Advanced Features

#### Settings Configuration

Click the **Settings** button to configure:

1. **Exclude from Close All Tabs**:
   - Add URL patterns to protect important tabs
   - Examples: `gmail\.com`, `localhost:\d+`, `important-project\.company\.com`

2. **Exclude from Search Results**:
   - Filter out unwanted URLs from search results
   - Examples: `chrome-extension://.*`, `ads\..*`, `tracking\..*`

#### Pattern Examples

```regex
# Email providers
(gmail|outlook|proton)\.com

# Development environments
localhost:\d+|127\.0\.0\.1:\d+

# Social media
(twitter|facebook|instagram)\.com

# File types
.*\.(pdf|doc|docx|ppt|pptx)$

# Company domains
.*\.yourcompany\.com

# GitHub repositories
github\.com/.*/.*/(issues|pulls)
```

#### Copy URLs

- Click the 📋 **copy icon** next to any URL to copy it to clipboard
- Receive instant visual confirmation with toast notifications

#### Tab Management

- **Close All Tabs**: Closes all unpinned tabs across all windows
- **Smart Protection**: Respects your configured exclude patterns
- **Auto-Refresh**: Search results update automatically after closing tabs

## 🔧 Technical Details

### File Structure
```
HistoryGrep/
├── manifest.json          # Extension configuration
├── popup.html            # Extension popup interface
├── popup.js              # Popup functionality
├── history.html          # Main search interface
├── history.js            # Core search and tab management logic
├── background.js         # Service worker
├── favicon.svg           # Extension icon source
├── icons/                # Generated icon files
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md             # This documentation
```

### Chrome APIs Used
- `chrome.history.search()` - Query browsing history
- `chrome.history.getVisits()` - Get detailed visit information
- `chrome.tabs.query()` - List open tabs
- `chrome.tabs.remove()` - Close tabs
- `chrome.tabs.create()` - Open new tabs
- `chrome.storage.sync` - Persist configuration settings
- `chrome.windows.getAll()` - Access all browser windows

### Permissions Required
- **history**: Access browsing history
- **tabs**: Manage browser tabs
- **storage**: Save configuration settings

### Browser Compatibility
- Chrome 88+ (Manifest V3 support required)
- Chromium-based browsers with extension support

## 🔐 Privacy & Security

- **Local Data Only**: All processing happens locally on your device
- **No External Servers**: No data is sent to external services
- **Chrome Sync**: Settings sync uses Chrome's built-in secure sync
- **No Tracking**: Extension doesn't collect or transmit usage data

## 🐛 Troubleshooting

### Extension Not Working
1. Ensure Developer mode is enabled in `chrome://extensions/`
2. Check that all permissions (history, tabs, storage) are granted
3. Try disabling and re-enabling the extension
4. Reload the extension after making changes

### No Search Results
1. Verify you have browsing history in the selected time period
2. Check if "Exclude open tabs" is filtering results you expect
3. Review your search result exclude patterns in Settings
4. Try expanding the date range or using "All Time"

### Regex Pattern Issues
- Use online regex testers to validate patterns
- Remember to escape special characters (e.g., `\.` for literal dots)
- Check browser console for pattern error messages

### Performance with Large History
- Large history databases (100k+ entries) may take longer to process
- Use more specific search terms or shorter time periods
- Consider adding exclude patterns to filter noise

## 🚀 Development

### Local Development
1. Make changes to source files
2. Go to `chrome://extensions/`
3. Click the refresh icon on the HistoryGrep extension
4. Test your changes in the interface

### Adding Features
- **Search Logic**: Modify `history.js`
- **UI Changes**: Update `history.html` and CSS
- **Permissions**: Edit `manifest.json`
- **Storage**: Extend the settings system

### Contributing
This project welcomes contributions for bug fixes, feature enhancements, and documentation improvements.

## 📄 License

This extension is provided as-is for educational and personal use.

---

**HistoryGrep** - Making browser history management powerful and intuitive.