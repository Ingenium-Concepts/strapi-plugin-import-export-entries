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
exports.findOrImportFile = void 0;
const fs_1 = __importDefault(require("fs"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const trim_1 = __importDefault(require("lodash/trim"));
const os_1 = __importDefault(require("os"));
const path_1 = __importDefault(require("path"));
const node_fetch_1 = __importDefault(require("node-fetch"));
const objects_1 = require("../../../../libs/objects");
const { nameToSlug } = require('@strapi/utils');
module.exports = {
    findOrImportFile,
};
function findOrImportFile(fileEntry, user, { allowedFileTypes }) {
    return __awaiter(this, void 0, void 0, function* () {
        let obj = {};
        if (typeof fileEntry === 'string') {
            obj.url = fileEntry;
        }
        else if ((0, objects_1.isObjectSafe)(fileEntry)) {
            obj = fileEntry;
        }
        else {
            throw new Error(`Invalid data format '${typeof fileEntry}' to import media. Only 'string', 'number', 'object' are accepted.`);
        }
        if (obj.url) {
            const fileData = getFileDataFromRawUrl(obj.url);
            if (!obj.name) {
                obj.name = fileData.name;
            }
            if (!obj.hash) {
                obj.hash = fileData.hash;
            }
        }
        let file = yield findFile(obj, user, allowedFileTypes);
        if (file && !isExtensionAllowed(file.ext.substring(1), allowedFileTypes)) {
            file = null;
        }
        return file;
    });
}
exports.findOrImportFile = findOrImportFile;
const findFile = ({ hash, name, url, alternativeText, caption }, user, allowedFileTypes) => __awaiter(void 0, void 0, void 0, function* () {
    let file = null;
    if (!file && hash) {
        [file] = yield strapi.entityService.findMany('plugin::upload.file', {
            filters: {
                hash: {
                    $startsWith: hash,
                },
            },
            limit: 1,
        });
    }
    if (!file && name) {
        [file] = yield strapi.entityService.findMany('plugin::upload.file', { filters: { name }, limit: 1 });
    }
    if (!file && url) {
        const checkResult = isValidFileUrl(url, allowedFileTypes);
        if (checkResult.isValid) {
            file = yield findFile({ hash: checkResult.fileData.hash, name: checkResult.fileData.fileName }, user, allowedFileTypes);
            if (!file) {
                file = yield importFile({ url: checkResult.fileData.rawUrl, name: name, alternativeText: alternativeText, caption: caption }, user);
            }
        }
    }
    return file;
});
const importFile = ({ url, name, alternativeText, caption }, user) => __awaiter(void 0, void 0, void 0, function* () {
    let file;
    try {
        file = yield fetchFile(url);
        let [uploadedFile] = yield strapi
            .plugin('upload')
            .service('upload')
            .upload({
            files: {
                name: file.name,
                type: file.type,
                size: file.size,
                path: file.path,
            },
            data: {
                fileInfo: {
                    name: name || file.name,
                    alternativeText: alternativeText || '',
                    caption: caption || '',
                },
            },
        }, { user });
        return uploadedFile;
    }
    catch (err) {
        strapi.log.error(err);
        throw err;
    }
    finally {
        if (file === null || file === void 0 ? void 0 : file.path) {
            deleteFileIfExists(file === null || file === void 0 ? void 0 : file.path);
        }
    }
});
const fetchFile = (url) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const response = yield (0, node_fetch_1.default)(url);
        const contentType = ((_b = (_a = response.headers.get('content-type')) === null || _a === void 0 ? void 0 : _a.split(';')) === null || _b === void 0 ? void 0 : _b[0]) || '';
        const contentLength = parseInt(response.headers.get('content-length') || '0', 10) || 0;
        const buffer = yield response.buffer();
        const fileData = getFileDataFromRawUrl(url);
        const filePath = yield writeFile(fileData.name, buffer);
        return {
            name: fileData.name,
            type: contentType,
            size: contentLength,
            path: filePath,
        };
    }
    catch (error) {
        throw new Error(`Tried to fetch file from url ${url} but failed with error: ${error.message}`);
    }
});
const writeFile = (name, content) => __awaiter(void 0, void 0, void 0, function* () {
    const tmpWorkingDirectory = yield fs_extra_1.default.mkdtemp(path_1.default.join(os_1.default.tmpdir(), 'strapi-upload-'));
    const filePath = path_1.default.join(tmpWorkingDirectory, name);
    try {
        fs_1.default.writeFileSync(filePath, content);
        return filePath;
    }
    catch (err) {
        strapi.log.error(err);
        throw err;
    }
});
const deleteFileIfExists = (filePath) => {
    if (filePath && fs_1.default.existsSync(filePath)) {
        fs_1.default.rmSync(filePath);
    }
};
const isValidFileUrl = (url, allowedFileTypes) => {
    try {
        const fileData = getFileDataFromRawUrl(url);
        return {
            isValid: isExtensionAllowed(fileData.extension, allowedFileTypes),
            fileData: {
                hash: fileData.hash,
                fileName: fileData.name,
                rawUrl: url,
            },
        };
    }
    catch (err) {
        strapi.log.error(err);
        return {
            isValid: false,
            fileData: {
                hash: '',
                fileName: '',
                rawUrl: '',
            },
        };
    }
};
const isExtensionAllowed = (ext, allowedFileTypes) => {
    const checkers = allowedFileTypes.map(getFileTypeChecker);
    return checkers.some((checker) => checker(ext));
};
const ALLOWED_AUDIOS = ['mp3', 'wav', 'ogg'];
const ALLOWED_IMAGES = ['png', 'gif', 'jpg', 'jpeg', 'svg', 'bmp', 'tif', 'tiff'];
const ALLOWED_VIDEOS = ['mp4', 'avi'];
/** See Strapi file allowedTypes for object keys. */
const fileTypeCheckers = {
    any: (ext) => true,
    audios: (ext) => ALLOWED_AUDIOS.includes(ext),
    files: (ext) => true,
    images: (ext) => ALLOWED_IMAGES.includes(ext),
    videos: (ext) => ALLOWED_VIDEOS.includes(ext),
};
const getFileTypeChecker = (type) => {
    const checker = fileTypeCheckers[type];
    if (!checker) {
        throw new Error(`Strapi file type ${type} not handled.`);
    }
    return checker;
};
const getFileDataFromRawUrl = (rawUrl) => {
    var _a;
    const parsedUrl = new URL(decodeURIComponent(rawUrl));
    const name = (0, trim_1.default)(parsedUrl.pathname, '/').replace(/\//g, '-');
    const extension = ((_a = parsedUrl.pathname.split('.').pop()) === null || _a === void 0 ? void 0 : _a.toLowerCase()) || '';
    const hash = nameToSlug(name.slice(0, -(extension.length + 1)) || '', { separator: '_', lowercase: false });
    return {
        hash,
        name,
        extension,
    };
};
