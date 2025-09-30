// HistoryGrep Options Page
class HistoryGrepOptions {
    constructor() {
        this.yamlEditor = document.getElementById('yamlEditor');
        this.yamlStatus = document.getElementById('yamlStatus');
        this.loadTemplateBtn = document.getElementById('loadTemplateBtn');
        this.validateYamlBtn = document.getElementById('validateYamlBtn');
        this.exportConfigBtn = document.getElementById('exportConfigBtn');
        this.importConfigBtn = document.getElementById('importConfigBtn');
        this.importConfigFile = document.getElementById('importConfigFile');
        this.saveSettingsBtn = document.getElementById('saveSettingsBtn');

        this.settings = {
            searchResultsExcludePatterns: [],
            urlGroupingRules: []
        };

        this.yamlValidationTimeout = null;

        this.initializeEventListeners();
        this.loadSettings();
    }

    initializeEventListeners() {
        if (this.loadTemplateBtn) {
            this.loadTemplateBtn.addEventListener('click', () => {
                this.loadYamlTemplate();
            });
        }

        if (this.validateYamlBtn) {
            this.validateYamlBtn.addEventListener('click', () => {
                this.validateYaml();
            });
        }

        if (this.exportConfigBtn) {
            this.exportConfigBtn.addEventListener('click', () => {
                this.exportYamlConfig();
            });
        }

        if (this.importConfigBtn && this.importConfigFile) {
            this.importConfigBtn.addEventListener('click', () => {
                this.importConfigFile.click();
            });

            this.importConfigFile.addEventListener('change', (e) => {
                this.importYamlConfig(e);
            });
        }

        if (this.yamlEditor) {
            this.yamlEditor.addEventListener('input', () => {
                this.validateYamlDebounced();
            });
        }

        if (this.saveSettingsBtn) {
            this.saveSettingsBtn.addEventListener('click', () => {
                this.saveSettings();
            });
        }
    }

