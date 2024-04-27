'use strict';
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
const { CustomSlugs } = require('../../../config/constants');
const { getService } = require('../../../utils');
const { getAllSlugs } = require('../../../utils/models');
const { handleAsyncError } = require('../../content-api/utils');
const exportData = (ctx) => __awaiter(void 0, void 0, void 0, function* () {
    if (!hasPermissions(ctx)) {
        return ctx.forbidden();
    }
    let { slug, search, applySearch, exportFormat, relationsAsId, deepness = 5, exportPluginsContentTypes } = ctx.request.body;
    let data;
    if (exportFormat === getService('export').formats.JSON_V2) {
        data = yield getService('export').exportDataV2({ slug, search, applySearch, deepness, exportPluginsContentTypes });
    }
    else {
        data = yield getService('export').exportData({ slug, search, applySearch, exportFormat, relationsAsId, deepness });
    }
    ctx.body = {
        data,
    };
});
const hasPermissions = (ctx) => {
    let { slug } = ctx.request.body;
    const { userAbility } = ctx.state;
    const slugs = slug === CustomSlugs.WHOLE_DB ? getAllSlugs() : [slug];
    const allowedSlugs = slugs.filter((slug) => {
        const permissionChecker = strapi.plugin('content-manager').service('permission-checker').create({ userAbility, model: slug });
        return permissionChecker.can.read();
    });
    return !!allowedSlugs.length;
};
module.exports = ({ strapi }) => ({
    exportData: handleAsyncError(exportData),
});
