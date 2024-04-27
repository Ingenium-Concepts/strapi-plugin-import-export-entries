"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mergeObjects = exports.isObjectEmpty = exports.isObjectSafe = exports.ObjectBuilder = void 0;
const deepmerge = require('deepmerge');
class ObjectBuilder {
    constructor() {
        this._obj = {};
    }
    get() {
        return this._obj;
    }
    extend(obj) {
        if ((0, exports.isObjectSafe)(obj)) {
            this._obj = Object.assign(Object.assign({}, this._obj), obj);
        }
    }
}
exports.ObjectBuilder = ObjectBuilder;
/**
 * Check if value is an object.
 */
const isObjectSafe = (val) => {
    return val && !Array.isArray(val) && typeof val === 'object';
};
exports.isObjectSafe = isObjectSafe;
const isObjectEmpty = (obj) => {
    for (let i in obj) {
        return false;
    }
    return true;
};
exports.isObjectEmpty = isObjectEmpty;
const mergeObjects = (x, y) => {
    return deepmerge(x, y, {
        arrayMerge: (target, source) => {
            source.forEach((item) => {
                if (target.indexOf(item) === -1) {
                    target.push(item);
                }
            });
            return target;
        },
    });
};
exports.mergeObjects = mergeObjects;
module.exports = {
    ObjectBuilder,
    isObjectSafe: exports.isObjectSafe,
    isObjectEmpty: exports.isObjectEmpty,
    mergeObjects: exports.mergeObjects,
};