    async loadSettings() {
        try {
            const result = await new Promise((resolve) => {
                chrome.storage.sync.get({
                    searchResultsExcludePatterns: [],
                    urlGroupingRules: [
                        {
                            pattern: "docs\\.google\\.com",
                            groupBy: "fragment",
                            description: "Google Docs - group by document"
                        },
                        {
                            pattern: "github\\.com/.+/issues",
                            groupBy: "fragment",
                            description: "GitHub Issues - group by issue page"
                        },
                        {
                            pattern: "stackoverflow\\.com/questions",
                            groupBy: "fragment",
                            description: "Stack Overflow - group by question"
                        },
                        {
                            pattern: ".*",
                            groupBy: "none",
                            description: "Default - no grouping"
                        }
                    ]
                }, resolve);
            });
            this.settings = result;
            this.populateSettingsUI();
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    }

    async saveSettingsToStorage() {
        try {
            await new Promise((resolve) => {
                chrome.storage.sync.set(this.settings, resolve);
            });
        } catch (error) {
            console.error('Error saving settings:', error);
        }
    }

    populateSettingsUI() {
        if (this.yamlEditor) {
            const yamlContent = this.settingsToYaml(this.settings);
            this.yamlEditor.value = yamlContent;
            this.validateYaml(false);
        }
    }

    saveSettings() {
        if (!this.validateYaml()) {
            this.updateYamlStatus('Please fix validation errors before saving', 'invalid');
            return;
        }

        try {
            const yamlData = this.parseYaml(this.yamlEditor.value);
            const newSettings = this.yamlToSettings(yamlData);

            this.settings = { ...this.settings, ...newSettings };
            this.saveSettingsToStorage();

            this.showToast('Settings saved successfully!');
        } catch (error) {
            this.updateYamlStatus(`Error saving settings: ${error.message}`, 'invalid');
        }
    }

    parseYaml(yamlText) {
        try {
            return jsyaml.load(yamlText);
        } catch (error) {
            throw new Error(`YAML parsing error: ${error.message}`);
        }
    }

    settingsToYaml(settings) {
        let yaml = '# HistoryGrep Configuration\n\n';

        yaml += '# Search Results Exclusions\n';
        yaml += 'exclude_patterns:\n';
        yaml += '  search_results:\n';
        if (settings.searchResultsExcludePatterns && settings.searchResultsExcludePatterns.length > 0) {
            settings.searchResultsExcludePatterns.forEach(pattern => {
                yaml += `    - '${pattern}'\n`;
            });
        } else {
            yaml += "    # - 'private\\.company\\.com'\n";
        }

        yaml += '\n# URL Grouping Rules - processed in order, first match wins\n';
        yaml += '#\n';
        yaml += '# group_by options:\n';
        yaml += '#   fragment          - Group by URL without fragment (everything after #)\n';
        yaml += '#   query             - Group by URL without query parameters (everything after ?)\n';
        yaml += '#   query-and-fragment - Group by URL without query parameters and fragment\n';
        yaml += '#   path-segment      - Group by URL path removing last segment\n';
        yaml += '#   subdomain         - Group by domain without subdomain (www.example.com -> example.com)\n';
        yaml += '#   none              - No grouping (default behavior)\n';
        yaml += '#\n';
        yaml += '# Examples:\n';
        yaml += '#   fragment: https://docs.google.com/document/d/123#heading -> https://docs.google.com/document/d/123\n';
        yaml += '#   query: https://example.com/search?q=test&page=2 -> https://example.com/search\n';
        yaml += '#   query-and-fragment: https://example.com/page?id=1#section -> https://example.com/page\n';
        yaml += '#   path-segment: https://github.com/user/repo/issues/123 -> https://github.com/user/repo/issues\n';
        yaml += '#   subdomain: https://mail.google.com/inbox -> https://google.com/inbox\n\n';

        yaml += 'url_grouping_rules:\n';
        if (settings.urlGroupingRules && settings.urlGroupingRules.length > 0) {
            settings.urlGroupingRules.forEach(rule => {
                let yamlGroupBy = rule.groupBy;
                if (yamlGroupBy === 'path_segment') {
                    yamlGroupBy = 'path-segment';
                }
                if (yamlGroupBy === 'query_and_fragment') {
                    yamlGroupBy = 'query-and-fragment';
                }

                yaml += `  - pattern: '${rule.pattern}'\n`;
                yaml += `    group_by: ${yamlGroupBy}\n`;
                yaml += `    description: '${rule.description}'\n\n`;
            });
        }

        return yaml;
    }

    yamlToSettings(yamlData) {
        const settings = {
            urlGroupingRules: [],
            searchResultsExcludePatterns: []
        };

        if (yamlData.url_grouping_rules) {
            settings.urlGroupingRules = yamlData.url_grouping_rules.map(rule => {
                let groupBy = rule.group_by || 'fragment';
                if (groupBy === 'path-segment') {
                    groupBy = 'path_segment';
                }
                if (groupBy === 'query-and-fragment') {
                    groupBy = 'query_and_fragment';
                }

                return {
                    pattern: rule.pattern || '',
                    groupBy: groupBy,
                    description: rule.description || ''
                };
            });
        }

        if (yamlData.exclude_patterns && yamlData.exclude_patterns.search_results) {
            settings.searchResultsExcludePatterns = yamlData.exclude_patterns.search_results;
        }

        return settings;
    }

    validateYamlDebounced() {
        clearTimeout(this.yamlValidationTimeout);
        this.yamlValidationTimeout = setTimeout(() => {
            this.validateYaml(false);
        }, 500);
    }

    validateYaml(showSuccess = true) {
        const yamlText = this.yamlEditor.value.trim();

        if (!yamlText) {
            this.updateYamlStatus('Enter configuration above', 'info');
            return false;
        }

        try {
            const parsed = this.parseYaml(yamlText);
            const errors = [];

            if (parsed.url_grouping_rules) {
                parsed.url_grouping_rules.forEach((rule, index) => {
                    if (!rule.pattern) {
                        errors.push(`Rule ${index + 1}: missing pattern`);
                    }
                    if (!rule.group_by || !['fragment', 'query', 'query_and_fragment', 'query-and-fragment', 'path_segment', 'path-segment', 'subdomain', 'none'].includes(rule.group_by)) {
                        errors.push(`Rule ${index + 1}: invalid group_by value (got: ${rule.group_by})`);
                    }
                    try {
                        new RegExp(rule.pattern);
                    } catch (e) {
                        errors.push(`Rule ${index + 1}: invalid regex pattern`);
                    }
                });
            }

            if (errors.length > 0) {
                this.updateYamlStatus(`Validation errors: ${errors.join(', ')}`, 'invalid');
                return false;
            }

            if (showSuccess) {
                this.updateYamlStatus('✓ Configuration is valid', 'valid');
            } else {
                this.updateYamlStatus('', 'info');
            }
            return true;
        } catch (error) {
            this.updateYamlStatus(`Parse error: ${error.message}`, 'invalid');
            return false;
        }
    }

    updateYamlStatus(message, type) {
        this.yamlStatus.textContent = message;
        this.yamlStatus.className = `yaml-status ${type}`;
    }

    loadYamlTemplate() {
        const template = `# HistoryGrep Configuration
# URL Grouping Rules - processed in order, first match wins

url_grouping_rules:
  - pattern: "docs\\\\.google\\\\.com"
    group_by: fragment
    description: "Google Docs - group by document"

  - pattern: "github\\\\.com/.+/issues"
    group_by: fragment
    description: "GitHub Issues - group by issue page"

  - pattern: "stackoverflow\\\\.com/questions"
    group_by: fragment
    description: "Stack Overflow - group by question"

  - pattern: "shop\\\\.example\\\\.com/product"
    group_by: query
    description: "E-commerce - group product variants"

  - pattern: "api\\\\..*\\\\.com/v\\\\d+"
    group_by: path-segment
    description: "API endpoints - group by resource"

  - pattern: ".*"
    group_by: none
    description: "Default - no grouping"

# Search Results Exclusions
exclude_patterns:
  search_results:
    - "private\\\\.company\\\\.com"
    - ".*\\\\.internal"
`;
        this.yamlEditor.value = template;
        this.validateYaml();
    }

    exportYamlConfig() {
        const yamlContent = this.yamlEditor.value;
        const blob = new Blob([yamlContent], { type: 'text/yaml' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = 'historygrep-config.yaml';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.updateYamlStatus('✓ Configuration exported', 'valid');
    }

    importYamlConfig(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            this.yamlEditor.value = e.target.result;
            this.validateYaml();
            event.target.value = '';
        };
        reader.readAsText(file);
    }

    showToast(message) {
        const toast = document.createElement('div');
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #333;
            color: white;
            padding: 12px 16px;
            border-radius: 6px;
            z-index: 10000;
            font-size: 14px;
        `;
        document.body.appendChild(toast);

        setTimeout(() => {
            document.body.removeChild(toast);
        }, 2000);
    }
}

// Initialize options page
document.addEventListener('DOMContentLoaded', function() {
    new HistoryGrepOptions();
});