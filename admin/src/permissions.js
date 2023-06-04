export { pluginPermissions };

const pluginPermissions = {
  exportButton: [{ action: 'plugin::import-export-entries.export', subject: null }],
  homePage: [
    { action: 'plugin::import-export-entries.export', subject: null },
    { action: 'plugin::import-export-entries.import', subject: null },
  ],
  importButton: [{ action: 'plugin::import-export-entries.import', subject: null }],
};
