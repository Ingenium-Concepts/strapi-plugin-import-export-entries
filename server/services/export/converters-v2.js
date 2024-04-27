"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const lodash_1 = require("lodash");
const constants_1 = require("../../config/constants");
const { getConfig } = require('../../utils/getConfig');
exports.default = {
    convertToJson: withBeforeConvert(convertToJson),
};
function convertToJson(jsoContent) {
    return JSON.stringify(jsoContent, null, '\t');
}
function withBeforeConvert(convertFn) {
    return (jsoContent, options) => {
        return convertFn(beforeConvert(jsoContent, options), options);
    };
}
function beforeConvert(jsoContent, options) {
    jsoContent = buildMediaUrl(jsoContent, options);
    jsoContent = pickMediaAttributes(jsoContent, options);
    return jsoContent;
}
function buildMediaUrl(jsoContent, options) {
    let mediaSlug = constants_1.CustomSlugToSlug[constants_1.CustomSlugs.MEDIA];
    let media = jsoContent.data[mediaSlug];
    if (!media) {
        return jsoContent;
    }
    media = (0, lodash_1.fromPairs)((0, lodash_1.toPairs)(media).map(([id, medium]) => {
        if (isRelativeUrl(medium.url)) {
            medium.url = buildAbsoluteUrl(medium.url);
        }
        return [id, medium];
    }));
    jsoContent.data[mediaSlug] = media;
    return jsoContent;
}
function isRelativeUrl(url) {
    return url.startsWith('/');
}
function buildAbsoluteUrl(relativeUrl) {
    return getConfig('serverPublicHostname') + relativeUrl;
}
function pickMediaAttributes(jsoContent, options) {
    let mediaSlug = constants_1.CustomSlugToSlug[constants_1.CustomSlugs.MEDIA];
    let media = jsoContent.data[mediaSlug];
    if (!media) {
        return jsoContent;
    }
    media = (0, lodash_1.fromPairs)((0, lodash_1.toPairs)(media).map(([id, medium]) => {
        medium = (0, lodash_1.pick)(medium, ['id', 'name', 'alternativeText', 'caption', 'hash', 'ext', 'mime', 'url', 'createdAt', 'updatedAt', 'createdBy', 'updatedBy']);
        return [id, medium];
    }));
    jsoContent.data[mediaSlug] = media;
    return jsoContent;
}
