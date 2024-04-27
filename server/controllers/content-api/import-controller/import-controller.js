'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const importData = require('./import-data');
module.exports = ({ strapi }) => ({
    importData: importData({ strapi }),
});
