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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const joi_1 = __importDefault(require("joi"));
const parsers_1 = require("../../../services/import/parsers");
const { getService } = require('../../../utils');
const { checkParams, handleAsyncError } = require('../utils');
const bodySchema = joi_1.default.object({
    slug: joi_1.default.string().required(),
    data: joi_1.default.any().required(),
    format: joi_1.default.string()
        .valid(...parsers_1.InputFormats)
        .required(),
    idField: joi_1.default.string(),
});
const importData = (ctx) => __awaiter(void 0, void 0, void 0, function* () {
    const { user } = ctx.state;
    const { slug, data: dataRaw, format, idField } = checkParams(bodySchema, ctx.request.body);
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
module.exports = ({ strapi }) => handleAsyncError(importData);
