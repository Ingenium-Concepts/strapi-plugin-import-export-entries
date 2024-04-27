"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
module.exports = {
    type: 'content-api',
    routes: [
        {
            method: 'POST',
            path: '/content/export/contentTypes',
            handler: 'export.exportData',
            config: {
                policies: [],
            },
        },
    ],
};
