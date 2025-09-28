# HistoryGrep

A Chrome extension for searching browser history with regex patterns and smart tab management.

## Features

- **Dual regex search** across page titles and URLs
- **Smart time filters**: Last 3 days (default), week, month, or custom dates
- **Sort by last visit** or visit frequency
- **Close all tabs** with configurable URL protection patterns
- **Copy URLs** with one click
- **Exclude open tabs** from search results
- **Settings sync** across Chrome instances

## Quick Start

1. Load the extension in Chrome (`chrome://extensions/` → "Load unpacked")
2. Click the HistoryGrep icon
3. Click "Open History Search"

**Default view**: Shows closed tabs from last 3 days, sorted by last visit.

## Usage

- **Search**: Enter regex patterns in title/URL fields
- **Time periods**: Click buttons or use custom "since" date
- **Copy URL**: Click 📋 icon next to any result
- **Settings**: Configure exclude patterns for tab closure and search results
- **Close tabs**: Red button closes all unpinned tabs (respects exclude patterns)

## Example Exclude Patterns

```
gmail\.com                    # Protect Gmail
localhost:\d+                 # Protect dev servers
github\.com/.*/issues         # Protect GitHub issues
chrome-extension://.*         # Hide extensions from search
```

## Installation

Load as unpacked extension or pack as `.crx` file.

Requires Chrome 88+ with Manifest V3 support.