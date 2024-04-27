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
const { BusinessError } = require('../../utils/errors');
/**
 * Check an object's properties based on a validation schema
 * @param {*} schema - Validation schema
 * @param {*} obj - Object to check properties
 * @param {Object} options
 * @param {boolean} [options.allowUnknown] - Whether to allow unknown properties (default: false)
 * @returns Object with values checked and parsed
 */
const checkParams = (schema, obj, options = {}) => {
    const allowUnknown = options.allowUnknown || false;
    const validation = schema.validate(obj, {
        abortEarly: false,
        allowUnknown,
    });
    if (validation.error) {
        const error = validation.error.details.map((detail) => detail.message).join(', ');
        throw new BusinessError(error);
    }
    return validation.value;
};
const handleAsyncError = (fn) => (ctx) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const res = yield fn(ctx);
        return res;
    }
    catch (err) {
        strapi.log.error(err);
        if (err instanceof BusinessError) {
            ctx.status = 400;
            ctx.body = {
                message: err.message,
                code: err.code,
            };
        }
        else {
            throw err;
        }
    }
});
module.exports = {
    checkParams,
    handleAsyncError,
};
