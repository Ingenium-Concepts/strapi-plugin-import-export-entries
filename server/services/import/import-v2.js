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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const cloneDeep_1 = __importDefault(require("lodash/cloneDeep"));
const isEmpty_1 = __importDefault(require("lodash/isEmpty"));
const omit_1 = __importDefault(require("lodash/omit"));
const pick_1 = __importDefault(require("lodash/pick"));
const castArray_1 = __importDefault(require("lodash/castArray"));
const arrays_1 = require("../../../libs/arrays");
const objects_1 = require("../../../libs/objects");
const models_1 = require("../../utils/models");
const lodash_1 = require("lodash");
const file_1 = require("./utils/file");
class IdMapper {
    constructor() {
        this.mapping = {};
    }
    getMapping(slug, fileId) {
        var _a;
        return (_a = this.mapping[slug]) === null || _a === void 0 ? void 0 : _a.get(`${fileId}`);
    }
    setMapping(slug, fileId, dbId) {
        if (!this.mapping[slug]) {
            this.mapping[slug] = new Map();
        }
        this.mapping[slug].set(`${fileId}`, dbId);
    }
}
/**
 * Import data.
 * @returns {Promise<ImportDataRes>}
 */
const importDataV2 = (fileContent, { slug: slugArg, user, idField, }) => __awaiter(void 0, void 0, void 0, function* () {
    const { data } = fileContent;
    const slugs = Object.keys(data);
    let failures = [];
    const fileIdToDbId = new IdMapper();
    const { componentSlugs, mediaSlugs, contentTypeSlugs } = splitSlugs(slugs);
    const componentsDataStore = {};
    for (const slug of componentSlugs) {
        componentsDataStore[slug] = data[slug];
    }
    for (const slug of mediaSlugs) {
        const res = yield importMedia(data[slug], { user, fileIdToDbId });
        failures.push(...res.failures);
    }
    // Import content types without setting relations.
    for (const slug of contentTypeSlugs) {
        const res = yield importContentTypeSlug(data[slug], Object.assign(Object.assign({ slug: slug, user }, (slug === slugArg ? { idField } : {})), { importStage: 'simpleAttributes', fileIdToDbId,
            componentsDataStore }));
        failures.push(...res.failures);
    }
    // Set relations of content types.
    for (const slug of contentTypeSlugs) {
        const res = yield importContentTypeSlug(data[slug], Object.assign(Object.assign({ slug: slug, user }, (slug === slugArg ? { idField } : {})), { importStage: 'relationAttributes', fileIdToDbId,
            componentsDataStore }));
        failures.push(...res.failures);
    }
    // Sync primary key sequence for postgres databases.
    // See https://github.com/strapi/strapi/issues/12493.
    // TODO: improve strapi typing
    if (strapi.db.config.connection.client === 'postgres') {
        for (const slugFromFile of slugs) {
            const model = (0, models_1.getModel)(slugFromFile);
            // TODO: handle case when `id` is not a number;
            yield strapi.db.connection.raw(`SELECT SETVAL((SELECT PG_GET_SERIAL_SEQUENCE('${model.collectionName}', 'id')), (SELECT MAX(id) FROM ${model.collectionName}) + 1, FALSE);`);
        }
    }
    return { failures };
});
function splitSlugs(slugs) {
    const slugsToProcess = [...slugs];
    const componentSlugs = (0, arrays_1.extract)(slugsToProcess, (slug) => { var _a; return ((_a = (0, models_1.getModel)(slug)) === null || _a === void 0 ? void 0 : _a.modelType) === 'component'; });
    const mediaSlugs = (0, arrays_1.extract)(slugsToProcess, (slug) => ['plugin::upload.file'].includes(slug));
    const contentTypeSlugs = (0, arrays_1.extract)(slugsToProcess, (slug) => { var _a; return ((_a = (0, models_1.getModel)(slug)) === null || _a === void 0 ? void 0 : _a.modelType) === 'contentType'; });
    if (slugsToProcess.length > 0) {
        strapi.log.warn(`Some slugs won't be imported: ${slugsToProcess.join(', ')}`);
    }
    return {
        componentSlugs,
        mediaSlugs,
        contentTypeSlugs,
    };
}
const importMedia = (slugEntries, { user, fileIdToDbId }) => __awaiter(void 0, void 0, void 0, function* () {
    const failures = [];
    const fileEntries = (0, lodash_1.toPairs)(slugEntries);
    for (let [fileId, fileEntry] of fileEntries) {
        try {
            const dbEntry = yield (0, file_1.findOrImportFile)(fileEntry, user, { allowedFileTypes: ['any'] });
            if (dbEntry) {
                fileIdToDbId.setMapping('plugin::upload.file', fileId, dbEntry === null || dbEntry === void 0 ? void 0 : dbEntry.id);
            }
        }
        catch (err) {
            strapi.log.error(err);
            failures.push({ error: err, data: fileEntry });
        }
    }
    return {
        failures,
    };
});
const importContentTypeSlug = (slugEntries, { slug, user, idField, importStage, fileIdToDbId, componentsDataStore, }) => __awaiter(void 0, void 0, void 0, function* () {
    let fileEntries = (0, lodash_1.toPairs)(slugEntries);
    // Sort localized data with default locale first.
    const sortDataByLocale = () => __awaiter(void 0, void 0, void 0, function* () {
        var _a, _b;
        const schema = (0, models_1.getModel)(slug);
        if ((_b = (_a = schema.pluginOptions) === null || _a === void 0 ? void 0 : _a.i18n) === null || _b === void 0 ? void 0 : _b.localized) {
            const defaultLocale = yield strapi.plugin('i18n').service('locales').getDefaultLocale();
            fileEntries = fileEntries.sort((dataA, dataB) => {
                if (dataA[1].locale === defaultLocale && dataB[1].locale === defaultLocale) {
                    return 0;
                }
                else if (dataA[1].locale === defaultLocale) {
                    return -1;
                }
                return 1;
            });
        }
    });
    yield sortDataByLocale();
    const failures = [];
    for (let [fileId, fileEntry] of fileEntries) {
        try {
            yield updateOrCreate(user, slug, fileId, fileEntry, idField, { importStage, fileIdToDbId, componentsDataStore });
        }
        catch (err) {
            strapi.log.error(err);
            failures.push({ error: err, data: fileEntry });
        }
    }
    return {
        failures,
    };
});
const updateOrCreate = (user, slug, fileId, fileEntryArg, idFieldArg, { importStage, fileIdToDbId, componentsDataStore }) => __awaiter(void 0, void 0, void 0, function* () {
    var _c, _d;
    const schema = (0, models_1.getModel)(slug);
    const idField = idFieldArg || ((_d = (_c = schema === null || schema === void 0 ? void 0 : schema.pluginOptions) === null || _c === void 0 ? void 0 : _c['import-export-entries']) === null || _d === void 0 ? void 0 : _d.idField) || 'id';
    let fileEntry = (0, cloneDeep_1.default)(fileEntryArg);
    if (importStage == 'simpleAttributes') {
        fileEntry = removeComponents(schema, fileEntry);
        fileEntry = linkMediaAttributes(schema, fileEntry, { fileIdToDbId });
        const attributeNames = (0, models_1.getModelAttributes)(slug, { filterOutType: ['relation'] })
            .map(({ name }) => name)
            .concat('id', 'localizations', 'locale');
        fileEntry = (0, pick_1.default)(fileEntry, attributeNames);
    }
    else if (importStage === 'relationAttributes') {
        fileEntry = setComponents(schema, fileEntry, { fileIdToDbId, componentsDataStore });
        const attributeNames = (0, models_1.getModelAttributes)(slug, { filterType: ['component', 'dynamiczone', 'relation'] })
            .map(({ name }) => name)
            .concat('id', 'localizations', 'locale');
        fileEntry = (0, pick_1.default)(fileEntry, attributeNames);
    }
    let dbEntry = null;
    if ((schema === null || schema === void 0 ? void 0 : schema.modelType) === 'contentType' && (schema === null || schema === void 0 ? void 0 : schema.kind) === 'singleType') {
        dbEntry = yield updateOrCreateSingleTypeEntry(user, slug, fileId, fileEntry, { importStage, fileIdToDbId });
    }
    else {
        dbEntry = yield updateOrCreateCollectionTypeEntry(user, slug, fileId, fileEntry, { idField, importStage, fileIdToDbId });
    }
    if (dbEntry) {
        fileIdToDbId.setMapping(slug, fileId, dbEntry.id);
    }
});
function linkMediaAttributes(schema, fileEntry, { fileIdToDbId }) {
    for (const [attributeName, attribute] of Object.entries(schema.attributes)) {
        let attributeValue = fileEntry[attributeName];
        if (attributeValue == null) {
            continue;
        }
        if ((0, models_1.isMediaAttribute)(attribute)) {
            attributeValue = (0, castArray_1.default)(attributeValue)
                .map((id) => fileIdToDbId.getMapping('plugin::upload.file', id))
                .filter(Boolean);
            if (!attribute.multiple) {
                attributeValue = attributeValue[0];
            }
            fileEntry[attributeName] = attributeValue;
        }
    }
    return fileEntry;
}
function removeComponents(schema, fileEntry) {
    const store = {};
    for (const [attributeName, attribute] of Object.entries(schema.attributes)) {
        // Do not reset an attribute component that is not imported.
        if (typeof fileEntry[attributeName] === 'undefined') {
            continue;
        }
        if ((0, models_1.isComponentAttribute)(attribute)) {
            if (attribute.repeatable) {
                store[attributeName] = [];
            }
            else {
                store[attributeName] = null;
            }
        }
        else if ((0, models_1.isDynamicZoneAttribute)(attribute)) {
            store[attributeName] = [];
        }
    }
    return Object.assign(Object.assign({}, fileEntry), (store || {}));
}
function setComponents(schema, fileEntry, { fileIdToDbId, componentsDataStore }) {
    const store = {};
    for (const [attributeName, attribute] of Object.entries(schema.attributes)) {
        const attributeValue = fileEntry[attributeName];
        if (attributeValue == null) {
            continue;
        }
        else if ((0, models_1.isComponentAttribute)(attribute)) {
            if (attribute.repeatable) {
                store[attributeName] = attributeValue.map((componentFileId) => getComponentData(attribute.component, `${componentFileId}`, { fileIdToDbId, componentsDataStore }));
            }
            else {
                store[attributeName] = getComponentData(attribute.component, `${attributeValue}`, { fileIdToDbId, componentsDataStore });
            }
        }
        else if ((0, models_1.isDynamicZoneAttribute)(attribute)) {
            store[attributeName] = attributeValue.map(({ __component, id }) => getComponentData(__component, `${id}`, { fileIdToDbId, componentsDataStore }));
        }
    }
    return Object.assign(Object.assign({}, fileEntry), (store || {}));
}
function getComponentData(
/** Slug of the component. */
slug, 
/** File id of the component. */
fileId, { fileIdToDbId, componentsDataStore }) {
    const schema = (0, models_1.getModel)(slug);
    const fileEntry = componentsDataStore[slug][`${fileId}`];
    if (fileEntry == null) {
        return null;
    }
    const store = Object.assign(Object.assign({}, (0, omit_1.default)(fileEntry, ['id'])), { __component: slug });
    for (const [attributeName, attribute] of Object.entries(schema.attributes)) {
        const attributeValue = fileEntry[attributeName];
        if (attributeValue == null) {
            store[attributeName] = null;
            continue;
        }
        if ((0, models_1.isComponentAttribute)(attribute)) {
            if (attribute.repeatable) {
                store[attributeName] = attributeValue.map((componentFileId) => getComponentData(attribute.component, `${componentFileId}`, { fileIdToDbId, componentsDataStore }));
            }
            else {
                store[attributeName] = getComponentData(attribute.component, `${attributeValue}`, { fileIdToDbId, componentsDataStore });
            }
        }
        else if ((0, models_1.isDynamicZoneAttribute)(attribute)) {
            store[attributeName] = attributeValue.map(({ __component, id }) => getComponentData(__component, `${id}`, { fileIdToDbId, componentsDataStore }));
        }
        else if ((0, models_1.isMediaAttribute)(attribute)) {
            if (attribute.multiple) {
                store[attributeName] = attributeValue.map((id) => fileIdToDbId.getMapping('plugin::upload.file', id));
            }
            else {
                store[attributeName] = fileIdToDbId.getMapping('plugin::upload.file', attributeValue);
            }
        }
        else if ((0, models_1.isRelationAttribute)(attribute)) {
            if (attribute.relation.endsWith('Many')) {
                store[attributeName] = attributeValue.map((id) => fileIdToDbId.getMapping(attribute.target, id));
            }
            else {
                store[attributeName] = fileIdToDbId.getMapping(attribute.target, attributeValue);
            }
        }
        else if ((0, models_1.isMediaAttribute)(attribute)) {
            if (attribute.multiple) {
                store[attributeName] = (0, castArray_1.default)(attributeValue).map((id) => fileIdToDbId.getMapping('plugin::upload.file', id));
            }
            else {
                store[attributeName] = fileIdToDbId.getMapping('plugin::upload.file', `${(0, lodash_1.head)((0, castArray_1.default)(attributeValue))}`);
            }
        }
    }
    return store;
}
const updateOrCreateCollectionTypeEntry = (user, slug, fileId, fileEntry, { idField, importStage, fileIdToDbId }) => __awaiter(void 0, void 0, void 0, function* () {
    var _e, _f, _g, _h;
    const schema = (0, models_1.getModel)(slug);
    const whereBuilder = new objects_1.ObjectBuilder();
    if (fileIdToDbId.getMapping(slug, fileId)) {
        whereBuilder.extend({ id: fileIdToDbId.getMapping(slug, fileId) });
    }
    else if (fileEntry[idField]) {
        whereBuilder.extend({ [idField]: fileEntry[idField] });
    }
    const where = whereBuilder.get();
    if (!((_f = (_e = schema.pluginOptions) === null || _e === void 0 ? void 0 : _e.i18n) === null || _f === void 0 ? void 0 : _f.localized)) {
        let dbEntry = yield strapi.db.query(slug).findOne({ where });
        if (!dbEntry) {
            return strapi.entityService.create(slug, { data: fileEntry });
        }
        else {
            return strapi.entityService.update(slug, dbEntry.id, { data: (0, omit_1.default)(fileEntry, ['id']) });
        }
    }
    else {
        if (!fileEntry.locale) {
            throw new Error(`No locale set to import entry for slug ${slug} (data ${JSON.stringify(fileEntry)})`);
        }
        const defaultLocale = yield strapi.plugin('i18n').service('locales').getDefaultLocale();
        const isDatumInDefaultLocale = fileEntry.locale === defaultLocale;
        let dbEntryDefaultLocaleId = null;
        let dbEntry = yield strapi.db.query(slug).findOne({ where, populate: ['localizations'] });
        if (isDatumInDefaultLocale) {
            dbEntryDefaultLocaleId = (dbEntry === null || dbEntry === void 0 ? void 0 : dbEntry.id) || null;
        }
        else {
            if (dbEntry) {
                // If `dbEntry` has been found, `dbEntry` holds the data for the default locale and
                // the data for other locales in its `localizations` attribute.
                const localizedEntries = [dbEntry, ...((dbEntry === null || dbEntry === void 0 ? void 0 : dbEntry.localizations) || [])];
                dbEntryDefaultLocaleId = ((_g = localizedEntries.find((e) => e.locale === defaultLocale)) === null || _g === void 0 ? void 0 : _g.id) || null;
                dbEntry = localizedEntries.find((e) => e.locale === fileEntry.locale) || null;
            }
            else {
                // Otherwise try to find dbEntry for default locale through localized siblings.
                let idx = 0;
                const fileLocalizationsIds = (fileEntry === null || fileEntry === void 0 ? void 0 : fileEntry.localizations) || [];
                while (idx < fileLocalizationsIds.length && !dbEntryDefaultLocaleId && !dbEntry) {
                    const dbId = fileIdToDbId.getMapping(slug, fileLocalizationsIds[idx]);
                    const localizedEntry = yield strapi.db.query(slug).findOne({ where: { id: dbId }, populate: ['localizations'] });
                    const localizedEntries = localizedEntry != null ? [localizedEntry, ...((localizedEntry === null || localizedEntry === void 0 ? void 0 : localizedEntry.localizations) || [])] : [];
                    if (!dbEntryDefaultLocaleId) {
                        dbEntryDefaultLocaleId = ((_h = localizedEntries.find((e) => e.locale === defaultLocale)) === null || _h === void 0 ? void 0 : _h.id) || null;
                    }
                    if (!dbEntry) {
                        dbEntry = localizedEntries.find((e) => e.locale === fileEntry.locale) || null;
                    }
                    idx += 1;
                }
            }
        }
        fileEntry = (0, omit_1.default)(fileEntry, ['localizations']);
        if ((0, isEmpty_1.default)((0, omit_1.default)(fileEntry, ['id']))) {
            return null;
        }
        if (isDatumInDefaultLocale) {
            if (!dbEntryDefaultLocaleId) {
                return strapi.entityService.create(slug, { data: fileEntry });
            }
            else {
                return strapi.entityService.update(slug, dbEntryDefaultLocaleId, { data: (0, omit_1.default)(Object.assign({}, fileEntry), ['id']) });
            }
        }
        else {
            if (!dbEntryDefaultLocaleId) {
                throw new Error(`Could not find default locale entry to import localization for slug ${slug} (data ${JSON.stringify(fileEntry)})`);
            }
            if (!dbEntry) {
                const insertLocalizedEntry = strapi.plugin('i18n').service('core-api').createCreateLocalizationHandler((0, models_1.getModel)(slug));
                return insertLocalizedEntry({ id: dbEntryDefaultLocaleId, data: (0, omit_1.default)(Object.assign({}, fileEntry), ['id']) });
            }
            else {
                return strapi.entityService.update(slug, dbEntry.id, { data: (0, omit_1.default)(Object.assign({}, fileEntry), ['id']) });
            }
        }
    }
});
const updateOrCreateSingleTypeEntry = (user, slug, fileId, fileEntry, { importStage, fileIdToDbId }) => __awaiter(void 0, void 0, void 0, function* () {
    var _j, _k;
    const schema = (0, models_1.getModel)(slug);
    if (!((_k = (_j = schema.pluginOptions) === null || _j === void 0 ? void 0 : _j.i18n) === null || _k === void 0 ? void 0 : _k.localized)) {
        let dbEntry = yield strapi.db
            .query(slug)
            .findMany({})
            .then((entries) => { var _a; return (_a = (0, arrays_1.toArray)(entries)) === null || _a === void 0 ? void 0 : _a[0]; });
        if (!dbEntry) {
            return strapi.entityService.create(slug, { data: fileEntry });
        }
        else {
            return strapi.entityService.update(slug, dbEntry.id, { data: (0, omit_1.default)(fileEntry, ['id']) });
        }
    }
    else {
        const defaultLocale = yield strapi.plugin('i18n').service('locales').getDefaultLocale();
        const isDatumInDefaultLocale = !fileEntry.locale || fileEntry.locale === defaultLocale;
        fileEntry = (0, omit_1.default)(fileEntry, ['localizations']);
        if ((0, isEmpty_1.default)((0, omit_1.default)(fileEntry, ['id']))) {
            return null;
        }
        let entryDefaultLocale = yield strapi.db.query(slug).findOne({ where: { locale: defaultLocale } });
        if (!entryDefaultLocale) {
            entryDefaultLocale = yield strapi.entityService.create(slug, { data: Object.assign(Object.assign({}, fileEntry), { locale: defaultLocale }) });
        }
        if (isDatumInDefaultLocale) {
            if (!entryDefaultLocale) {
                return strapi.entityService.create(slug, { data: fileEntry });
            }
            else {
                return strapi.entityService.update(slug, entryDefaultLocale.id, { data: fileEntry });
            }
        }
        else {
            const entryLocale = yield strapi.db.query(slug).findOne({ where: { locale: fileEntry.locale } });
            let datumLocale = Object.assign(Object.assign({}, entryLocale), fileEntry);
            yield strapi.db.query(slug).delete({ where: { locale: fileEntry.locale } });
            const insertLocalizedEntry = strapi.plugin('i18n').service('core-api').createCreateLocalizationHandler((0, models_1.getModel)(slug));
            return insertLocalizedEntry({ id: entryDefaultLocale.id, data: datumLocale });
        }
    }
});
module.exports = {
    importDataV2,
};
