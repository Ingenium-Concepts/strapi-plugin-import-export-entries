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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const cloneDeep_1 = __importDefault(require("lodash/cloneDeep"));
const fromPairs_1 = __importDefault(require("lodash/fromPairs"));
const fp_1 = require("lodash/fp");
const qs_1 = __importDefault(require("qs"));
const arrays_1 = require("../../../libs/arrays");
const constants_1 = require("../../config/constants");
const objects_1 = require("../../../libs/objects");
const models_1 = require("../../utils/models");
const converters_v2_1 = __importDefault(require("./converters-v2"));
const dataFormats = {
    JSON: 'json',
};
const dataConverterConfigs = {
    [dataFormats.JSON]: {
        convertEntries: converters_v2_1.default.convertToJson,
    },
};
module.exports = {
    exportDataV2,
};
/**
 * Export data.
 */
function exportDataV2({ slug, search, applySearch, deepness = 5, exportPluginsContentTypes, }) {
    return __awaiter(this, void 0, void 0, function* () {
        const slugsToExport = slug === constants_1.CustomSlugs.WHOLE_DB ? (0, models_1.getAllSlugs)({ includePluginsContentTypes: exportPluginsContentTypes }) : (0, arrays_1.toArray)(constants_1.CustomSlugToSlug[slug] || slug);
        let store = {};
        for (const slug of slugsToExport) {
            const hierarchy = buildSlugHierarchy(slug, deepness);
            store = yield findEntriesForHierarchy(store, slug, hierarchy, deepness, Object.assign({}, (applySearch ? { search } : {})));
        }
        const jsoContent = {
            version: 2,
            data: store,
        };
        const fileContent = convertData(jsoContent, {
            dataFormat: 'json',
        });
        return fileContent;
    });
}
function findEntriesForHierarchy(store, slug, hierarchy, deepness, { search, ids }) {
    return __awaiter(this, void 0, void 0, function* () {
        const schema = (0, models_1.getModel)(slug);
        if (schema.uid === 'admin::user') {
            return {};
        }
        let entries = yield findEntries(slug, deepness, { search, ids })
            .then((entries) => {
            var _a, _b;
            entries = (0, arrays_1.toArray)(entries).filter(Boolean);
            // Export locales
            if ((_b = (_a = schema.pluginOptions) === null || _a === void 0 ? void 0 : _a.i18n) === null || _b === void 0 ? void 0 : _b.localized) {
                const allEntries = [...entries];
                const entryIdsToExported = (0, fromPairs_1.default)(allEntries.map((entry) => [entry.id, true]));
                for (const entry of entries) {
                    (entry.localizations || []).forEach((localization) => {
                        if (localization.id && !entryIdsToExported[localization.id]) {
                            allEntries.push(localization);
                            entryIdsToExported[localization.id] = true;
                        }
                    });
                }
                return allEntries;
            }
            return entries;
        })
            .then((entries) => (0, arrays_1.toArray)(entries));
        // Transform relations as ids.
        let entriesFlatten = (0, cloneDeep_1.default)(entries);
        (() => {
            const flattenEntryCommon = (entry) => {
                if (entry == null) {
                    return null;
                }
                else if ((0, arrays_1.isArraySafe)(entry)) {
                    return entry.map((rel) => {
                        if ((0, objects_1.isObjectSafe)(rel)) {
                            return rel.id;
                        }
                        return rel;
                    });
                }
                else if ((0, objects_1.isObjectSafe)(entry)) {
                    return entry.id;
                }
                return entry;
            };
            const flattenProperty = (propAttribute, propEntries) => {
                if (propEntries == null) {
                    return null;
                }
                else if ((0, models_1.isComponentAttribute)(propAttribute)) {
                    return flattenEntryCommon(propEntries);
                }
                else if ((0, models_1.isDynamicZoneAttribute)(propAttribute)) {
                    return propEntries.map((entry) => ({
                        __component: entry.__component,
                        id: entry.id,
                    }));
                }
                else if ((0, models_1.isMediaAttribute)(propAttribute)) {
                    return flattenEntryCommon(propEntries);
                }
                else if ((0, models_1.isRelationAttribute)(propAttribute)) {
                    return flattenEntryCommon(propEntries);
                }
                return propEntries;
            };
            const flattenEntry = (entry, slug) => {
                const attributes = (0, models_1.getModelAttributes)(slug, { filterType: ['component', 'dynamiczone', 'media', 'relation'] });
                for (const attribute of attributes) {
                    (0, models_1.setEntryProp)(entry, attribute.name, flattenProperty(attribute, (0, models_1.getEntryProp)(entry, attribute.name)));
                }
                return entry;
            };
            entriesFlatten = entriesFlatten.map((entry) => flattenEntry(entry, slug));
        })();
        store = (0, objects_1.mergeObjects)({ [slug]: Object.fromEntries(entriesFlatten.map((entry) => [entry.id, entry])) }, store);
        // Skip admin::user slug.
        const filterOutUnwantedRelations = () => {
            const UNWANTED_RELATIONS = ['admin::user'];
            const attributes = (0, models_1.getModelAttributes)(slug, { filterType: ['relation'] });
            return entries.map((entry) => {
                attributes.forEach((attribute) => {
                    if (UNWANTED_RELATIONS.includes(attribute.target)) {
                        (0, models_1.deleteEntryProp)(entry, attribute.name);
                    }
                });
                return entry;
            });
        };
        filterOutUnwantedRelations();
        const findAndFlattenComponentAttributes = () => __awaiter(this, void 0, void 0, function* () {
            var _a;
            let attributes = (0, models_1.getModelAttributes)(slug, { filterType: ['component'] });
            for (const attribute of attributes) {
                const attributeSlug = (_a = hierarchy[attribute.name]) === null || _a === void 0 ? void 0 : _a.__slug;
                if (!attributeSlug) {
                    continue;
                }
                const ids = entries
                    .filter((entry) => !!(0, models_1.getEntryProp)(entry, attribute.name))
                    .flatMap((entry) => (0, models_1.getEntryProp)(entry, attribute.name))
                    .filter((entry) => !!entry.id)
                    .map((entry) => entry.id)
                    .filter((id) => { var _a; return typeof ((_a = store === null || store === void 0 ? void 0 : store[attributeSlug]) === null || _a === void 0 ? void 0 : _a[`${id}`]) === 'undefined'; });
                const dataToStore = yield findEntriesForHierarchy(store, attributeSlug, hierarchy[attribute.name], deepness - 1, { ids });
                store = (0, objects_1.mergeObjects)(dataToStore, store);
            }
        });
        yield findAndFlattenComponentAttributes();
        const findAndFlattenDynamicZoneAttributes = () => __awaiter(this, void 0, void 0, function* () {
            var _b;
            let attributes = (0, models_1.getModelAttributes)(slug, { filterType: ['dynamiczone'] });
            for (const attribute of attributes) {
                for (const slugFromAttribute of attribute.components) {
                    const componentHierarchy = (_b = hierarchy[attribute.name]) === null || _b === void 0 ? void 0 : _b[slugFromAttribute];
                    const componentSlug = componentHierarchy === null || componentHierarchy === void 0 ? void 0 : componentHierarchy.__slug;
                    if (!componentSlug) {
                        continue;
                    }
                    const ids = entries
                        .filter((entry) => !!(0, models_1.getEntryProp)(entry, attribute.name))
                        .flatMap((entry) => (0, models_1.getEntryProp)(entry, attribute.name))
                        .filter((entry) => (entry === null || entry === void 0 ? void 0 : entry.__component) === slugFromAttribute)
                        .map((entry) => entry.id)
                        .filter((id) => { var _a; return typeof ((_a = store === null || store === void 0 ? void 0 : store[componentSlug]) === null || _a === void 0 ? void 0 : _a[`${id}`]) === 'undefined'; });
                    const dataToStore = yield findEntriesForHierarchy(store, componentSlug, componentHierarchy, deepness - 1, { ids });
                    store = (0, objects_1.mergeObjects)(dataToStore, store);
                }
            }
        });
        yield findAndFlattenDynamicZoneAttributes();
        const findAndFlattenMediaAttributes = () => __awaiter(this, void 0, void 0, function* () {
            var _c;
            let attributes = (0, models_1.getModelAttributes)(slug, { filterType: ['media'] });
            for (const attribute of attributes) {
                const attributeSlug = (_c = hierarchy[attribute.name]) === null || _c === void 0 ? void 0 : _c.__slug;
                if (!attributeSlug) {
                    continue;
                }
                const ids = entries
                    .filter((entry) => !!(0, models_1.getEntryProp)(entry, attribute.name))
                    .flatMap((entry) => (0, models_1.getEntryProp)(entry, attribute.name))
                    .filter((entry) => !!entry.id)
                    .map((entry) => entry.id)
                    .filter((id) => { var _a; return typeof ((_a = store === null || store === void 0 ? void 0 : store[attributeSlug]) === null || _a === void 0 ? void 0 : _a[`${id}`]) === 'undefined'; });
                const dataToStore = yield findEntriesForHierarchy(store, attributeSlug, hierarchy[attribute.name], deepness - 1, { ids });
                store = (0, objects_1.mergeObjects)(dataToStore, store);
            }
        });
        yield findAndFlattenMediaAttributes();
        const findAndFlattenRelationAttributes = () => __awaiter(this, void 0, void 0, function* () {
            var _d;
            let attributes = (0, models_1.getModelAttributes)(slug, { filterType: ['relation'] });
            for (const attribute of attributes) {
                const attributeSlug = (_d = hierarchy[attribute.name]) === null || _d === void 0 ? void 0 : _d.__slug;
                if (!attributeSlug) {
                    continue;
                }
                const ids = entries
                    .filter((entry) => !!(0, models_1.getEntryProp)(entry, attribute.name))
                    .flatMap((entry) => (0, models_1.getEntryProp)(entry, attribute.name))
                    .filter((entry) => !!entry.id)
                    .map((entry) => entry.id)
                    .filter((id) => { var _a; return typeof ((_a = store === null || store === void 0 ? void 0 : store[attributeSlug]) === null || _a === void 0 ? void 0 : _a[`${id}`]) === 'undefined'; });
                const dataToStore = yield findEntriesForHierarchy(store, attributeSlug, hierarchy[attribute.name], deepness - 1, { ids });
                store = (0, objects_1.mergeObjects)(dataToStore, store);
            }
        });
        yield findAndFlattenRelationAttributes();
        return store;
    });
}
function findEntries(slug, deepness, { search, ids }) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const queryBuilder = new objects_1.ObjectBuilder();
            queryBuilder.extend(getPopulateFromSchema(slug, deepness));
            if (search) {
                queryBuilder.extend(buildFilterQuery(search));
            }
            else if (ids) {
                queryBuilder.extend({
                    filters: {
                        id: { $in: ids },
                    },
                });
            }
            const entries = yield strapi.entityService.findMany(slug, queryBuilder.get());
            return entries;
        }
        catch (_) {
            return [];
        }
    });
}
function buildFilterQuery(search = '') {
    let { filters, sort: sortRaw } = qs_1.default.parse(search);
    // TODO: improve query parsing
    const [attr, value] = (sortRaw === null || sortRaw === void 0 ? void 0 : sortRaw.split(':')) || [];
    const sort = {};
    if (attr && value) {
        sort[attr] = value.toLowerCase();
    }
    return {
        filters,
        sort,
    };
}
function convertData(exportContent, options) {
    const converter = getConverter(options.dataFormat);
    const convertedData = converter.convertEntries(exportContent, options);
    return convertedData;
}
function getConverter(dataFormat) {
    const converter = dataConverterConfigs[dataFormat];
    if (!converter) {
        throw new Error(`Data format ${dataFormat} is not supported.`);
    }
    return converter;
}
function getPopulateFromSchema(slug, deepness = 5) {
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
        if ((0, models_1.isComponentAttribute)(attribute)) {
            populate[attributeName] = getPopulateFromSchema(attribute.component, deepness - 1);
        }
        else if ((0, models_1.isDynamicZoneAttribute)(attribute)) {
            const dynamicPopulate = attribute.components.reduce((zonePopulate, component) => {
                const compPopulate = getPopulateFromSchema(component, deepness - 1);
                return compPopulate === true ? zonePopulate : (0, fp_1.merge)(zonePopulate, compPopulate);
            }, {});
            populate[attributeName] = (0, fp_1.isEmpty)(dynamicPopulate) ? true : dynamicPopulate;
        }
        else if ((0, models_1.isRelationAttribute)(attribute)) {
            const relationPopulate = getPopulateFromSchema(attribute.target, deepness - 1);
            if (relationPopulate) {
                populate[attributeName] = relationPopulate;
            }
        }
        else if ((0, models_1.isMediaAttribute)(attribute)) {
            populate[attributeName] = true;
        }
    }
    return (0, fp_1.isEmpty)(populate) ? true : { populate };
}
// type Hierarchy = {
//   [key: string]: Hierarchy | string;
// };
function buildSlugHierarchy(slug, deepness = 5) {
    slug = constants_1.CustomSlugToSlug[slug] || slug;
    if (deepness <= 1) {
        return { __slug: slug };
    }
    const hierarchy = {
        __slug: slug,
    };
    const model = (0, models_1.getModel)(slug);
    for (const [attributeName, attribute] of Object.entries(getModelPopulationAttributes(model))) {
        if (!attribute) {
            continue;
        }
        if ((0, models_1.isComponentAttribute)(attribute)) {
            hierarchy[attributeName] = buildSlugHierarchy(attribute.component, deepness - 1);
        }
        else if ((0, models_1.isDynamicZoneAttribute)(attribute)) {
            hierarchy[attributeName] = Object.fromEntries(attribute.components.map((componentSlug) => [componentSlug, buildSlugHierarchy(componentSlug, deepness - 1)]));
        }
        else if ((0, models_1.isRelationAttribute)(attribute)) {
            const relationHierarchy = buildSlugHierarchy(attribute.target, deepness - 1);
            if (relationHierarchy) {
                hierarchy[attributeName] = relationHierarchy;
            }
        }
        else if ((0, models_1.isMediaAttribute)(attribute)) {
            // TODO: remove casting
            hierarchy[attributeName] = buildSlugHierarchy(constants_1.CustomSlugs.MEDIA, deepness - 1);
        }
    }
    return hierarchy;
}
function getModelPopulationAttributes(model) {
    if (model.uid === 'plugin::upload.file') {
        const _a = model.attributes, { related } = _a, attributes = __rest(_a, ["related"]);
        return attributes;
    }
    return model.attributes;
}
