/**
 * @file FileSystemStore.js - File System Store for persistence with MongoPortable ({@link https://github.com/EastolfiWebDev/MongoPortable}), 
 *  a portable MongoDB-like module.
 * @version 1.0.0
 * 
 * @author Eduardo Astolfi <eastolfi91@gmail.com>
 * @copyright 2016 Eduardo Astolfi <eastolfi91@gmail.com>
 * @license MIT Licensed
 */
 
var _ = require("lodash"),
    fs = require("file-system"),
    Logger = require("jsw-logger");
    
var logger = null;

var _defOptions = {
    ddbb_path: 'db',
    collection_extension: 'json',
    sync: false
};

// existsDir, existsFile, createDir, removeDir, createFile, removeFile, writeToFile, readFromFile

const _existsFile = function(filename) {
    var exists = false;
    try {
        let file = fs.readFileSync(filename);  
        
        if (!_.isNil(file)) {
            var stats = fs.statSync(filename);
            
            exists = stats.isFile();
        }
    } catch (error) {
        logger.debug(`File ${filename} doesn't exist`);
    } finally {
        return exists;
    }
};

const _persist = function(collectionPath, collection) {
    let docs = "";
    for (let i = 0; i < collection.docs.length; i++) {
        docs += JSON.stringify(collection.docs[i]) + "\n";
    }
    
    if (this.options.sync === true) {
        _writeFile(collectionPath, docs);

        logger.info('Document persisted in the file system');
    } else {
        fs.writeFile(collectionPath, (docs, err) => {
            if (err) throw err;
            
            logger.info('Document persisted in the file system');
        });
    }
};

const _readFile = function(path, callback = null) {
    if (!_.isNil(callback)) {
        fs.readFile(path, (err, data) => {
            if (err) throw err;
            
            callback(data);
            
            logger.info('Collection readed from the file system');
        });
    } else {
        return fs.readFileSync(path);
    }
};

const _createDirectory = function(dir = '') {
    fs.mkdirSync(`${this.options.ddbb_path}/${dir}`);
};

const _createFile = function(path, recursive) {
    _writeFile(path);
};

const _writeFile = function(path, content = '') {
    fs.writeFileSync(path, content);
};

/**
 * FileSystemStore
 * 
 * @module FileSystemStore
 * @constructor
 * @since 0.0.1
 * 
 * @classdesc Store for MongoPortable ({@link https://github.com/EastolfiWebDev/MongoPortable})
 * 
 * @param {Object} [options] - Additional options
 * 
 * @param {Boolean} [options.ddbb_path="db"] - The name of the directory where the database will be located
 * @param {Boolean} [options.sync=true] - Set it false to make all the file access asynchronous. (Currently only sync=true is supported)
 * @param {Boolean} [options.collection_extension="json"] - The extension of the collection files. (Currently only "json" is supported)
 */
class FileSysStore {
    constructor(options = {}) {
        this.options = _.assign(_defOptions, options);
        
        if (options.log) {
            logger = Logger.getInstance(options.log);
        } else {
            logger = Logger.instance;
        }
        
        logger.info(`Database will be in ${this.options.ddbb_path}`);
        
        // Create the DDBB path
        _createDirectory.call(this);
    }
    
    /***************
     *    UTILS    *
     ***************/
    
    /**
     * Get the path of the collection file
     *
     * @method FileSystemStore#getCollectionPath
     * 
     * @param {String} ddbb_name - Name of the database
     * @param {String} coll_name - Name of the collection
     *
     * @return {String} - The path of the file
     */
    getCollectionPath(ddbb_name, coll_name) {
        if (_.isNil(ddbb_name)) throw new Error("Parameter 'ddbb_name' is required");
        if (_.isNil(coll_name)) throw new Error("Parameter 'coll_name' is required");
        
        return `${this.options.ddbb_path}/${ddbb_name}/${coll_name}.${this.options.collection_extension}`;
    }
    
    /***************
     * COLLECTIONS *
     ***************/
     
    /**
     * Receives a "createCollection" event from MongoPortable, syncronizing the collection file with the new info
     *
     * @method FileSystemStore~createCollection
     * 
     * @listens MongoPortable~createCollection
     * 
     * @param {Object} args - Arguments from the event
     * 
     * @param {Object} args.connection - Information about the current database connection
     * @param {Object} args.collection - Information about the collection created
     */
     createCollection(args) {
         logger.log('#createCollection');
         
         var coll_path = this.getCollectionPath(args.collection.fullName.split('.')[0], args.collection.name);
         
         if (!_existsFile(coll_path)) {
             _createFile(coll_path, true);
         }
     }

    /**********
     * CREATE *
     **********/
    
