module.exports = {
  moduleNameMapper: {
    '^axios$': require.resolve('axios'),
  },
  verbose: true,
  reporters: [
    "default",
    ["jest-html-reporter", {
      "pageTitle": "Auth Test Report",
      "outputPath": "test-report.html",
      "includeFailureMsg": true,
      "includeConsoleLog": true
    }]
  ]
};
