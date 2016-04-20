// # Tag API
// RESTful API for the Tag resource
var Promise      = require('bluebird'),
    _            = require('lodash'),
    fs           = require('fs'),
    readline     = require('readline'),
    dataProvider = require('../models'),
    errors       = require('../errors'),
    utils        = require('./utils'),
    pipeline     = require('../utils/pipeline'),
    i18n         = require('../i18n'),

    docName      = 'subscribers',
    allowedIncludes = ['count.posts'],
    subscribers;

/**
 * ### Subscribers API Methods
 *
 * **See:** [API Methods](index.js.html#api%20methods)
 */
subscribers = {
    /**
     * ## Browse
     * @param {{context}} options
     * @returns {Promise<Subscriber>} Subscriber Collection
     */
    browse: function browse(options) {
        var tasks;

        /**
         * ### Model Query
         * Make the call to the Model layer
         * @param {Object} options
         * @returns {Object} options
         */
        function doQuery(options) {
            return dataProvider.Subscriber.findPage(options);
        }

        // Push all of our tasks into a `tasks` array in the correct order
        tasks = [
            utils.validate(docName, {opts: utils.browseDefaultOptions}),
            // TODO: handlePermissions
            doQuery
        ];

        // Pipeline calls each task passing the result of one to be the arguments for the next
        return pipeline(tasks, options);
    },

    /**
     * ## Read
     * @param {{id}} options
     * @return {Promise<Subscriber>} Subscriber
     */
    read: function read(options) {
        var attrs = ['id'],
            tasks;

        /**
         * ### Model Query
         * Make the call to the Model layer
         * @param {Object} options
         * @returns {Object} options
         */
        function doQuery(options) {
            return dataProvider.Subscriber.findOne(options.data, _.omit(options, ['data']));
        }

        // Push all of our tasks into a `tasks` array in the correct order
        tasks = [
            utils.validate(docName, {attrs: attrs}),
            // TODO: handlePermissions
            doQuery
        ];

        // Pipeline calls each task passing the result of one to be the arguments for the next
        return pipeline(tasks, options).then(function formatResponse(result) {
            if (result) {
                return {subscribers: [result.toJSON(options)]};
            }

            return Promise.reject(new errors.NotFoundError('TODO'/*i18n.t('errors.api.tags.tagNotFound')*/));
        });
    },

    /**
     * ## Add
     * @param {Subscriber} object the subscriber to create
     * @returns {Promise(Subscriber)} Newly created Subscriber
     */
    add: function add(object, options) {
        var tasks;

        /**
         * ### Model Query
         * Make the call to the Model layer
         * @param {Object} options
         * @returns {Object} options
         */
        function doQuery(options) {
            return dataProvider.Subscriber.add(options.data.subscribers[0], _.omit(options, ['data']));
        }

        // Push all of our tasks into a `tasks` array in the correct order
        tasks = [
            utils.validate(docName),
            // TODO: handlePermissions
            doQuery
        ];

        // Pipeline calls each task passing the result of one to be the arguments for the next
        return pipeline(tasks, object, options).then(function formatResponse(result) {
            var subscriber = result.toJSON(options);

            return {subscribers: [subscriber]};
        });
    },

    /**
     * ## Edit
     *
     * @public
     * @param {Subscriber} object Subscriber or specific properties to update
     * @param {{id, context, include}} options
     * @return {Promise<Subscriber>} Edited Subscriber
     */
    edit: function edit(object, options) {
        var tasks;

        /**
         * Make the call to the Model layer
         * @param {Object} options
         * @returns {Object} options
         */
        function doQuery(options) {
            return dataProvider.Subscriber.edit(options.data.subscribers[0], _.omit(options, ['data']));
        }

        // Push all of our tasks into a `tasks` array in the correct order
        tasks = [
            utils.validate(docName, {opts: utils.idDefaultOptions}),
            // TODO: handlePermissions
            doQuery
        ];

        // Pipeline calls each task passing the result of one to be the arguments for the next
        return pipeline(tasks, object, options).then(function formatResponse(result) {
            if (result) {
                var subscriber = result.toJSON(options);

                return {subscribers: [subscriber]};
            }

            return Promise.reject(new errors.NotFoundError(i18n.t('TODO'/*errors.api.tags.tagNotFound'*/)));
        });
    },

    /**
     * ## Destroy
     *
     * @public
     * @param {{id, context}} options
     * @return {Promise}
     */
    destroy: function destroy(options) {
        var tasks;

        /**
         * ### Delete Subscriber
         * Make the call to the Model layer
         * @param {Object} options
         */
        function doQuery(options) {
            return dataProvider.Subscriber.destroy(options).return(null);
        }

        // Push all of our tasks into a `tasks` array in the correct order
        tasks = [
            utils.validate(docName, {opts: utils.idDefaultOptions}),
            // TODO: handlePermissions
            doQuery
        ];

        // Pipeline calls each task passing the result of one to be the arguments for the next
        return pipeline(tasks, options);
    },

    /**
     * ### Export Subscribers
     * Generate the CSV to export
     *
     * @public
     * @param {{context}} options
     * @returns {Promise} Ghost Export CSV format
     */
    exportCSV: function exportCSV(options) {
        var tasks = [];

        options = options || {};

        function formatCSV (data) {
            var fields = ["id", "email", "created_at", "deleted_at"],
                csv = '';

            for (var j = 0; j < data.length; j++) {
                var subscriber = data[j];
                for(var i = 0; i < fields.length; i++) {
                    var field = fields[i];
                    csv += subscriber[field] !== null ? subscriber[field] : '';
                    if (i !== fields.length - 1) {
                        csv += ','
                    }
                }
                csv += '\r\n';
            };
            return csv;
        }

        // Export data, otherwise send error 500
        function exportSubscribers() {
            return dataProvider.Subscriber.findPage(options).then(function (data) {
                return formatCSV(data.subscribers);
            }).catch(function (error) {
                return Promise.reject(new errors.InternalServerError(error.message || error));
            });
        }

        tasks = [
            // TODO: handlePermissions
            exportSubscribers
        ];

        return pipeline(tasks, options);
    },

    /**
     * ### Import CSV
     * Import subscribers from a CSV file
     *
     * @public
     * @param {{context}} options
     * @returns {Promise} Success
     */
    importCSV: function (options) {
        var tasks = [];

        options = options || {};

        function validate(options) {
            options.name = options.originalname;
            options.type = options.mimetype;

            // Check if a file was provided
            if (!utils.checkFileExists(options)) {
                return Promise.reject(new errors.ValidationError(i18n.t('errors.api.db.selectFileToImport')));
            }

            // TODO: check for valid entries

            return options;
        }

        function importCSV (options) {
            return new Promise(function (resolve, reject) {
                var filePath = options.path,
                    importTasks = [];
                readline.createInterface({
                    input: fs.createReadStream(filePath),
                    terminal: false
                }).on('line', function(line) {
                    var dataToImport = line.split(',');
                    // TODO: investigate if directly writing to DB & use transaction is better?
                    importTasks.push(subscribers.add({
                        subscribers: [{
                            email: dataToImport[1]
                        }
                    ]}, {context: options.context}));
                }).on('close', function () {
                    Promise.all(importTasks).then(function () {
                        // TODO: delete uploaded file
                        return resolve({imported: importTasks.length});
                    }).catch(function(error) {
                        return reject(new errors.InternalServerError(error.message || error));
                    });
                });
            });
        }

        tasks = [
            validate,
            // TODO: handlePermissions
            importCSV
        ];

        return pipeline(tasks, options);
    },
};

module.exports = subscribers;