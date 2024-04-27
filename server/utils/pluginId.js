"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const pluginPkg = require('../../package.json');
const pluginId = pluginPkg.name.replace(/^(@[^-,.][\w,-]+\/|strapi-)plugin-/i, '');
module.exports = pluginId;
