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
const constants_1 = require("../../../config/constants");
const models_1 = require("../../../utils/models");
const { getService } = require('../../../utils');
module.exports = ({ strapi }) => importData;
function importData(ctx) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!hasPermissions(ctx)) {
            return ctx.forbidden();
        }
        const { user } = ctx.state;
        const { slug, data: dataRaw, format, idField } = ctx.request.body;
        const fileContent = yield getService('import').parseInputData(format, dataRaw, { slug });
        let res;
        if ((fileContent === null || fileContent === void 0 ? void 0 : fileContent.version) === 2) {
            res = yield getService('import').importDataV2(fileContent, {
                slug,
                user,
                idField,
            });
        }
        else {
            res = yield getService('import').importData(dataRaw, {
                slug,
                format,
                user,
                idField,
            });
        }
        ctx.body = {
            failures: res.failures,
        };
    });
}
function hasPermissions(ctx) {
    let { slug } = ctx.request.body;
    const { userAbility } = ctx.state;
    let slugsToCheck = [];
    if (slug === constants_1.CustomSlugs.WHOLE_DB) {
        slugsToCheck.push(...(0, models_1.getAllSlugs)());
    }
    else {
        slugsToCheck.push(slug);
    }
    return slugsToCheck.every((slug) => hasPermissionForSlug(userAbility, slug));
}
function hasPermissionForSlug(userAbility, slug) {
    const permissionChecker = strapi.plugin('content-manager').service('permission-checker').create({ userAbility, model: slug });
    return permissionChecker.can.create() && permissionChecker.can.update();
}
