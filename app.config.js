// Extends app.json. EXPO_BASE_URL is set only by the GitHub Pages workflow
// (deploy-pages.yml), so Netlify and local builds keep serving from the root.
module.exports = ({ config }) => ({
  ...config,
  experiments: {
    ...config.experiments,
    baseUrl: process.env.EXPO_BASE_URL || '',
  },
});
