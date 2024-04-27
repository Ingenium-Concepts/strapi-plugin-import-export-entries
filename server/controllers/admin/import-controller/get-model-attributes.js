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
const { getModelAttributes } = require('../../../utils/models');
const getModelAttributesEndpoint = (ctx) => __awaiter(void 0, void 0, void 0, function* () {
    const { slug } = ctx.params;
    const attributeNames = getModelAttributes(slug)
        .filter(filterAttribute)
        .map((attr) => attr.name);
    attributeNames.unshift('id');
    ctx.body = {
        data: {
            attribute_names: attributeNames,
        },
    };
});
const filterAttribute = (attr) => {
    const filters = [filterType, filterName];
    return filters.every((filter) => filter(attr));
};
const filterType = (attr) => !['relation', 'component', 'dynamiczone'].includes(attr.type);
const filterName = (attr) => !['createdAt', 'updatedAt', 'publishedAt', 'locale'].includes(attr.name);
module.exports = ({ strapi }) => getModelAttributesEndpoint;
