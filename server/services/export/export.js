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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
const { isEmpty, merge } = require('lodash/fp');
const qs = require('qs');
const { ObjectBuilder } = require('../../../libs/objects');
const { CustomSlugToSlug } = require('../../config/constants');
const { convertToCsv, convertToJson } = require('./converters');
const dataFormats = {
    CSV: 'csv',
    JSON: 'json',
    JSON_V2: 'json-v2',
};
const dataConverterConfigs = {
    [dataFormats.CSV]: {
        convertEntries: convertToCsv,
    },
    [dataFormats.JSON]: {
        convertEntries: convertToJson,
    },
};
/**
 * Export data.
 * @param {Object} options
 * @param {string} options.slug
 * @param {("csv"|"json")} options.exportFormat
 * @param {string} options.search
 * @param {boolean} options.applySearch
 * @param {boolean} options.relationsAsId
 * @param {number} options.deepness
 * @returns {string}
 */
const exportData = ({ slug, search, applySearch, exportFormat, relationsAsId, deepness = 5 }) => __awaiter(void 0, void 0, void 0, function* () {
    const slugToProcess = CustomSlugToSlug[slug] || slug;
    const queryBuilder = new ObjectBuilder();
    queryBuilder.extend(getPopulateFromSchema(slugToProcess, deepness));
    if (applySearch) {
        queryBuilder.extend(buildFilterQuery(search));
    }
    const query = queryBuilder.get();
    const entries = yield strapi.entityService.findMany(slugToProcess, query);
    const data = convertData(entries, {
        slug: slugToProcess,
        dataFormat: exportFormat,
        relationsAsId,
    });
    return data;
});
const buildFilterQuery = (search) => {
    let { filters, sort: sortRaw } = qs.parse(search);
    const [attr, value] = (sortRaw === null || sortRaw === void 0 ? void 0 : sortRaw.split(':')) || [];
    let sort = {};
    if (attr && value) {
        sort[attr] = value.toLowerCase();
    }
    return {
        filters,
        sort,
    };
};
/**
 *
 * @param {Array<Object>} entries
 * @param {Object} options
 * @param {string} options.slug
 * @param {string} options.dataFormat
 * @param {boolean} options.relationsAsId
 * @returns
 */
const convertData = (entries, options) => {
    const converter = getConverter(options.dataFormat);
    const convertedData = converter.convertEntries(entries, options);
    return convertedData;
};
const getConverter = (dataFormat) => {
    const converter = dataConverterConfigs[dataFormat];
    if (!converter) {
        throw new Error(`Data format ${dataFormat} is not supported.`);
    }
    return converter;
};
const getPopulateFromSchema = (slug, deepness = 5) => {
    if (deepness <= 1) {
        return true;
    }
    if (slug === 'admin::user') {
        return undefined;
    }
    const populate = {};
    const model = strapi.getModel(slug);
    for (const [attributeName, attribute] of Object.entries(getModelPopulationAttributes(model))) {
        if (!attribute) {
            continue;
        }
        if (attribute.type === 'component') {
            populate[attributeName] = getPopulateFromSchema(attribute.component, deepness - 1);
        }
        else if (attribute.type === 'dynamiczone') {
            const dynamicPopulate = attribute.components.reduce((zonePopulate, component) => {
                const compPopulate = getPopulateFromSchema(component, deepness - 1);
                return compPopulate === true ? zonePopulate : merge(zonePopulate, compPopulate);
            }, {});
            populate[attributeName] = isEmpty(dynamicPopulate) ? true : dynamicPopulate;
        }
        else if (attribute.type === 'relation') {
            const relationPopulate = getPopulateFromSchema(attribute.target, deepness - 1);
            if (relationPopulate) {
                populate[attributeName] = relationPopulate;
            }
        }
        else if (attribute.type === 'media') {
            populate[attributeName] = true;
        }
    }
    return isEmpty(populate) ? true : { populate };
};
const getModelPopulationAttributes = (model) => {
    if (model.uid === 'plugin::upload.file') {
        const _a = model.attributes, { related } = _a, attributes = __rest(_a, ["related"]);
        return attributes;
    }
    return model.attributes;
};
module.exports = {
    formats: dataFormats,
    exportData,
    getPopulateFromSchema,
};
