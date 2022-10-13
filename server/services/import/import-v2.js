const cloneDeep = require('lodash/cloneDeep');
const pick = require('lodash/pick');

const { ObjectBuilder } = require('../../../libs/objects');
const { CustomSlugs, CustomSlugToSlug } = require('../../config/constants');
const { getModel, getModelAttributes } = require('../../utils/models');
const { findOrImportFile } = require('./utils/file');

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
 * @param {Object} fileContent - Content of the import file.
 * @param {Object} options
 * @param {string} options.slug - Slug of the imported model.
 * @param {Object} options.user - User importing the data.
 * @param {Object} options.idField - Field used as unique identifier.
 * @returns {Promise<ImportDataRes>}
 */
const importDataV2 = async (fileContent, { slug, user, idField }) => {
  const { data } = fileContent;

  const slugs = Object.keys(data);
  let failures = [];
  // Import without setting relations.
  for (const slugFromFile of slugs) {
    let slugFailures = [];
    if (slugFromFile === CustomSlugToSlug[CustomSlugs.MEDIA]) {
      slugFailures = await importMedia(Object.values(data[slugFromFile]), { user }).then((res) => res.slugFailures);
    } else {
      slugFailures = await importOtherSlug(Object.values(data[slugFromFile]), {
        slug: slugFromFile,
        user,
        // Keep behavior of `idField` of version 1.
        ...(slugFromFile === slug ? { idField } : {}),
        excludeRelations: true,
      }).then((res) => res.failures);
    }
    failures = [...failures, ...(slugFailures || [])];
  }

  // Set relations relations.
  for (const slugFromFile of slugs) {
    let slugFailures = [];
    if (slugFromFile === CustomSlugToSlug[CustomSlugs.MEDIA]) {
      slugFailures = await importMedia(Object.values(data[slugFromFile]), { user }).then((res) => res.slugFailures);
    } else {
      slugFailures = await importOtherSlug(Object.values(data[slugFromFile]), {
        slug: slugFromFile,
        user,
        // Keep behavior of `idField` of version 1.
        ...(slugFromFile === slug ? { idField } : {}),
        onlyRelations: true,
      }).then((res) => res.failures);
    }
    failures = [...failures, ...(slugFailures || [])];
  }

  return { failures };
};

const importMedia = async (fileData, { user }) => {
  const processed = [];
  for (let fileDatum of fileData) {
    let res;
    try {
      await findOrImportFile(fileDatum, user, { allowedFileTypes: ['any'] });
      res = { success: true };
    } catch (err) {
      strapi.log.error(err);
      res = { success: false, error: err.message, args: [fileDatum] };
    }
    processed.push(res);
  }

  const failures = processed.filter((p) => !p.success).map((f) => ({ error: f.error, data: f.args[0] }));

  return {
    failures,
  };
};

/**
 * Import data.
 * @param {Array<Object>} data
 * @param {Object} importOptions
 * @param {boolean} [importOptions.excludeRelations]
 * @param {boolean} [importOptions.onlyRelations]
 * @returns
 */
const importOtherSlug = async (data, { slug, user, idField, excludeRelations, onlyRelations }) => {
  const processed = [];
  for (let datum of data) {
    let res;
    try {
      await updateOrCreate(user, slug, datum, idField, { excludeRelations, onlyRelations });
      res = { success: true };
    } catch (err) {
      strapi.log.error(err);
      res = { success: false, error: err.message, args: [datum] };
    }
    processed.push(res);
  }

  const failures = processed.filter((p) => !p.success).map((f) => ({ error: f.error, data: f.args[0] }));

  return {
    failures,
  };
};

/**
 * Update or create entries for a given model.
 * @param {Object} user - User importing the data.
 * @param {string} slug - Slug of the model.
 * @param {Object} datum - Data to update/create entries from.
 * @param {string} idField - Field used as unique identifier.
 * @returns Updated/created entry.
 */
const updateOrCreate = async (user, slug, datum, idField = 'id', { excludeRelations, onlyRelations }) => {
  datum = cloneDeep(datum);

  if (excludeRelations) {
    const attributeNames = getModelAttributes(slug, { filterOutType: ['component', 'dynamiczone', 'media', 'relation'], addIdAttribute: true }).map(({ name }) => name);
    datum = pick(datum, attributeNames);
  } else if (onlyRelations) {
    const attributeNames = getModelAttributes(slug, { filterType: ['component', 'dynamiczone', 'media', 'relation'], addIdAttribute: true }).map(({ name }) => name);
    datum = pick(datum, attributeNames);

    // For compatibility with older file structure.
    const componentAttributeNames = getModelAttributes(slug, { filterType: ['component'] }).map(({ name }) => name);
    for (const componentName of componentAttributeNames) {
      // If the component is an integer, then it's an id.
      if (Number.isInteger(datum[componentName])) {
        datum[componentName] = { id: datum[componentName] };
      }
    }
  }

  let entry;
  const model = getModel(slug);
  if (model.kind === 'singleType') {
    entry = await updateOrCreateSingleType(user, slug, datum, idField);
  } else {
    entry = await updateOrCreateCollectionType(user, slug, datum, idField);
  }
  return entry;
};

const updateOrCreateCollectionType = async (user, slug, datum, idField) => {
  const whereBuilder = new ObjectBuilder();
  if (datum[idField]) {
    whereBuilder.extend({ [idField]: datum[idField] });
  }
  const where = whereBuilder.get();

  const shouldFindEntryId = idField !== 'id' && datum[idField];
  if (shouldFindEntryId) {
    delete datum.id;
    let entry = await strapi.db.query(slug).findOne({ where });
    datum.id = entry?.id;
  }

  let entry;
  if (!datum.id) {
    entry = await strapi.entityService.create(slug, { data: datum });
  } else {
    entry = await strapi.entityService.update(slug, datum.id, { data: datum });

    if (!entry) {
      entry = await strapi.entityService.create(slug, { data: datum });
    }
  }

  return entry;
};

const updateOrCreateSingleType = async (user, slug, datum, idField) => {
  let entry = await strapi.entityService.findMany(slug);

  if (!entry) {
    entry = await strapi.entityService.create(slug, { data: datum });
  } else {
    entry = await strapi.entityService.update(slug, entry.id, { data: datum });
  }

  return entry;
};

module.exports = {
  importDataV2,
};