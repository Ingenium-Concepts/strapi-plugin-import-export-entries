"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const pluginId = require('./pluginId');
/**
 * ServiceName.
 * @typedef {("export"|"import")} ServiceName
 */
/**
 * Get a plugin service.
 * @param {ServiceName} serviceName
 * @returns
 */
const getService = (serviceName) => {
    return strapi.plugin(pluginId).service(serviceName);
};
module.exports = {
    getService,
};
