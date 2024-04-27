"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteEntryProp = exports.setEntryProp = exports.getEntryProp = exports.isRelationAttribute = exports.isMediaAttribute = exports.isDynamicZoneAttribute = exports.isComponentAttribute = exports.getModelAttributes = exports.getModelFromSlugOrModel = exports.getModel = exports.getAllSlugs = void 0;
const arrays_1 = require("../../libs/arrays");
module.exports = {
    getAllSlugs,
    getModel,
    getModelFromSlugOrModel,
    getModelAttributes,
    isComponentAttribute,
    isDynamicZoneAttribute,
    isMediaAttribute,
    isRelationAttribute,
    getEntryProp,
    setEntryProp,
    deleteEntryProp,
};
function getAllSlugs({ includePluginsContentTypes = false } = {}) {
    return Array.from(strapi.db.metadata)
        .filter(([collectionName]) => collectionName.startsWith('api::') || (includePluginsContentTypes && collectionName.startsWith('plugin::')))
        .map(([collectionName]) => collectionName);
}
exports.getAllSlugs = getAllSlugs;
function getModel(slug) {
    return strapi.getModel(slug);
}
exports.getModel = getModel;
function getModelFromSlugOrModel(modelOrSlug) {
    let model = modelOrSlug;
    if (typeof model === 'string') {
        model = getModel(modelOrSlug);
    }
    return model;
}
exports.getModelFromSlugOrModel = getModelFromSlugOrModel;
/**
 * Get the attributes of a model.
 */
function getModelAttributes(slug, options = {}) {
    const schema = getModel(slug);
    if (!schema) {
        return [];
    }
    const typesToKeep = options.filterType ? (0, arrays_1.toArray)(options.filterType) : [];
    const typesToFilterOut = options.filterOutType ? (0, arrays_1.toArray)(options.filterOutType) : [];
    const targetsToFilterOut = (0, arrays_1.toArray)(options.filterOutTarget || []);
    let attributes = Object.keys(schema.attributes)
        .reduce((acc, key) => acc.concat(Object.assign(Object.assign({}, schema.attributes[key]), { name: key })), [])
        .filter((attr) => !typesToFilterOut.includes(attr.type))
        .filter((attr) => !targetsToFilterOut.includes(attr.target));
    if (typesToKeep.length) {
        attributes = attributes.filter((attr) => typesToKeep.includes(attr.type));
    }
    return attributes;
}
exports.getModelAttributes = getModelAttributes;
function isComponentAttribute(attribute) {
    return attribute.type === 'component';
}
exports.isComponentAttribute = isComponentAttribute;
function isDynamicZoneAttribute(attribute) {
    return attribute.type === 'dynamiczone';
}
exports.isDynamicZoneAttribute = isDynamicZoneAttribute;
function isMediaAttribute(attribute) {
    return attribute.type === 'media';
}
exports.isMediaAttribute = isMediaAttribute;
function isRelationAttribute(attribute) {
    return attribute.type === 'relation';
}
exports.isRelationAttribute = isRelationAttribute;
function getEntryProp(entry, prop) {
    return entry[prop];
}
exports.getEntryProp = getEntryProp;
function setEntryProp(entry, prop, value) {
    entry[prop] = value;
}
exports.setEntryProp = setEntryProp;
function deleteEntryProp(entry, prop) {
    delete entry[prop];
}
exports.deleteEntryProp = deleteEntryProp;
