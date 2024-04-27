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
exports.parseInputData = exports.InputFormats = void 0;
const csvtojson_1 = __importDefault(require("csvtojson"));
const arrays_1 = require("../../../libs/arrays");
const objects_1 = require("../../../libs/objects");
const models_1 = require("../../utils/models");
const inputFormatToParser = {
    csv: parseCsv,
    jso: parseJso,
    json: parseJson,
};
const InputFormats = Object.keys(inputFormatToParser);
exports.InputFormats = InputFormats;
module.exports = {
    InputFormats,
    parseInputData,
};
/**
 * Parse input data.
 */
function parseInputData(format, dataRaw, { slug }) {
    return __awaiter(this, void 0, void 0, function* () {
        const parser = inputFormatToParser[format];
        if (!parser) {
            throw new Error(`Data input format ${format} is not supported.`);
        }
        const data = yield parser(dataRaw, { slug });
        return data;
    });
}
exports.parseInputData = parseInputData;
function parseCsv(dataRaw, { slug }) {
    return __awaiter(this, void 0, void 0, function* () {
        let data = yield (0, csvtojson_1.default)().fromString(dataRaw);
        const relationNames = (0, models_1.getModelAttributes)(slug, { filterType: ['component', 'dynamiczone', 'media', 'relation'] }).map((a) => a.name);
        data = data.map((datum) => {
            for (let name of relationNames) {
                try {
                    datum[name] = JSON.parse(datum[name]);
                }
                catch (err) {
                    strapi.log.error(err);
                }
            }
            return datum;
        });
        return data;
    });
}
function parseJson(dataRaw) {
    return __awaiter(this, void 0, void 0, function* () {
        let data = JSON.parse(dataRaw);
        return data;
    });
}
function parseJso(dataRaw) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!(0, objects_1.isObjectSafe)(dataRaw) && !(0, arrays_1.isArraySafe)(dataRaw)) {
            throw new Error(`To import JSO, data must be an array or an object`);
        }
        return dataRaw;
    });
}