    /**
     * Receives a "insert" event from MongoPortable, syncronizing the collection file with the new info
     *
     * @method FileSystemStore~insert
     * 
     * @listens MongoPortable~insert
     * 
     * @param {Object} args - Arguments from the event
     * 
     * @param {Object} args.collection - Information about the collection
     * @param {Object} args.doc - Information about the document inserted
     */
    insert (args) {
        logger.log('#insert');
            
        _persist.call(this, this.getCollectionPath(args.collection.fullName.split('.')[0], args.collection.name), args.collection);
    }
    
    // TODO
    save (args) {
        logger.log('#save');
    }
    
    /**********
     *  READ  *
     **********/
    
    // TODO
    all(args) {
        logger.log('#all');
    }
    
    /**
     * Receives a "find" event from MongoPortable, fetching the info of the collection file
     *
     * @method FileSystemStore~find
     * 
     * @listens MongoPortable~find
     * 
     * @param {Object} args - Arguments from the event
     * 
     * @property {Object} args.collection - Information about the collection
     * @property {Object} args.selector - The selection of the query
     * @property {Object} args.fields - The fields showed in the query
     */
    find (args) {
        logger.log('#find');
        
        var callback = null;
        
        if (this.options.sync !== true) {
            // handle async
        }
        
        var file = _readFile(this.getCollectionPath(args.collection.fullName.split('.')[0], args.collection.name), callback);
        
        let docs = [];
        let indexes = {};
        
        let lines = file.toString().split("\n");
        
        // FIXME Workaround...
        for (let i = 0; i < lines.length; i++) {
            let doc = lines[i];
            
            if (doc.trim() !== '') {
                docs.push(JSON.parse(doc));
                indexes[JSON.parse(doc)._id] = i;
            }
        }
        
        /**/
        // var _docs = _.cloneDeep(args.collection.docs);
        // var _idxs = _.cloneDeep(args.collection.doc_indexes);
        
        // for (collDocs) {
        //     let doc;
            
        //     if (!_.hasIn(_idx, doc._id)) {
        //         add(doc);
        //     } else {
        //         update(doc);
        //     }
        // }
        /**/
        
        // var docs = [];
        
        // for (var i = 0; i < collDocs.length; i++) {
        //     var doc = collDocs[i];
            
        //     docs.push(doc);
        //     args.collection.doc_indexes[doc._id] = i;
        // }
        
        // if (docs.length !== )
        
        // for (let key in args.collection.doc_indexes) {
            
        // }
        
        args.collection.docs = docs;
        args.collection.doc_indexes = indexes;
    }
    
    /**
     * Receives a "findOne" event from MongoPortable, fetching the info of the collection file
     *
     * @method FileSystemStore~findOne
     * 
     * @listens MongoPortable~findOne
     * 
     * @param {Object} args - Arguments from the event
     * 
     * @property {Object} args.collection - Information about the collection
     * @property {Object} args.selector - The selection of the query
     * @property {Object} args.fields - The fields showed in the query
     */
    findOne (args) {
        logger.log('#findOne');
        
        // FIXME When we can do a line-per-line file search, change this
        this.find(args);
    }
    /**********
     * UPDATE *
     **********/
    
    /**
     * Receives an "update" event from MongoPortable, syncronizing the collection file with the new info
     *
     * @method FileSystemStore~update
     * 
     * @listens MongoPortable~update
     * 
     * @param {Object} args - Arguments from the event
     * 
     * @property {Object} args.collection - Information about the collection
     * @property {Object} args.selector - The selection of the query
     * @property {Object} args.modifier - The modifier used in the query
     * @property {Object} args.docs - The updated/inserted documents information
     */
    update (args){
        logger.log('#update');
        
        _persist.call(this, this.getCollectionPath(args.collection.fullName.split('.')[0], args.collection.name), args.collection);
    }
    
    /**********
     * DELETE *
     **********/
    
    /**
     * Receives an "remove" event from MongoPortable, syncronizing the collection file with the new info
     *
     * @method FileSystemStore~remove
     * 
     * @listens MongoPortable~remove
     * 
     * @param {Object} args - Arguments from the event
     * 
     * @property {Object} args.collection - Information about the collection
     * @property {Object} args.selector - The selection of the query
     * @property {Object} args.docs - The deleted documents information
     */
    remove(args) {
        logger.log('#remove');
        
        _persist.call(this, this.getCollectionPath(args.collection.fullName.split('.')[0], args.collection.name), args.collection);
    }
    
    /**********
     * OTHERS *
     **********/
    // TODO
    ensureIndex (args){
        logger.log('#ensureIndex');
    }
    
    // TODO
    backup (args){
        logger.log('#backup');
    }
    
    // TODO
    backups (args){
        logger.log('#backups');
    }
    
    // TODO
    removeBackup (args){
        logger.log('#removeBackup');
    }
    
    // TODO
    restore (args){
        logger.log('#restore');
    }
}

module.exports = FileSysStore;