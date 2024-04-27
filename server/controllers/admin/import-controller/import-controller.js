'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const getModelAttributes = require('./get-model-attributes');
const importData = require('./import-data');
module.exports = ({ strapi }) => ({
    getModelAttributes: getModelAttributes({ strapi }),
    importData: importData({ strapi }),
});
