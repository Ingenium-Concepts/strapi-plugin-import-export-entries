"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isCustomSlug = exports.CustomSlugToSlug = exports.CustomSlugs = void 0;
exports.CustomSlugs = {
    MEDIA: 'media',
    WHOLE_DB: 'custom:db',
};
exports.CustomSlugToSlug = {
    [exports.CustomSlugs.MEDIA]: 'plugin::upload.file',
};
const isCustomSlug = (slug) => {
    return !!exports.CustomSlugToSlug[slug];
};
exports.isCustomSlug = isCustomSlug;
module.exports = {
    CustomSlugs: exports.CustomSlugs,
    CustomSlugToSlug: exports.CustomSlugToSlug,
    isCustomSlug: exports.isCustomSlug,
};
