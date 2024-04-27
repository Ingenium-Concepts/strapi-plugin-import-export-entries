"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toArray = exports.isArraySafe = exports.filterOutDuplicates = exports.extract = void 0;
module.exports = {
    extract,
    filterOutDuplicates,
    isArraySafe,
    toArray,
};
/**
 * Check if value is an array.
 */
function isArraySafe(val) {
    return val && Array.isArray(val);
}
exports.isArraySafe = isArraySafe;
/**
 * Convert value to array if not already.
 * @param {*} val
 * @returns {Array<*>}
 */
function toArray(val) {
    return isArraySafe(val) ? val : [val];
}
exports.toArray = toArray;
function extract(arr, predicate) {
    const extractedValues = arr.filter(predicate);
    // Modify `arr` in place.
    arr.splice(0, arr.length, ...arr.filter((v, i, a) => !predicate(v, i, a)));
    return extractedValues;
}
exports.extract = extract;
function filterOutDuplicates(predicate) {
    const isStrictlyEqual = (valueA, valueB) => valueA === valueB;
    const findIndexPredicate = predicate || isStrictlyEqual;
    return (value, index, array) => array.findIndex((v) => findIndexPredicate(v, value)) === index;
}
exports.filterOutDuplicates = filterOutDuplicates;
