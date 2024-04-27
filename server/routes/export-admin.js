"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
module.exports = {
    type: 'admin',
    routes: [
        {
            method: 'POST',
            path: '/export/contentTypes',
            handler: 'exportAdmin.exportData',
            config: {
                policies: [],
            },
        },
    ],
};
