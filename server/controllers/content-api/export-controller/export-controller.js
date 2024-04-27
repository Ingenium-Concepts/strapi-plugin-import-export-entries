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
const Joi = require('joi');
const { getService } = require('../../../utils');
const { checkParams, handleAsyncError } = require('../utils');
const bodySchema = Joi.object({
    slug: Joi.string().required(),
    exportFormat: Joi.string().valid('csv', 'json', 'json-v2').required(),
    search: Joi.string().default(''),
    applySearch: Joi.boolean().default(false),
    relationsAsId: Joi.boolean().default(false),
    deepness: Joi.number().integer().min(1).default(5),
    exportPluginsContentTypes: Joi.boolean().default(false),
});
const exportData = (ctx) => __awaiter(void 0, void 0, void 0, function* () {
    let { slug, search, applySearch, exportFormat, relationsAsId, deepness, exportPluginsContentTypes } = checkParams(bodySchema, ctx.request.body);
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
module.exports = ({ strapi }) => ({
    exportData: handleAsyncError(exportData),
});
