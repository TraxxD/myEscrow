const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

const templateDir = path.join(__dirname, '..', 'templates', 'emails');
const templateCache = {};

/**
 * Load and cache an HTML template
 */
function loadTemplate(name) {
  if (templateCache[name]) return templateCache[name];

  const filePath = path.join(templateDir, `${name}.html`);
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    templateCache[name] = content;
    return content;
  } catch (err) {
    logger.error('templateRenderer', `Template not found: ${name} (${filePath})`);
    return null;
  }
}

/**
 * Render a template with {{variable}} replacement
 */
function renderTemplate(templateName, data = {}) {
  const template = loadTemplate(templateName);
  if (!template) {
    return `<p>Email template "${templateName}" not found.</p>`;
  }

  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return data[key] !== undefined ? String(data[key]) : match;
  });
}

/**
 * Clear template cache (for development)
 */
function clearCache() {
  Object.keys(templateCache).forEach(key => delete templateCache[key]);
}

module.exports = { renderTemplate, clearCache };
