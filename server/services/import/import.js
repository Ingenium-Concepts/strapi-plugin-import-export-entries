"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const { isArraySafe, toArray } = require('../../../libs/arrays');
const { ObjectBuilder, isObjectSafe } = require('../../../libs/objects');
const { CustomSlugs } = require('../../config/constants');
const { getModelAttributes, getModel } = require('../../utils/models');
const { findOrImportFile } = require('./utils/file');
const { parseInputData } = require('./parsers');
/**
 * @typedef {Object} ImportDataRes
 * @property {Array<ImportDataFailures>} failures
 */
/**
 * Represents failed imports.
 * @typedef {Object} ImportDataFailures
 * @property {Error} error - Error raised.
 * @property {Object} data - Data for which import failed.
 */
/**
 * Import data.
 * @param {Array<Object>} dataRaw - Data to import.
 * @param {Object} options
 * @param {string} options.slug - Slug of the model to import.
 * @param {("csv" | "json")} options.format - Format of the imported data.
 * @param {Object} options.user - User importing the data.
 * @param {Object} options.idField - Field used as unique identifier.
 * @returns {Promise<ImportDataRes>}
 */
const importData = (dataRaw, { slug, format, user, idField }) => __awaiter(void 0, void 0, void 0, function* () {
    let data = yield parseInputData(format, dataRaw, { slug });
    data = toArray(data);
    let res;
    if (slug === CustomSlugs.MEDIA) {
        res = yield importMedia(data, { user });
    }
    else {
        res = yield importOtherSlug(data, { slug, user, idField });
    }
    return res;
});
const importMedia = (fileData, { user }) => __awaiter(void 0, void 0, void 0, function* () {
    const processed = [];
    for (let fileDatum of fileData) {
        let res;
        try {
            yield findOrImportFile(fileDatum, user, { allowedFileTypes: ['any'] });
            res = { success: true };
        }
        catch (err) {
            strapi.log.error(err);
            res = { success: false, error: err.message, args: [fileDatum] };
        }
        processed.push(res);
    }
    const failures = processed.filter((p) => !p.success).map((f) => ({ error: f.error, data: f.args[0] }));
    return {
        failures,
    };
});
const importOtherSlug = (data, { slug, user, idField }) => __awaiter(void 0, void 0, void 0, function* () {
    const processed = [];
    for (let datum of data) {
        let res;
        try {
            yield updateOrCreate(user, slug, datum, idField);
            res = { success: true };
        }
        catch (err) {
            strapi.log.error(err);
            res = { success: false, error: err.message, args: [datum] };
        }
        processed.push(res);
    }
    const failures = processed.filter((p) => !p.success).map((f) => ({ error: f.error, data: f.args[0] }));
    return {
        failures,
    };
});
/**
 * Update or create entries for a given model.
 * @param {Object} user - User importing the data.
 * @param {string} slug - Slug of the model.
 * @param {Object} data - Data to update/create entries from.
 * @param {string} idField - Field used as unique identifier.
 * @returns Updated/created entry.
 */
const updateOrCreate = (user, slug, data, idField = 'id') => __awaiter(void 0, void 0, void 0, function* () {
    const relationAttributes = getModelAttributes(slug, { filterType: ['component', 'dynamiczone', 'media', 'relation'] });
    for (let attribute of relationAttributes) {
        data[attribute.name] = yield updateOrCreateRelation(user, attribute, data[attribute.name]);
    }
    let entry;
    const model = getModel(slug);
    if (model.kind === 'singleType') {
        entry = yield updateOrCreateSingleType(user, slug, data, idField);
    }
    else {
        entry = yield updateOrCreateCollectionType(user, slug, data, idField);
    }
    return entry;
});
const updateOrCreateCollectionType = (user, slug, data, idField) => __awaiter(void 0, void 0, void 0, function* () {
    const whereBuilder = new ObjectBuilder();
    if (data[idField]) {
        whereBuilder.extend({ [idField]: data[idField] });
    }
    const where = whereBuilder.get();
    // Prevent strapi from throwing a unique constraint error on id field.
    if (idField !== 'id') {
        delete data.id;
    }
    let entry;
    if (!where[idField]) {
        entry = yield strapi.db.query(slug).create({ data });
    }
    else {
        entry = yield strapi.db.query(slug).update({ where, data });
        if (!entry) {
            entry = yield strapi.db.query(slug).create({ data });
        }
    }
    return entry;
});
const updateOrCreateSingleType = (user, slug, data, idField) => __awaiter(void 0, void 0, void 0, function* () {
    delete data.id;
    let [entry] = yield strapi.db.query(slug).findMany();
    if (!entry) {
        entry = yield strapi.db.query(slug).create({ data });
    }
    else {
        entry = yield strapi.db.query(slug).update({ where: { id: entry.id }, data });
    }
    return entry;
});
/**
 * Update or create a relation.
 * @param {Object} user
 * @param {Attribute} rel
 * @param {number | Object | Array<Object>} relData
 */
const updateOrCreateRelation = (user, rel, relData) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    if (relData == null) {
        return null;
    }
    if (['createdBy', 'updatedBy'].includes(rel.name)) {
        return user.id;
    }
    else if (rel.type === 'dynamiczone') {
        const components = [];
        for (const componentDatum of relData || []) {
            let component = yield updateOrCreate(user, componentDatum.__component, componentDatum);
            component = Object.assign(Object.assign({}, component), { __component: componentDatum.__component });
            components.push(component);
        }
        return components;
    }
    else if (rel.type === 'component') {
        relData = toArray(relData);
        relData = rel.repeatable ? relData : relData.slice(0, 1);
        const entryIds = [];
        for (const relDatum of relData) {
            if (typeof relDatum === 'number') {
                entryIds.push(relDatum);
            }
            else if (isObjectSafe(relDatum)) {
                const entry = yield updateOrCreate(user, rel.component, relDatum);
                if (entry === null || entry === void 0 ? void 0 : entry.id) {
                    entryIds.push(entry.id);
                }
            }
        }
        return rel.repeatable ? entryIds : (entryIds === null || entryIds === void 0 ? void 0 : entryIds[0]) || null;
    }
    else if (rel.type === 'media') {
        relData = toArray(relData);
        relData = rel.multiple ? relData : relData.slice(0, 1);
        const entryIds = [];
        for (const relDatum of relData) {
            const media = yield findOrImportFile(relDatum, user, { allowedFileTypes: (_a = rel.allowedTypes) !== null && _a !== void 0 ? _a : ['any'] });
            if (media === null || media === void 0 ? void 0 : media.id) {
                entryIds.push(media.id);
            }
        }
        return rel.multiple ? entryIds : (entryIds === null || entryIds === void 0 ? void 0 : entryIds[0]) || null;
    }
    else if (rel.type === 'relation') {
        const isMultiple = isArraySafe(relData);
        relData = toArray(relData);
        const entryIds = [];
        for (const relDatum of relData) {
            if (typeof relDatum === 'number') {
                entryIds.push(relDatum);
            }
            else if (isObjectSafe(relDatum)) {
                const entry = yield updateOrCreate(user, rel.target, relDatum);
                if (entry === null || entry === void 0 ? void 0 : entry.id) {
                    entryIds.push(entry.id);
                }
            }
        }
        return isMultiple ? entryIds : (entryIds === null || entryIds === void 0 ? void 0 : entryIds[0]) || null;
    }
    throw new Error(`Could not update or create relation of type ${rel.type}.`);
});
module.exports = {
    importData,
};
